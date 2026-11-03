// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Checkpoints} from "@openzeppelin/contracts/utils/structs/Checkpoints.sol";
import {Time} from "@openzeppelin/contracts/utils/types/Time.sol";
import {SchulzeTally} from "./SchulzeTally.sol";

/// @title Community governance with delegated voting and automatic testnet payment
/// @notice One deployment per community. See docs/prototype/spec.md.
contract CommunityGovernance {
    using Checkpoints for Checkpoints.Trace208;

    // ---------------------------------------------------------------------
    // Types
    // ---------------------------------------------------------------------

    struct Member {
        bool registered; // in the registry (eligible or not); blocks supplier registration
        bool eligible; // false = moroso
        uint32 weight; // current vote weight, registrar-only
        address delegate; // current delegate, address(0) = none
        uint32 receivedWeight; // sum of current weights of current delegators
    }

    enum IssueStatus {
        Open,
        Awarded,
        Executed,
        ClosedWithoutAward
    }

    /// @notice Derived from status and time; see `phaseOf`.
    enum IssuePhase {
        Bidding,
        Voting,
        VotingEnded, // still Open, waiting for someone to call closeIssue
        Closed // status != Open; the status gives the detail
    }

    /// @notice Why an issue closed without award (decided 2026-11-03: the members want to know).
    /// Checked in this order; `None` while open or when awarded.
    enum CloseReason {
        None,
        NoBids,
        NoQuorum,
        NoUniqueWinner, // Schulze tie (ADR-0020, ADR-0022)
        RejectAllWon
    }

    struct Issue {
        address proposer;
        string descriptionCid; // IPFS CID (Pinata); the text itself lives off-chain
        bytes32 topic; // organizational tag only, never used in weight computation
        uint256 ceiling; // wei, reserved from the treasury at creation
        uint48 createdAt;
        uint48 snapshot; // createdAt - 1: registry state the issue is decided with
        IssueStatus status;
        uint256 winningBidId; // 0 unless awarded
        CloseReason closeReason; // set when closed without award
    }

    struct Bid {
        uint256 issueId;
        address supplier;
        uint256 amount; // wei, at most the issue ceiling; what the supplier is paid if awarded
        string documentCid; // IPFS CID of the proposal document, uploaded by the supplier portal
    }

    /// @notice A complete ranking of the candidates, most preferred first. Immutable once cast;
    /// it carries no weight: weights are resolved at close, at the snapshot (ADR-0019).
    struct Ballot {
        bool cast;
        uint256[] ranking; // bid ids of the issue plus REJECT_ALL, each exactly once
    }

    // ---------------------------------------------------------------------
    // Errors
    // ---------------------------------------------------------------------

    error InvalidQuorumPercent();
    error ZeroPeriod();
    error NotRegistrar();
    error ZeroAddress();
    error ZeroWeight();
    error AlreadyRegistered(address member);
    error NotRegistered(address member);
    error AddressIsSupplier(address account);
    error AddressIsMember(address account);
    error EligibilityUnchanged(address member, bool eligible);
    error NotEligible(address member);
    error ZeroCeiling();
    error EmptyCid();
    error InsufficientFunds(uint256 available, uint256 requested);
    error ActiveIssueExists(uint256 issueId);
    error IssueNotFound(uint256 issueId);
    error NotSupplier(address account);
    error NotInBiddingPhase(uint256 issueId);
    error AlreadyBid(uint256 issueId, address supplier);
    error ZeroAmount();
    error AmountAboveCeiling(uint256 ceiling, uint256 amount);
    error SelfDelegation();
    error AlreadyDelegating(address currentDelegate);
    error DelegatorIsDelegate(address delegator);
    error DelegateIsDelegating(address delegate);
    error DelegationCapExceeded(uint256 controlledWeight, uint256 totalWeight);
    error NotDelegating(address member);
    error NotInVotingPhase(uint256 issueId);
    error NotEligibleAtSnapshot(uint256 issueId, address voter);
    error AlreadyVoted(uint256 issueId, address voter);
    error InvalidRanking(uint256 issueId);
    error IssueNotOpen(uint256 issueId);
    error VotingNotOver(uint256 issueId);

    // ---------------------------------------------------------------------
    // Events (spec §6)
    // ---------------------------------------------------------------------

    event MemberRegistered(address indexed member, uint32 weight);
    event MemberRemoved(address indexed member);
    event EligibilityChanged(address indexed member, bool eligible);
    event WeightChanged(address indexed member, uint32 oldWeight, uint32 newWeight);
    event SupplierRegistered(address indexed supplier);
    event DelegationSet(address indexed delegator, address indexed delegate);
    event DelegationRevoked(address indexed delegator);
    event IssueCreated(uint256 indexed issueId, address indexed proposer, uint256 ceiling);
    event BidSubmitted(uint256 indexed issueId, uint256 indexed bidId, address indexed supplier, uint256 amount);
    event BallotCast(uint256 indexed issueId, address indexed voter);
    event IssueAwarded(uint256 indexed issueId, uint256 indexed bidId);
    event IssueClosedWithoutAward(uint256 indexed issueId, CloseReason reason);
    event TreasuryFunded(address indexed from, uint256 amount);

    // ---------------------------------------------------------------------
    // Parameters (spec §2)
    // ---------------------------------------------------------------------

    /// @notice A delegate cannot accumulate more than total eligible weight / 3 (ADR-0019).
    uint32 public constant DELEGATION_CAP_DIVISOR = 3;

    /// @notice Candidate id for "rechazar todas" inside a ballot. Bid ids start at 1.
    uint256 public constant REJECT_ALL = 0;

    /// @notice Bidding window length in seconds, counted from the issue's creation.
    uint48 public immutable BIDDING_PERIOD;

    /// @notice Voting window length in seconds, starting when bidding ends.
    uint48 public immutable VOTING_PERIOD;

    /// @notice Minimum expressed weight for an issue to be awardable, as a percentage (1–100) of
    /// the total eligible weight at the issue's snapshot (ADR-0023).
    uint8 public immutable QUORUM_PERCENT;

    // ---------------------------------------------------------------------
    // State (spec §3)
    // ---------------------------------------------------------------------

    /// @notice The only account allowed to modify the member and supplier registries (ADR-0015).
    address public immutable registrar;

    mapping(address => Member) public members;

    /// @notice Registry in order of registration. Append-only: used to iterate at close.
    address[] public memberList;

    /// @notice The address was ever pushed to `memberList`.
    mapping(address => bool) public listed;

    mapping(address => bool) public isSupplier;

    /// @dev Effective weight per member: `weight` if registered and eligible, else 0.
    mapping(address => Checkpoints.Trace208) private weightHistory;

    /// @dev Sum of all effective weights.
    Checkpoints.Trace208 private totalWeightHistory;

    /// @dev Delegate of each member over time, stored as uint160 (0 = none).
    mapping(address => Checkpoints.Trace208) private delegateHistory;

    /// @notice Sum of the ceilings of Open and Awarded issues: treasury funds already committed.
    uint256 public reservedBalance;

    /// @notice Id of the next issue. Starts at 1 so that 0 can mean "no issue".
    uint256 public nextIssueId = 1;

    mapping(uint256 => Issue) public issues;

    /// @notice The proposer's issue in Open status, 0 if none (one open issue per proposer, HU-003).
    mapping(address => uint256) public activeIssueOf;

    /// @notice Id of the next bid. Starts at 1: inside a ballot, 0 is REJECT_ALL.
    uint256 public nextBidId = 1;

    mapping(uint256 => Bid) public bids;

    /// @notice Bid ids of each issue, in submission order (the tally candidates, plus REJECT_ALL).
    mapping(uint256 => uint256[]) public bidsByIssue;

    /// @notice One bid per supplier per issue (ADR-0019).
    mapping(uint256 => mapping(address => bool)) public hasBid;

    /// @dev issueId => voter => ballot. Read with getBallot: an auto-getter would omit the ranking.
    mapping(uint256 => mapping(address => Ballot)) private ballots;

    // ---------------------------------------------------------------------
    // Constructor
    // ---------------------------------------------------------------------

    constructor(uint8 quorumPercent_, uint48 biddingPeriod_, uint48 votingPeriod_) {
        if (quorumPercent_ == 0 || quorumPercent_ > 100) revert InvalidQuorumPercent();
        if (biddingPeriod_ == 0 || votingPeriod_ == 0) revert ZeroPeriod();

        registrar = msg.sender;
        QUORUM_PERCENT = quorumPercent_;
        BIDDING_PERIOD = biddingPeriod_;
        VOTING_PERIOD = votingPeriod_;
    }

    // ---------------------------------------------------------------------
    // Modifiers
    // ---------------------------------------------------------------------

    modifier onlyRegistrar() {
        if (msg.sender != registrar) revert NotRegistrar();
        _;
    }

    modifier onlyRegistered(address member) {
        if (!members[member].registered) revert NotRegistered(member);
        _;
    }

    // ---------------------------------------------------------------------
    // Registry (HU-001)
    // ---------------------------------------------------------------------

    function registerMember(address member, uint32 weight) external onlyRegistrar {
        if (member == address(0)) revert ZeroAddress();
        if (weight == 0) revert ZeroWeight();
        if (members[member].registered) revert AlreadyRegistered(member);
        if (isSupplier[member]) revert AddressIsSupplier(member);

        Member storage m = members[member];
        m.registered = true;
        m.eligible = true;
        m.weight = weight;

        if (!listed[member]) {
            listed[member] = true;
            memberList.push(member);
        }
        _checkpointWeight(member, weight);

        emit MemberRegistered(member, weight);
    }

    /// @notice Removes `member` from the registry from now on. Past snapshots still see them.
    /// Revokes the member's outgoing delegation and every delegation they received (OPEN-4).
    function removeMember(address member) external onlyRegistrar onlyRegistered(member) {
        if (members[member].delegate != address(0)) _revokeDelegation(member);
        if (members[member].receivedWeight > 0) {
            for (uint256 i = 0; i < memberList.length; i++) {
                if (members[memberList[i]].delegate == member) _revokeDelegation(memberList[i]);
            }
        }
        _checkpointWeight(member, 0);
        // Stays in memberList (append-only) and keeps `listed`, so re-registering does not duplicate it.
        delete members[member];

        emit MemberRemoved(member);
    }

    function setEligibility(address member, bool eligible) external onlyRegistrar onlyRegistered(member) {
        Member storage m = members[member];
        if (m.eligible == eligible) revert EligibilityUnchanged(member, eligible);

        m.eligible = eligible;
        _checkpointWeight(member, eligible ? m.weight : 0);

        emit EligibilityChanged(member, eligible);
    }

    function setWeight(address member, uint32 newWeight) external onlyRegistrar onlyRegistered(member) {
        if (newWeight == 0) revert ZeroWeight();

        Member storage m = members[member];
        uint32 oldWeight = m.weight;
        m.weight = newWeight;
        // An ineligible member keeps effective weight 0; the new weight applies when re-enabled.
        if (m.eligible) _checkpointWeight(member, newWeight);
        // The delegate may end above the cap: accepted edge case (ADR-0019), the cap is checked
        // when delegating.
        if (m.delegate != address(0)) {
            Member storage d = members[m.delegate];
            d.receivedWeight = d.receivedWeight - oldWeight + newWeight;
        }

        emit WeightChanged(member, oldWeight, newWeight);
    }

    // ---------------------------------------------------------------------
    // Supplier registry (HU-002)
    // ---------------------------------------------------------------------

    /// @notice Registration only: suppliers cannot be modified or removed (ADR-0017).
    /// The supplier's name is kept off-chain by the enrollment simulator.
    function registerSupplier(address supplier) external onlyRegistrar {
        if (supplier == address(0)) revert ZeroAddress();
        if (isSupplier[supplier]) revert AlreadyRegistered(supplier);
        // Disjoint from the member registry, eligible or not (ADR-0021). `listed` also covers
        // removed members: they may still vote on issues whose snapshot predates the removal.
        if (listed[supplier]) revert AddressIsMember(supplier);

        isSupplier[supplier] = true;

        emit SupplierRegistered(supplier);
    }

    // ---------------------------------------------------------------------
    // Delegation (HU-005, HU-006)
    // ---------------------------------------------------------------------

    /// @notice Delegates the caller's vote to `delegate` for issues created from now on.
    /// Single hop: nobody is delegator and delegate at once. Cap: the delegate cannot end up
    /// controlling more than 1/3 of the total eligible weight (ADR-0019).
    function delegateTo(address delegate) external {
        _requireEligible(msg.sender);
        if (delegate == msg.sender) revert SelfDelegation();
        Member storage d = members[delegate];
        if (!d.registered) revert NotRegistered(delegate);
        Member storage m = members[msg.sender];
        if (m.delegate != address(0)) revert AlreadyDelegating(m.delegate);
        if (m.receivedWeight > 0) revert DelegatorIsDelegate(msg.sender);
        if (d.delegate != address(0)) revert DelegateIsDelegating(delegate);

        // Weight the delegate would control: its own effective weight + received + the caller's.
        uint256 controlled = uint256(d.eligible ? d.weight : 0) + d.receivedWeight + m.weight;
        uint256 total = totalWeightHistory.latest();
        if (controlled * DELEGATION_CAP_DIVISOR > total) revert DelegationCapExceeded(controlled, total);

        m.delegate = delegate;
        d.receivedWeight += m.weight;
        delegateHistory[msg.sender].push(Time.timestamp(), uint160(delegate));

        emit DelegationSet(msg.sender, delegate);
    }

    /// @notice Takes the caller's vote back. Issues already created keep resolving against
    /// their snapshot; the change applies to issues created afterwards.
    function revokeDelegation() external {
        if (members[msg.sender].delegate == address(0)) revert NotDelegating(msg.sender);
        _revokeDelegation(msg.sender);
    }

    // ---------------------------------------------------------------------
    // Issues (HU-003)
    // ---------------------------------------------------------------------

    /// @notice Raises an issue with a budget ceiling, reserved from the treasury at once
    /// (ADR-0014). The registry is frozen for this issue at `snapshot` (ADR-0018).
    /// @param descriptionCid IPFS CID of the issue's description, uploaded by the client.
    function createIssue(string calldata descriptionCid, bytes32 topic, uint256 ceiling)
        external
        returns (uint256 issueId)
    {
        _requireEligible(msg.sender);
        if (ceiling == 0) revert ZeroCeiling();
        if (bytes(descriptionCid).length == 0) revert EmptyCid();
        uint256 available = availableBalance();
        if (ceiling > available) revert InsufficientFunds(available, ceiling);
        if (activeIssueOf[msg.sender] != 0) revert ActiveIssueExists(activeIssueOf[msg.sender]);

        uint48 now_ = Time.timestamp();
        issueId = nextIssueId++;
        issues[issueId] = Issue({
            proposer: msg.sender,
            descriptionCid: descriptionCid,
            topic: topic,
            ceiling: ceiling,
            createdAt: now_,
            // One second before: registry changes in the same block as the creation do not count.
            snapshot: now_ - 1,
            status: IssueStatus.Open,
            winningBidId: 0,
            closeReason: CloseReason.None
        });
        reservedBalance += ceiling;
        activeIssueOf[msg.sender] = issueId;

        emit IssueCreated(issueId, msg.sender, ceiling);
    }

    // ---------------------------------------------------------------------
    // Bids (HU-004)
    // ---------------------------------------------------------------------

    /// @notice A registered supplier submits one bid per issue during its bidding window.
    /// @param amount What the supplier asks to be paid, in wei; at most the issue ceiling.
    /// @param documentCid IPFS CID of the proposal, uploaded by the supplier portal.
    function submitBid(uint256 issueId, uint256 amount, string calldata documentCid)
        external
        returns (uint256 bidId)
    {
        if (!isSupplier[msg.sender]) revert NotSupplier(msg.sender);
        Issue storage issue = _issue(issueId);
        if (issue.status != IssueStatus.Open || block.timestamp >= _biddingEnd(issue)) {
            revert NotInBiddingPhase(issueId);
        }
        if (hasBid[issueId][msg.sender]) revert AlreadyBid(issueId, msg.sender);
        if (amount == 0) revert ZeroAmount();
        if (amount > issue.ceiling) revert AmountAboveCeiling(issue.ceiling, amount);
        if (bytes(documentCid).length == 0) revert EmptyCid();

        bidId = nextBidId++;
        bids[bidId] = Bid({issueId: issueId, supplier: msg.sender, amount: amount, documentCid: documentCid});
        bidsByIssue[issueId].push(bidId);
        hasBid[issueId][msg.sender] = true;

        emit BidSubmitted(issueId, bidId, msg.sender, amount);
    }

    // ---------------------------------------------------------------------
    // Voting (HU-007)
    // ---------------------------------------------------------------------

    /// @notice Casts the caller's ballot: a complete ranking of the issue's bids plus REJECT_ALL.
    /// The right to vote comes from the snapshot: the caller must have had weight when the issue
    /// was created, whatever happened to the registry since. Voting directly overrides the
    /// caller's delegation for this issue (resolved at close).
    function castBallot(uint256 issueId, uint256[] calldata ranking) external {
        Issue storage issue = _issue(issueId);
        uint256 votingStart = _biddingEnd(issue);
        if (
            issue.status != IssueStatus.Open || block.timestamp < votingStart
                || block.timestamp >= votingStart + VOTING_PERIOD
        ) revert NotInVotingPhase(issueId);
        if (weightHistory[msg.sender].upperLookup(issue.snapshot) == 0) {
            revert NotEligibleAtSnapshot(issueId, msg.sender);
        }
        Ballot storage ballot = ballots[issueId][msg.sender];
        if (ballot.cast) revert AlreadyVoted(issueId, msg.sender);
        _checkRanking(issueId, ranking);

        ballot.cast = true;
        ballot.ranking = ranking;

        emit BallotCast(issueId, msg.sender);
    }

    // ---------------------------------------------------------------------
    // Close and award (HU-008)
    // ---------------------------------------------------------------------

    /// @notice Closes an issue and decides it in the same transaction (ADR-0016). Anyone can call
    /// it once the voting period has ended, or earlier if all the eligible weight at the snapshot
    /// has been expressed. The outcome depends only on the ballots and the snapshot.
    function closeIssue(uint256 issueId) external {
        Issue storage issue = _issue(issueId);
        if (issue.status != IssueStatus.Open) revert IssueNotOpen(issueId);
        uint256 votingStart = _biddingEnd(issue);
        if (block.timestamp < votingStart) revert VotingNotOver(issueId);

        (address[] memory voters, uint256[] memory weights, uint256 expressed) =
            _resolveWeights(issueId, issue.snapshot);
        uint256 total = totalWeightHistory.upperLookup(issue.snapshot);
        if (block.timestamp < votingStart + VOTING_PERIOD && expressed != total) revert VotingNotOver(issueId);

        (CloseReason reason, uint256 winningBidId) = _outcome(issueId, voters, weights, expressed, total);

        delete activeIssueOf[issue.proposer];
        if (reason == CloseReason.None) {
            // The reservation stays until the transfer (HU-009).
            issue.status = IssueStatus.Awarded;
            issue.winningBidId = winningBidId;
            emit IssueAwarded(issueId, winningBidId);
        } else {
            issue.status = IssueStatus.ClosedWithoutAward;
            issue.closeReason = reason;
            reservedBalance -= issue.ceiling;
            emit IssueClosedWithoutAward(issueId, reason);
        }
    }

    // ---------------------------------------------------------------------
    // Treasury
    // ---------------------------------------------------------------------

    /// @notice Anyone can fund the treasury. Funding mechanisms are out of scope; the demo is
    /// funded from a faucet. The event makes every contribution part of the history.
    receive() external payable {
        emit TreasuryFunded(msg.sender, msg.value);
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    /// @notice Effective weight of `member` at `time` (0 if not registered or not eligible then).
    function weightAt(address member, uint48 time) external view returns (uint208) {
        return weightHistory[member].upperLookup(time);
    }

    /// @notice Sum of effective weights at `time`.
    function totalWeightAt(uint48 time) external view returns (uint208) {
        return totalWeightHistory.upperLookup(time);
    }

    /// @notice The voter's ballot on an issue (`cast == false` and an empty ranking if none).
    function getBallot(uint256 issueId, address voter) external view returns (Ballot memory) {
        return ballots[issueId][voter];
    }

    /// @notice Delegate of `member` at `time` (address(0) if none).
    function delegateAt(address member, uint48 time) external view returns (address) {
        return address(uint160(delegateHistory[member].upperLookup(time)));
    }

    function memberCount() external view returns (uint256) {
        return memberList.length;
    }

    /// @notice Treasury balance not committed to any issue ("saldo libre").
    function availableBalance() public view returns (uint256) {
        return address(this).balance - reservedBalance;
    }

    /// @notice Current phase of an issue. Single source of the phase rule for every client.
    function phaseOf(uint256 issueId) external view returns (IssuePhase) {
        Issue storage issue = _issue(issueId);
        if (issue.status != IssueStatus.Open) return IssuePhase.Closed;

        uint256 biddingEnd = _biddingEnd(issue);
        if (block.timestamp < biddingEnd) return IssuePhase.Bidding;
        if (block.timestamp < biddingEnd + VOTING_PERIOD) return IssuePhase.Voting;
        return IssuePhase.VotingEnded;
    }

    /// @notice Every bid of an issue, in submission order. `ids[i]` is the id of `list[i]`: the
    /// value a ballot uses to rank it. (The auto-getter of `bidsByIssue` returns one id per call.)
    function getBids(uint256 issueId) external view returns (uint256[] memory ids, Bid[] memory list) {
        _issue(issueId);
        ids = bidsByIssue[issueId];
        list = new Bid[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            list[i] = bids[ids[i]];
        }
    }

    // ---------------------------------------------------------------------
    // Internal
    // ---------------------------------------------------------------------

    /// @dev Records `member`'s new effective weight and adjusts the total, both keyed at now.
    function _checkpointWeight(address member, uint208 newEffective) private {
        uint48 now_ = Time.timestamp();
        uint208 oldEffective = weightHistory[member].latest();
        weightHistory[member].push(now_, newEffective);
        totalWeightHistory.push(now_, totalWeightHistory.latest() - oldEffective + newEffective);
    }

    /// @dev Clears `delegator`'s delegation; the caller has checked there is one.
    function _revokeDelegation(address delegator) private {
        Member storage m = members[delegator];
        members[m.delegate].receivedWeight -= m.weight;
        m.delegate = address(0);
        delegateHistory[delegator].push(Time.timestamp(), 0);

        emit DelegationRevoked(delegator);
    }

    /// @dev Members may create issues, vote and delegate only while registered and eligible.
    function _requireEligible(address account) private view {
        Member storage m = members[account];
        if (!m.registered) revert NotRegistered(account);
        if (!m.eligible) revert NotEligible(account);
    }

    /// @dev A ranking is valid if it is a permutation of {REJECT_ALL} ∪ bidsByIssue[issueId]: right
    /// length, every id a candidate of this issue, no repetitions. O(n²) with n ≤ ~6 candidates.
    function _checkRanking(uint256 issueId, uint256[] calldata ranking) private view {
        if (ranking.length != bidsByIssue[issueId].length + 1) revert InvalidRanking(issueId);
        for (uint256 i = 0; i < ranking.length; i++) {
            uint256 id = ranking[i];
            // A bid id that does not exist has issueId 0, which is never a real issue.
            if (id != REJECT_ALL && bids[id].issueId != issueId) revert InvalidRanking(issueId);
            for (uint256 j = 0; j < i; j++) {
                if (ranking[j] == id) revert InvalidRanking(issueId);
            }
        }
    }

    /// @dev Weight of each voter at snapshot `s`: their own, plus that of every delegator who did
    /// not vote, provided the voter (as delegate) was eligible at `s` (spec §4, ADR-0019). A
    /// delegator who voted counts only for themself. Single hop by construction: one pass is
    /// enough. O(members²) in memory, with < 50 members.
    function _resolveWeights(uint256 issueId, uint48 s)
        private
        view
        returns (address[] memory voters, uint256[] memory weights, uint256 expressed)
    {
        address[] memory list = memberList;
        uint256 n = list.length;
        uint256[] memory own = new uint256[](n);
        address[] memory delegateOf = new address[](n);
        bool[] memory cast = new bool[](n);
        uint256 castCount;
        for (uint256 i = 0; i < n; i++) {
            own[i] = weightHistory[list[i]].upperLookup(s);
            cast[i] = ballots[issueId][list[i]].cast;
            if (cast[i]) castCount++;
            else if (own[i] > 0) delegateOf[i] = address(uint160(delegateHistory[list[i]].upperLookup(s)));
        }

        voters = new address[](castCount);
        weights = new uint256[](castCount);
        uint256 k = 0;
        for (uint256 i = 0; i < n; i++) {
            if (!cast[i]) continue;
            uint256 w = own[i];
            // A delegate not eligible at the snapshot receives nothing: the weight stays with
            // the delegator, and is lost if the delegator did not vote.
            if (w > 0) {
                for (uint256 j = 0; j < n; j++) {
                    if (!cast[j] && delegateOf[j] == list[i]) w += own[j];
                }
            }
            voters[k] = list[i];
            weights[k] = w;
            expressed += w;
            k++;
        }
    }

    /// @dev Outcome checks in spec order: no bids, no quorum, no unique winner, REJECT_ALL wins.
    /// `CloseReason.None` means awarded to `winningBidId`.
    function _outcome(
        uint256 issueId,
        address[] memory voters,
        uint256[] memory weights,
        uint256 expressed,
        uint256 total
    ) private view returns (CloseReason reason, uint256 winningBidId) {
        uint256[] storage bidIds = bidsByIssue[issueId];
        if (bidIds.length == 0) return (CloseReason.NoBids, 0);
        // Integer arithmetic, rounding up: with total 7 and 50 %, 4 is needed (ADR-0023).
        if (expressed == 0 || expressed * 100 < uint256(QUORUM_PERCENT) * total) return (CloseReason.NoQuorum, 0);

        // Tally candidates: index 0 is REJECT_ALL, index i is bidIds[i - 1].
        uint256 n = bidIds.length + 1;
        uint256[][] memory rankings = new uint256[][](voters.length);
        for (uint256 v = 0; v < voters.length; v++) {
            uint256[] storage ranking = ballots[issueId][voters[v]].ranking;
            rankings[v] = new uint256[](n);
            for (uint256 i = 0; i < n; i++) {
                rankings[v][i] = _candidateIndex(bidIds, ranking[i]);
            }
        }

        (bool hasWinner, uint256 winner) = SchulzeTally.tally(rankings, weights, n);
        if (!hasWinner) return (CloseReason.NoUniqueWinner, 0);
        if (winner == 0) return (CloseReason.RejectAllWon, 0);
        return (CloseReason.None, bidIds[winner - 1]);
    }

    /// @dev Tally index of a ballot entry. castBallot validated every entry, so a bid is always found.
    function _candidateIndex(uint256[] storage bidIds, uint256 id) private view returns (uint256) {
        if (id == REJECT_ALL) return 0;
        uint256 i = 0;
        while (bidIds[i] != id) i++;
        return i + 1;
    }

    /// @dev First second after the bidding window; voting starts here.
    function _biddingEnd(Issue storage issue) private view returns (uint256) {
        return uint256(issue.createdAt) + BIDDING_PERIOD;
    }

    /// @dev Issues exist from id 1 to nextIssueId - 1; every one has a proposer.
    function _issue(uint256 issueId) private view returns (Issue storage issue) {
        issue = issues[issueId];
        if (issue.proposer == address(0)) revert IssueNotFound(issueId);
    }
}

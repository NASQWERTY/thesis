// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Checkpoints} from "@openzeppelin/contracts/utils/structs/Checkpoints.sol";
import {Time} from "@openzeppelin/contracts/utils/types/Time.sol";

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

    struct Issue {
        address proposer;
        string descriptionCid; // IPFS CID (Pinata); the text itself lives off-chain
        bytes32 topic; // organizational tag only, never used in weight computation
        uint256 ceiling; // wei, reserved from the treasury at creation
        uint48 createdAt;
        uint48 snapshot; // createdAt - 1: registry state the issue is decided with
        IssueStatus status;
        uint256 winningBidId; // 0 unless awarded
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

    // ---------------------------------------------------------------------
    // Events (spec §6)
    // ---------------------------------------------------------------------

    event MemberRegistered(address indexed member, uint32 weight);
    event MemberRemoved(address indexed member);
    event EligibilityChanged(address indexed member, bool eligible);
    event WeightChanged(address indexed member, uint32 oldWeight, uint32 newWeight);
    event SupplierRegistered(address indexed supplier);
    event IssueCreated(uint256 indexed issueId, address indexed proposer, uint256 ceiling);
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

    /// @notice Sum of the ceilings of Open and Awarded issues: treasury funds already committed.
    uint256 public reservedBalance;

    /// @notice Id of the next issue. Starts at 1 so that 0 can mean "no issue".
    uint256 public nextIssueId = 1;

    mapping(uint256 => Issue) public issues;

    /// @notice The proposer's issue in Open status, 0 if none (one open issue per proposer, HU-003).
    mapping(address => uint256) public activeIssueOf;

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
    /// TODO(HU-005): revoke the member's outgoing and incoming delegations (OPEN-4).
    function removeMember(address member) external onlyRegistrar onlyRegistered(member) {
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
            winningBidId: 0
        });
        reservedBalance += ceiling;
        activeIssueOf[msg.sender] = issueId;

        emit IssueCreated(issueId, msg.sender, ceiling);
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

        uint256 biddingEnd = uint256(issue.createdAt) + BIDDING_PERIOD;
        if (block.timestamp < biddingEnd) return IssuePhase.Bidding;
        if (block.timestamp < biddingEnd + VOTING_PERIOD) return IssuePhase.Voting;
        return IssuePhase.VotingEnded;
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

    /// @dev Members may create issues, vote and delegate only while registered and eligible.
    function _requireEligible(address account) private view {
        Member storage m = members[account];
        if (!m.registered) revert NotRegistered(account);
        if (!m.eligible) revert NotEligible(account);
    }

    /// @dev Issues exist from id 1 to nextIssueId - 1; every one has a proposer.
    function _issue(uint256 issueId) private view returns (Issue storage issue) {
        issue = issues[issueId];
        if (issue.proposer == address(0)) revert IssueNotFound(issueId);
    }
}

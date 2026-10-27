# Contract specification — `CommunityGovernance`

Consolidated from the thesis (Entrega 3: Tablas 7–25, Figuras 4–5) and ADR-0013…0021.
This is the source of truth for the Solidity code. Items marked **[OPEN-n]** depend on a
decision listed in `open-decisions.md`; items marked **[GAP]** are things the thesis data
model does not cover and the code needs — they must be reported in `thesis-sync.md`.

One contract, single deployment, one community. Network: Arbitrum Sepolia.

---

## 1. Roles

| Role | Who | Can | Cannot |
|---|---|---|---|
| Registrar | `registrar` address (deployer in the prototype) | register/remove members, set eligibility, set weight, register suppliers | vote, create issues, trigger a payment |
| Eligible member | registered + `eligible == true` | create issue, vote, delegate, revoke delegation | bid |
| Ineligible member (moroso) | registered + `eligible == false` | read history | vote, create issues, delegate |
| Supplier | `isSupplier == true` | submit bids, receive payment, read history | vote, create issues, receive delegations |
| Anyone | any address | `closeIssue`, `executeTransfer`, fund the treasury (`receive`), read | alter any outcome |

Members ∩ suppliers = ∅ (ADR-0021).

---

## 2. Parameters

| Name | Type | Meaning | Value |
|---|---|---|---|
| `BIDDING_PERIOD` | `uint48` immutable | bidding window length, seconds, from `createdAt` | set in constructor |
| `VOTING_PERIOD` | `uint48` immutable | voting window length, seconds, starts when bidding ends | set in constructor |
| `DELEGATION_CAP_DIVISOR` | `uint32` constant | cap = total eligible weight / 3 | `3` |
| `REJECT_ALL` | `uint256` constant | "rechazar todas" candidate id inside a ballot | `0` |
| `quorum` | `uint32` | minimum expressed weight for an issue to be awardable, in weight units | set in constructor, value **[OPEN-1]** |

**Decided 2026-10-27 (OPEN-2):** the periods are `immutable`, set once at deployment —
identical for every issue (ADR-0018 holds) and short on the testnet demo.

```solidity
constructor(uint32 quorum_, uint48 biddingPeriod_, uint48 votingPeriod_)
// registrar = msg.sender; reject zero values
```

---

## 3. State

```solidity
struct Member {
    bool registered;        // in the registry (eligible or not); blocks supplier registration
    bool eligible;          // false = moroso
    uint32 weight;          // current vote weight, default 1, registrar-only
    address delegate;       // current delegate, address(0) = none
    uint32 receivedWeight;  // sum of current weights of current delegators
}

enum IssueStatus { Open, Awarded, Executed, ClosedWithoutAward }

struct Issue {
    address proposer;
    string descriptionCid;  // IPFS CID (Pinata)
    bytes32 topic;          // organizational tag only, never used in weight computation
    uint256 ceiling;        // wei, reserved at creation
    uint48 createdAt;       // block.timestamp
    uint48 snapshot;        // createdAt - 1
    IssueStatus status;
    uint256 winningBidId;   // 0 if closed without award
}

struct Bid { uint256 issueId; address supplier; uint256 amount; string documentCid; }

struct Ballot { bool cast; uint256[] ranking; }
```

| Storage | Type |
|---|---|
| `registrar` | `address` |
| `quorum` | `uint32` |
| `reservedBalance` | `uint256` — sum of ceilings of `Open` + `Awarded` issues |
| `memberList` | `address[]` — registry in order of registration (used to iterate at close) |
| `nextIssueId`, `nextBidId` | `uint256`, both start at **1** (bid 0 = REJECT_ALL) |
| `members` | `mapping(address => Member)` |
| `isSupplier` | `mapping(address => bool)` |
| `issues` | `mapping(uint256 => Issue)` |
| `bids` | `mapping(uint256 => Bid)` |
| `bidsByIssue` | `mapping(uint256 => uint256[])` |
| `hasBid` | `mapping(uint256 => mapping(address => bool))` |
| `ballots` | `mapping(uint256 => mapping(address => Ballot))` |
| `weightHistory` | `mapping(address => Checkpoints.Trace208)` — effective weight: `weight` if registered & eligible, else 0 |
| `delegateHistory` | `mapping(address => Checkpoints.Trace208)` — delegate address as `uint160` |
| `totalWeightHistory` | `Checkpoints.Trace208` — sum of effective weights |
| `activeIssueOf` | `mapping(address => uint256)` — id of the proposer's issue in `Open` status, 0 if none. Enforces one open issue per proposer (HU-003). Set in `createIssue`, cleared in `closeIssue` |
| `listed` | `mapping(address => bool)` — the address was ever pushed to `memberList`. A member removed and registered again is not pushed twice |

Checkpoint keys are `uint48(block.timestamp)` (OpenZeppelin `Checkpoints.Trace208`,
`push(key, value)` / `upperLookup(key)`).

`activeIssueOf` and `listed` were added on 2026-10-23 (not in Entrega 3's Tabla 18; see
`thesis-sync.md`).

**`memberList` is append-only.** Removal must not delete from the array: snapshot-time weight
  resolution has to see members that existed at the snapshot even if removed later. Removed
  members simply have effective weight 0 from the removal time on.

---

## 4. Functions

### Registry (registrar only — `NotRegistrar` otherwise)

| Function | Rules | Event |
|---|---|---|
| `registerMember(address member, uint32 weight)` | reject if already registered, if `isSupplier[member]`, if `weight == 0`, if zero address. Sets registered, eligible = true, weight. HU-001 says "peso de voto en 1": the simulator passes 1 by default. Push to `memberList` if not `listed`. Checkpoint effective weight and total | `MemberRegistered(member, weight)` |
| `removeMember(address member)` | reject if not registered. Effective weight → 0 (checkpoint), total updated; the member's record is cleared (a later `registerMember` starts fresh, without re-pushing to `memberList`). Delegation (decided 2026-10-27, OPEN-4): revoke the member's outgoing delegation and every incoming one (iterate `memberList`), emitting `DelegationRevoked(delegator)` for each — same effects as `revokeDelegation` | `MemberRemoved(member)` (+ `DelegationRevoked` per revoked delegation) |
| `setEligibility(address member, bool eligible)` | reject if not registered or no change. Effective weight checkpoint (0 or weight), total updated | `EligibilityChanged(member, eligible)` |
| `setWeight(address member, uint32 newWeight)` | reject if not registered or `newWeight == 0`. If eligible, checkpoint effective weight and total. If the member is currently delegating, adjust the delegate's `receivedWeight` (may end above cap — accepted edge case, ADR-0019) | `WeightChanged(member, oldWeight, newWeight)` |
| `registerSupplier(address supplier)` | reject if already supplier, if `members[supplier].registered`, if zero address. **The supplier's name is not on-chain**: the simulator stores it next to the address (decided 2026-10-23) | `SupplierRegistered(supplier)` |

### Delegation (HU-005, HU-006)

`delegateTo(address delegate)` — reverts if:
- caller not registered or not eligible;
- `delegate == msg.sender`;
- `delegate` not a registered member;
- caller already has a delegate (must revoke first);
- caller has `receivedWeight > 0` (is a delegate → cannot delegate);
- `delegate` has a delegate itself (is a delegator → cannot receive);
- cap: `(members[delegate].receivedWeight + members[msg.sender].weight) * DELEGATION_CAP_DIVISOR > currentTotalWeight`.

Effects: set `delegate`, add weight to `receivedWeight`, checkpoint `delegateHistory[msg.sender]`.
Event `DelegationSet(delegator, delegate)`.

`revokeDelegation()` — reverts if caller has no delegate. Subtract `receivedWeight`, clear,
checkpoint 0. Event `DelegationRevoked(delegator)`. Closed issues are unaffected (they resolve
against their snapshot); the change applies to issues created afterwards.

### Issues and bids (HU-003, HU-004)

`createIssue(string descriptionCid, bytes32 topic, uint256 ceiling) returns (uint256 issueId)` —
reverts if caller not registered/eligible, if `ceiling == 0`, if
`ceiling > address(this).balance - reservedBalance`, if caller has an `Open` issue, if CID empty.
Effects: `createdAt = now`, `snapshot = now - 1`, status `Open`, `reservedBalance += ceiling`,
`activeIssueOf[caller] = id`. Event `IssueCreated(issueId, proposer, ceiling)`.

`submitBid(uint256 issueId, uint256 amount, string documentCid) returns (uint256 bidId)` —
reverts if caller not a supplier, issue does not exist or is not `Open`,
`now >= createdAt + BIDDING_PERIOD`, `hasBid[issueId][caller]`, `amount == 0`,
`amount > ceiling`, CID empty. Event `BidSubmitted(issueId, bidId, supplier, amount)`.

### Phases (derived, `status == Open`)

```
bidding : createdAt <= now < createdAt + BIDDING_PERIOD
voting  : createdAt + BIDDING_PERIOD <= now < createdAt + BIDDING_PERIOD + VOTING_PERIOD
expired : now >= createdAt + BIDDING_PERIOD + VOTING_PERIOD   (awaiting closeIssue)
```

`phaseOf(issueId) → IssuePhase` exposes this to the clients:

```solidity
enum IssuePhase { Bidding, Voting, VotingEnded, Closed }
// Closed  ⇔ status != Open (status gives the detail)
// VotingEnded ⇔ status == Open and the voting period is over (awaiting closeIssue)
```
Reverts for a non-existent issue.

### Voting (HU-007)

`castBallot(uint256 issueId, uint256[] ranking)` — reverts if:
- issue not `Open` or not in voting phase;
- `weightAt(msg.sender, snapshot) == 0` — the voter must have been registered and eligible at
  the issue's creation (HU-007). Becoming ineligible later does not remove that right for this
  issue; the snapshot rules;
- ballot already cast;
- `ranking` is not a **complete permutation** of `{REJECT_ALL} ∪ bidsByIssue[issueId]`
  (length must be `bids + 1`, every element valid, no duplicates).

Stores the ballot only (no weight). Event `BallotCast(issueId, voter)`.
If the issue has 0 bids the ballot would be `[0]`; voting is allowed but pointless — the issue
closes without award anyway.

### Close + award (HU-008) — permissionless

`closeIssue(uint256 issueId)` — reverts if not `Open`, or if neither condition holds:
(a) voting period ended, or (b) `expressedWeight == totalWeightAt(snapshot)`.
Reverts during bidding phase.

**Weight resolution** (everything at `s = issue.snapshot`):

```
for each v in memberList with ballot cast:
    w[v] = weightAt(v, s)
for each m in memberList with weightAt(m, s) > 0 and ballot NOT cast:
    d = delegateAt(m, s)
    if d != 0 and ballots[issueId][d].cast and weightAt(d, s) > 0:
        w[d] += weightAt(m, s)
expressedWeight = Σ w[v]
```

- A delegate ineligible at the snapshot ⇒ delegation has no effect (weight 0 for d ⇒ skipped).
- A delegator who voted directly ⇒ only their own ballot counts (override).
- Single hop is guaranteed by construction (ADR-0019); no recursion.

**Outcome:**
1. no bids → `ClosedWithoutAward`
2. `expressedWeight < quorum` → `ClosedWithoutAward`
3. tally (§5); no unique winner → `ClosedWithoutAward`
4. winner == `REJECT_ALL` → `ClosedWithoutAward`
5. else `Awarded`, `winningBidId = winner`

`ClosedWithoutAward`: `reservedBalance -= ceiling`, event `IssueClosedWithoutAward(issueId)`.
`Awarded`: reservation kept until execution, event `IssueAwarded(issueId, bidId)`.
In both cases clear `activeIssueOf[proposer]`.

### Execute (HU-009) — permissionless, `nonReentrant`

`executeTransfer(uint256 issueId)` — reverts unless status `Awarded`. Effects first: status
`Executed`, `reservedBalance -= ceiling`; then send `bid.amount` to `bid.supplier`
(`call`, revert on failure). `released = ceiling - amount` simply becomes free balance.
Event `TransferExecuted(issueId, supplier, amount, released)`.

### Treasury and views

`receive() external payable` — anyone funds the treasury (funding mechanisms are out of scope;
the demo is funded from a faucet). Optional event `TreasuryFunded(from, amount)` **[GAP]**.

Views (all in Figura 4, decided 2026-10-27):

| View | Returns | Why |
|---|---|---|
| `weightAt(member, time)` | `uint208` | effective weight at a time (checkpoint) |
| `delegateAt(member, time)` | `address` | delegate at a time (checkpoint) |
| `totalWeightAt(time)` | `uint208` | total eligible weight at a time |
| `getBids(issueId)` | `Bid[]` | the auto-getter of `bidsByIssue` returns one element per index |
| `getBallot(issueId, voter)` | `Ballot` | the auto-getter of `ballots` does not return the `ranking` array |
| `phaseOf(issueId)` | `IssuePhase` | single source of the phase rule for every client |
| `availableBalance()` | `uint256` | `address(this).balance - reservedBalance` ("saldo libre", Fig. 6) |
| `memberCount()` | `uint256` | `memberList.length`, to iterate the registry from clients |

---

## 5. Tally — ranked preference, pairwise majority

Candidates `C = {REJECT_ALL} ∪ bidsByIssue[issueId]` (n = bids + 1).
Ballots are complete rankings, so for each pair (a, b):
`P[a][b] = Σ w[v]` over voters ranking a above b.

**Method: [OPEN-3]** — ADR-0020 deferred the choice to Entregable 4 (needs ADR-0022):
- **Option A — simple Condorcet:** winner = candidate with `P[x][y] > P[y][x]` for every y ≠ x.
  None ⇒ no unique winner.
- **Option B — Schulze:** strongest-path widths `S` via Floyd–Warshall on `P`
  (`d[a][b] = P[a][b]` if `P[a][b] > P[b][a]` else 0); winner = x with `S[x][y] > S[y][x]`
  for every y ≠ x. None ⇒ no unique winner (tie).

Either way: **no unique winner ⇒ close without award** (ADR-0020). Implement the tally as an
internal pure function over `(uint256[][] rankings, uint256[] weights, uint256 n)` so it can
be unit-tested in isolation with crafted ballots (cycle, tie, clear winner, REJECT_ALL wins).

---

## 6. Events (exact names — Tabla 25)

```
MemberRegistered(address indexed member, uint32 weight)
MemberRemoved(address indexed member)
EligibilityChanged(address indexed member, bool eligible)
WeightChanged(address indexed member, uint32 oldWeight, uint32 newWeight)
SupplierRegistered(address indexed supplier)
DelegationSet(address indexed delegator, address indexed delegate)
DelegationRevoked(address indexed delegator)
IssueCreated(uint256 indexed issueId, address indexed proposer, uint256 ceiling)
BidSubmitted(uint256 indexed issueId, uint256 indexed bidId, address indexed supplier, uint256 amount)
BallotCast(uint256 indexed issueId, address indexed voter)
IssueAwarded(uint256 indexed issueId, uint256 indexed bidId)
IssueClosedWithoutAward(uint256 indexed issueId)
TransferExecuted(uint256 indexed issueId, address indexed supplier, uint256 amount, uint256 released)
```

The "historial consultable" (prototype limit) is built from these events by the clients.

---

## 7. Invariants (from the ADRs — keep as named tests)

Registry
- Only the registrar modifies registry, eligibility, weights and supplier registry.
- No address is both member and supplier.
- A registry change after an issue's creation does not alter that issue's snapshot.

Treasury
- `reservedBalance <= address(this).balance` always.
- A ceiling never exceeds the unreserved balance at creation.
- Every reservation ends released: award + execution, no bids, no quorum, REJECT_ALL wins, no unique winner.
- Every transfer goes to a registered supplier; awarded amount ≤ ceiling; no issue awarded or executed twice.

Delegation
- No address is simultaneously delegator and delegate.
- A delegate's accumulated weight does not exceed the cap at delegation time.
- Weight of a delegator whose delegate is not eligible at the snapshot stays with the delegator (and is lost if the delegator doesn't vote).
- If a member voted directly, their weight does not count for their delegate in that issue.
- Σ computed weights in an issue ≤ total eligible weight at its snapshot.

Issue lifecycle
- Bidding and voting periods identical for every issue.
- One bid per supplier per issue; a cast ballot never changes.
- `closeIssue` only if voting ended or expressed == total snapshot weight; never twice; no votes after close; outcome does not depend on caller.
- No award without quorum; a tie/cycle never awards; REJECT_ALL competes as a regular candidate.
- No transfer on an issue that is not `Awarded`.

---

## 8. Inconsistencies with the thesis document

Resolved 2026-10-23 (the author updates the document; see `thesis-sync.md`):
1. HU-008's criterion about a voter who submitted a bid is **dropped** (ADR-0021).
2. HU-002: the supplier's name lives **off-chain** in the simulator; the contract keeps only the address.
3. `activeIssueOf` and `listed` are **added** to the data model.

4. Periods are `immutable` with a constructor; five views and `IssuePhase` added (2026-10-27).
   Figura 4 regenerated: `docs/diagramas/fig04-class-diagram.mmd` (source) and `.png`.

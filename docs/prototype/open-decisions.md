# Open decisions

Claude Code must **not** decide these silently. Ask the author; once decided, record the answer
here (and as an ADR where noted), then update `spec.md`.

| # | Decision | Blocks | Options / recommendation | Status |
|---|---|---|---|---|
| OPEN-1 | **Quorum value** (ADR-0020 left it undefined) | HU-008 | Constructor parameter in weight units. Real case reference: assembly quorum used by the consorcio (see relevamiento). For the demo with 8 members, e.g. 4 | Pending |
| OPEN-2 | Bidding/voting periods | HU-003, HU-004, HU-007 | — | **Decided 2026-10-27: `immutable`, set in the constructor** together with `quorum`. Tests use `time.increase`; testnet demo uses short values |
| OPEN-3 | **Tally method: simple Condorcet vs Schulze** (ADR-0020 deferred it to Entregable 4) | HU-008 | Condorcet: simpler, more cycles → more "no award". Schulze: what LiquidFeedback uses (Behrens et al., 2014), resolves cycles, ~40 more lines, O(n³) with n ≤ ~6 is trivial. Needs **ADR-0022** | Pending |
| OPEN-4 | **Removing a member who is in a delegation** | HU-001 | (a) auto-revoke the member's outgoing delegation and leave incoming ones (they resolve to nothing at later snapshots, but block those delegators from being delegated to until they revoke); (b) reject removal while the member has delegation in/out. Recommendation: (a) + emit `DelegationRevoked` | **Decided 2026-10-27: revoke all** — the removed member's outgoing delegation **and** every incoming one (iterating `memberList`, < 50 members), one `DelegationRevoked` per revoked delegator. Nobody is left delegating to a removed account; existing issues are unaffected (snapshot) |
| OPEN-5 | Supplier name | HU-002 | — | **Decided 2026-10-23: off-chain**, stored by the simulator next to the address; contract and `SupplierRegistered` keep only the address |
| OPEN-6 | **What "70%" means for the tutor** | sprint plan | Ask the tutor: functionality, HUs, story points? Proposed cut in `backlog.md` | Pending (author asks) |
| OPEN-7 | **Member app delivery form and wallet** | HU-003/005/007 clients | RN wallet connection is the riskiest piece. Options: (a) Expo + WalletConnect/Reown AppKit with MetaMask Mobile; (b) Expo app with an in-app testnet key imported from a QR/seed for demo accounts (simplest, honest for testnet, declared as prototype limitation); (c) Expo with `react-native-web` so the same app runs in a browser with MetaMask. Recommendation: (b), possibly + (c) for the demo video | Pending |
| OPEN-9 | Query views for clients | clients | — | **Decided 2026-10-27:** `getBids`, `getBallot`, `phaseOf` (+ enum `IssuePhase`), `availableBalance`, `memberCount` |
| OPEN-8 | Legacy folders `circuits/`, `simulation/`, `tfg-dao/`, `tfg-dao.tar.gz` | repo hygiene | Remove (old scope) | Pending |

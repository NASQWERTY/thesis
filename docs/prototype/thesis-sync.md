# Thesis ↔ code sync

Things in the code that make the thesis document (Google Doc) inaccurate. Claude Code appends
here; the author updates the document and ticks the item.

- [ ] **Tabla 15 (HU-008):** remove the last criterion ("si un votante presentó una oferta…"). Decided 2026-10-23 (ADR-0021).
- [ ] **Tabla 9 (HU-002):** first criterion — the name is kept by the simulator, only the address goes to the contract. Decided 2026-10-23.
- [ ] **Tablas 8 y 9 (HU-001 / HU-002):** add the cross-registration rejection criterion (ADR-0021).
- [ ] **Tabla 18:** add rows `activeIssueOf` and `listed`. Decided 2026-10-23.
- [ ] **Figura 4 (class diagram):** replace with `docs/diagramas/fig04-class-diagram.png` (regenerated 2026-10-27: `activeIssueOf`, `listed`, immutables, constructor, five views, `IssuePhase`).
- [ ] **HU-001 / HU-005 (OPEN-4, decided 2026-10-27):** removing a member revokes their outgoing delegation and every delegation they received (`DelegationRevoked` per delegator). Worth a criterion in Tabla 8 or a note where delegation is described.
- [ ] **Tabla 9 (HU-002) / ADR-0021 (decided 2026-10-27):** the cross-registration check also rejects an address that **was** a member and was removed (not only current members, eligible or not). Reason: a removed member can still vote on issues created before the removal.
- [ ] **Member app wallet (OPEN-7, decided 2026-10-27):** the app holds an imported testnet key and signs locally (no external wallet). Declare it as a prototype limitation; check the architecture figure (Fig. 10–11) and any text that mentions MetaMask/WalletConnect for the member app.
- [ ] **Tabla 18:** `BIDDING_PERIOD` / `VOTING_PERIOD` type `uint48 (constante)` → `uint48 (inmutable)`; description: fixed at deployment.
- [ ] **New table after Tabla 23:** enumeration `IssuePhase` (Bidding, Voting, VotingEnded, Closed).
- [ ] **Diccionario de datos del simulador** (if the thesis describes off-chain data): supplier name.
- [ ] Tabla 17: add sprints 2–5 and mark Sprint 1 tasks done.
- [ ] ADR-0022 (tally method) reasoning where the thesis describes the escrutinio.

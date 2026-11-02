# Thesis ↔ code sync

Things in the code that make the thesis document (Google Doc) inaccurate. Claude Code appends
here; the author updates the document and ticks the item.

- [ ] **Tabla 15 (HU-008):** remove the last criterion ("si un votante presentó una oferta…"). Decided 2026-10-23 (ADR-0021).
- [ ] **Tabla 9 (HU-002):** first criterion — the name is kept by the simulator, only the address goes to the contract. Decided 2026-10-23.
- [ ] **Tablas 8 y 9 (HU-001 / HU-002):** add the cross-registration rejection criterion (ADR-0021).
- [ ] **Tabla 18:** add rows `activeIssueOf` and `listed`. Decided 2026-10-23.
- [ ] **Figura 4 (class diagram):** replace with `docs/diagramas/fig04-class-diagram.png` (regenerated 2026-10-27: `activeIssueOf`, `listed`, immutables, constructor, five views, `IssuePhase`). ⚠ Since 2026-11-02 the `.mmd` source also has `QUORUM_PERCENT : uint8 «immutable»` and the new constructor, but the `.png`/`.svg` were **not** regenerated (mermaid-cli could not be downloaded) — regenerate before inserting.
- [ ] **HU-001 / HU-005 (OPEN-4, decided 2026-10-27):** removing a member revokes their outgoing delegation and every delegation they received (`DelegationRevoked` per delegator). Worth a criterion in Tabla 8 or a note where delegation is described.
- [ ] **Tabla 9 (HU-002) / ADR-0021 (decided 2026-10-27):** the cross-registration check also rejects an address that **was** a member and was removed (not only current members, eligible or not). Reason: a removed member can still vote on issues created before the removal.
- [ ] **Member app wallet (OPEN-7, decided 2026-10-27):** the app holds an imported testnet key and signs locally (no external wallet). Declare it as a prototype limitation; check the architecture figure (Fig. 10–11) and any text that mentions MetaMask/WalletConnect for the member app.
- [ ] **Tabla 25 (eventos), decided 2026-11-02:** add `TreasuryFunded(address indexed from, uint256 amount)`, emitted by `receive()` on every contribution to the treasury. Reason: the consultable history must show where the treasury funds came from. Also in Figura 4's event list (`.mmd` updated).
- [ ] **`getBids` (decided 2026-11-02):** returns `(uint256[] ids, Bid[] list)` instead of `Bid[]` — the `Bid` struct has no id field and a ballot ranks bids by id. Update Figura 4 (`.mmd` updated) and wherever the views are listed.
- [ ] **Tabla 18:** `BIDDING_PERIOD` / `VOTING_PERIOD` type `uint48 (constante)` → `uint48 (inmutable)`; description: fixed at deployment.
- [ ] **New table after Tabla 23:** enumeration `IssuePhase` (Bidding, Voting, VotingEnded, Closed).
- [ ] **Diccionario de datos del simulador** (if the thesis describes off-chain data): supplier name.
- [ ] Tabla 17: add sprints 2–5 and mark Sprint 1 tasks done.
- [ ] **Escrutinio (OPEN-3, decided 2026-11-02, ADR-0022): Schulze.** Wherever the thesis describes the escrutinio or says the method is deferred to Entregable 4, state that it is Schulze; ADR-0022 has a worked example (cycle resolved). If ADR-0020's "método diferido" is quoted, update it. Verify the Schulze (2011) reference before citing it.
- [ ] **Quórum (OPEN-1, decided 2026-11-02, ADR-0023): percentage, 50 %.**
  - Tabla 18: row `quorum` `uint32` (absolute weight) → `QUORUM_PERCENT` `uint8 (inmutable)`, "porcentaje (1–100) del peso total habilitado en el snapshot de la cuestión; 50 en el prototipo".
  - Constructor (Fig. 4 and wherever it is described): `constructor(quorumPercent: uint8, biddingPeriod: uint48, votingPeriod: uint48)`.
  - Tabla 15 (HU-008): the criterion "si no hubo quórum" can stay as is; optionally make it explicit: "si el peso expresado no alcanza el 50 % del peso habilitado en el snapshot".
  - If the thesis says the quorum value is pending (ADR-0020 "Pendiente"), it is now defined.

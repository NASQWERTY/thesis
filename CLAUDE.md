# CLAUDE.md

Instructions for Claude (Claude Code in VS Code) working in this repository.

> **Rewritten 2026-10-23.** The previous version described an earlier scope (ZK / Semaphore,
> per-topic delegation, proof of personhood, Foundry). All of that was superseded by
> ADR-0012 → ADR-0021. If anything in `docs/roadmap.md`, `docs/tesis/00-estructura.md` or
> ADRs 0001–0010 contradicts this file or `docs/prototype/`, **this file and
> `docs/prototype/` win.**

---

## 1. What this project is

Trabajo Final de Grado (TFG), **Ingeniería en Software**, Universidad Siglo 21 (Córdoba, Argentina).
Modality: **Prototipado Tecnológico**. Methodology: **Scrum**.

A blockchain-based community governance system for organizations that manage shared funds.
Reference case: **Complejo Jardines del Sur** (consorcio, 3 buildings × 12 units, administered
by Jorep SA).

**Prototype objective (fixed, from the thesis):**
> Desarrollar una plataforma de votación con delegación de voto y pago automático en red de
> prueba que permita, a un grupo predefinido de miembros, plantear cuestiones, obtener ofertas
> y votar.

**Limits:** from the simulated enrollment of eligible members up to the executed transfer to
the awarded supplier, with consultable history.

Two deliverables: the TFG document (Spanish, APA 7, written by the author in Google Docs) and
**the prototype (this repo)**.

### Deadline

**Entregable 4 is due 2026-11-09.** It requires a public cloud link (Google Drive) with the
prototype ready to run, its source code, and setup instructions (*instructivo de puesta en
marcha*). The prototype must be at least ~70% done by then. **Velocity matters now** — see §8.

---

## 2. Where the specification lives — read these before coding

| File | What it is |
|---|---|
| `docs/prototype/spec.md` | **Contract specification**: roles, state, functions, rules, close/tally algorithm, events, invariants. Source of truth for the Solidity code |
| `docs/prototype/backlog.md` | User stories HU-001…HU-009 with acceptance criteria (Spanish, as in the thesis) + sprint plan to 2026-11-09 |
| `docs/prototype/architecture.md` | Components, stack, target repo layout, env vars |
| `docs/prototype/open-decisions.md` | **Decisions not yet taken.** Do not silently decide these — ask the author |
| `docs/prototype/figures/` | Figures from the thesis: class diagram, sequence diagram, UI mockups, architecture |
| `docs/adr/` | Architecture Decision Records (Spanish). ADR-0013…0021 are the current design |
| `docs/glosario.md` | ES ↔ EN terminology and the identifier data dictionary |

The acceptance criteria in `backlog.md` are the contract of done. Each criterion should map to
at least one test.

---

## 3. Writing policy — the thesis document

**The author writes the thesis. Claude does not write thesis prose.** This holds even under
deadline pressure.

Claude MAY: discuss ideas, propose structure, critique the author's drafts, verify and format
references (APA 7), check terminology, copy-edit text the author already wrote (preserving
their voice), and translate text **the author wrote** (e.g. Resumen → Abstract) when asked.

Claude MUST NOT: write paragraphs, sections, resumen/abstract or "example text to adapt"
for the document, or rewrite the author's prose into better prose.

**Code, tests, config, scripts, README/instructivo of the prototype and diagrams are NOT
covered by this policy** — normal collaboration applies, and Claude writes them.

Exception worth flagging: when a code change makes the thesis document inaccurate (data
dictionary, sequence diagram, HU criteria, sprint backlog), **say so explicitly** so the author
can update the document. Keep a running list in `docs/prototype/thesis-sync.md`.

---

## 4. Language

- **All code identifiers, comments, commit messages, technical docs:** English.
- **User-facing UI strings** (mobile app, supplier portal, simulator output): **Spanish (es-AR)**.
- **ADRs and HU acceptance criteria:** Spanish.
- Use the mapping in `docs/glosario.md`. The domain entity is **cuestión → `Issue`**
  (never "licitación"/"tender"/"proposal" in code), oferta → `Bid`, boleta → `Ballot`,
  padrón → member registry, registrador → `registrar`, proveedor → `supplier`.

---

## 5. Locked design decisions (current)

Do not re-litigate. If something genuinely breaks, say so and propose a new ADR.

| ADR | Decision |
|---|---|
| 0002 | No transferable token. Membership is a non-transferable on-chain record |
| 0004 | **Arbitrum Sepolia testnet only.** No mainnet, no asset of economic value |
| 0013 | Minimal core: registry, 1-person-1-vote by default, issue with bidding, global revocable delegation with override, quorum, supplier whitelist, testnet transfer, on-chain traceability |
| 0014 | Simplified bidding: creating an issue fixes its ceiling and reserves funds at once. No endorsement threshold |
| 0015 | Members are ETH addresses loaded by a single `registrar` (deployer account) via an off-chain enrollment simulator. Weight 1 by default, modifiable by the registrar. No identity verification. Moroso = ineligible |
| 0016 | `closeIssue` is permissionless; allowed when voting period ended **or** expressed weight == total eligible weight at snapshot. Close and award happen in the same tx. Transfer is a separate permissionless tx |
| 0017 | Supplier registry preloaded by the registrar. **Only registration** (no removal/disable) |
| 0018 | Bidding and voting periods are identical for every issue (contract params, not chosen by proposer). Registry snapshot taken at issue creation. Attachments on IPFS via Pinata; only the CID goes on-chain |
| 0019 | **Single-hop delegation**: an address cannot be delegator and delegate at the same time. Cap: a delegate cannot accumulate more than 1/3 of total eligible weight (checked when delegating). Ballot is immutable; weight is resolved at close. A member who votes directly overrides their delegation for that issue. One bid per supplier per issue |
| 0020 | Ranked-preference tally; majority applies per pairwise comparison; quorum is the only global threshold. **No unique winner (cycle or tie) ⇒ close without award, release reservation** |
| 0021 | Members and suppliers are **disjoint sets** (checked at registration, against membership, not eligibility). No member-bidder weight suspension |

Out of scope (do not build): ZK / Semaphore / MACI, gasless relayer, endorsement threshold,
per-topic delegation, transitive delegation, real CiDi identity, multisig registrar (that is
the *project*, not the prototype), backup module, notifications, mainnet.

---

## 6. Stack

- **Smart contract:** Solidity + **Hardhat** (the thesis architecture figure says Hardhat — not
  Foundry). OpenZeppelin Contracts (`Checkpoints.Trace208`, `ReentrancyGuard`). Tests in
  TypeScript with Hardhat Toolbox (ethers v6, chai, `time` helpers).
- **Enrollment simulator** (registrar): Node.js + ethers.js CLI.
- **Supplier portal:** React (Vite) + ethers.js + browser wallet (MetaMask); small Node.js
  endpoint to upload to Pinata (keeps the JWT server-side).
- **Member app:** React Native + ethers.js (see `open-decisions.md` — Expo / wallet strategy).
- **Storage:** IPFS via Pinata.
- **Network:** Arbitrum Sepolia (chainId 421614).

See `docs/prototype/architecture.md` for the target layout.

---

## 7. Engineering conventions

- Every state-changing contract function has unit tests covering each acceptance criterion
  (happy path + each rejection). Use custom errors, and assert them with
  `revertedWithCustomError`.
- Emit exactly the events listed in `spec.md` §6, with those parameter names.
- Checks-effects-interactions + `nonReentrant` on functions that send ETH.
- Keep the invariants of `spec.md` §7 as named tests (`describe("invariants")`).
- Gas is not a priority (< 50 members, ≤ ~5 bids per issue); clarity is.
- Never commit `.env`, private keys or the Pinata JWT. Use throwaway testnet keys only.
- Small commits, one HU (or one sub-task) per commit, conventional-commit style
  (`feat(contract): HU-003 createIssue with reservation`).
- Tag `entrega-4` on the commit that is delivered.

---

## 8. Working protocol (deadline mode, from 2026-10-23)

The author drives, but at **HU granularity**, not line by line:

1. Before starting an HU, state in a few lines what you will build and which open decisions
   (if any) it touches. Wait for an OK.
2. Then implement the whole HU — code **and** tests — and run the tests.
3. Report: what was done, test results, anything that diverges from the thesis document
   (add it to `docs/prototype/thesis-sync.md`). Propose the next HU and stop.

Never silently decide anything listed in `docs/prototype/open-decisions.md`. Flag scope creep
in one sentence; do not build it.

---

## 9. Citation discipline (for anything going into the thesis)

Never invent a reference. If a source can't be verified, say so. Prefer primary sources
(official docs: OpenZeppelin, Hardhat, Arbitrum, Pinata, Ethereum).

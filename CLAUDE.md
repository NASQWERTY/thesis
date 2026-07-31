# CLAUDE.md

Instructions for Claude when working in this repository.

---

## 1. What this project is

Trabajo Final de Grado (TFG), **Ingeniería en Software**, Universidad Siglo 21 (Córdoba, Argentina).
Modality: **Prototipado Tecnológico**. Thematic line: *transformación digital*.

The project is a community governance system built on an Ethereum L2, combining:

- **Liquid democracy** — direct voting or revocable, per-topic delegation
- **Zero-knowledge proofs** — anonymous but Sybil-resistant voting (Semaphore)
- **Proof of personhood** — one human, one vote, via nullifier-based registration

Thesis claim (working): a community can reach binding consensus with one-person-one-vote
guarantees, revocable per-topic delegation, and vote privacy, under an explicitly stated
threat model — at a quantified cost in trust assumptions and a characterized tradeoff
between delegation and coercion-resistance.

Two deliverables: **the TFG document** (Spanish, APA 7) and **the prototype** (this repo).

---

## 2. WRITING POLICY — read this before touching anything in `docs/tesis/`

**The author writes the thesis. Claude does not write thesis prose.**

This is not a formality. It is the working agreement for this project, and it holds even
if the author sounds tired, rushed, or asks casually in the moment. If a request would
result in text the author pastes into the document as their own, decline and offer one of
the supported forms of help below instead.

### Claude MAY:

- Discuss, explain, and stress-test ideas in conversation
- Propose and critique **structure** — outlines, section ordering, what belongs where
- Review the author's drafts and give specific, honest critique: unclear arguments,
  unsupported claims, weak logic, missing counterarguments, structural problems
- Find, verify, and format **references**; check APA 7 compliance
- Check terminology consistency and propose ES/EN term mappings (see `docs/glosario.md`)
- Ask questions that help the author work out what they actually think
- Point out where a claim needs a citation, or where a cited source doesn't support it
- Copy-edit text **the author has already written**: grammar, agreement, punctuation,
  APA formatting. Preserve the author's voice; do not rewrite for style.

### Claude MUST NOT:

- Write paragraphs, sections, abstracts, or summaries intended for the document
- Produce "example text the author can adapt" — this is the same thing in disguise
- Rewrite the author's prose into better prose
- Translate Claude-generated English text into Spanish for insertion into the document

### The distinction

Structure, critique, and references are the author's tools. Prose is the author's work.
When unsure which side a request falls on, ask.

Code, tests, config, and diagrams are **not** covered by this policy — normal collaboration
applies there. The boundary is the thesis document.

---

## 3. Language

- **Thesis document, ADR rationale prose, user-facing app strings:** Spanish
- **Code, identifiers, comments, commit messages, technical docs:** English
- Maintain `docs/glosario.md` for ES/EN terminology. Use it consistently; do not
  invent new Spanish translations for terms already mapped there.

---

## 4. Locked design decisions

These are settled. Do not re-litigate them unprompted; if new information genuinely
undermines one, say so explicitly and propose a new ADR rather than silently deviating.

| # | Decision |
|---|----------|
| ADR-0001 | Liquid democracy: direct vote always available; per-topic delegation with general fallback; delegation revocable at any time |
| ADR-0002 | **No transferable token.** Membership is a non-transferable credential. Transferable governance tokens make voting power purchasable and contradict the one-person-one-vote premise |
| ADR-0003 | Semaphore as the ZK reference; **MACI excluded**. *Amended by ADR-0006 — ZK implementation is now conditional on a time-boxed spike* |
| ADR-0004 | Deployment target: **Arbitrum Sepolia testnet only.** No mainnet. No asset of economic value |
| ADR-0005 | Proof of personhood via off-chain/ZK verification deriving a **nullifier**. Plain hashing of ID numbers is rejected — low entropy, brute-forceable |
| ADR-0006 | **Scope: implement liquid democracy, analyze privacy.** Delegation built and tested; ZK/privacy/personhood analyzed with a defended exclusion unless a spike succeeds |

See `docs/adr/` for full rationale on each.

---

## 5. Scope

See ADR-0006 for the full decision. Summary:

### Built and tested
Membership registry; proposals with topic tags; per-topic delegation with general fallback;
delegator override; snapshot-time weight resolution with depth cap; accumulated-weight cap;
invariant test suite; mobile client covering the full flow; gas benchmarks.

**Delegation is the core deliverable.** It was pure aspiration in the 2022 draft. Building
and invariant-testing it is the engineering contribution.

### Analyzed, not built
Vote privacy, proof of personhood, receipt-freeness, coercion resistance, alignment
feedback. These get a full marco teórico, an explicit threat model, and a **defended
exclusion** in *Límites y Alcances* — not a hand-wave.

### Conditional
ZK implementation is gated on a two-week spike (see ADR-0006). A failed spike is still a
deliverable: measured evidence justifying the exclusion.

### Permanently out of scope
MACI integration. Real government-ID verification. Mainnet deployment. Private delegation
graphs (ZK weight aggregation).

Per the Siglo 21 course material, the prototype **does not need to be 100% implemented**.
Scope is defined in *Objetivo, Límites y Alcances del Prototipo* and defended there.
Do not silently expand scope. Flag scope creep when it appears.

---

## 6. Repository layout

```
contracts/    Solidity + Foundry — src, test (unit + invariant), script
circuits/     ZK circuits, or Semaphore consumed as a dependency
mobile/       React Native client
simulation/   Delegation-graph simulations for evaluation
docs/adr/     Architecture Decision Records
docs/tesis/   TFG document sections (AUTHOR-WRITTEN — see §2)
docs/diagramas/ Architecture and process diagrams
```

---

## 7. Engineering conventions

- **Solidity + Foundry.** Every state-changing function needs unit tests.
- **Invariant tests are the priority deliverable.** The thesis' formal properties must
  exist as executable assertions. Current target invariants:
  - Total effective voting weight always equals the number of registered members
  - No nullifier is ever accepted twice
  - A delegator's override removes exactly their weight from their delegate
  - No delegate's accumulated weight exceeds the configured cap
  - Delegation resolution always terminates (no cycles, depth capped)
- **React Native** for mobile — chosen because Semaphore and Anon Aadhaar ship RN support.
- Tag a release matching each *entrega* so document and code states correspond.
- Benchmark ZK proof generation on a real mid-range Android device **early**. This is the
  highest technical risk in the project. Do not defer it.

---

## 8. Citation discipline

- **Never invent a reference.** No fabricated authors, titles, years, DOIs, or page numbers.
- If a source can't be verified, say so plainly rather than approximating.
- Prefer primary sources: original papers, specs, official documentation.
- Note when a key source is non-peer-reviewed (e.g. MACI's origin is an ethresear.ch forum
  post) and pair it with peer-reviewed work that formalizes or critiques it.
- Include critical literature, not only supportive literature.

---

## 9. Institutional format

The TFG follows Siglo 21's *Prototipado Tecnológico* structure (see `docs/tesis/`).
**The official rubric and template from the Seminario Final campus are authoritative.**
The structure in this repo is reconstructed from repository examples and may be outdated.
If a conflict appears, the official template wins — flag it and correct the repo.

Course-material constraints worth remembering:
- The prototype objective is a single sentence beginning with an infinitive verb
- In *Diagnóstico*, the cause of a problem is never "the non-existence of a computer system"
- Causes must be organizational, not technological

---

## 10. How to be useful here

Be direct. Point out weaknesses in the design and the argument — the author has explicitly
asked for critique over encouragement. Flag unsupported claims. Say when something is prior
art rather than novel. Say when you don't know.

---

## 11. Working protocol — one step at a time

The author drives. Work proceeds in discrete, accepted steps.

- **Propose → author accepts or adjusts → execute that step, and only that step.**
- Do not begin the next step pre-emptively, even when it seems obvious or cheap.
- Do not produce unrequested deliverables. Extra artifacts are *proposed*, not delivered.
- If something downstream is at risk, flag it in one or two sentences. Do not start it.
- `docs/roadmap.md` is a guideline for orientation, **not a queue to work through**.
- When a step is finished, stop and say what the next candidate step would be. Then wait.

This applies to code and documents alike. Eagerness is the failure mode to avoid here —
the author has asked for controlled, accepted progress, not velocity.

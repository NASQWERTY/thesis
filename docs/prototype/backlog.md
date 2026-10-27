# Product Backlog, user stories and sprint plan

Source: thesis Entrega 3, Tablas 7–17. Acceptance criteria copied in Spanish, with the
corrections required by ADR-0021 marked ⚠. Each criterion → at least one test.

## Product Backlog (Tabla 7)

| ID | Historia de usuario | Prioridad | Puntos | Depende de |
|---|---|---|---|---|
| HU-001 | Registro de usuarios habilitados en el padrón | Alta | 13 | — |
| HU-002 | Registro de proveedores | Alta | 3 | HU-001 |
| HU-003 | Creación de cuestión | Alta | 13 | HU-001 |
| HU-004 | Presentación de oferta a una cuestión | Alta | 13 | HU-002, HU-003 |
| HU-005 | Delegación de voto | Alta | 5 | HU-007 * |
| HU-006 | Revocación de delegación | Media | 3 | HU-005 |
| HU-007 | Votación de una cuestión | Alta | 8 | HU-004 |
| HU-008 | Cierre y adjudicación de la votación | Alta | 13 | HU-007 |
| HU-009 | Ejecución de la transferencia al proveedor | Alta | 5 | HU-008 |

\* In code, delegation (HU-005/006) only depends on the registry (HU-001); it can be built
before voting. The *weight resolution* that uses it lives in HU-008.

Total: 76 points.

---

## Acceptance criteria

### HU-001 — Registro de usuarios habilitados en el padrón
*Como registrador quiero administrar el padrón de la comunidad para que los miembros puedan
interactuar con el sistema y que haya registro de los cambios.*
- Dado que un miembro no existe en el sistema, cuando se da de alta su cuenta entonces una nueva cuenta es creada con peso de voto en 1.
- Dado que un miembro ya existe en el sistema, cuando se da de alta su cuenta, entonces la operación se rechaza.
- Dado que un miembro ya existe en el sistema, cuando se da de baja, entonces su cuenta queda eliminada.
- Dado que un miembro ya existe y su cuenta está habilitada, cuando se deshabilita, entonces no puede votar ni plantear cuestiones.
- Dado que un miembro ya existe y su cuenta está deshabilitada, cuando se habilita, entonces puede operar con normalidad.
- Dado que un miembro ya existe, cuando se modifica su peso de votación, entonces las votaciones actuales no se ven afectadas (snapshot) y las futuras tendrán el cambio.
- Dada una dirección que no es la del registrador, cuando intenta modificar el padrón, entonces la operación se rechaza.
- Cuando se ejecuta cualquier acción sobre el padrón entonces se emite un evento.
- ⚠ (ADR-0021) Dada una dirección registrada como proveedor, cuando se la da de alta como miembro, entonces la operación se rechaza.

### HU-002 — Registro de proveedores
*Como registrador quiero dar de alta los proveedores para que exista un registro único de proveedores del sistema.*
- Dado que un proveedor no existe, cuando se da de alta su dirección y nombre entonces la dirección queda registrada en el contrato y el nombre en el simulador. (Decidido 2026-10-23: el nombre no va a la cadena.)
- Dado que un proveedor ya existe con una dirección, cuando se da de alta con la misma dirección, entonces se rechaza.
- Dado que un proveedor ya existe, cuando se trata de modificar los datos, entonces se rechaza.
- Dada una dirección distinta a la del registrador, cuando intenta dar de alta un proveedor, entonces se rechaza.
- Cuando se ejecuta una nueva alta entonces se emite un evento.
- ⚠ (ADR-0021) Dada una dirección registrada en el padrón (habilitada o no), cuando se la da de alta como proveedor, entonces se rechaza.

### HU-003 — Creación de cuestión
*Como miembro habilitado quiero plantear una cuestión con un techo presupuestario para que la comunidad defina las expectativas.*
- Dada una dirección de un miembro no registrado, cuando ingresa al sistema, entonces la operación es rechazada.
- Dado un miembro, cuando plantea una nueva cuestión con un techo definido, entonces el techo se reserva de la tesorería, se crea la cuestión y se emite un evento.
- Cuando una cuestión es creada, se toma un snapshot del padrón.
- Cuando una cuestión es creada, sus datos se almacenan en IPFS y se registra el hash.
- Dado un miembro, cuando plantea una cuestión con un techo mayor al monto no reservado, entonces se rechaza.
- Dado un miembro que ya tiene una cuestión abierta, cuando plantea una nueva, entonces se rechaza.
- Dado un miembro no habilitado, cuando plantea una cuestión, entonces se rechaza.

### HU-004 — Presentación de oferta a una cuestión
*Como proveedor registrado quiero presentar ofertas a las cuestiones abiertas para poder brindar mis servicios a la comunidad.*
- Dada una dirección de un proveedor no registrado, cuando ingresa al sistema, entonces se rechaza.
- Dado un proveedor, cuando ingresa al sistema web, entonces ve la lista de cuestiones abiertas.
- Dado un proveedor, cuando presenta una oferta a una cuestión, entonces se registra y se emite un evento.
- Cuando una oferta es creada, sus datos se almacenan en IPFS y se registra el hash.
- Oferta por un monto superior al techo → se rechaza.
- Oferta fuera del plazo de validez (ventana de ofertas) → se rechaza.
- Segunda oferta del mismo proveedor a la misma cuestión → se rechaza.

### HU-005 — Delegación de voto
*Como miembro habilitado quiero seleccionar otro miembro para delegar mi poder de voto.*
- Si el peso acumulado no supera un tercio del total y el delegado no delegó su voto → queda registrada.
- Si el peso acumulado supera un tercio del total → se rechaza.
- Si el elegido ya tiene un delegado configurado → se rechaza.
- Si quien delega ya fue seleccionado como delegado → se rechaza.
- Miembro no habilitado → se rechaza.
- Delegarse a sí mismo → se rechaza.
- Delegar en un miembro no registrado → se rechaza.

### HU-006 — Revocación de delegación
*Como miembro con voto delegado quiero revocar mi delegación para recuperar el control del voto.*
- Al revocar, se registra y se emite un evento.
- El nuevo peso se computa para la próxima cuestión que se plantee.
- No se modifican los pesos en cuestiones ya cerradas.
- Si no estaba delegando → se rechaza.
- Tras revocar, puede volver a delegar.

### HU-007 — Votación de una cuestión
*Como miembro habilitado al momento de la creación de la cuestión, quiero votar sobre las ofertas recibidas para dejar constancia de mi lista de preferencias.*
- Voto con lista de preferencias de las ofertas más "rechazar todas" → se guarda y se emite un evento.
- Miembro no habilitado al momento de la creación → se rechaza.
- Segundo voto en la misma cuestión → se rechaza.
- Voto fuera del período de votación → se rechaza.
- Voto sobre una cuestión cerrada → se rechaza.
- Boleta incompleta (no ordena todas las opciones) → se rechaza.

### HU-008 — Cierre y adjudicación de la votación
*Como miembro del sistema quiero dar cierre a una cuestión abierta para continuar con la decisión tomada.*
- Si cumplió el plazo o el peso expresado es igual al peso total habilitado en el snapshot → se cierra y se emite un evento.
- Si no se cumplió el plazo (ni la participación total) → se rechaza.
- Si ya está cerrada → se rechaza.
- Peso de cada votante = propio + delegantes, restando los delegantes que votaron por su cuenta.
- Si ganó una oferta → se adjudica al proveedor.
- Si el escrutinio no produce un ganador único → sin efecto, se libera la reserva.
- Si no hubo quórum → sin efecto, se libera la reserva.
- Si ganó "rechazar todas" → sin efecto, se libera la reserva.
- Si no hubo ofertas → sin efecto, se libera la reserva.
- Si el delegado no figura habilitado en el snapshot → el peso queda con el delegante y la delegación no tiene efecto.
- ~~Si un votante presentó una oferta, se computa únicamente su peso propio~~ — **eliminado** (ADR-0021, decidido 2026-10-23). No implementar.

### HU-009 — Ejecución de la transferencia al proveedor
*Como miembro del sistema quiero ejecutar la adjudicación de una cuestión cerrada y adjudicada para pagarle al proveedor.*
- Cuestión cerrada y adjudicada → se envía el monto de la oferta al proveedor y se emite un evento.
- Se libera el resto entre el techo y la oferta.
- Cuestión abierta → se rechaza.
- Cuestión no adjudicada → se rechaza.
- Transferencia ya ejecutada → se rechaza.

---

## Sprint plan to Entregable 4 (2026-11-09)

Sprint 1 (thesis Tabla 17) covered repo setup. Proposed continuation — **dates are a proposal,
the author adjusts**:

| Sprint | Dates | Goal | Items |
|---|---|---|---|
| 2 | Oct 24 – Oct 28 | Contract core: registry, issues, bids | Hardhat scaffold; HU-001, HU-002, HU-003, HU-004 + tests |
| 3 | Oct 29 – Nov 01 | Contract complete + deployed | HU-005, HU-006, HU-007, HU-008 (tally, OPEN-3), HU-009 + invariant tests; deploy to Arbitrum Sepolia; enrollment simulator CLI (registry/suppliers from CSV) |
| 4 | Nov 02 – Nov 06 | Clients | Supplier portal (list open issues, submit bid + Pinata upload); member app (issue list, create issue, vote, delegation, close/execute buttons) |
| 5 | Nov 07 – Nov 08 | Delivery | End-to-end demo on testnet; README/instructivo; demo video (optional); zip + Drive folder; tag `entrega-4` |

### The "70%" cut (to confirm with the tutor — OPEN-6)

Proposed **in** for Nov 9: all 9 HUs in the contract with tests, deployed and verified on
Arbitrum Sepolia; simulator CLI; supplier portal; member app covering list, create, vote,
delegate/revoke, close and execute.

Proposed **can slip** (the remaining ~30%): history screen built from events, treasury screen,
UI polish, attachment preview, wallet UX in the mobile app beyond the minimum.

### Delivery checklist (Entregable 4 "Demo")

- [ ] Public Google Drive folder
- [ ] Source code (zip of the repo at tag `entrega-4`)
- [ ] *Instructivo de puesta en marcha* (Spanish): prerequisites, `.env`, deploy, run simulator, run portal, run app, test accounts, faucet
- [ ] Deployed contract address + Arbiscan link
- [ ] Demo video walking the full flow (recommended — the tutor may not run it)
- [ ] Link inserted in the thesis under the title **Demo** (after Conclusiones, before Referencias)

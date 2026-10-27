# Glosario ES / EN

Terminología unificada. Usar estas formas de manera consistente en el documento.
Al introducir un término por primera vez, indicar el original en inglés entre paréntesis.

| Español | English | Nota |
|---|---|---|
| Democracia líquida | Liquid democracy | También "democracia delegativa" |
| Delegación transitiva / metadelegación | Transitive delegation / metadelegation | |
| Delegante | Delegator | |
| Delegado / apoderado | Delegate / proxy | Preferir "delegado" |
| Revocación instantánea | Instant recall | |
| Anulación / voto directo sobreescribiendo | Override | Preferir "anulación de la delegación" |
| Prueba de conocimiento cero | Zero-knowledge proof | |
| Prueba de personeidad | Proof of personhood | Alternativa: "prueba de humanidad" |
| Resistencia Sybil | Sybil resistance | Mantener "Sybil" sin traducir |
| Anulador / nulificador | Nullifier | **Decidir una forma y sostenerla**; considerar mantener "nullifier" en cursiva |
| Compromiso de identidad | Identity commitment | |
| Árbol de Merkle | Merkle tree | |
| Privacidad de la papeleta | Ballot privacy | |
| Ausencia de recibo | Receipt-freeness | Término no estandarizado en español — definir explícitamente en el marco teórico |
| Resistencia a la coerción | Coercion-resistance | |
| Soborno / compra de votos | Bribery / vote buying | |
| Colusión | Collusion | |
| Contrato inteligente | Smart contract | |
| Cadena de bloques | Blockchain | Aceptable usar "blockchain" |
| Capa 2 | Layer 2 (L2) | |
| Instantánea / corte | Snapshot | Preferir "snapshot" en cursiva por convención técnica |
| Padrón / registro de miembros | Membership registry | |
| Quórum | Quorum | |
| Voto cuadrático | Quadratic voting | |
| Financiamiento cuadrático | Quadratic funding | |
| Token no transferible | Soulbound token | |
| Modelo de amenaza | Threat model | |
| Invariante | Invariant | |

## Términos a decidir

- [ ] `nullifier` — ¿traducir o mantener en inglés con cursiva?
- [ ] `receipt-freeness` — definir la forma castellana que se usará en todo el documento
- [ ] `snapshot` — ¿"instantánea" o mantener?

## Diccionario de identificadores del prototipo (código ↔ dominio)

Fuente: Entrega 3, Tablas 18–25. El código usa los identificadores en inglés; el documento,
los términos en español.

| Identificador | Término del dominio |
|---|---|
| `CommunityGovernance` | Contrato de gobernanza comunitaria |
| `registrar` | Registrador |
| `Member` / `members` / `memberList` | Miembro / padrón |
| `registered` | Empadronado (figura en el padrón) |
| `eligible` | Habilitado (`false` = moroso, inhabilitado) |
| `weight` | Peso de voto |
| `delegate` / `delegateTo` / `revokeDelegation` | Delegado / delegar / revocar la delegación |
| `receivedWeight` | Peso delegado recibido |
| `DELEGATION_CAP_DIVISOR` | Divisor del tope de delegación (1/3) |
| `isSupplier` / `registerSupplier` | Registro de proveedores / alta de proveedor |
| `Issue` / `createIssue` | Cuestión / plantear una cuestión |
| `proposer` | Miembro que plantea |
| `ceiling` | Techo presupuestario |
| `reservedBalance` | Reserva (suma de techos comprometidos) |
| `topic` | Etiqueta temática |
| `descriptionCid` / `documentCid` | CID en IPFS de la descripción / de la propuesta |
| `snapshot` | Snapshot del padrón |
| `BIDDING_PERIOD` / `VOTING_PERIOD` | Ventana de ofertas / plazo de votación |
| `Bid` / `submitBid` | Oferta / presentar oferta |
| `Ballot` / `castBallot` / `ranking` | Boleta / emitir boleta / orden de preferencias |
| `REJECT_ALL` | "Rechazar todas" |
| `quorum` | Quórum |
| `closeIssue` | Cierre (y adjudicación) |
| `Awarded` / `winningBidId` | Adjudicada / oferta adjudicada |
| `ClosedWithoutAward` | Cerrada sin adjudicación |
| `executeTransfer` / `Executed` | Ejecución de la transferencia / ejecutada |
| `weightHistory` / `delegateHistory` / `totalWeightHistory` | Historiales (checkpoints) |

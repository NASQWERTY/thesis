# Architecture Decision Records

One file per decision. Copy `0000-template.md`, number sequentially, never delete —
supersede instead (mark the old one `Reemplazada por ADR-XXXX`).

These feed the *Diagnóstico y Propuesta* and *Límites y Alcances* sections of the TFG.
Writing the rationale here, at the moment of deciding, means the thesis argument is
already reasoned and dated when you get to writing it.

| ADR | Decisión | Estado |
|---|---|---|
| [0001](0001-liquid-democracy-per-topic-delegation.md) | Democracia líquida con delegación por tema | Enmendada por 0012, 0019 |
| [0002](0002-no-transferable-token.md) | Sin token transferible | Aceptada |
| [0003](0003-semaphore-not-maci.md) | Semaphore sí, MACI excluido | Fuera del núcleo (0013) |
| [0004](0004-arbitrum-sepolia-testnet.md) | Arbitrum Sepolia, solo testnet | Aceptada |
| [0005](0005-nullifier-proof-of-personhood.md) | Nullifier, no hash de documento | Fuera del núcleo (0013, 0015) |
| [0006](0006-scope-decision.md) | Alcance: implementar delegación, analizar privacidad | Enmendada por 0013 |
| [0007](0007-treasury-as-binding-object.md) | Tesorería como objeto vinculante de las decisiones | Enmendada por 0011, 0016, 0017, 0020 |
| [0008](0008-cidi-personhood-no-city-scale.md) | CiDi como prueba de personeidad, sin escala de ciudad | Enmendada por 0015 |
| [0009](0009-gasless-voting-relayer.md) | Relayer para voto sin gas | Fuera del núcleo (0013) |
| [0010](0010-endorsement-threshold.md) | Umbral de adhesión | Retirado (0014) |
| [0011](0011-licitacion-model.md) | Modelo de licitación: la comunidad plantea, el mercado propone | Enmendada por 0012, 0014, 0017, 0018, 0021 |
| [0012](0012-remove-per-topic-delegation.md) | Se elimina la delegación por tema | Enmendada por 0019 |
| [0013](0013-alcance-nucleo-minimo.md) | Núcleo de alcance mínimo | Enmendada por 0014, 0015 |
| [0014](0014-licitacion-simplificada-sin-admision.md) | Licitación simplificada, sin admisión | Aceptada |
| [0015](0015-padron-direcciones-registrador-peso-configurable.md) | Padrón de direcciones, registrador, peso configurable | Aceptada |
| [0016](0016-cierre-activo-sin-permisos-fusionado-con-adjudicacion.md) | Cierre activo sin permisos, fusionado con adjudicación | Aceptada |
| [0017](0017-registro-proveedores-precargado-por-el-registrador.md) | Registro de proveedores precargado por el registrador | Aceptada |
| [0018](0018-parametros-del-planteo-plazo-fijo-snapshot-y-adjuntos-en-ipfs.md) | Plazos fijos, snapshot al crear, adjuntos en IPFS | Aceptada |
| [0019](0019-delegacion-salto-unico-tope-de-peso-y-boleta-inmutable.md) | Delegación de salto único, tope 1/3, boleta inmutable | Aceptada |
| [0020](0020-resolucion-del-escrutinio-y-cierre-conservador.md) | Escrutinio por pares; ambigüedad cierra sin adjudicación | Aceptada |
| [0021](0021-miembros-y-proveedores-disjuntos.md) | Miembros y proveedores disjuntos | Aceptada |

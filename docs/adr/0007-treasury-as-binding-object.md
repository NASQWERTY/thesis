# ADR-0007: La tesorería como objeto vinculante de las decisiones

- **Fecha:** 2026-08-06
- **Estado:** Aceptada
- **Relacionada con:** ADR-0002, ADR-0004, ADR-0006
- **Sección del TFG:** Propuesta / Objetivo, Límites y Alcances del Prototipo

## Contexto

El borrador 2022 y el diseño posterior nunca definieron **sobre qué son vinculantes** las
decisiones de la comunidad. El sistema registraba consenso, pero la ejecución de lo decidido
quedaba fuera del sistema, a cargo de personas.

Esa omisión debilita el trabajo en un punto central: si el sistema solo registra consenso
que luego humanos ejecutan por fuera, la pregunta "¿por qué se requiere una cadena de
bloques?" no tiene respuesta sólida. Una planilla firmada cumpliría la misma función.

## Alternativas consideradas

1. **Registro de consenso no vinculante** — el sistema documenta la decisión; la ejecución
   es externa y discrecional. Alcance menor, pero no justifica la tecnología empleada.
2. **Control de derechos de acceso o membresía** — las decisiones modifican permisos dentro
   del propio sistema. Vinculante, pero circular: la gobernanza gobierna solo a sí misma.
3. **Gestión de una tesorería común** — las decisiones aprobadas ejecutan transferencias de
   fondos de manera autónoma.

## Decisión

Opción 3. **La comunidad gobierna una tesorería común.** Una propuesta aprobada ejecuta la
transferencia sin intervención discrecional de ninguna persona.

### Parámetros decididos

| Aspecto | Decisión |
|---|---|
| Efecto de una propuesta aprobada | Transferencia de un monto fijo a un destinatario |
| Activo | ETH nativo (testnet). ERC-20 queda como extensión futura |
| Quién puede proponer | Cualquier miembro |
| Destinatarios admisibles | Solo direcciones incorporadas a una lista blanca por la comunidad |
| Segundo tipo de propuesta | Incorporación de dirección a la lista blanca, **con las mismas reglas** que una propuesta de gasto |
| Condición de aprobación | Mayoría más quórum mínimo de participación |
| Ejecución | Período de votación fijo; al cierre, cualquiera puede ejecutar en una transacción separada |
| Disponibilidad de fondos | Los fondos se **reservan al crear** la propuesta |
| Anti-spam | Tope de propuestas abiertas por miembro |

### Ingreso de fondos

**Fuera de alcance.** El prototipo asume una tesorería con fondos preexistentes. Los
mecanismos de aporte (cuotas, depósitos, donaciones) no se modelan y deben declararse como
exclusión en *Límites y Alcances*.

## Fundamentación

**Responde a la pregunta de por qué se requiere una cadena de bloques.** Con una tesorería,
el contrato inteligente *ejecuta* la decisión: los fondos se mueven porque la votación fue
aprobada, sin discrecionalidad intermedia. Eso es ejecución autónoma, que es lo que esta
tecnología aporta de manera distintiva. La caracterización del sistema como *organización
autónoma descentralizada* deja de ser aspiracional.

**Convierte a Porto Alegre de antecedente en precedente directo.** El presupuesto
participativo es exactamente esto: una comunidad decidiendo colectivamente sobre fondos
comunes. Se hereda un campo de estudio con literatura consolidada en lugar de construir uno.

**Da contenido cuantificable al análisis de coerción.** Sin tesorería, "un delegado podría
ser sobornado" es hipotético: sobornado para obtener qué. Con fondos en juego, el soborno
tiene retorno computable: el atacante compara el costo de capturar a un delegado contra la
fracción de tesorería que puede redirigir. El tope de peso acumulado (ADR-0001) deja de ser
un parámetro de equidad abstracto y pasa a ser una **cota sobre el valor que un delegado
capturado puede movilizar**. Ese es un argumento de seguridad verificable.

**La lista blanca introduce un paso público previo.** Impide que una mayoría capturada envíe
fondos a una dirección arbitraria sin una decisión previa y visible de la comunidad. El costo
es duplicar la superficie de propuestas.

### Ejecución diferida, no inmediata

Se descartó la ejecución en el instante en que se cruza el umbral de aprobación. Esa variante
tiene dos defectos: la transacción que cruza el umbral es la que dispara la transferencia, lo
que **identifica al último votante** por el gas pagado —una filtración incompatible con el
objetivo de privacidad— y además los votos tempranos deciden el resultado, dejando sin efecto
la participación posterior, lo cual es inconsistente con la resolución de peso por snapshot.

## Compatibilidad con decisiones previas

**ADR-0002 (sin token transferible) se mantiene sin conflicto.** La membresía sigue siendo no
transferible y de peso unitario. La tesorería es aquello que **se gobierna**, no aquello que
**confiere derecho a voto**. Esta distinción es precisamente lo que separa el diseño de las
DAO con voto ponderado por tenencia, y la presencia de una tesorería la vuelve más nítida.

**ADR-0004 (solo testnet) se mantiene.** El ETH de testnet carece de valor económico, de modo
que la formulación original sigue siendo exacta.

## Riesgo aceptado: bloqueo de tesorería por propuesta única

La reserva de fondos al crear la propuesta, combinada con derecho de propuesta abierto,
habilita un ataque de denegación de servicio: **un solo miembro puede crear una propuesta por
el total del saldo y congelar la tesorería durante todo el período de votación**, sin costo.
El tope de propuestas abiertas por miembro limita el spam serial pero **no cubre este caso**.

Mitigaciones evaluadas y **no adoptadas**: tope de tamaño por propuesta como fracción del
saldo (impediría gastos legítimos grandes en una sola propuesta) y depósito perdible del
proponente.

**Se acepta el riesgo y se documenta.** Debe declararse explícitamente en el modelo de
amenaza del TFG como ataque conocido y no mitigado, con las mitigaciones evaluadas y el
fundamento del descarte. Corresponde a *Límites y Alcances*.

## Consecuencias

- Nueva superficie de contratos: custodia, ejecución, control de acceso, lista blanca
- **Cambia la clase de falla.** Un error en el conteo produce un resultado incorrecto; un
  error en la custodia vacía la tesorería. El capítulo de seguridad crece
- Nuevos invariantes a verificar:
  - La suma de transferencias aprobadas y no ejecutadas nunca excede el saldo
  - Ninguna transferencia se ejecuta hacia una dirección fuera de la lista blanca
  - Ninguna propuesta se ejecuta dos veces
  - Los fondos reservados se liberan si la propuesta es rechazada o expira
- **Acota la búsqueda de comunidad de referencia** (paso 3 del roadmap) a organizaciones que
  administran fondos comunes: consorcio de propietarios, cooperativa, mutual, club, centro de
  estudiantes con presupuesto
- Habilita la formulación del título: existe un dominio concreto que nombrar

## Trabajo futuro señalado, fuera de alcance

- Mecanismos de ingreso de fondos
- Tesorería en ERC-20
- Asignación de presupuesto entre opciones en competencia — caso canónico de voto y
  financiamiento cuadrático (Posner & Weyl, 2018; Buterin, Hitzig & Weyl, 2019). Adyacente y
  tentador; se registra como trabajo futuro para evitar expansión de alcance

## Referencias

- Sintomer, Y., Herzberg, C. & Röcke, A. — presupuesto participativo
- Posner, E. & Weyl, G. (2018). *Radical Markets*
- Buterin, V., Hitzig, Z. & Weyl, G. (2019). A Flexible Design for Funding Public Goods.
  *Management Science*
- ADR-0001, ADR-0002, ADR-0004, ADR-0006

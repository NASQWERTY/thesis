# ADR-0013: Núcleo de alcance mínimo — se congela la construcción y se recorta el aparato teórico

- **Fecha:** 2026-08-17
- **Estado:** Aceptada — **enmendada por ADR-0014** (núcleo de "creación de propuestas")
- **Enmienda a:** ADR-0003, ADR-0006, ADR-0009, ADR-0010
- **Relacionada con:** ADR-0001, ADR-0002, ADR-0004, ADR-0005, ADR-0007, ADR-0008, ADR-0011,
  ADR-0012
- **Sección del TFG:** Objetivo, Límites y Alcances del Prototipo

## Contexto

El historial de decisiones desde ADR-0006 fue, en cada paso, un recorte: delegación por
tema afuera (ADR-0012), relayer y umbral de adhesión definidos como parte del núcleo
(ADR-0009, ADR-0010), modelo de licitación incorporado (ADR-0011). Revisado en conjunto, el
trabajo sigue comprometiendo simultáneamente ocho frentes distintos: democracia líquida,
ejecución automática de fondos, identidad digital, privacidad del voto, resistencia a la
coerción, pruebas de conocimiento cero y gobernanza comunitaria. Sostener los ocho a la vez
—aunque la mayoría estén marcados como "se analiza sin construir"— excede lo razonable para
una tutoría de TFG de 3 a 6 meses.

Esto expone un problema no resuelto por ADR-0006: **la separación entre build y análisis no
alcanza si el tratamiento analítico ocupa una extensión comparable a la del prototipo
construido.** Un capítulo de marco teórico extenso sobre ZK, personeidad real y resistencia
a la coerción se lee como intento de resolver esos problemas, aunque el texto aclare que no
se implementan. El propio ADR-0006 ya advertía esta tensión al mantener el "encuadre
documental de C" (democracia líquida con preservación de privacidad) sin construirla; esa
decisión es la que ahora se revierte.

Se redefine el núcleo a demostrar como: **registro de miembros, una persona/un voto,
creación de propuestas, delegación y revocación del voto, votación con quórum y mayoría,
lista blanca de destinatarios, ejecución de transferencia en testnet y trazabilidad de las
operaciones.**

## Alternativas consideradas

1. **Conservar el documento actual, mejorar solo la redacción** de la separación
   build/análisis. Se descarta: el problema no es de claridad, es de extensión y cantidad
   de frentes abiertos sostenidos a la vez.
2. **Eliminar por completo toda mención a ZK, personeidad real y coerción.** Se descarta:
   tira el análisis que ADR-0006 identificó como la contribución de mayor valor del
   trabajo, y reduce la propuesta a un scaffolding de DAO genérico sin diferenciación.
3. **Congelar el núcleo de construcción al listado mínimo demostrable, y comprimir todo lo
   demás a mención breve de trabajo futuro** (uno o dos párrafos por tema, sin capítulo de
   modelo de amenaza extenso para lo no construido).

## Decisión

**Opción 3.**

### Núcleo de construcción — fijo, sin condicionalidad

| Elemento | ADR que lo respalda |
|---|---|
| Registro de miembros (mock de empadronamiento) | ADR-0005, ADR-0008 |
| Una persona / un voto (sin token transferible) | ADR-0002, ADR-0005 |
| Creación de propuestas (licitación simplificada: planteo con techo, registro de proveedores, ofertas, selección por preferencia ordenada, adjudicación — sin fase de admisión separada) | ADR-0007, ADR-0011 enmendada por ADR-0014 |
| Delegación global revocable, con anulación | ADR-0001 enmendada por ADR-0012 |
| Votación con quórum y mayoría | ADR-0007 |
| Lista blanca de destinatarios | ADR-0007 |
| Ejecución de transferencia en testnet | ADR-0004, ADR-0007 |
| Trazabilidad de las operaciones (on-chain, no privada) | Consecuencia directa de no incluir Semaphore en el núcleo |

Este listado es el mínimo demostrable dentro del plazo de 3 a 6 meses. No agrega nada por
fuera de él.

### Se cancela la condicionalidad de ADR-0006

ADR-0006 dejaba abierta la posibilidad de elevar el alcance de Opción B a Opción C
(democracia líquida con privacidad implementada) si un spike de dos semanas confirmaba
viabilidad técnica de Semaphore en dispositivo real. **Esa puerta se cierra.** No hay
escenario en el que agregar privacidad de papeleta sea deseable dentro de este alcance, con
independencia del resultado del spike. El spike **no se ejecuta**.

### Se recorta el aparato teórico, no se elimina

Los siguientes temas permanecen en el trabajo, pero como mención breve en *Trabajo
futuro* — un párrafo cada uno, sin capítulo de modelo de amenaza propio, sin comparación
extensa de alternativas:

- Privacidad del voto vía pruebas de conocimiento cero (Semaphore) — ADR-0003
- Personeidad verificada en producción vía CiDi Nivel 2 real (más allá del mock) — ADR-0008
- Resistencia a la coerción y *receipt-freeness* — ADR-0003
- Delegación por tema — ya excluida por ADR-0012, sin cambios

### Dos elementos existentes se sacan del núcleo de construcción

**Relayer sin gas (ADR-0009).** Su fundamento principal, según la propia ADR, no era el
costo de gas sino la privacidad: *"la votación anónima exige que la transacción sea
enviada por alguien distinto del votante"*. Sin voto anónimo en el núcleo, ese fundamento
desaparece. Construirlo igual, solo por conveniencia de UX, agrega superficie de
contratos (punto de censura, dependencia de disponibilidad) sin responder a ninguno de
los ocho elementos del núcleo mínimo. Pasa a trabajo futuro.

**Umbral de adhesión / fase de admisión de cuestiones (ADR-0010).** El núcleo pide
"creación de propuestas", no una fase previa de adhesión con quórum propio. El mecanismo
es interesante — es de donde emergía el argumento de "representantes naturales" — pero
agrega una fase, un parámetro a calibrar y una dimensión pública (quién adhiere a qué)
que no es necesaria para demostrar el flujo principal. Pasa a trabajo futuro / extensión
si el cronograma lo permite.

Ambos recortes son de bajo costo de reversión: si sobra tiempo respecto del cronograma de
3 a 6 meses, se reincorporan primero, en ese orden, antes que cualquier otro tema de la
lista de trabajo futuro.

## Fundamentación

El patrón es consistente a lo largo de todo el historial de decisiones y no es casualidad
— es la curva normal de un alcance que se sobreestimó al principio del proyecto: cada ADR
desde la 0006 fue un recorte (delegación por tema afuera, umbral de adhesión adentro y
ahora afuera, relayer adentro y ahora afuera).

La diferencia con esta ADR es que las anteriores recortaban **qué se construye**
manteniendo intacto **cuánto se analiza**. Revisado el conjunto acumulado, la segunda
variable también cuenta como alcance a los efectos de una tutoría de TFG. Un capítulo de
marco teórico del tamaño de un proyecto aparte sigue siendo, en los hechos, un proyecto
aparte — aunque no tenga código.

Vale la pena no sobrecorregir hacia la Alternativa 2. El análisis de la tensión entre
delegación y resistencia a la coerción, y la incompatibilidad de CiDi con participación
no vinculable (hallazgo ya documentado en ADR-0008), son aportes genuinos y baratos de
mantener en formato breve. Lo que hay que evitar es que ocupen espacio y atención
comparables al prototipo.

## Consecuencias

- El título y los objetivos generales del TFG deben reescribirse: de "democracia líquida
  con preservación de privacidad" a algo del orden de "sistema de gobernanza comunitaria
  con delegación revocable y ejecución de tesorería en red de prueba".
- El marco teórico se reduce a un tratamiento breve de ZK, personeidad y coerción; el
  peso del documento pasa a estar en el prototipo, su arquitectura y su verificación.
- Se elimina el capítulo de modelo de amenaza detallado para ataques no mitigados que no
  corresponden al núcleo (soborno verificable, censura del relayer). Se conserva un
  modelo de amenaza acotado al sistema efectivamente construido.
- Se reduce la superficie de contratos e invariantes: sin relayer, sin fase de adhesión.
  Los invariantes de ADR-0007 (reserva de fondos, lista blanca, ejecución única) quedan
  como el núcleo verificable del trabajo.
- **Resuelto por ADR-0014:** ADR-0011 ("modelo de licitación") resultó depender de la fase
  de admisión de ADR-0010, que esta misma ADR saca del núcleo. ADR-0014 concilia ambas
  decisiones: conserva la licitación (proveedores ofertando soluciones) pero fusiona
  planteo y admisión en un solo paso, sin umbral de adhesión. El núcleo de "creación de
  propuestas" queda descrito con precisión en ADR-0014, no en esta ADR.
- El documento de propuesta debe anteponer el listado de "qué se construye" de forma
  prominente y visualmente separada, dejando el trabajo futuro al final, en extensión
  claramente menor.

## Referencias

- ADR-0001, ADR-0002, ADR-0003, ADR-0004, ADR-0005, ADR-0006, ADR-0007, ADR-0008,
  ADR-0009, ADR-0010, ADR-0011, ADR-0012

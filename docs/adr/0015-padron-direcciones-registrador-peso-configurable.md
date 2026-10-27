# ADR-0015: Padrón como lista de direcciones ETH cargada por un registrador — peso de voto configurable (por defecto 1)

- **Fecha:** 2026-09-21
- **Estado:** Aceptada
- **Enmienda a:** ADR-0002, ADR-0008, ADR-0013
- **Relacionada con:** ADR-0001, ADR-0005, ADR-0007, ADR-0012
- **Sección del TFG:** Objetivos específicos / Objetivo, Límites y Alcances del Prototipo / Estructura de datos

## Contexto

ADR-0008 modeló el empadronamiento como un *mock* de CiDi Nivel 2, y ADR-0013 dejó la
personeidad real (CiDi en producción) como trabajo futuro, manteniendo el mock como pieza del
núcleo ("registro de miembros").

El relevamiento del caso real (Complejo Jardines del Sur, Jorep SA) muestra que el padrón no
funciona como un flujo de identidad digital: lo mantiene el administrador, se actualiza contra
un libre deuda y una copia de escritura, y el propietario no necesita la aprobación de nadie
para figurar en él. Un mock de CiDi simula un mecanismo que el caso real no usa. Además, el
relevamiento muestra que el voto se pesa por coeficiente y que el moroso pierde el derecho a
votar — dos aspectos que el núcleo (una persona / un voto) no contemplaba.

La Tabla 2 del Diagnóstico (Alta y actualización del padrón) identifica como problemas la falta
de una fuente única y verificable y la ausencia de historial de cambios.

## Alternativas consideradas

1. **Mantener el mock de CiDi (ADR-0008).** Simula OAuth e identidad civil; agrega una pieza
   que no corresponde a ningún proceso relevado.
2. **Lista de direcciones dentro del contrato, mantenida por un rol registrador, sin
   componente aparte.** Es lo más simple, pero el "simulador de empadronamiento" del objetivo
   específico 1 pasaría a no existir como componente.
3. **Lista de direcciones dentro del contrato, con un simulador de empadronamiento fuera de
   la cadena que mantiene el listado y lo carga al contrato.** Conserva el componente del
   objetivo específico 1 y refleja el rol real del administrador sobre el padrón.
4. **Alta de miembros por voto de la comunidad.** Descartada: contradice el relevamiento (el
   propietario no necesita aprobación) y el alcance de comunidad única (ADR-0008).

## Decisión

**Opción 3.**

### Padrón

- Un **miembro** es una dirección ETH incorporada al contrato por el registrador. Los datos en
  cadena son: dirección, estado habilitado/inhabilitado y peso de voto.
- El **simulador de empadronamiento** es un componente fuera de la cadena que recibe un
  listado de direcciones y realiza las altas, bajas y cambios de estado sobre el contrato. Los
  datos que no hacen falta en cadena (por ejemplo, la unidad a la que corresponde cada
  dirección) permanecen en el simulador.
- El **registrador** es la única dirección autorizada a modificar el padrón. En el prototipo es
  la cuenta que despliega el contrato y cumple el rol del administrador.
- Toda alta, baja y cambio de estado o de peso emite un evento, de modo que el historial del
  padrón es consultable.
- Un miembro inhabilitado no vota ni crea cuestiones. Esto modela la regla del moroso.
- El simulador **no verifica identidad**: el prototipo asume que las direcciones cargadas
  corresponden a propietarios reales.

### Peso de voto

- Todo miembro tiene **peso 1 por defecto**, de modo que el comportamiento base sigue siendo
  una persona, un voto.
- El registrador puede modificar el peso de un miembro. Esto permite modelar más adelante el
  coeficiente por unidad del caso real sin cambiar el contrato.
- El peso y la habilitación que cuentan para una cuestión son los vigentes en el momento de
  su snapshot (ADR-0001, ADR-0007). Un cambio posterior no altera una votación en curso.
- El quórum, la mayoría y el tope de peso acumulado por delegación se expresan en unidades de
  peso. Con todos los pesos en 1 equivalen a contar personas.

## Fundamentación

**Es coherente con lo que ADR-0005 ya había aceptado.** Para el prototipo, ADR-0005 modeló la
verificación mediante un registrador de confianza y declaró que "quien controla el registro
controla el sistema". Esta ADR mantiene ese supuesto y retira el mock de CiDi, que era una
representación más elaborada del mismo supuesto.

**Reubica la confianza, no la elimina.** En el caso real la confianza recae en el
administrador que mantiene el padrón a mano. En el prototipo recae en el registrador. La
diferencia está en la trazabilidad: cada cambio queda registrado y es consultable, lo que
responde al problema de historial de la Tabla 2. No responde al problema de verificación:
nada impide que el registrador cargue direcciones que no correspondan a propietarios, o más de
una dirección para la misma persona. Debe declararse como límite.

**El peso configurable evita construir de más.** Implementar el coeficiente real (fraccionario,
por dormitorios, multiplicado por unidades) agrega complejidad al recuento sin aportar al
argumento central. Con un peso por defecto de 1 el núcleo no cambia, y la puerta queda abierta.

## Consecuencias

- **Enmienda ADR-0002.** La membresía sigue sin token transferible, pero "peso unitario"
  pasa a "peso 1 por defecto, modificable por el registrador". El peso no es transferible ni
  proviene de tenencia alguna.
- **Enmienda ADR-0008.** El mock de CiDi sale del núcleo de construcción. El análisis de
  incompatibilidad de CiDi con participación no vinculable se conserva como mención breve en
  trabajo futuro (ADR-0013).
- **Enmienda ADR-0013.** En el núcleo, "Registro de miembros (mock de empadronamiento)" pasa a
  "Registro de miembros (padrón simulado por carga de direcciones)", y "Una persona / un voto"
  pasa a "una persona / un voto por defecto (peso 1)".
- **El objetivo específico 1 de la Entrega 1** ("simulador de empadronamiento que verifique
  identidades") debe reformularse sin la verificación de identidades al consolidar el
  Entregable 2. Se recomienda informar al tutor.
- **Modelo de amenaza.** El registrador es un punto único de control y debe declararse
  explícitamente, junto con la posibilidad de direcciones múltiples por persona. La pérdida de
  clave (pendiente en ADR-0005) se resuelve como baja de la dirección anterior y alta de una
  nueva, a cargo del registrador.
- **Coeficientes fraccionarios.** Los coeficientes del caso real (por ejemplo 2 %, 2,5 %,
  0,5 %) exigirían una escala entera (por ejemplo, puntos básicos) si se modelaran. No se
  hace en el prototipo.
- **Nuevos invariantes a verificar:**
  - Solo el registrador modifica el padrón, las habilitaciones y los pesos
  - Un miembro inhabilitado no vota ni crea cuestiones
  - Un cambio de peso o de habilitación no altera una cuestión con snapshot ya tomado
  - Toda modificación del padrón emite un evento
- **Reversible a bajo costo.** Reemplazar al registrador único por una multifirma o por alta
  por votación, o reincorporar CiDi como fuente del padrón, modifica quién carga las
  direcciones, no la estructura de datos.

## Referencias

- ADR-0001, ADR-0002, ADR-0005, ADR-0007, ADR-0008, ADR-0012, ADR-0013
- Relevamiento funcional y Diagnóstico (Tabla 2) del TFG

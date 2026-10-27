# ADR-0010: Umbral de adhesión para admitir cuestiones — derecho de propuesta no restringido

- **Fecha:** 2026-08-10
- **Estado:** Aceptada
- **Enmienda a:** ADR-0007
- **Sección del TFG:** Propuesta

## Contexto

ADR-0007 estableció que **cualquier miembro** puede crear una propuesta. Al incorporarse el
modelo de cuestiones planteadas por la comunidad, surgieron dos necesidades: filtrar
cuestiones sin interés real, y permitir que emerjan representantes naturales a partir de la
confianza que la comunidad ya deposita mediante delegaciones.

Se propuso restringir el derecho a plantear cuestiones a los miembros que tuvieran votos
delegados en su favor.

## Alternativas consideradas

1. **Derecho abierto sin filtro** (ADR-0007 original) — igualitario, pero sin defensa contra
   el ruido.
2. **Restringir el planteo a quienes tengan votos delegados.**
3. **Planteo abierto, avance por umbral de adhesión**, computando el peso delegado en la
   adhesión.

## Decisión

**Opción 3.** Cualquier miembro puede plantear una cuestión. La cuestión avanza a la fase
siguiente únicamente al alcanzar un **umbral de adhesión**, y el peso delegado **computa**
en esa adhesión.

## Fundamentación

### Por qué se rechaza restringir el planteo

- **Problema de arranque.** En el estado inicial nadie tiene votos delegados, luego nadie
  puede plantear una cuestión, luego no hay materia sobre la cual delegar.
- **Silencia a los más afectados.** Quien advierte que los juegos de la plaza están rotos es
  quien pasa por ahí, probablemente sin delegación alguna. La premisa de igualdad del trabajo
  sostiene que la preocupación de todo miembro es admisible; esta regla convertiría el
  planteo en un privilegio obtenido por popularidad.
- **Acopla el derecho de propuesta al recuento público de delegaciones.** Hoy es consistente,
  porque el grafo de delegación privado está fuera de alcance (ADR-0006), pero clausuraría
  la vía de delegación privada identificada como defensa frente a la coerción.

### Por qué el umbral de adhesión

Es el mecanismo con antecedente probado. **LiquidFeedback** permite que cualquier
participante abra una cuestión, pero exige que alcance un quórum de adherentes para ser
admitida a discusión; las que no lo alcanzan se cierran al término de la fase de admisión. El
quórum es configurable —por ejemplo, 10% de los participantes inscriptos en un área
temática—. Cada participante puede presentar propuestas, pero solo avanzan las que reúnen
suficiente adhesión.

Al computar el peso delegado en la adhesión, **un miembro con treinta delegaciones puede
hacer avanzar una cuestión por sí solo**. Los representantes naturales emergen igualmente,
el ruido se filtra, y nadie queda impedido de expresarse. El objetivo perseguido por la
opción 2 se alcanza sin sus efectos colaterales.

Adicionalmente, la adhesión es el punto donde el peso delegado realiza trabajo visible fuera
del acto de votar, lo que refuerza el argumento central del trabajo.

## Consecuencias

- Aparece un parámetro nuevo a calibrar: el valor del umbral. LiquidFeedback lo hace
  configurable por área temática; en comunidades pequeñas un porcentaje fijo puede resultar
  demasiado alto o demasiado bajo
- **Las adhesiones son públicas**, lo que revela quién apoya el avance de cada cuestión.
  Debe consignarse en el modelo de amenaza y contrastarse con la privacidad del voto
- Se agrega una fase de admisión con su propio plazo de vencimiento
- Las cuestiones que no alcanzan el umbral se cierran sin llegar a votación
- LiquidFeedback incorpora además un limitador de cuestiones que ajusta dinámicamente el
  umbral según la cantidad de cuestiones abiertas. **No se adopta**; se registra como
  antecedente ante eventual necesidad

## Referencias

- Behrens, J., Kistner, A., Nitsche, A. & Swierczek, B. (2014). *The Principles of
  LiquidFeedback*
- LiquidFeedback — documentación de fases: admisión, discusión, verificación, votación
- *The Liquid Democracy Journal*, números 1 y 5 — quórum de adherentes y limitador de
  cuestiones
- ADR-0001, ADR-0006, ADR-0007

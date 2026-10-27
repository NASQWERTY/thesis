# ADR-0012: Se elimina la delegación por tema — solo delegación global revocable

- **Fecha:** 2026-08-10
- **Estado:** Aceptada
- **Enmienda a:** ADR-0001, ADR-0011
- **Sección del TFG:** Propuesta / Marco Teórico Referencial / Límites y Alcances

## Contexto

ADR-0001 estableció delegación por tema con respaldo general, siguiendo a Blum y Zuber, que
enumeran la delegación flexible —por cuestión, por área o global— como componente
constitutivo de la democracia líquida.

Al consolidarse el modelo de licitación (ADR-0011) se revisó si esa granularidad aporta al
argumento del trabajo en proporción a su costo de implementación y a la superficie de ataque
que introduce.

## Alternativas consideradas

1. **Mantener la delegación por tema completa** — solo se justifica si evaluar la delegación
   temática es en sí un resultado a medir.
2. **Conservar el modelo de datos con clave temática, sin evaluarla** — costo bajo, cobertura
   conceptual intacta, pero mantiene la complejidad en los invariantes.
3. **Eliminarla. Solo delegación global revocable con anulación.**

## Decisión

**Opción 3.** El sistema implementa **delegación global revocable**, con voto directo siempre
disponible y anulación en cualquier momento. La delegación por tema se trata analíticamente
en el marco teórico y se declara fuera de alcance.

La etiqueta temática de las cuestiones (ADR-0011) **se conserva como metadato organizativo**
—permite filtrar y navegar cuestiones— pero **no incide en la resolución de peso**.

## Fundamentación

### Ninguna contribución del trabajo la requiere

Las contribuciones centrales son: delegación implementada y verificada por invariantes
(ADR-0006), el análisis de la tensión entre delegación y resistencia a la coerción, el modelo
de licitación (ADR-0011), y la suspensión de peso del miembro oferente. **Ninguna depende de
la granularidad temática.**

La delegación global revocable, con anulación, resolución en el momento del snapshot, tope de
profundidad, resolución de ciclos y tope de peso acumulado sigue constituyendo trabajo de
contratos sustancial y suficiente como aporte de ingeniería.

### El argumento de justificación retroactiva era más débil de lo presentado

Al adoptarse el modelo de licitación se argumentó que la delegación por tema dejaba de ser
teórica, porque evaluar una obra de albañilería y evaluar un proyecto cultural exigen
competencias distintas. **El argumento es plausible pero no demostrado**, y sobre todo puede
sostenerse de manera analítica sin implementarlo.

### Costos que se eliminan

- **Superficie de invariantes.** Cada invariante llevaba el calificador "por tema": resolución
  de ciclos, tope de profundidad, snapshot, tope de peso. No era un caso adicional sino una
  dimensión adicional en todos los casos.
- **Gobierno de una taxonomía.** Quién define los temas y quién los asigna eran decisiones
  pendientes sin respuesta.
- **Un vector de control de agenda.** Bajo ADR-0011 la etiqueta la fija quien plantea la
  cuestión. Con delegación por tema, **quien etiqueta determina qué delegados tienen peso
  sobre esa cuestión**, de modo que un miembro podría elegir el tema en el que sus delegados
  afines acumulan votos. Esa vulnerabilidad la introducía la propia función y desaparece con
  ella.
- **Granularidad ilusoria a la escala objetivo.** Con menos de 50 miembros y unos pocos temas,
  la distinción fina probablemente no corresponda a personas distintas.

### Qué se conserva sin costo

La delegación por tema se expone en el marco teórico como componente de la democracia líquida
según Blum y Zuber, junto con el análisis del compromiso entre expresividad y complejidad, y
la fundamentación del recorte. Ese tratamiento no requiere código.

### Sobre la evidencia empírica

Se buscó evidencia sobre la frecuencia de uso de la delegación por área frente a la global en
LiquidFeedback. El estudio de Kling et al. sobre el Partido Pirata alemán confirma que la
plataforma admite delegación en los tres niveles —global, por área y por cuestión— y su
conjunto de datos comprende 499.009 votos sobre 6.517 iniciativas en 3.565 cuestiones, con
14.964 delegaciones registradas a lo largo de cuatro años. **No se obtuvo el desglose por
nivel**, de modo que no puede afirmarse que la delegación temática se use poco. La decisión
se funda en costo e irrelevancia para el argumento, **no** en evidencia de desuso.

Lo que sí está documentado en ese estudio es la concentración de poder en pocos
superdelegados, con coeficientes de Gini superiores a 0,8 y participación efectiva por debajo
del 10% de los usuarios registrados. Ese hallazgo respalda el **tope de peso acumulado**, no
la delegación por tema.

## Consecuencias

- Se simplifica el modelo de delegación a `delegacion[miembro] → delegado`
- Los invariantes pierden la dimensión temática
- La etiqueta temática de las cuestiones queda como metadato sin efecto sobre el cómputo
- Desaparece el vector de control de agenda por etiquetado
- Enmienda ADR-0001 y el parámetro correspondiente de ADR-0011
- **Reincorporarla más adelante es de bajo costo**: agregar la clave temática al mapeo y
  extender los invariantes. La decisión no cierra la puerta de manera irreversible

## Referencias

- Blum, C. & Zuber, C. I. (2016). Liquid Democracy: Potentials, Problems, and Perspectives.
  *Journal of Political Philosophy*, 24(2), 162-182
- Kling, C., Kunegis, J., Hartmann, H., Strohmaier, M. & Staab, S. (2015). Voting Behaviour
  and Power in Online Democracy: A Study of LiquidFeedback in Germany's Pirate Party. *ICWSM*
  (arXiv:1503.07723)
- ADR-0001, ADR-0006, ADR-0011

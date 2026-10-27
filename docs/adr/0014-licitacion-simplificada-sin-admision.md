# ADR-0014: Licitación simplificada — se fusiona planteo y admisión, sin umbral de adhesión

- **Fecha:** 2026-08-18
- **Estado:** Aceptada
- **Enmienda a:** ADR-0010, ADR-0011, ADR-0013
- **Relacionada con:** ADR-0007
- **Sección del TFG:** Propuesta / Objetivo, Límites y Alcances del Prototipo

## Contexto

ADR-0013 congeló el núcleo de construcción del TFG a un listado mínimo demostrable y sacó
del núcleo la fase de admisión con umbral de adhesión (ADR-0010), por agregar una fase, un
parámetro a calibrar y una dimensión pública sin corresponder a ninguno de los ocho
elementos de ese núcleo.

Al incorporarse ADR-0011 al proyecto (modelo de licitación: la comunidad plantea el
problema, los proveedores ofertan la solución) se detectó una contradicción: **ADR-0011 usa
la fase de admisión de ADR-0010 como pieza estructural** del ciclo de vida — es el paso
donde se aprueban conjuntamente la cuestión y su techo presupuestario, y donde se activa la
reserva de fondos. No es posible sacar ADR-0010 del núcleo sin ajustar ADR-0011.

El modelo de licitación completo, además, es más elaborado que el flujo mínimo del núcleo de
ADR-0013: agrega registro de proveedores, ventana de ofertas, voto por preferencia ordenada y
suspensión de peso delegado para oferentes, encima de una fase de admisión con quórum propio.

## Alternativas consideradas

1. **Volver al modelo de monto fijo de ADR-0007**, descartando la licitación completa
   (registro de proveedores, ofertas, preferencia ordenada) al trabajo futuro. Es lo más
   ajustado al núcleo mínimo de ADR-0013, pero pierde el diferenciador más original del
   trabajo: el mercado como mecanismo de generación de soluciones.
2. **Mantener la licitación completa**, con su fase de admisión propia. Es lo más ambicioso;
   reintroduce exactamente el patrón — una fase más, un parámetro más a calibrar — que
   ADR-0013 identificó como candidato a recorte.
3. **Conservar la licitación, fusionando planteo y admisión en un solo paso.** El miembro que
   plantea la cuestión fija el techo en el mismo acto; no hay umbral de adhesión ni fase de
   admisión separada. El registro de proveedores, la ventana de ofertas y la selección por
   preferencia ordenada se mantienen sin cambios.

## Decisión

**Opción 3.**

### Ciclo de vida resultante

| Fase | Qué ocurre |
|---|---|
| **Planteo** | Cualquier miembro crea una cuestión: descripción, adjuntos (hash), etiqueta temática (metadato, ADR-0012) y **techo presupuestario en ETH**. **Los fondos se reservan en este mismo paso** — no hay fase de admisión intermedia |
| **Ofertas** | Ventana de plazo fijo. Los proveedores del registro presentan ofertas ≤ techo. Las ofertas son definitivas una vez presentadas |
| **Selección** | Votación por preferencia ordenada. "Rechazar todas" es una opción más en la boleta. Quórum y mayoría según ADR-0007. El peso delegado de un miembro oferente se suspende para esa cuestión |
| **Adjudicación** | Se transfiere al oferente seleccionado. El remanente (techo − oferta) se libera a la tesorería |
| **Cierre sin adjudicación** | Sin ofertas, o si gana "rechazar todas": la cuestión se cierra y la reserva se libera |

Cinco fases en lugar de seis. Sin umbral de adhesión, sin parámetro de quórum de admisión
que calibrar, sin dimensión pública adicional sobre quién adhiere a qué.

### Qué se mantiene sin cambios respecto de ADR-0011

Registro de proveedores (admisión global y única), denominación en ETH con monto en pesos
como metadato no verificado, adjuntos por hash, suspensión (no eliminación) del peso
delegado del miembro que oferta, votación por preferencia ordenada con Schulze como
antecedente, "rechazar todas" como candidato regular.

## Fundamentación

La elección explícita del autor fue conservar el diferenciador de la licitación —proveedores
compitiendo por proponer la solución, no solo el precio— sin reintroducir la pieza que
ADR-0013 ya había identificado como prescindible para el núcleo. Fusionar planteo y admisión
logra ambas cosas: el mecanismo de mercado permanece intacto, la superficie de fases y
parámetros se reduce.

Esto es consistente con el patrón ya observado en el historial de decisiones (ADR-0012 sacó
la delegación por tema, ADR-0013 sacó el relayer): cuando una pieza no es necesaria para el
argumento central del trabajo, se saca, aunque tenga justificación teórica propia.

## Consecuencias

### Se acepta de nuevo el riesgo de bloqueo de tesorería por propuesta única

ADR-0011 había señalado que diferir la reserva de fondos al momento de la admisión debilitaba
el ataque de ADR-0007 —bloquear la tesorería con una sola propuesta— porque exigía reunir
peso de adhesión, no la acción de un solo miembro. **Esa mitigación desaparece.** Al reservar
los fondos en el momento del planteo, el ataque vuelve a requerir un solo miembro y ningún
respaldo comunitario previo.

Se acepta el riesgo en los mismos términos que ADR-0007: el tope de propuestas abiertas por
miembro limita el spam serial, pero no cubre una propuesta única por el total del saldo. Debe
declararse en el modelo de amenaza como ataque conocido y no mitigado.

### Enmiendas a ADR-0010 y ADR-0011

| Documento decía | Ahora |
|---|---|
| ADR-0010: cuestión avanza al alcanzar umbral de adhesión | Cuestión avanza directamente al plantearse; sin umbral |
| ADR-0011: reserva de fondos al **admitirse** | Reserva de fondos al **plantearse** (vuelve al momento original de ADR-0007) |
| ADR-0011: techo se aprueba junto con la admisión | Techo se fija y reserva en el mismo acto de creación |

El contenido de ADR-0010 —umbral de adhesión, peso delegado como mecanismo de filtrado,
emergencia de representantes naturales— **no se descarta como idea**: se documenta en el
marco teórico y como extensión futura, con la salvedad de que su reincorporación exigiría
también revisar el momento de reserva de fondos de ADR-0011.

### Invariantes a verificar (reemplazan a los de ADR-0011)

- La suma de reservas nunca excede el saldo de la tesorería
- El techo declarado nunca excede el saldo no reservado en el momento de la creación de la
  cuestión
- Toda reserva termina liberada: por adjudicación (remanente), por "rechazar todas", por
  ausencia de ofertas, o por vencimiento
- Ninguna transferencia se dirige a una dirección fuera del registro de proveedores
- Ninguna cuestión se adjudica dos veces
- El monto adjudicado nunca excede el techo
- El peso delegado de un miembro oferente no computa en la cuestión en que ofertó

### Actualiza el núcleo de construcción de ADR-0013

La fila "Creación de propuestas" del núcleo de ADR-0013 pasa a leerse como: planteo de
cuestión con techo presupuestario, registro de proveedores, ventana de ofertas, selección
por preferencia ordenada y adjudicación — según el ciclo de cinco fases de esta ADR, en
lugar del modelo de monto fijo a destinatario único de ADR-0007.

## Referencias

- ADR-0007, ADR-0010, ADR-0011, ADR-0012, ADR-0013

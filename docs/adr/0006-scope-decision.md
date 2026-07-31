# ADR-0006: Alcance del TFG — implementar democracia líquida, analizar privacidad

- **Fecha:** 2026-07-31
- **Estado:** Aceptada
- **Enmienda a:** ADR-0003
- **Sección del TFG:** Objetivo, Límites y Alcances del Prototipo

## Contexto

Existe un borrador previo del TFG (Córdoba, 2022) que plantea una DAO para comunidades
pequeñas sobre Ethereum L1: creación de comunidad, admisión de miembros por votación,
propuestas y voto. La delegación aparece mencionada como aspiración, sin mecanismo.

El trabajo de diseño posterior incorporó privacidad del voto (Semaphore), prueba de
personeidad basada en nullifier, delegación por tema con anulación, despliegue en L2, y un
análisis de la tensión entre delegación líquida y resistencia a la coerción.

Restricciones relevantes al momento de decidir:

- El proyecto de 2022 **nunca fue aprobado** por un director de Seminario Final → no hay
  compromiso institucional con el alcance anterior
- Plazo disponible: **3 a 6 meses**
- Experiencia previa del autor con herramental ZK (circom, Semaphore, snarkjs): **ninguna**

## Alternativas consideradas

1. **A — Revisión.** Mantener el alcance 2022, corregir errores, completar secciones
   faltantes. Riesgo mínimo. Deja la delegación sin implementar y el trabajo sin
   diferenciación.
2. **B — Extensión.** Núcleo 2022 más delegación por tema real con anulación, sobre L2.
   Privacidad y coerción tratadas en marco teórico y modelo de amenaza, no implementadas.
3. **C — Reencuadre.** Democracia líquida con preservación de privacidad. Voto anónimo vía
   Semaphore implementado, registro por nullifier, modelo de amenaza explícito.
4. **D — Alcance total.** C más retroalimentación de alineación implementada más MACI.
   Descartada por inviable en el plazo disponible.

## Decisión

**Opción B con el encuadre documental de C, y una prueba de concepto acotada que puede
elevar el alcance a C.**

- **Se construye y se prueba:** registro de miembros, propuestas con tema, delegación por
  tema con respaldo general, anulación por parte del delegante, resolución de peso en
  snapshot con tope de profundidad, tope de peso acumulado, suite de invariantes, cliente
  móvil del flujo completo, mediciones de gas.
- **Se analiza sin construir:** privacidad del voto, prueba de personeidad,
  *receipt-freeness*, resistencia a la coerción, retroalimentación de alineación.
- **Condicional:** implementación ZK, sujeta a la prueba de concepto descrita abajo.

## Fundamentación

La ausencia de aprobación del proyecto 2022 elimina el costo institucional de reencuadrar.
El documento se reformula sin restricción.

El plazo de 3 a 6 meses combinado con experiencia nula en herramental ZK hace imprudente
que la graduación dependa de esa integración. El riesgo no está en la SDK de Semaphore —
que se consume como biblioteca— sino en la generación de pruebas dentro de React Native
sobre dispositivo real: bindings nativos, compilación WASM y límites de memoria.

El punto central: **la contribución más valiosa del trabajo es analítica, no de
implementación.** La tensión entre delegación y resistencia a la coerción, el modelo de
amenaza, el argumento de que la anulación privada restituye resistencia a la coerción en la
capa de delegación, y el análisis de filtración de la retroalimentación de alineación no
requieren haber implementado Semaphore. Requieren razonamiento riguroso y citación correcta.

Adicionalmente, la delegación —objeto central de la tesis— es inexistente en el borrador
2022. Implementarla y verificarla mediante invariantes es contribución de ingeniería
suficiente por sí misma.

## Prueba de concepto (spike) — puerta de decisión

Acotada a **dos semanas**, ejecutada **temprano**, no al final. Tres puntos de control:

1. Semaphore funcionando en un script Node plano
2. Verificador Solidity desplegado en Arbitrum Sepolia
3. Generación de prueba en dispositivo Android de gama media real, **medida**

- Si los tres se cumplen dentro del plazo → elevar alcance a C
- Si falla el punto 3 → permanecer en B, **con evidencia medida** para justificar la
  exclusión en *Límites y Alcances*
- Salida intermedia disponible: generación de pruebas del lado del servidor. Conserva la
  arquitectura ZK, sacrifica la propiedad de privacidad, y debe documentarse como tal

Una prueba de concepto fallida **también es un entregable**: "la generación de prueba
requirió X segundos y Y MB en dispositivo Z, excediendo umbrales de usabilidad para la
comunidad objetivo" es una justificación considerablemente más fuerte que "fuera de
alcance", y es contrastable contra la literatura sobre huella de memoria en pruebas ZK
móviles.

## Consecuencias

- Los objetivos generales y específicos del borrador 2022 deben reescribirse por completo
- El marco teórico incorpora democracia líquida, ZK, personeidad y *receipt-freeness*
  aunque no todo se implemente
- *Límites y Alcances* se vuelve una sección sustantiva, no formal
- El modelo de amenaza debe declarar explícitamente qué ataques **no** se mitigan
- El relevamiento as-is sobre una comunidad concreta pasa a ser el ítem de mayor tiempo de
  espera del cronograma: depende de agenda de terceros, no de esfuerzo propio

## Referencias

- Vijayakumaran, S. Privacy-Preserving Aadhaar-based Age Proofs — huella de memoria del
  prover en dispositivos de gama baja
- ADR-0001, ADR-0003, ADR-0005

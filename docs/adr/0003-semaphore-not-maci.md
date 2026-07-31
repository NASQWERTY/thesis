# ADR-0003: Semaphore para votación anónima; MACI excluido del prototipo

- **Fecha:** 2026-07-31
- **Estado:** Aceptada — **enmendada por ADR-0006**
- **Sección del TFG:** Límites y Alcances / Trabajo futuro

> **Nota (ADR-0006):** la exclusión de MACI se mantiene. La implementación de Semaphore
> pasó a ser **condicional**, sujeta a una prueba de concepto acotada de dos semanas.

## Contexto

Se requiere privacidad del voto. Existen dos referencias principales en el ecosistema
Ethereum: Semaphore (prueba anónima de pertenencia + señalización) y MACI (votación
on-chain resistente a colusión, con receipt-freeness).

## Alternativas consideradas

1. **Solo Semaphore** — privacidad de la papeleta, resistencia Sybil vía nullifier.
2. **Semaphore + MACI** — agrega receipt-freeness y resistencia a soborno.
3. **Diseño criptográfico propio** — fuera de alcance para un TFG de Ingeniería en Software.

## Decisión

Opción 1 para el prototipo. MACI queda **excluido explícitamente** y documentado como
exclusión justificada + trabajo futuro.

## Fundamentación

MACI requiere un coordinador que procesa y tabula mensajes cifrados. Ese coordinador es
confiable para la *privacidad*: puede descifrar votos individuales, aunque no puede
censurar ni falsificar resultados. Ese punto de centralización es incómodo en un trabajo
sobre gobernanza descentralizada, y su integración junto con democracia líquida excede el
alcance razonable de un prototipo de TFG.

Además existe tensión estructural documentada: la delegación líquida y la receipt-freeness
se oponen. Analizar esa tensión es más valioso para el trabajo que implementar MACI.

## Consecuencias

- El prototipo alcanza privacidad de papeleta, **no** receipt-freeness
- El modelo de amenaza debe declarar explícitamente que el soborno con verificación no
  está mitigado en el prototipo
- Se habilita el análisis de la tensión delegación/coerción como contribución del trabajo

## Referencias

- Semaphore whitepaper (Gurkan, WhiteHat et al.)
- Buterin, V. (2019). Minimal anti-collusion infrastructure. ethresear.ch [no revisado por pares]
- Benaloh & Tuinstra (1994) — receipt-freeness
- Juels, Catalano & Jakobsson (2005) — coercion-resistance
- Análisis crítico de MACI (tesis, University of Edinburgh) — incluir como contraargumento

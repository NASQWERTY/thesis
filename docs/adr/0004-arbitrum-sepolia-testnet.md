# ADR-0004: Arbitrum Sepolia como red objetivo — solo testnet

- **Fecha:** 2026-07-31
- **Estado:** Aceptada
- **Sección del TFG:** Límites y Alcances

## Contexto

Se requiere una red compatible con Ethereum, con costos de transacción viables para
votación frecuente y delegación por tema.

## Alternativas consideradas

1. **Ethereum L1** — costos prohibitivos para votación frecuente.
2. **Arbitrum** — mayor actividad de gobernanza DAO existente.
3. **Optimism** — alineación con RetroPGF.

## Decisión

Arbitrum Sepolia (testnet). Sin despliegue en mainnet.

## Fundamentación

Herramental completo de Ethereum, costos bajos, y Semaphore disponible. Arbitrum presenta
más actividad de gobernanza existente, útil como referencia empírica. La diferencia técnica
frente a Optimism no es determinante para este trabajo.

Testnet exclusivamente: un prototipo académico no requiere mainnet, y la ausencia de valor
económico evita cuestiones regulatorias.

## Consecuencias

- Los benchmarks de gas son representativos pero no de producción
- Migrar a Optimism sería de bajo costo si se justificara más adelante

## Referencias

- Kalodner et al. (2018). Arbitrum: Scalable, private smart contracts. USENIX Security.
- Documentación de Arbitrum; L2Beat para datos empíricos

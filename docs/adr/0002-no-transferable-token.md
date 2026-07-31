# ADR-0002: Sin token transferible — credencial de membresía no transferible

- **Fecha:** 2026-07-31
- **Estado:** Aceptada
- **Sección del TFG:** Propuesta / Límites y Alcances

## Contexto

La mayoría de las DAO usan tokens de gobernanza transferibles (patrón OpenZeppelin Governor),
donde el peso del voto es proporcional a la tenencia.

## Alternativas consideradas

1. **Token ERC-20 de gobernanza** — herramental estándar disponible (Tally, Governor).
2. **NFT soulbound (no transferible)** — artefacto on-chain de membresía.
3. **Sin token; membresía como compromiso de identidad en un árbol de Merkle (Semaphore).**

## Decisión

Opción 3, con opción 2 disponible si se requiere un artefacto on-chain visible.
**No se emite ningún token transferible.**

## Fundamentación

Un token transferible vuelve comprable el poder de voto. Eso contradice directamente la
premisa de una persona = un voto y el objetivo de equidad del trabajo. Adoptar el herramental
estándar de DAO habría implicado adoptar también su modelo plutocrático.

Consecuencia adicional: al no existir activo de valor económico, el prototipo queda fuera
de cualquier discusión regulatoria sobre emisión de tokens en Argentina.

## Consecuencias

- No se puede reutilizar Governor/Tally — se requieren contratos propios
- Se elimina el vector de compra de votos por mercado secundario
- El registro de membresía se vuelve el punto crítico de control

## Referencias

- Worldcoin whitepaper — crítica a la gobernanza *un token, un voto*
- Weyl, Ohlhaver & Buterin (2022). Decentralized Society: Finding Web3's Soul (soulbound)

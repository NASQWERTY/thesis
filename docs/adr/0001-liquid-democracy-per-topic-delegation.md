# ADR-0001: Democracia líquida con delegación por tema

- **Fecha:** 2026-07-31
- **Estado:** Aceptada
- **Sección del TFG:** Propuesta / Marco Teórico Referencial

## Contexto

El sistema debe permitir participación directa y también representación, sin obligar a
cada miembro a formar opinión sobre cada propuesta.

## Alternativas consideradas

1. **Democracia directa pura** — sin delegación. Simple, pero alta carga sobre cada miembro
   y baja participación efectiva.
2. **Delegación global única** — un delegado para todo. Simple de implementar, pero ignora
   que la confianza es específica por dominio.
3. **Delegación por tema con respaldo general** — mapping `delegacion[miembro][tema] → delegado`
   con fallback a un delegado general.

## Decisión

Opción 3. Voto directo siempre disponible, delegación revocable en cualquier momento,
delegación por tema con respaldo general, override del delegante siempre posible.

## Fundamentación

Blum y Zuber definen la delegación flexible (por tema, por área, o global) y la revocación
instantánea como componentes constitutivos de la democracia líquida. El costo adicional en
gas es aceptable en L2.

Las cadenas de delegación transitiva introducen complejidad (ciclos, profundidad). Se
mitigan con tope de profundidad y resolución en el momento del snapshot.

## Consecuencias

- Cálculo de peso por propuesta según su tema
- Se requiere resolución de ciclos y tope de profundidad — verificable por invariantes
- Habilita el análisis sobre concentración de poder en superdelegados

## Referencias

- Blum, C. & Zuber, C. I. (2016). Liquid Democracy: Potentials, Problems, and Perspectives.
  *Journal of Political Philosophy*, 24(2), 162-182.
- Christoff, Z. & Grossi, D. (2017). Binary Voting with Delegable Proxy. TARK.
- Gölz, P. et al. The Fluid Mechanics of Liquid Democracy.

# ADR-0022: Método de escrutinio — Schulze

- **Fecha:** 2026-11-02
- **Estado:** Aceptada
- **Precisa:** ADR-0020
- **Relacionada con:** ADR-0011, ADR-0019
- **Sección del TFG:** Descripción del sistema (HU-008) / Marco Teórico Referencial

## Contexto

ADR-0020 fijó qué produce el escrutinio ante cada entrada —la mayoría opera dentro de cada
comparación por pares, y si no hay un ganador único la cuestión cierra sin adjudicación— pero
difirió al Entregable 4 **cómo** se calcula el ganador: Schulze completo o un Condorcet simple.

Ambos parten de la misma matriz de comparaciones por pares: para cada par de candidatos (a, b),
el peso total de los votantes que ubican a por encima de b. Los candidatos son las ofertas de la
cuestión más "rechazar todas". Difieren en lo que hacen cuando no existe un candidato que gane
todos sus duelos (ciclo).

## Alternativas consideradas

1. **Condorcet simple** — gana el candidato que vence a todos los demás en comparación directa.
   Si no existe, no hay ganador único y la cuestión cierra sin adjudicación. Más simple de
   implementar y de explicar; ante un ciclo, la comunidad debe volver a plantear la cuestión.
2. **Schulze** — si no hay un ganador directo, compara la fuerza de las *cadenas* de victorias
   entre candidatos y elige al que tiene las cadenas más fuertes. Resuelve la mayoría de los
   ciclos; solo queda sin ganador ante un empate entre cadenas.

## Decisión

El escrutinio se calcula con el **método Schulze**. Si aun así no hay un ganador único (empate),
la cuestión cierra sin adjudicación y libera la reserva, como establece ADR-0020.

## Fundamentación

**Coincide con Condorcet cuando hay un ganador claro.** Si un candidato vence a todos los demás en
comparación directa, Schulze lo elige. Las dos alternativas solo difieren ante un ciclo.

**Ante un ciclo, una preferencia existe aunque no sea unánime.** Ejemplo, con tres ofertas A, B
y C y boletas de peso 4 (A > B > C), 3 (B > C > A) y 2 (C > A > B): A vence a B 6–3, B vence a
C 7–2 y C vence a A 5–4. Con Condorcet simple nadie gana y la cuestión se repite completa
—plazos de oferta y de votación incluidos—. Con Schulze, la cadena A → B → C tiene fuerza 6
(su eslabón más débil), mayor que la victoria directa de C sobre A (5), y A resulta ganadora.
Repetir el proceso tiene un costo real para la comunidad; Schulze lo evita sin dejar de respetar
las comparaciones por pares.

**Se mantiene el cierre conservador.** El empate sigue sin adjudicar. ADR-0020 ya anticipaba
este escenario: con Schulze, el caso "sin ganador único" simplemente ocurre menos veces.

**El costo de implementación es acotado.** El cálculo de las cadenas más fuertes es un
Floyd–Warshall sobre la matriz de pares, O(n³) con n = ofertas + 1. Con el límite operativo de
alrededor de cinco ofertas por cuestión, son a lo sumo unos pocos cientos de operaciones.

**Tiene antecedente en sistemas de democracia líquida.** Es el método que utiliza
LiquidFeedback (Behrens et al., 2014), ya citado como antecedente en ADR-0011 y ADR-0020.

## Consecuencias

- El escrutinio se implementa como una función pura sobre (boletas, pesos, cantidad de
  candidatos), testeable de forma aislada con casos construidos: ganador claro, ciclo resuelto
  por Schulze, ciclo simétrico con pesos iguales (empate, sin adjudicación), gana "rechazar
  todas", una sola oferta contra "rechazar todas" (mayoría simple).
- El criterio de aceptación de HU-008 no cambia: "si el escrutinio no produce un ganador único,
  cierra sin adjudicación" sigue siendo verdadero.
- El documento debe explicar el método al describir el escrutinio. El ejemplo de esta ADR sirve
  como caso ilustrativo.

## Referencias

- Behrens, J., Kistner, A., Nitsche, A. & Swierczek, B. (2014). *The Principles of LiquidFeedback*.
- Schulze, M. (2011). A new monotonic, clone-independent, reversal symmetric, and
  Condorcet-consistent single-winner election method. *Social Choice and Welfare, 36*(2),
  267–303. — *Verificar los datos bibliográficos contra la fuente antes de citarla en el TFG.*
- ADR-0011, ADR-0019, ADR-0020

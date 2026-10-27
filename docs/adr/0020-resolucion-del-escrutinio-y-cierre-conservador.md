# ADR-0020: Resolución del escrutinio — la mayoría opera por pares, y toda ambigüedad cierra sin adjudicación

- **Fecha:** 2026-09-26
- **Estado:** Aceptada
- **Enmienda a:** ADR-0007
- **Precisa:** ADR-0011, ADR-0016
- **Relacionada con:** ADR-0014, ADR-0019
- **Sección del TFG:** Descripción del sistema (HU-008) / Marco Teórico Referencial / Modelo de amenaza

## Contexto

ADR-0007 definió la condición de aprobación como *"mayoría más quórum mínimo de participación"*,
formulada cuando la propuesta era binaria: aprobar o rechazar una transferencia de monto fijo.
ADR-0011 reemplazó ese modelo por selección entre ofertas mediante **preferencia ordenada**, con
Schulze como antecedente y "rechazar todas" como candidato regular.

Las dos afirmaciones no encajan. En un método por preferencia ordenada no existe un umbral global
de mayoría: el ganador se determina comparando candidatos de a pares. Exigir "mayoría" *además* del
escrutinio por preferencia obliga a definir mayoría de qué, y ninguna ADR lo hacía.

Al detallar HU-008 aparecieron además dos resultados posibles del escrutinio que no tenían regla:
el **ciclo** —A le gana a B, B a C y C a A, la paradoja de Condorcet— y el **empate**.

## Decisión

### La mayoría opera dentro de cada comparación por pares

No hay umbral global de mayoría. Cada duelo entre dos candidatos se decide por mayoría del peso
expresado, y el ganador es quien gana todas sus comparaciones. El único umbral global que se
mantiene es el **quórum**.

### Ante la ambigüedad, el sistema no gasta

Si el escrutinio no produce un ganador único —por ciclo o por empate—, la cuestión **cierra sin
adjudicación y se libera la reserva**.

Con esto, los cuatro caminos de cierre sin adjudicación son: no hubo ofertas, no se alcanzó el
quórum, ganó "rechazar todas", o el escrutinio no produjo un ganador único. En los cuatro se libera
la reserva.

### El método de resolución queda diferido

La elección entre implementar Schulze completo —que resuelve los ciclos buscando las cadenas de
victorias más fuertes— o un Condorcet simple que caiga en el cierre sin adjudicación ante el ciclo,
es una decisión de implementación y se toma en el Entregable 4, con ADR propia.

Por eso el criterio de aceptación de HU-008 se redacta como **"si el escrutinio no produce un
ganador único, cierra sin adjudicación"**, formulación verdadera bajo ambas opciones: con Schulze
ese caso simplemente ocurre pocas veces.

## Fundamentación

**Es una decisión de diseño, no cuatro casos de borde.** Las cuatro salidas sin adjudicación
responden al mismo principio: el sistema no mueve fondos de la comunidad cuando la comunidad no
expresó una preferencia inequívoca. Presentado así se defiende solo; presentado como excepciones
sueltas parece un conjunto de parches.

**Sostiene la coherencia con "rechazar todas" como candidato regular.** ADR-0011 ya había convertido
el no-adjudicar en un resultado legítimo del mecanismo, no en un caso especial. Resolver el ciclo y
el empate por el mismo camino extiende ese criterio en lugar de contradecirlo.

**Diferir el método no deja el comportamiento indefinido.** Lo que el escrutinio produce ante cada
entrada queda especificado; lo que falta decidir es cómo se calcula. La frontera es la habitual: un
criterio de aceptación describe un resultado observable, y dos implementaciones que produzcan
resultados distintos para la misma entrada no difieren en implementación.

## Consecuencias

### Enmienda a ADR-0007

| Documento decía | Ahora |
|---|---|
| Condición de aprobación: mayoría más quórum mínimo de participación | Quórum como único umbral global; la mayoría opera dentro de cada comparación por pares del escrutinio por preferencia ordenada |

### Entrada al modelo de amenaza

La resolución conservadora **favorece a quien quiera bloquear un gasto**: no necesita ganar la
votación, le alcanza con producir ambigüedad. El costo está acotado, porque la reserva se libera al
cierre y la tesorería no queda comprometida más allá del plazo, pero corresponde declararlo junto a
los demás ataques conocidos y no mitigados.

### Pendiente

**El valor del quórum sigue sin definir.** ADR-0007 lo nombró sin fijarlo y HU-008 lo necesita.
Corresponde fijarlo como parámetro del contrato, igual que los plazos de ADR-0018.

### Invariantes a verificar

- Toda cuestión cerrada sin ganador único libera su reserva y no adjudica
- Un empate no adjudica
- Ninguna cuestión adjudica sin haber alcanzado el quórum
- "Rechazar todas" compite en el escrutinio como un candidato más

## Referencias

- Behrens, J., Kistner, A., Nitsche, A. & Swierczek, B. (2014). *The Principles of LiquidFeedback*
  — método Schulze
- ADR-0007, ADR-0011, ADR-0014, ADR-0016, ADR-0019

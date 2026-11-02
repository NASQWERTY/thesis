# ADR-0023: Quórum como porcentaje del peso habilitado en el snapshot

- **Fecha:** 2026-11-02
- **Estado:** Aceptada
- **Precisa:** ADR-0020
- **Relacionada con:** ADR-0015, ADR-0018, ADR-0019
- **Sección del TFG:** Descripción del sistema (HU-008, diccionario de datos)

## Contexto

ADR-0020 dejó el quórum como único umbral global del escrutinio, pero sin valor: "corresponde
fijarlo como parámetro del contrato, igual que los plazos de ADR-0018". El diccionario de datos
del Entregable 3 lo modelaba como un número absoluto de unidades de peso (`quorum: uint32`).

El padrón no es fijo: el registrador da de alta y de baja miembros, cambia pesos e inhabilita a
los morosos (ADR-0015). El peso habilitado total varía con el tiempo, mientras que un parámetro
del contrato queda fijo desde el despliegue.

## Alternativas consideradas

1. **Quórum absoluto** — un peso mínimo fijo. Simple, pero desacoplado del padrón: si crece la
   morosidad puede volverse inalcanzable y bloquear toda adjudicación; si el padrón crece, queda
   bajo y deja de cumplir su función.
2. **Quórum porcentual** — un porcentaje del peso total habilitado en el snapshot de cada
   cuestión. Se ajusta solo a los cambios del padrón.

## Decisión

El quórum es un **porcentaje del peso total habilitado en el snapshot** de la cuestión, fijado
en el despliegue (`QUORUM_PERCENT`, inmutable, entre 1 y 100). El valor del prototipo es
**50 %**.

Se alcanza cuando el peso expresado —propio más delegado, según la resolución de HU-008— es
mayor que cero y es mayor o igual que ese porcentaje del total. El cálculo es entero y redondea
hacia arriba: con un peso habilitado de 7 y 50 %, se necesitan 4.

## Fundamentación

**Mide participación relativa, que es lo que el quórum representa.** El quórum no pretende fijar
un número de votantes sino asegurar que una fracción suficiente de la comunidad se expresó. Un
porcentaje expresa esa idea directamente y no requiere reconfigurar nada cuando el padrón cambia.

**Usa la misma referencia que el resto del escrutinio.** El total se toma en el snapshot de la
cuestión (ADR-0018), igual que los pesos individuales. Los cambios del padrón posteriores a la
creación no alteran ni los pesos ni el umbral de esa cuestión.

**La delegación cuenta para el quórum.** El peso de un delegante que no votó se computa a favor
de su delegado si este votó (ADR-0019). Delegar es una forma de participar, y el quórum lo
reconoce.

**El valor es un parámetro del despliegue.** El 50 % es el valor elegido para el prototipo. Para
una comunidad real, el valor debería surgir de sus propias reglas de decisión; el contrato lo
recibe como parámetro, sin cambios de código.

## Consecuencias

- Cambia el diccionario de datos: `quorum: uint32` (peso absoluto) pasa a
  `QUORUM_PERCENT: uint8` (porcentaje, inmutable). Cambia también el constructor.
- El cierre anticipado por participación total de ADR-0016 (peso expresado igual al total del
  snapshot) no se ve afectado: con participación total el quórum siempre se alcanza.
- Una cuestión sin peso expresado nunca alcanza el quórum, aunque el total habilitado sea cero.

## Referencias

- ADR-0015, ADR-0016, ADR-0018, ADR-0019, ADR-0020

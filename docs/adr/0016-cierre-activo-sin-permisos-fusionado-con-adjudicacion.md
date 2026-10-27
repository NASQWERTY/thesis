# ADR-0016: Cierre activo sin permisos, fusionado con la adjudicación — se agrega cierre anticipado por participación total

- **Fecha:** 2026-09-25
- **Estado:** Aceptada
- **Enmienda a:** ADR-0007, ADR-0014
- **Relacionada con:** ADR-0001, ADR-0013, ADR-0015
- **Sección del TFG:** Descripción del sistema (Product Backlog, HU-008) / Modelo de amenaza

## Contexto

ADR-0007 fijó la ejecución diferida: período de votación fijo y, al cierre, *"cualquiera puede
ejecutar en una transacción separada"*. ADR-0014 describió el ciclo de vida en cinco fases, con
la fase de **adjudicación** definida como *"se transfiere al oferente seleccionado"*, es decir,
determinación del ganador y transferencia en un mismo acto.

Ninguna de las dos resuelve **cómo ocurre el cierre en sí**. Al detallar el Product Backlog
apareció el problema: **un contrato en una EVM no puede dispararse solo al vencer un plazo.** No
existe temporizador ni proceso en segundo plano. Lo único posible es que el contrato *verifique*
la condición (`block.timestamp` contra el plazo) cuando alguien le envía una transacción. Por lo
tanto "la votación se cierra cuando vence el plazo" no es implementable de forma literal: la
transición de estado requiere que alguien la provoque y pague su gas.

Surgió además una condición de cierre adicional no contemplada: si ya se expresó el total del
peso habilitado, esperar al vencimiento del plazo no agrega información.

## Alternativas consideradas

1. **Cierre pasivo (evaluación diferida).** No existe función de cierre. La siguiente llamada que
   toque la cuestión —típicamente la de ejecución de la transferencia— verifica el plazo y
   resuelve el resultado en el mismo paso. Menos transacciones, pero el estado de la cuestión
   queda indeterminado hasta que alguien la toque, no hay un evento de cierre en un momento
   definido, y la lógica de adjudicación queda dentro de la transacción que mueve fondos,
   acoplando dos responsabilidades con modos de falla distintos.
2. **Cierre a cargo de un rol designado** (administrador, o el miembro que planteó la cuestión).
   Se descarta: un administrador reintroduce un punto de control que el núcleo no tiene en ningún
   otro paso, y cualquier actor único —incluido el proponente— convierte el cierre en una
   dependencia de liveness sobre una sola persona.
3. **Cierre activo sin permisos, fusionado con la adjudicación.** Una función de cierre que
   cualquiera puede invocar cuando se cumple alguna de las dos condiciones, y que en la misma
   transacción determina el resultado.

## Decisión

**Opción 3.**

### Cierre

- El cierre es una **función pública sin restricción de rol**: puede invocarla cualquier
  dirección, sea miembro, proveedor o un tercero.
- Procede si se cumple **alguna** de estas condiciones:
  - venció el plazo de votación, o
  - el peso expresado igualó el peso total habilitado en el snapshot de la cuestión.
- Una vez cerrada, la cuestión no acepta más votos y no puede cerrarse de nuevo.

### Fusión con la adjudicación

El cierre y la adjudicación ocurren en **una sola transacción**. La adjudicación es
determinística a partir del recuento —selección por preferencia ordenada, con "rechazar todas"
como candidato regular (ADR-0014)—, de modo que no requiere ninguna decisión externa que
justifique un paso aparte.

### La ejecución de la transferencia sigue siendo un paso separado

Se mantiene sin cambios respecto de ADR-0007: la transferencia al oferente adjudicado es una
transacción distinta, también invocable por cualquiera.

## Fundamentación

**Que el cierre no tenga permisos no es una concesión, es lo correcto.** Cerrar no decide nada:
fija el resultado que el estado on-chain ya determina. Quien invoca la función no puede alterar
el resultado a su favor, solo confirmar uno que ya existe. Por eso la función valida la
condición, no al llamante. Es además el patrón que ADR-0007 ya había adoptado para la ejecución,
de modo que no se introduce un actor nuevo: se extiende un criterio ya establecido.

**Separar cierre de ejecución preserva el fundamento de ADR-0007.** La razón original de la
ejecución diferida era que la transacción que cruza el umbral no sea la que mueve los fondos,
para no identificar al último votante por el gas pagado. Con el cierre como paso propio ese
fundamento se mantiene, y se agrega otro: los modos de falla del recuento y los de la
transferencia quedan aislados.

**Fusionar cierre y adjudicación evita un paso sin contenido decisorio.** La alternativa —tres
transacciones: cerrar, adjudicar, transferir— agregaría una transacción cuyo único efecto sería
ejecutar un cálculo que ya podía hacerse en la anterior.

## Consecuencias

### Enmienda a ADR-0007

| Documento decía | Ahora |
|---|---|
| Ejecución: período de votación fijo; al cierre, cualquiera puede ejecutar en una transacción separada | Período de votación fijo; el cierre es una transacción propia sin permisos que además adjudica; la ejecución de la transferencia es una segunda transacción, también sin permisos |
| El cierre ocurre al vencer el plazo | El cierre procede al vencer el plazo **o** al expresarse el total del peso habilitado, y requiere una transacción que lo provoque |

### Enmienda a ADR-0014

La fase de **adjudicación** del ciclo de vida se desdobla: el cierre y la adjudicación determinan
y registran el ganador sin mover fondos, y la transferencia al oferente con liberación del
remanente pasa a la fase de ejecución. El ciclo sigue teniendo cinco fases nominales, pero la
adjudicación ya no incluye la transferencia.

### Riesgo aceptado: la cuestión puede quedar sin cerrar

Si el resultado no le conviene reclamar a nadie —ganó "rechazar todas", no hubo ofertas, o no se
alcanzó el quórum— es posible que ninguna dirección tenga incentivo económico para pagar el gas
del cierre, y la reserva de fondos permanezca retenida indefinidamente.

Mitigación evaluada y **no adoptada**: recompensar a quien cierra con una fracción de la
tesorería. Agrega fuga de fondos y un parámetro nuevo a calibrar, para un problema que en una
comunidad de menos de 50 miembros con interés directo en liberar la reserva es de probabilidad
baja.

**Se acepta el riesgo y se declara** en el modelo de amenaza, en los mismos términos que el
bloqueo de tesorería por propuesta única de ADR-0007 y ADR-0014.

### Sobre la condición de participación total

Requiere conocer el peso total habilitado en el snapshot, lo cual es posible porque el padrón es
un conjunto acotado de pesos conocidos (ADR-0015).

Hay un caso que conviene tener presente: el peso de un delegante solo se expresa si el delegado
efectivamente vota. Si un delegado no vota, ese peso nunca se expresa y la condición de
participación total resulta inalcanzable. No es un defecto: simplemente la cuestión cierra por
vencimiento del plazo, que es el camino por defecto.

### Invariantes a verificar

- El cierre procede únicamente si venció el plazo o si el peso expresado igualó el peso total
  habilitado en el snapshot
- Ninguna cuestión se cierra dos veces
- No se aceptan votos después del cierre
- La adjudicación ocurre en la misma transacción que el cierre y no se modifica después
- El cierre no depende de la identidad de quien lo invoca
- Ninguna transferencia se ejecuta sobre una cuestión no cerrada

### Impacto en el Product Backlog

Corresponde a HU-008 (*Cierre y adjudicación de la votación*), con HU-009 (*Ejecución de la
transferencia*) dependiendo de ella.

## Referencias

- ADR-0001, ADR-0007, ADR-0013, ADR-0014, ADR-0015

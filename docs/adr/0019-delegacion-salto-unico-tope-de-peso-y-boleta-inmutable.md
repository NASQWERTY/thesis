# ADR-0019: Delegación de salto único con tope de peso acumulado, y separación entre boleta y peso

- **Fecha:** 2026-09-26
- **Estado:** Aceptada
- **Enmienda a:** ADR-0001, ADR-0012
- **Precisa:** ADR-0011, ADR-0015, ADR-0018
- **Relacionada con:** ADR-0007, ADR-0014, ADR-0016
- **Sección del TFG:** Descripción del sistema (HU-005 a HU-008) / Marco Teórico Referencial / Modelo de amenaza

## Contexto

ADR-0001 estableció delegación con cadenas transitivas, mitigadas con tope de profundidad y
resolución de ciclos. ADR-0012 eliminó la delegación por tema pero **conservó explícitamente** la
transitividad, el tope de profundidad y la resolución de ciclos como trabajo de contratos.

Al detallar HU-005 a HU-008 aparecieron cuatro problemas:

1. La transitividad obliga a resolver ciclos y a topar la profundidad, y el cómputo de peso deja
   de ser una suma para volverse un recorrido de grafo. Es la parte más cara del núcleo y no la
   requiere ninguna contribución del trabajo.
2. Nunca se decidió si el tope de peso acumulado —que ADR-0007 usa para acotar el análisis de
   coerción y que ADR-0012 respalda con los datos de LiquidFeedback— se implementa.
3. **Inmutabilidad del voto y override se contradicen.** Si el voto emitido es inmutable y el
   delegante puede votar directo después de que su delegado ya votó, el peso con que computa el
   voto del delegado tiene que cambiar, lo que parece violar la inmutabilidad.
4. ADR-0011 declara las ofertas definitivas una vez presentadas, sin decir cuántas puede presentar
   un proveedor por cuestión. Sin ese límite, la definitividad se evade presentando una segunda.

## Decisión

### Delegación de salto único, con regla bidireccional

**Una dirección no puede ser delegante y delegado al mismo tiempo.** Quien tiene peso delegado
recibido no puede delegar, y quien ya delegó no puede recibir delegaciones.

Esto elimina la transitividad, el tope de profundidad y la resolución de ciclos.

### Tope de peso acumulado por delegado

Un delegado no puede acumular más de **un tercio del peso total habilitado**. La verificación
ocurre en el momento de delegar: si el peso ya acumulado por el delegado más el del delegante
supera el tope, la delegación se rechaza.

### La delegación se resuelve en el snapshot

Si el delegado no figura habilitado en el snapshot de la cuestión, el peso queda con el delegante
y la delegación no tiene efecto en esa cuestión. Un cambio en el padrón posterior al snapshot no
altera esa resolución (ADR-0018).

### La boleta es inmutable; el peso se resuelve al cierre

Al votar se registra únicamente la boleta —el orden de preferencias—, que no puede modificarse. El
peso con que esa boleta computa se calcula en el cierre (ADR-0016), cuando ya se sabe quién votó
directo. **Si un miembro vota por su cuenta, su delegación no cuenta para esa cuestión.**

### Una oferta por proveedor por cuestión

## Fundamentación

**La regla bidireccional hace del salto único un invariante estructural, no una truncación.** Un
tope de profundidad recorta cadenas que el sistema igual permite formar, y obliga a decidir qué
pasa con el peso que queda más allá del corte. Prohibir que una dirección sea delegante y delegado
a la vez impide que la cadena exista, y el cómputo de peso vuelve a ser una suma sobre los
delegantes directos. Falta la mitad inversa de la regla para que funcione: si A delega en B y luego
C delega en A, hay una cadena C→A→B formada por la puerta de atrás.

**Costo asumido:** se pierde la expresividad de las cadenas, que Blum y Zuber cuentan entre las
propiedades de la democracia líquida. Se trata de manera analítica en el marco teórico, junto con
la delegación por tema ya excluida por ADR-0012, sin implementarla.

**El tope le devuelve la cota al análisis de coerción.** Sin tope, un delegado capturado puede
movilizar el total del peso delegable, y la afirmación de seguridad de ADR-0007 —que el tope de
peso acumulado es *una cota sobre el valor que un delegado capturado puede movilizar*— se queda sin
contenido. Un tercio es el umbral que garantiza que ningún delegado alcance por sí solo la mayoría.
El hallazgo de Kling et al. sobre concentración en pocos superdelegados, con coeficientes de Gini
superiores a 0,8, es lo que respalda tener un tope, según ya señalaba ADR-0012.

**Separar boleta de peso resuelve la contradicción del punto 3 sin resignar ninguna de las dos
propiedades.** Lo que el votante no puede cambiar es su orden de preferencias; cuánto pesa se
determina al cierre. Además concentra todo el cómputo de peso en un solo lugar del contrato, lo que
reduce la superficie a verificar: HU-007 solo registra boletas.

## Consecuencias

### Enmienda a ADR-0001 y ADR-0012

| Documento decía | Ahora |
|---|---|
| Cadenas de delegación transitivas, con tope de profundidad y resolución de ciclos | Delegación de salto único; una dirección no puede ser delegante y delegado a la vez. Sin transitividad, sin tope de profundidad, sin resolución de ciclos |
| Tope de peso acumulado mencionado sin definir si se implementa | Se implementa, fijado en un tercio del peso total habilitado, verificado al delegar |

### La delegación pasa a ser por orden de llegada

Si un delegado ya alcanzó el tope, quien quiera delegarle recibe un rechazo y debe elegir a otro o
votar directo. Es una consecuencia inevitable de cualquier tope y debe declararse.

### Caso de borde aceptado

El tope se verifica al delegar, contra el peso total habilitado de ese momento. Si el padrón se
reduce después, un delegado puede quedar por encima del tope vigente sin haber hecho nada. Se
acepta y se declara: revisar el tope en cada snapshot agregaría la pregunta de qué peso truncar y a
quién, que no tiene respuesta neutral.

### Invariantes a verificar

- Ninguna dirección es simultáneamente delegante y delegado
- El peso acumulado por un delegado no supera el tope en el momento de delegar
- El peso de un delegante cuyo delegado no está habilitado en el snapshot queda con el delegante
- Una boleta emitida no se modifica
- Si un miembro votó directo, su peso no computa para su delegado en esa cuestión
- Un proveedor no presenta más de una oferta por cuestión
- La suma de pesos computados en una cuestión no excede el peso total habilitado de su snapshot

### Impacto en el Product Backlog

HU-005 suma los criterios de la regla bidireccional y del tope. HU-007 pierde el cómputo de peso,
que pasa a HU-008. **Conviene revisar las estimaciones:** HU-007 debería bajar de 13 y HU-008
subir, porque toda la resolución de peso —delegaciones, overrides, suspensión del oferente— queda
ahora del lado del cierre.

## Referencias

- Blum, C. & Zuber, C. I. (2016). Liquid Democracy: Potentials, Problems, and Perspectives.
  *Journal of Political Philosophy*, 24(2), 162-182
- Kling, C., Kunegis, J., Hartmann, H., Strohmaier, M. & Staab, S. (2015). Voting Behaviour and
  Power in Online Democracy. *ICWSM* (arXiv:1503.07723)
- ADR-0001, ADR-0007, ADR-0011, ADR-0012, ADR-0014, ADR-0015, ADR-0016, ADR-0018

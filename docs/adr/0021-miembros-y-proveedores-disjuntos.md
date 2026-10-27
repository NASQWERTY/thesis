# ADR-0021: Miembros y proveedores son conjuntos disjuntos — se elimina la suspensión de peso del oferente

- **Fecha:** 2026-09-28
- **Estado:** Aceptada
- **Enmienda a:** ADR-0011, ADR-0014
- **Precisa:** ADR-0015, ADR-0017, ADR-0019
- **Sección del TFG:** Descripción del sistema (HU-002, HU-008) / Estructura de datos / Objetivo, Límites y Alcances / Modelo de amenaza

## Contexto

ADR-0011 permitió que un miembro presentara ofertas y, para acotar el conflicto de interés,
estableció que **ofertar suspende su peso delegado para esa cuestión**, conservando su voto
propio. ADR-0014 mantuvo la regla y la incorporó a sus invariantes; ADR-0017 la declaró sin
cambios; ADR-0019 la ubicó dentro de la resolución de peso del cierre (HU-008).

Al modelar la estructura de datos, la regla exige un dato propio —una marca por cuestión y por
dirección, o su derivación a partir de las ofertas presentadas— y un caso adicional en el cómputo
de peso, que es la parte del contrato con más invariantes.

En el caso relevado, quienes plantean una cuestión son propietarios y quienes ofertan son
empresas o prestadores externos al consorcio. El autor no prevé que un mismo miembro cumpla
ambos roles en el uso práctico del sistema.

Por otra parte, ADR-0017 dejó ambos registros —padrón y proveedores— a cargo del mismo
registrador, por lo que la separación puede verificarse en el momento del alta.

## Alternativas consideradas

1. **Mantener la suspensión de peso delegado (ADR-0011).** Admite el caso del vecino proveedor,
   pero agrega estado y un caso más a la resolución de peso para un escenario que no aparece
   en el uso previsto.
2. **Excluir por completo el voto del miembro oferente en esa cuestión.** Neutraliza mejor el
   conflicto, pero conserva la misma complejidad y además priva a un propietario de su voto.
3. **Conjuntos disjuntos: una dirección no puede estar a la vez en el padrón y en el registro de
   proveedores.**

## Decisión

**Opción 3.**

- Al dar de alta un proveedor, se rechaza cualquier dirección **registrada en el padrón**, esté
  habilitada o no.
- Al dar de alta un miembro, se rechaza cualquier dirección registrada como proveedor.
- Como presentar una oferta ya exige pertenecer al registro de proveedores (ADR-0011), ningún
  miembro puede ofertar y ningún proveedor puede votar ni recibir delegaciones.
- **Se elimina la suspensión de peso delegado del oferente.**

La verificación se hace contra la pertenencia al padrón y no contra la habilitación: de lo
contrario, un miembro inhabilitado por morosidad podría registrarse como proveedor y, al ser
rehabilitado, ocupar ambos roles.

## Fundamentación

**El conflicto de interés desaparece por construcción, no por compensación.** La suspensión
admitía el conflicto y luego reducía su efecto; la separación impide que ocurra. Es el mismo
criterio que ADR-0019 aplicó a la delegación: preferir un invariante estructural a una regla
correctiva.

**Reduce la superficie del cómputo de peso.** El cierre (ADR-0016, ADR-0019) deja de consultar
las ofertas presentadas para resolver pesos; la resolución vuelve a depender solo de boletas,
delegaciones y snapshot.

**Refleja el uso previsto.** En el caso de referencia, los roles de propietario y proveedor
corresponden a personas distintas.

## Consecuencias

### La separación es por dirección, no por persona

Una persona que sea a la vez propietaria y proveedora puede operar con dos direcciones distintas,
y el prototipo no puede impedirlo, porque no verifica identidad (ADR-0015). Es la misma limitación
que ya se declara para el padrón, y su resolución depende de la misma vía de producción: una
verificación de identidad real que vincule direcciones con personas. Debe declararse en Límites y
Alcances y en el modelo de amenaza.

Dentro del prototipo, la separación depende del registrador, que es quien carga ambos registros
(ADR-0017). No agrega una facultad nueva: es una restricción sobre una facultad que ya tenía.

### Enmienda a ADR-0011 y ADR-0014

| Documento decía | Ahora |
|---|---|
| ADR-0011: miembro que oferta permitido; ofertar suspende su peso delegado para esa cuestión | Un miembro no puede estar en el registro de proveedores; no existe el miembro oferente |
| ADR-0014, fase Selección: el peso delegado de un miembro oferente se suspende para esa cuestión | Sin suspensión |
| ADR-0014, invariante: el peso delegado de un miembro oferente no computa en la cuestión en que ofertó | Reemplazado por los invariantes de esta ADR |

### Precisiones a ADR-0015, ADR-0017 y ADR-0019

- **ADR-0015 y ADR-0017:** el alta en cada registro verifica la ausencia en el otro.
- **ADR-0017:** la frase que declara sin cambios la suspensión del peso delegado del oferente
  queda superada.
- **ADR-0019:** la resolución de peso de HU-008 ya no incluye la suspensión del oferente.

### Estructura de datos

No se requiere ningún campo ni mapping para la suspensión. Alcanza con las dos verificaciones en
las funciones de alta.

### Impacto en el Product Backlog

- **HU-001 y HU-002** suman un criterio de aceptación cada una: el rechazo del alta cruzada.
- **HU-008** pierde el caso de suspensión en la resolución de peso; su estimación puede bajar
  respecto de lo que sugería ADR-0019.

### Invariantes a verificar

- Ninguna dirección figura a la vez en el padrón y en el registro de proveedores
- El alta de un proveedor se rechaza si la dirección está registrada en el padrón, esté
  habilitada o no
- El alta de un miembro se rechaza si la dirección está registrada como proveedor
- Ninguna oferta proviene de una dirección del padrón

### Reversión

Reincorporar al miembro oferente consiste en quitar las dos verificaciones de alta y volver a
agregar la suspensión en la resolución de peso del cierre, según ADR-0011. No afecta la
estructura del registro de proveedores ni del padrón.

## Referencias

- ADR-0011, ADR-0014, ADR-0015, ADR-0016, ADR-0017, ADR-0019

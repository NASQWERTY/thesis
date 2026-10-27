# ADR-0017: Registro de proveedores precargado por el registrador — la admisión por votación queda como vía modelada

- **Fecha:** 2026-09-25
- **Estado:** Aceptada
- **Enmienda a:** ADR-0007, ADR-0011
- **Relacionada con:** ADR-0013, ADR-0014, ADR-0015, ADR-0016
- **Sección del TFG:** Objetivo, Límites y Alcances / Descripción del sistema (HU-002) / Modelo de amenaza

## Contexto

ADR-0007 estableció la lista blanca de destinatarios y definió un **segundo tipo de
propuesta**: la incorporación de una dirección a esa lista, *"con las mismas reglas que una
propuesta de gasto"*, es decir votada con quórum y mayoría. ADR-0011 identificó esa lista
blanca con el registro de proveedores y sostuvo que *"admitir un proveedor es, con razón, una
decisión comunitaria"*, con admisión global y única, dejando la baja de proveedores fuera de
alcance.

ADR-0015 resolvió el padrón de miembros de otra manera: como una lista de direcciones cargada
por un registrador mediante un simulador de empadronamiento, declarando que la verificación
real queda como vía de producción.

Al detallar el Product Backlog apareció el costo de mantener la admisión por votación: exige un
**segundo recorrido de votación**, binario sobre una dirección, distinto de la preferencia
ordenada sobre ofertas que usa la cuestión. Además reordena la construcción, porque los
proveedores son precondición de las ofertas y las ofertas lo son de la votación.

## Alternativas consideradas

1. **Admisión por votación, fiel a ADR-0007 y ADR-0011.** Agrega un tipo de propuesta y una vía
   de votación propia, justo en la dimensión que ADR-0013 venía recortando.
2. **Admisión por el registrador, sin más.** Barato, pero contradice el fundamento de ADR-0011
   sin dejar registro del razonamiento ni de lo que se pierde.
3. **Registro precargado por el registrador en el prototipo, con la admisión por votación
   documentada como vía modelada.** Es el mismo tratamiento que ADR-0015 le dio al padrón.

## Decisión

**Opción 3.**

- El registro de proveedores es una **lista de direcciones cargada por el registrador**, el
  mismo actor y el mismo componente que mantiene el padrón.
- El componente pasa a llamarse **simulador de empadronamiento y alta de proveedores**.
- **Solo alta.** El prototipo no implementa baja ni inhabilitación de proveedores. El diseño las
  admite y las modela, pero no son requerimiento del MVP, y ADR-0011 ya había dejado la baja
  fuera de alcance.
- La admisión es **global y única**: un proveedor admitido puede ofertar en cualquier cuestión.
  Sin cambios respecto de ADR-0011.
- Toda alta emite un evento, de modo que el registro es auditable.

## Fundamentación

**La protección que motivaba la lista blanca se conserva.** El fundamento de ADR-0007 era
impedir que una mayoría capturada dirigiera fondos a una dirección arbitraria, mediante una
decisión previa y visible. Al quedar el alta **fuera del camino de votación**, una mayoría
capturada sigue sin poder incorporar destinatarios: la separación entre quien admite y quien
decide el gasto se mantiene. Lo que cambia es quién ejerce esa facultad, no que exista.

**Es consistente con el tratamiento del padrón.** El trabajo ya simula el empadronamiento y
declara la vía real como producción (ADR-0015). Aplicar dos criterios distintos a dos registros
que el mismo componente mantiene sería difícil de justificar.

**La asimetría con el padrón tiene respaldo en el relevamiento.** Un miembro puede quedar
inhabilitado y luego rehabilitado, porque la figura del propietario moroso que pierde el derecho
a voto existe en el caso real. La sanción o baja de un proveedor no apareció en el relevamiento,
de modo que no hay proceso relevado que el prototipo esté omitiendo.

## Consecuencias

### Enmienda a ADR-0007

| Documento decía | Ahora |
|---|---|
| Segundo tipo de propuesta: incorporación de dirección a la lista blanca, con las mismas reglas que una propuesta de gasto | En el prototipo el alta la realiza el registrador. La admisión por votación queda como vía modelada y trabajo futuro |

En consecuencia, **el prototipo tiene un único tipo de propuesta**: la cuestión con licitación.
Esto simplifica el contrato y el diagrama de secuencia.

### Enmienda a ADR-0011

La afirmación *"admitir un proveedor es, con razón, una decisión comunitaria"* pasa a describir
la vía modelada, no la implementada. El resto de esa ADR —admisión global y única, baja fuera de
alcance, ofertas ≤ techo, suspensión del peso delegado del oferente— no cambia.

### Modelo de amenaza

El registrador concentra ahora **dos facultades**: define quién vota y define quién puede
recibir fondos. Debe declararse junto con lo que ya declara ADR-0015.

Conviene precisar el límite de esa concentración: el registrador **no puede disparar un pago por
sí mismo**. Para que una dirección del registro reciba fondos hace falta una cuestión planteada,
ofertada, votada, cerrada y adjudicada. Su facultad es de admisión, no de ejecución.

### Impacto en el documento del TFG

El objetivo específico 1 debe reformularse: hoy habla de un simulador de empadronamiento que
habilita a los miembros, y ese mismo componente ahora también da de alta proveedores, que no son
miembros ni se empadronan.

### Impacto en el Product Backlog

HU-002 (*Registro de proveedor*) se reduce al alta y reutiliza el control de acceso, los eventos
y el simulador construidos en HU-001, por lo que su estimación baja. Su dependencia de HU-001 se
mantiene y no aparece dependencia sobre la votación.

### Invariantes a verificar

- Solo el registrador incorpora proveedores al registro
- Una dirección ya registrada no se registra dos veces
- Ninguna transferencia se dirige a una dirección fuera del registro (ADR-0011, sin cambios)
- Toda alta de proveedor emite un evento

### Reversión

Reincorporar la admisión por votación consiste en agregar un tipo de propuesta que, al
adjudicarse, escriba en el registro. No modifica la estructura del registro ni las historias que
dependen de él.

## Referencias

- ADR-0007, ADR-0011, ADR-0013, ADR-0014, ADR-0015, ADR-0016
- Relevamiento funcional y Diagnóstico (Tabla 3) del TFG

# ADR-0018: Parámetros del planteo — plazos fijos en el contrato, snapshot del padrón al crear la cuestión, y adjuntos en IPFS vía Pinata

- **Fecha:** 2026-09-26
- **Estado:** Aceptada
- **Enmienda a:** ADR-0011
- **Precisa:** ADR-0014, ADR-0015, ADR-0016
- **Sección del TFG:** Diseño metodológico / Descripción del sistema (HU-003) / Estructura de datos / Modelo de amenaza

## Contexto

ADR-0014 definió el planteo como el acto en que un miembro crea una cuestión con su techo
presupuestario y se reservan los fondos. Al detallar HU-003 aparecieron tres huecos que ninguna
ADR resolvía:

1. **Quién fija los plazos.** ADR-0011 habla de una "ventana de plazo fijo" para las ofertas, sin
   decir si la fija quien plantea o si es un parámetro del sistema.
2. **Cuándo se toma el snapshot del padrón.** ADR-0015 estableció que el peso y la habilitación
   que cuentan son los vigentes "en el momento del snapshot de la cuestión", y ADR-0016 usa ese
   mismo snapshot para calcular el cierre anticipado por participación total, pero el momento en
   que se toma nunca se fijó.
3. **Dónde viven los adjuntos en el prototipo.** ADR-0011 dice "hash en cadena; archivos fuera de
   cadena (servidor simple en el prototipo, IPFS como vía de producción)", mientras el Diseño
   metodológico del TFG declara Pinata como servicio de almacenamiento. Las dos afirmaciones no
   pueden ser ciertas a la vez.

## Decisión

### Los plazos son parámetros fijos del contrato

La ventana de ofertas y el plazo de votación son **iguales para todas las cuestiones** y no los
elige quien plantea.

### El snapshot del padrón se toma al crear la cuestión

En el momento del planteo queda fijado el conjunto de miembros habilitados y sus pesos para esa
cuestión. Un alta, una baja, una habilitación o un cambio de peso posteriores no afectan a las
cuestiones ya creadas.

### Los adjuntos van a IPFS vía Pinata, también en el prototipo

En la cadena se registra el hash del contenido; el archivo se almacena en IPFS, con Pinata como
servicio de pinning y puerta de acceso.

## Fundamentación

**Plazos fijos, porque un plazo a medida es un vector de ataque.** Si quien plantea elige la
ventana de ofertas, puede fijarla tan corta que solo llegue a ofertar el proveedor que estaba
avisado de antemano, lo que convierte la licitación en una adjudicación directa disfrazada. El
mismo razonamiento aplica al plazo de votación: una ventana mínima favorece a quien coordinó su
voto previamente. Como parámetros del contrato, iguales para todas las cuestiones, el vector
desaparece sin agregar ninguna verificación.

**Snapshot al crear, porque le da a la cuestión un electorado propio desde que nace.** La
alternativa era tomarlo al abrir la votación, lo que incluiría a quienes se empadronaron durante
la ventana de ofertas. Se descarta por dos razones. La primera es de simplicidad: con el snapshot
en la creación, el techo, la reserva y el electorado quedan determinados en un solo acto, y el
cierre anticipado de ADR-0016 tiene un total contra el cual comparar desde el primer momento. La
segunda es de integridad del proceso: si el electorado pudiera cambiar después de que las ofertas
son públicas, quien controla el padrón podría incorporar miembros una vez conocidas las ofertas,
en función del resultado que prefiere. Dado que el registrador es un actor único (ADR-0015), cerrar
esa puerta importa.

**Consecuencia aceptada:** un miembro empadronado después del planteo no participa en las
cuestiones ya abiertas. Con plazos cortos y una comunidad chica el efecto es menor, y debe
declararse.

**Pinata en el prototipo, porque el servidor simple no ahorra trabajo.** La alternativa de
ADR-0011 suponía que un servidor propio era más barato que integrar un servicio de pinning. En los
hechos es al revés: un servidor propio hay que montarlo, exponerlo y mantenerlo disponible, y no
aporta direccionamiento por contenido, que es justamente la propiedad que hace que el hash en
cadena sirva como verificación de integridad. Usar IPFS desde el prototipo también elimina la
brecha entre lo que se construye y lo que el trabajo propone como vía de producción.

## Consecuencias

### Enmienda a ADR-0011

| Documento decía | Ahora |
|---|---|
| Adjuntos: hash en cadena; archivos fuera de cadena (servidor simple en el prototipo, IPFS como vía de producción) | Hash en cadena; archivos en IPFS vía Pinata, tanto en el prototipo como en la vía de producción |
| Ventana de ofertas de "plazo fijo", sin definir quién lo fija | Plazo definido como parámetro del contrato, igual para todas las cuestiones |

### Corrección requerida en el documento del TFG

El Diseño metodológico afirma que Pinata guarda los datos "en una blockchain descentralizada".
Es incorrecto y además contradice la definición de IPFS que el propio Marco Teórico da en el
apartado de TICs. La redacción correcta es que el hash del contenido va en la cadena y el archivo
en IPFS, con Pinata como servicio de pinning y puerta de acceso.

### Dependencia externa declarada

Pinata es un servicio de terceros, de modo que la disponibilidad de los adjuntos depende de él.
Corresponde consignarlo en el análisis de aplicabilidad junto con los demás terceros del diseño.
Es una dependencia de menor gravedad que las otras: si el servicio deja de servir un archivo, el
hash en cadena sigue permitiendo verificar la integridad de cualquier copia que se recupere por
otro medio, y la cuestión, las ofertas y la adjudicación siguen siendo válidas sin él.

### Invariantes a verificar

- La ventana de ofertas y el plazo de votación son idénticos para todas las cuestiones
- El conjunto de miembros habilitados y sus pesos para una cuestión son los del momento de su
  creación
- Un cambio en el padrón posterior a la creación de una cuestión no altera su snapshot
- Toda cuestión registra el hash de sus adjuntos

### Impacto en el Product Backlog

Afecta a HU-003 (*Creación de propuesta con techo presupuestario*), que incorpora el snapshot y el
registro del hash de adjuntos entre sus criterios, y a HU-007 y HU-008, que leen el snapshot para
el cómputo de peso y para la condición de cierre anticipado.

## Referencias

- ADR-0011, ADR-0014, ADR-0015, ADR-0016

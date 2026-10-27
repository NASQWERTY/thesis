# ADR-0008: CIDI como vía de prueba de personeidad — alcance municipal rechazado

- **Fecha:** 2026-08-10
- **Estado:** Aceptada
- **Relacionada con:** ADR-0005, ADR-0006
- **Sección del TFG:** Propuesta / Modelo de amenaza / Límites y Alcances

## Contexto

ADR-0005 identificó la prueba de personeidad como el eslabón más débil del diseño y dejó
como camino de producción la verificación de firma gubernamental dentro de un circuito ZK,
citando ejemplos extranjeros (Anon Aadhaar, zkPassport).

La provincia de Córdoba opera **CiDi (Ciudadano Digital)**, plataforma de identidad digital
con dos niveles de verificación. Surgió además la propuesta de extender el alcance a toda la
ciudad, con comunidades definidas por barrio y datos de localización cifrados.

## Alternativas consideradas

1. **Registrador de confianza off-chain** (decisión original de ADR-0005) — simple, pero sin
   anclaje institucional y con toda la confianza depositada en una persona.
2. **CiDi como proveedor de identidad, alcance acotado a una comunidad.**
3. **CiDi con alcance a toda la ciudad**, barrios como comunidades, localización cifrada.
4. **Biometría (World ID) o grafo social (BrightID)** — sin presencia local ni respaldo
   institucional en el contexto argentino.

## Decisión

**Opción 2.** CiDi Nivel 2 se adopta como vía de empadronamiento **modelada y analizada**;
el prototipo la implementa mediante un simulador (*mock*). El alcance permanece acotado a
una comunidad única. **La opción 3 se rechaza.**

## Fundamentación

### Por qué CiDi

CiDi es la instanciación local y concreta de la vía de identidad gubernamental que ADR-0005
ya había señalado. Reemplaza analogías extranjeras por un sistema que opera en la
jurisdicción del trabajo: más de 3,9 millones de usuarios registrados, de los cuales más de
2,3 millones alcanzan Nivel 2, y 265 aplicaciones consumiendo sus servicios de
autenticación. El Nivel 1 requiere CUIL y correo electrónico; el **Nivel 2 exige
verificación presencial de identidad** en un Centro de Constatación de Identidad, o
validación remota mediante Clave Fiscal Nivel 3 de AFIP. Esa verificación es exactamente la
garantía de *una persona, una identidad* que el diseño necesitaba.

### Hallazgo crítico: CiDi es incompatible con participación no vinculable

La autenticación de CiDi es de tipo OAuth: el ciudadano inicia sesión en línea y **la
provincia registra quién se autenticó y cuándo**. En un sistema de votación cuya premisa
central es la privacidad, esto significa que el Estado observa quién participa en la
gobernanza, aunque no observe el contenido del voto.

Esto **difiere sustancialmente del patrón Anon Aadhaar**, donde un circuito ZK verifica la
*firma* del documento gubernamental de manera offline: el Estado nunca sabe que se generó
una prueba. CiDi, en su forma actual, no admite ese uso.

Documentar esta incompatibilidad —que un sistema de identidad civil real y en producción no
admite participación no vinculable, y qué debería cambiar para admitirla— constituye un
hallazgo del trabajo, no una limitación a ocultar.

### Riesgo de acceso

La integración con CiDi está condicionada a auspicio institucional: la solicitud de alta de
aplicación debe originarse en un funcionario público de la localidad, o en un tercero con
copia al funcionario, y el soporte de APIs exige ser referente del organismo. Para un
trabajo de grado en una ventana de 3 a 6 meses, esto constituye una **dependencia externa de
plazo desconocido**, de la misma clase que la rúbrica institucional pero de mayor magnitud.

Existe un ambiente **CiDi Test**, cuya disponibilidad para este trabajo debe investigarse
tempranamente. Aun así, el prototipo se implementa contra un *mock*, de modo que el avance
no dependa de la obtención de acceso.

### Por qué se rechaza el alcance municipal

- **Destruye el objeto vinculante.** Una tesorería a escala municipal implica fondos públicos.
  Un prototipo académico no puede controlar dinero público: la limitación es legal, no
  técnica. El objeto vinculante colapsaría a "registro de consenso, ejecución humana",
  precisamente lo que ADR-0007 vino a corregir.
- **Imposibilita el relevamiento.** No se puede entrevistar a una ciudad. El relevamiento
  as-is ya es el ítem de mayor tiempo de espera del cronograma.
- **La localización cifrada no protege lo que se pretende.** Si el barrio determina sobre
  qué propuestas se vota, el barrio queda revelado por *en cuáles* votaciones se participa,
  con independencia de que el campo esté cifrado. Es la misma filtración estructural del
  problema del escrutinio: los metadatos delatan lo que el texto cifrado protege. Se suman
  la definición de límites barriales, las mudanzas y las personas sin domicilio fijo.
- **Cambia el análisis de delegación.** Un delegado con decenas de miles de votos es un
  objeto distinto de uno con diez. El tope de peso acumulado pasaría de parámetro de diseño
  a componente crítico, y el análisis de coerción requeriría recuantificación.
- **Contradice ADR-0006.** El alcance se acotó por plazo y experiencia previa nula; esta
  expansión agrega además una dependencia externa fuera del control del autor.

El alcance municipal se traslada a la sección de escalabilidad y a trabajo futuro:
argumentar qué debería cambiar es considerablemente más barato que construirlo.

## Consecuencias

- **Se reintroduce un tercero de confianza.** CiDi debe declararse explícitamente en el
  análisis de aplicabilidad (Wüst & Gervais) y en el modelo de amenaza
- Quien controla el padrón controla el sistema: CiDi reubica esa confianza, no la elimina
- El prototipo implementa un *mock* de empadronamiento; la integración real queda documentada
  como vía de producción
- Debe investigarse tempranamente la disponibilidad del ambiente CiDi Test
- Consideraciones legales pendientes: Ley 25.326 de Protección de Datos Personales

## Referencias

- Gobierno de Córdoba — Ciudadano Digital: cidi.cba.gov.ar; cordobadigital.cba.gov.ar
- Portal Tecnológico de la Provincia de Córdoba — procedimiento de alta de aplicaciones en CiDi
- Vijayakumaran, S. — Privacy-Preserving Aadhaar-based Age Proofs
- Wüst, K. & Gervais, A. (2018). Do you need a Blockchain? *CVCBT*, IEEE
- ADR-0005, ADR-0006

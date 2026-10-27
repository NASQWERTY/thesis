# ADR-0009: Votación sin gas mediante relayer — cadena propia rechazada

- **Fecha:** 2026-08-10
- **Estado:** Aceptada
- **Relacionada con:** ADR-0002, ADR-0003, ADR-0004
- **Sección del TFG:** Propuesta / Modelo de amenaza

## Contexto

Si cada votante envía su propia transacción, debe poseer fondos para pagar el gas. Esto
plantea dos objeciones: una barrera de acceso incompatible con un sistema que aspira a
representar a toda una comunidad, y la complejidad de obtener los fondos iniciales.

Se evaluó también la construcción de una cadena propia que emitiera periódicamente tokens a
usuarios autenticados para cubrir el costo de participación.

## Alternativas consideradas

1. **El votante paga su propio gas** — sin infraestructura adicional, pero ver fundamentación.
2. **Relayer con meta-transacciones** (*trusted forwarder*) — el votante firma fuera de
   cadena, un tercero difunde y paga.
3. **Abstracción de cuenta con paymaster (ERC-4337)** — patrocinio como característica de
   primera clase del protocolo.
4. **Cadena propia con emisión periódica a usuarios autenticados.**

## Decisión

**Opción 2** para el prototipo. La opción 3 se documenta como vía de producción. La
**opción 4 se rechaza**.

## Fundamentación

### El motivo principal no es el costo, es la privacidad

Si el votante envía su propia transacción, su dirección queda **vinculada de manera
permanente al hecho de haber votado en una propuesta determinada**. Bajo Semaphore, la
prueba de conocimiento cero oculta *qué miembro* emite el voto, y el pago del gas devuelve
exactamente esa información.

Por lo tanto, **la votación anónima exige que la transacción sea enviada por alguien
distinto del votante**. El relayer no es una comodidad de experiencia de usuario: es un
requisito derivado del objetivo de privacidad. La eliminación de la barrera de acceso —el
usuario nunca necesita fondos, ni una billetera provista, ni conocer qué es el gas— es una
consecuencia favorable, no la motivación.

El flujo de alta resultante es: autenticación → generación de clave en el dispositivo →
voto.

### Qué puede y qué no puede hacer el relayer

El relayer conoce una dirección IP, no una identidad. **No puede falsificar ni alterar un
voto**, porque no dispone de lo necesario para producir una prueba válida.

### Por qué se rechaza la cadena propia

Tres razones, cada una suficiente por sí sola:

- **Sin presupuesto de seguridad.** Quien opera los validadores puede reescribir la historia.
  El resultado es una base de datos con pasos adicionales.
- **Carga operativa** ajena al objeto del trabajo.
- **Reintroduce un token transferible**, en contradicción directa con ADR-0002: el poder de
  voto volvería a ser función de la tenencia.

### Quién paga el gas

En testnet el costo es nulo, de modo que la cuestión es arquitectónica. Se registra una
posibilidad de diseño: **que la tesorería financie al relayer**, con lo cual el
financiamiento del gas se convierte a su vez en una decisión de gobernanza.

## Consecuencias

- **El relayer es un punto de censura y una dependencia de disponibilidad.** Puede descartar
  votos de manera selectiva; si está caído, nadie vota. Debe figurar como tal en el modelo
  de amenaza
- Mitigaciones a documentar: admitir múltiples relayers, y habilitar una vía de envío
  directo en la que el votante paga su gas **sacrificando conscientemente el anonimato**
- **Debilita el argumento de ausencia de tercero de confianza.** Sumado a CiDi (ADR-0008),
  el sistema incorpora dos servicios permanentemente en línea. Esto debe declararse con
  honestidad en el análisis de aplicabilidad, no defenderse

### Qué sobrevive del argumento a favor de la cadena de bloques

Ningún operador puede falsificar un voto, alterar un escrutinio ni reescribir la historia.
CiDi conoce quién se empadronó, no cómo votó. El relayer puede demorar o censurar, no
fabricar ni modificar resultados. Ninguna parte —incluido el autor como desplegador— puede
producir un resultado que los miembros no hayan producido. Un servidor puede hacer todo eso
por definición.

El trabajo no debe afirmar que la cadena de bloques es **necesaria**, sino que es
**suficiente y apropiada**, exponiendo qué lograría un registro de transparencia con
firmantes de umbral a menor costo, y por qué la ejecución autónoma y la aplicación no
discrecional de las reglas inclinan la elección.

## Referencias

- ERC-4337 — Account Abstraction Using Alt Mempool
- EIP-2771 — Secure Protocol for Native Meta Transactions
- Wüst, K. & Gervais, A. (2018). Do you need a Blockchain? *CVCBT*, IEEE
- ADR-0002, ADR-0003, ADR-0008

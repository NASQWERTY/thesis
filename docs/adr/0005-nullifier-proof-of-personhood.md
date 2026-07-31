# ADR-0005: Prueba de personeidad basada en nullifier — hash de documento rechazado

- **Fecha:** 2026-07-31
- **Estado:** Aceptada
- **Sección del TFG:** Propuesta / Modelo de amenaza

## Contexto

El sistema requiere garantía de una persona = un voto. La idea inicial fue derivar una
identidad on-chain a partir del hash del número de documento de identidad.

## Alternativas consideradas

1. **Hash del número de documento** — simple, pero inseguro (ver fundamentación).
2. **Verificación off-chain por registrador de confianza + credencial emitida.**
3. **Verificación de firma gubernamental dentro de un circuito ZK** (patrón Anon Aadhaar / zkPassport).
4. **Biometría (World ID) o grafo social (BrightID).**

## Decisión

Nullifier derivado de una identidad verificada, con la cuenta de votación desvinculada de
la identidad civil. Para el prototipo, la verificación se modela mediante registrador de
confianza (opción 2); la opción 3 se documenta como camino de producción.

## Fundamentación

**El hash de un documento no preserva privacidad.** Los números de documento tienen baja
entropía: un atacante puede recorrer el espacio completo por fuerza bruta y recuperar la
identidad. Además, el hash se convierte en identificador público permanente que vincula toda
la actividad on-chain del miembro.

El patrón correcto es derivar un *nullifier*: un valor que impide el doble registro sin
revelar ni permitir reconstruir la identidad subyacente.

El prototipo **importa** el supuesto de personeidad en lugar de resolverlo. Esto debe
declararse honestamente: quien controla el registro controla el sistema, y ninguna
criptografía posterior corrige un padrón capturado o excluyente.

## Consecuencias

- El registro es el eslabón más débil — requiere tratamiento explícito en el modelo de amenaza
- Debe definirse: revocación, pérdida de clave, personas sin el documento requerido
- La opción 3 queda como trabajo futuro con camino técnico identificado

## Referencias

- Vijayakumaran, S. Privacy-Preserving Aadhaar-based Age Proofs (noción formal de nullifier)
- Anon Aadhaar / zkPassport — documentación y presentaciones Devcon 7
- Borge et al. (2017). Proof-of-Personhood. IEEE EuroS&PW
- Survey: Who Watches the Watchmen? (arXiv:2008.05300)

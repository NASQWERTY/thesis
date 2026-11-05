# TFG — Sistema de gobernanza comunitaria sobre blockchain

Trabajo Final de Grado — Ingeniería en Software, Universidad Siglo 21.
Modalidad: Prototipado Tecnológico. Caso de referencia: Complejo Jardines del Sur (Córdoba).

Plataforma de votación con delegación de voto y pago automático en red de prueba que permite,
a un grupo predefinido de miembros, plantear cuestiones, obtener ofertas y votar.

## Estructura

| Directorio | Contenido |
|---|---|
| `contracts/` | Contrato inteligente `CommunityGovernance` (Solidity + Hardhat) |
| `simulator/` | Simulador de empadronamiento y alta de proveedores (Node.js) |
| `supplier-portal/` | Servicio web de proveedores (React) |
| `mobile/` | Aplicación del miembro (React Native) |
| `docs/prototype/` | Especificación, backlog, arquitectura y decisiones abiertas |
| `docs/adr/` | Architecture Decision Records |

## Red objetivo

Arbitrum Sepolia (testnet). **Sin despliegue en mainnet. Sin activos de valor económico.**

## Puesta en marcha

Ver [`INSTRUCTIVO.md`](INSTRUCTIVO.md): requisitos, instalación, la demo en Arbitrum Sepolia, la red local, las pruebas del contrato y un despliegue propio.

## Convenciones

- Documento del TFG: español, normas APA 7
- Código, comentarios y commits: inglés; textos de interfaz: español
- Ver `CLAUDE.md` para las instrucciones de trabajo asistido

# Instructivo de puesta en marcha

Prototipo del Trabajo Final de Grado *Sistema de gobernanza comunitaria sobre blockchain*
(Ingeniería en Software, Universidad Siglo 21). Plataforma de votación con delegación de voto y
pago automático en red de prueba, para un grupo predefinido de miembros: plantear cuestiones,
obtener ofertas, votar y pagar al proveedor adjudicado.

El prototipo funciona **solo en la red de prueba Arbitrum Sepolia** o en una cadena local. Ninguna
cuenta ni saldo tiene valor económico.

---

## 1. Qué contiene la entrega

| Archivo | Contenido |
|---|---|
| `INSTRUCTIVO.md` | Este documento |
| `codigo-fuente-entrega-4.zip` | Código fuente del prototipo (repositorio en la etiqueta `entrega-4`) |
| `cuentas-demo.sepolia.txt` | Claves privadas de las 8 cuentas de miembro y las 3 de proveedor de la demo (solo testnet) |
| `qr.sepolia.html` | Las mismas claves de miembro como códigos QR, para importarlas en la app desde la cámara |
| `Demo.mp4` | Video de la demo: una cuestión de punta a punta en Arbitrum Sepolia |

El código se organiza en cinco módulos:

| Carpeta | Módulo | Tecnología |
|---|---|---|
| `contracts/` | Contrato inteligente `CommunityGovernance` | Solidity 0.8.28, Hardhat 3, OpenZeppelin 5 |
| `simulator/` | Módulo de alta del padrón y de proveedores (registrador) e historial consultable | Node.js, ethers v6 |
| `uploader/` | Servicio que sube archivos a IPFS (Pinata) | Node.js |
| `supplier-portal/` | Portal web de proveedores | React + Vite, MetaMask |
| `mobile/` | Aplicación móvil del miembro | React Native (Expo) |

La especificación del contrato está en `docs/prototype/spec.md` y las historias de usuario con sus
criterios de aceptación, en `docs/prototype/backlog.md`.

---

## 2. Formas de ponerlo en marcha

| Ruta | Para qué | Necesita |
|---|---|---|
| **A. Demo en Arbitrum Sepolia** (recomendada) | Usar el contrato ya desplegado, con miembros, proveedores e historial cargados | Las cuentas de demo de la entrega |
| **B. Red local** | Probar todo en la PC, sin depender de la testnet y adelantando el reloj de la cadena | Nada más que la PC |
| **C. Despliegue propio en Sepolia** | Desplegar un contrato nuevo, con usted como registrador | ETH de prueba de un *faucet* |

Además, las **pruebas automatizadas del contrato** (sección 7) corren sin red y sin configuración.

---

## 3. Requisitos

En la PC (Windows, macOS o Linux):

- **Node.js 24** o superior, con npm (<https://nodejs.org>). El módulo de alta del padrón y el uploader ejecutan
  TypeScript directamente con Node.js 24.
- **Google Chrome** (u otro navegador compatible) con la extensión **MetaMask**, para el portal
  de proveedores.
- Una **cuenta gratuita en Pinata** (<https://pinata.cloud>), solo para subir archivos a IPFS
  (descripciones de cuestiones y propuestas de los proveedores). Sin ella se puede consultar
  todo, pero no plantear cuestiones ni ofertar.

En el teléfono:

- Un **teléfono Android** con **Expo Go** (Play Store), conectado a la **misma red Wi-Fi** que la
  PC. La red no debe ser de invitados ni aislar a los clientes entre sí.

---

## 4. Instalación (común a todas las rutas)

1. Descomprima `codigo-fuente-entrega-4.zip`.
2. Instale las dependencias de cada módulo. Desde la carpeta raíz:

   ```sh
   cd contracts       && npm install && cd ..
   cd simulator       && npm install && cd ..
   cd uploader        && npm install && cd ..
   cd supplier-portal && npm install && cd ..
   cd mobile          && npm install && cd ..
   ```

3. Copie `.env.example` como `.env` en la carpeta raíz y complete la sección de IPFS:

   ```
   PINATA_JWT=<su JWT de Pinata>
   PINATA_GATEWAY=gateway.pinata.cloud
   ```

   - **`PINATA_JWT`**: en Pinata, *API Keys → New Key* (con permiso para subir archivos); copie el
     *JWT*. Solo lo usa el uploader y nunca llega al navegador ni al teléfono.
   - **`PINATA_GATEWAY`**: use `gateway.pinata.cloud`, el gateway público de Pinata. Un gateway
     dedicado de su cuenta (`xxx.mypinata.cloud`) solo sirve los archivos subidos con esa misma
     cuenta y no mostraría los documentos de las cuestiones ya cargadas en la demo.

   Las demás variables solo hacen falta en la ruta C.

---

## 5. Ruta A — Demo en Arbitrum Sepolia

El contrato ya está desplegado y su código fuente está verificado:

- Contrato: `0x6DAAb6C81C0a59a32E790C41EC0e6d4eB5822de2`
- Explorador: <https://sepolia.arbiscan.io/address/0x6DAAb6C81C0a59a32E790C41EC0e6d4eB5822de2>
- Código verificado (Sourcify): <https://sourcify.dev/server/repo-ui/421614/0x6DAAb6C81C0a59a32E790C41EC0e6d4eB5822de2>

Parámetros del despliegue:
- **10 minutos para ofertar** desde que se plantea cada cuestión, y después **15 minutos de
  votación**.
- **Quórum del 50 %** del peso habilitado.
- **Tope de delegación de un tercio** del peso total.

El padrón tiene 8 miembros y hay 3 proveedores registrados. Cada cuenta de demo tiene un poco de
ETH de prueba para pagar el gas.

### 5.1 Levantar los servicios

Tres terminales, desde la carpeta raíz:

```sh
cd uploader        && npm start      # 1. subida a IPFS, puerto 8787
cd supplier-portal && npm run dev    # 2. portal de proveedores → http://localhost:5173
cd mobile          && npm start      # 3. app del miembro: muestra un código QR
```

La primera vez, Windows puede pedir permiso para que Node.js use la red. **Permítalo en redes
privadas**: el teléfono necesita llegar a la PC (puertos 8081 y 8787).

### 5.2 Aplicación del miembro

1. Abra Expo Go en el teléfono y escanee el QR que mostró `npm start` en la terminal 3.
2. Importe un miembro. Tiene dos opciones:
   - Abra `qr.sepolia.html` en el navegador de la PC, toque la tarjeta del miembro y escanéelo
     con **Escanear QR**.
   - Pegue su clave privada, tomada de `cuentas-demo.sepolia.txt`.
3. **Mi cuenta → Red → Arbitrum Sepolia.** La elección queda recordada.
4. Para cambiar de miembro: **Mi cuenta → Cerrar sesión**, e importe otra clave.

Qué se puede hacer:
- **Cuestiones:** el listado con la fase de cada cuestión. El detalle muestra la descripción, las
  ofertas con su propuesta en IPFS, el resultado, y los botones **Cerrar cuestión** y
  **Ejecutar pago**.
- **Plantear cuestión:** título, descripción, rubro y techo. El techo no puede superar el saldo
  libre de la tesorería.
- **Votar:** se tocan las ofertas y «Rechazar todas» en orden de preferencia.
- **Delegación:** delegar el voto en otro miembro o revocar la delegación.
- **Mi cuenta:** estado en el padrón, saldo de la tesorería y un aporte de prueba a la tesorería.

### 5.3 Portal de proveedores

1. En MetaMask, *Importar cuenta* con la clave de un proveedor de `cuentas-demo.sepolia.txt`.
2. Abra <http://localhost:5173> y toque **Conectar MetaMask**. El portal agrega la red Arbitrum
   Sepolia a MetaMask si no la tiene, y cambia a ella.
3. El portal muestra las cuestiones que reciben ofertas. Para ofertar, cargue un monto (no mayor
   al techo) y un archivo con la propuesta (PDF, hasta 10 MB). En `docs/demo/propuestas/` hay
   PDF de ejemplo.
4. En **Mis ofertas** se sigue el estado de cada oferta.

### 5.4 Recorrido sugerido

| Paso | Dónde | Qué hacer |
|---|---|---|
| 1 | App, un miembro | Plantear una cuestión con un techo chico, por ejemplo 0,001 ETH |
| 2 | Portal, dos proveedores | Ofertar dentro de los 10 minutos, cada uno con su PDF |
| 3 | App, varios miembros | Al terminar el período de ofertas, votar. El quórum es el 50 % del peso: con 8 miembros, 4 votos (cuentan las delegaciones) |
| 4 | App | Al terminar la votación: **Cerrar cuestión**. Lo puede hacer cualquier miembro, y el contrato adjudica en la misma transacción |
| 5 | App | **Ejecutar pago**: el contrato paga al proveedor ganador y libera el resto de la reserva |
| 6 | Terminal | Consultar el historial (5.5) |

Si la tesorería tiene poco saldo libre, cualquier miembro puede aportar desde **Mi cuenta**.

### 5.5 Historial consultable

Desde la carpeta `simulator/`:

```sh
npm run sim -- list --network sepolia                # padrón, proveedores, tesorería y parámetros
npm run sim -- history --network sepolia             # todos los eventos del contrato, en orden
npm run sim -- history --network sepolia --issue 1   # una cuestión, con sus documentos en IPFS
```

Estos comandos solo leen la cadena: no necesitan la clave del registrador. Sin
`ARBITRUM_SEPOLIA_RPC_URL` en el `.env` usan el RPC público de Arbitrum, que limita la cantidad
de consultas; si responde con errores, espere unos segundos y repita. Cada transacción del
historial se puede abrir en el explorador.

Los comandos que modifican el padrón (`members`, `eligibility`, `fund`…) requieren la clave del
registrador del contrato. Esa clave no se entrega; para probarlos, use la ruta B o la C.

---

## 6. Ruta B — Red local

Todo corre en la PC, sobre una cadena de Hardhat que mina un bloque por segundo. Las cuentas son
las de Hardhat, con 10 000 ETH de prueba cada una. Plazos por defecto: 5 minutos de ofertas y 10
de votación. El reloj se puede adelantar.

Cinco terminales, desde la carpeta raíz:

```sh
cd contracts && npm run node              # 1. cadena local, puerto 8545 (déjela abierta)
cd contracts && npm run deploy:local      # 2. despliega el contrato
cd uploader && npm start                  # 3. subida a IPFS
cd supplier-portal && npm run dev         # 4. portal → http://localhost:5173
cd mobile && npm start                    # 5. app del miembro
```

Cargue el padrón, los proveedores y la tesorería (en `simulator/`):

```sh
npm run sim -- members        # 8 miembros de data/local/members.csv
npm run sim -- suppliers      # 3 proveedores de data/local/suppliers.csv
npm run sim -- fund 10        # 10 ETH a la tesorería
npm run sim -- list
npm run sim -- keys           # claves de las cuentas de demo locales
npm run sim -- qr --html      # qr.local.html con los QR de los miembros
```

En la app deje **Mi cuenta → Red → Local**. En el portal, elija *Red local* antes de conectar
MetaMask.

Comandos útiles solo en la red local:

```sh
npm run sim -- issue T1-1A 4 "Reparación del ascensor" --topic mantenimiento   # plantea una cuestión
npm run sim -- time 300                                                        # adelanta 5 minutos
npm run sim -- close 1                                                         # cierra la cuestión 1
npm run sim -- execute 1                                                       # paga al adjudicado
npm run sim -- history                                                         # historial
```

**Al reiniciar el nodo** la cadena empieza vacía. Hay que hacer cuatro cosas:
1. Volver a ejecutar `npm run deploy:local`.
2. Volver a cargar el padrón.
3. Reiniciar el portal y la app (`npm run dev` y `npm start`), para que tomen la dirección nueva
   del contrato.
4. En MetaMask, *Configuración → Avanzado → Borrar datos de la pestaña de actividad*. Si no, las
   transacciones fallan por *nonce*.

---

## 7. Pruebas automatizadas del contrato

```sh
cd contracts
npm test
```

Compila el contrato y ejecuta las pruebas sobre una cadena en memoria (no necesita `.env` ni
red). Resultado esperado: **175 pruebas aprobadas**. Cada archivo de `contracts/test/` cubre una
historia de usuario o un área, con su camino feliz, cada rechazo y las invariantes de la
especificación:

| Archivo | Historia | Qué verifica |
|---|---|---|
| `registry.ts` | HU-001 | Padrón: alta, baja, habilitación (moroso) y peso |
| `suppliers.ts` | HU-002 | Registro de proveedores, disjunto del padrón |
| `issues.ts` | HU-003 | Plantear cuestión: reserva del techo, foto del padrón, fases |
| `bids.ts` | HU-004 | Ofertas: período, techo, una por proveedor |
| `delegation.ts` | HU-005, HU-006 | Delegación de un salto, tope de un tercio, revocación |
| `voting.ts` | HU-007 | Boleta ordenada e inmutable; el voto directo anula la delegación |
| `tally.ts` | HU-008 | Recuento por preferencias (Schulze): empates y ciclos |
| `close.ts` | HU-008 | Cierre sin permisos, quórum, adjudicación o cierre sin adjudicar |
| `transfer.ts` | HU-009 | Pago al proveedor y liberación del resto de la reserva |
| `deployment.ts`, `treasury.ts` | — | Parámetros iniciales; aportes a la tesorería |

---

## 8. Ruta C — Despliegue propio en Arbitrum Sepolia

1. Cree una cuenta descartable (por ejemplo, una nueva en MetaMask) y obtenga ETH de prueba de
   Arbitrum Sepolia en un *faucet*. La documentación de Arbitrum (<https://docs.arbitrum.io>)
   lista los disponibles. Alcanza con unos 0,05 ETH.
2. Complete el `.env`:

   ```
   ARBITRUM_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
   DEPLOYER_PRIVATE_KEY=<clave de la cuenta descartable>
   QUORUM_PERCENT=50
   BIDDING_PERIOD_SECONDS=600
   VOTING_PERIOD_SECONDS=900
   ```

   La cuenta que despliega es el **registrador** del contrato. Use solo una clave de testnet.
3. Despliegue con `npm run deploy:sepolia` en `contracts/`. El comando reemplaza
   `shared/deployments/421614.json`, así que el portal, la app y el módulo de alta pasan a usar el
   contrato nuevo.
4. Cree las cuentas de demo, desde `simulator/`. Primero ejecute
   `npm run sim -- accounts 11 --network sepolia`. Después reemplace las direcciones de
   `data/sepolia/members.csv` (las 8 primeras) y `data/sepolia/suppliers.csv` (las 3 últimas)
   por las generadas.
5. Cargue todo (en `simulator/`):

   ```sh
   npm run sim -- members   --network sepolia
   npm run sim -- suppliers --network sepolia
   npm run sim -- fund 0.01 --network sepolia     # tesorería
   npm run sim -- gas 0.002 --network sepolia     # gas para cada cuenta de demo
   npm run sim -- keys --file --network sepolia   # cuentas-demo.sepolia.txt
   npm run sim -- qr --html --network sepolia     # qr.sepolia.html
   ```

6. Reinicie el portal y la app, y siga desde la sección 5.2.

---

## 9. Problemas frecuentes

| Síntoma | Solución |
|---|---|
| El teléfono no carga la app, o la app no conecta con la cadena local | PC y teléfono en la misma red Wi-Fi (no de invitados). Permita Node.js en el firewall de Windows para redes privadas. En la red local, la dirección del nodo se puede corregir en **Mi cuenta → Opciones avanzadas** |
| La app dice que no hay contrato en la red elegida | Revise **Mi cuenta → Red**. En la red local: el nodo está corriendo y se ejecutó `deploy:local`; después reinicie `npm start` |
| Las descripciones aparecen como «no disponible» | El uploader no está corriendo, o `PINATA_GATEWAY` no es `gateway.pinata.cloud` (ver sección 4) |
| «El uploader rechazó la subida» | Revise `PINATA_JWT` en el `.env` y reinicie el uploader |
| MetaMask: *max fee per gas less than block base fee* | Vuelva a enviar la transacción. Si persiste, en MetaMask edite la comisión y suba la *max base fee* |
| MetaMask: *nonce too high* (red local) | *Configuración → Avanzado → Borrar datos de la pestaña de actividad* |
| `npm run sim` en Sepolia responde con errores de conexión | El RPC público limita las consultas: espere y repita, o configure un RPC propio en `ARBITRUM_SEPOLIA_RPC_URL` |
| No se puede votar en una cuestión | Solo votan los miembros habilitados que estaban en el padrón cuando se planteó la cuestión, y solo durante el período de votación |
| No se puede delegar en un miembro | La app muestra el motivo. El delegado ya delegó su voto (la delegación es de un solo salto), o superaría el tope de un tercio del peso total |

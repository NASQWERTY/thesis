# Guion de la demo en Arbitrum Sepolia

Cinco cuestiones, cada una pensada para dejar registrado en la cadena un resultado distinto. Todo
queda consultable después en el historial (`npm run sim -- history --network sepolia`) y en el
explorador.

- Contrato: `0x6DAAb6C81C0a59a32E790C41EC0e6d4eB5822de2`
  ([Arbiscan](https://sepolia.arbiscan.io/address/0x6DAAb6C81C0a59a32E790C41EC0e6d4eB5822de2) ·
  [código verificado en Sourcify](https://sourcify.dev/server/repo-ui/421614/0x6DAAb6C81C0a59a32E790C41EC0e6d4eB5822de2))
- Plazos reales: **10 min de ofertas** desde que se crea cada cuestión, después **15 min de
  votación**. Quórum: 50 % del peso habilitado = **4 de 8**.
- Tope de delegación: nadie controla más de un tercio del peso (con 8 miembros, como máximo 2
  votos: el propio y una delegación).
- Las propuestas en PDF están en `docs/demo/propuestas/` (se regeneran con
  `node docs/demo/make-proposals.mjs`).

| # | Cuestión | Propone | Techo | Resultado esperado |
|---|---|---|---|---|
| 1 | Reparación del portón vehicular | T1-1A Ana Gómez | 0,003 | Adjudicada a Electricidad Serrana y pagada |
| 2 | Pintura del hall del edificio 2 | T2-1A Diego Fernández | 0,002 | Adjudicada a Pinturas del Sur (la más cara) gracias a la delegación; pagada |
| 3 | Mantenimiento de ascensores | T3-1A Gabriela Torres | 0,002 | Sin adjudicar: ganó «Rechazar todas» |
| 4 | Cambio de luminarias del estacionamiento | T3-2B Hernán Molina | 0,001 | Sin adjudicar: sin quórum |
| 5 | Poda de árboles del parque común | T1-2B Bruno Díaz | 0,001 | Sin adjudicar: sin ofertas |

Los techos suman 0,009 ETH: entran en la tesorería (0,01 ETH) aunque estén todas abiertas a la
vez. Los números #1…#5 son los que asigna el contrato si se crean en este orden.

---

## 0. Preparación (antes de grabar)

1. En la PC: uploader corriendo (`uploader/`, `npm start`), portal de proveedores
   (`supplier-portal/`, `npm run dev`) y la app (`mobile/`, `npm start`).
2. App: **Mi cuenta → Red → Arbitrum Sepolia**.
3. MetaMask: importar las 3 cuentas de proveedor (claves en `simulator/cuentas-demo.sepolia.txt`)
   y elegir la red Arbitrum Sepolia en el portal.
4. Tener a mano los QR de los miembros: `npm run sim -- qr --html --network sepolia` en
   `simulator/` y abrir `qr.sepolia.html`.
5. **Delegaciones** (tienen que existir *antes* de crear las cuestiones: cada cuestión toma el
   padrón del momento en que se crea). En la app, pestaña **Delegación**:
   - **T2-3C Facundo López** delega en **T2-2B Elena Sosa**.
   - **T1-3C Carla Ruiz** delega en **T1-2B Bruno Díaz**.

Para cambiar de miembro en la app: **Mi cuenta → Cerrar sesión** e importar la clave del
siguiente (QR o pegada).

> **Ritmo.** Cada cuestión da 10 minutos para ofertar desde que se crea. Conviene hacerlo en dos
> tandas: **tanda A** = cuestiones 1 y 2 (el camino feliz), **tanda B** = 3, 4 y 5. En cada tanda:
> crear las cuestiones, presentar enseguida sus ofertas y votar cuando abra la votación.

---

## Tanda A — el camino feliz

### Cuestión 1 · Reparación del portón vehicular

**Crear** (app, como **T1-1A Ana Gómez**) · Plantear cuestión:

- Título: `Reparación del portón vehicular`
- Descripción: `El portón del estacionamiento no cierra solo y el control remoto falla. Se pide
  reparar el motor o el tablero y dejarlo funcionando con controles nuevos.`
- Rubro: **Mantenimiento** · Techo: `0.003`

**Ofertas** (portal, dentro de los 10 minutos):

| Proveedor | Monto | PDF |
|---|---|---|
| Electricidad Serrana | `0.0025` | `1-porton-electricidad-serrana.pdf` |
| Ascensores Andinos SRL | `0.0028` | `1-porton-ascensores-andinos.pdf` |

### Cuestión 2 · Pintura del hall del edificio 2

**Crear** (app, como **T2-1A Diego Fernández**):

- Título: `Pintura del hall del edificio 2`
- Descripción: `Las paredes del hall de entrada del edificio 2 tienen fisuras y manchas de
  humedad. Se pide repararlas y pintar el hall completo.`
- Rubro: **Obras** · Techo: `0.002`

**Ofertas**:

| Proveedor | Monto | PDF |
|---|---|---|
| Pinturas del Sur SA | `0.0019` | `2-pintura-pinturas-del-sur.pdf` |
| Electricidad Serrana | `0.0015` | `2-pintura-electricidad-serrana.pdf` |

### Votación de la tanda A (cuando la app muestre «En votación»)

Ordenado por miembro, para iniciar sesión una sola vez con cada uno. «Rechazar todas» va siempre
última.

| Miembro | Cuestión 1 (portón) | Cuestión 2 (pintura) |
|---|---|---|
| T1-1A Ana Gómez | Electricidad > Ascensores | — |
| T1-2B Bruno Díaz | Ascensores > Electricidad | Electricidad > Pinturas |
| T1-3C Carla Ruiz | — | Pinturas > Electricidad (vota directo: anula su delegación) |
| T2-1A Diego Fernández | Electricidad > Ascensores | Electricidad > Pinturas |
| T2-2B Elena Sosa | — | Pinturas > Electricidad (vota también por Facundo) |
| T3-1A Gabriela Torres | Electricidad > Ascensores | — |
| T3-2B Hernán Molina | Electricidad > Ascensores | — |

Qué muestra cada una al cerrar:

- **Cuestión 1:** Bruno cuenta 2 (el suyo y el de Carla, que le delegó y no votó en esta
  cuestión). Electricidad 4 – Ascensores 2, con 6 de 8 expresados. **Adjudicada a Electricidad
  Serrana.**
- **Cuestión 2:** Elena cuenta 2 (Facundo le delegó y no votó). Carla votó directo, así que
  cuenta solo por ella y Bruno vota solo por sí mismo. Pinturas 3 – Electricidad 2, con 5 de 8
  expresados. **Adjudicada a Pinturas del Sur**, la oferta más cara. Sin la delegación de
  Facundo habría sido un empate 2 – 2 (sin adjudicar); sin el voto directo de Carla, Bruno
  contaría 2 y ganaría Electricidad.

### Cierre y pago

1. Terminada la votación, en el detalle de cada cuestión: **Cerrar cuestión** (cualquier
   miembro).
2. En las adjudicadas: **Ejecutar pago**.
3. Qué mirar:
   - App, detalle: «Adjudicada y pagada», monto pagado y lo que volvió a la tesorería
     (cuestión 1: 0,0005 ETH; cuestión 2: 0,0001 ETH).
   - App, Mi cuenta: la tesorería baja en lo pagado y el reservado vuelve a 0.
   - Portal, «Mis ofertas» de cada proveedor: «Pagada a tu cuenta» / «Adjudicada a otra oferta».

---

## Tanda B — los cierres sin adjudicación

### Cuestión 3 · Mantenimiento de ascensores

**Crear** (app, como **T3-1A Gabriela Torres**):

- Título: `Mantenimiento de ascensores`
- Descripción: `Contratar el mantenimiento preventivo mensual de los tres ascensores durante seis
  meses, con atención de urgencias.`
- Rubro: **Mantenimiento** · Techo: `0.002`

**Oferta**: Ascensores Andinos SRL · `0.002` (justo el techo) ·
`3-ascensores-ascensores-andinos.pdf`

### Cuestión 4 · Cambio de luminarias del estacionamiento

**Crear** (app, como **T3-2B Hernán Molina**):

- Título: `Cambio de luminarias del estacionamiento`
- Descripción: `Reemplazar los tubos fluorescentes del estacionamiento por luminarias LED con
  sensores de movimiento en los accesos.`
- Rubro: **Servicios** · Techo: `0.001`

**Oferta**: Electricidad Serrana · `0.0009` · `4-luminarias-electricidad-serrana.pdf`

### Cuestión 5 · Poda de árboles del parque común

**Crear** (app, como **T1-2B Bruno Díaz**):

- Título: `Poda de árboles del parque común`
- Descripción: `Poda de mantenimiento de los árboles del parque común antes del verano.`
- Rubro: **General** · Techo: `0.001`

**Ofertas**: ninguna (ningún proveedor se presenta).

### Votación de la tanda B

| Miembro | Cuestión 3 (ascensores) | Cuestión 4 (luminarias) |
|---|---|---|
| T1-1A Ana Gómez | Rechazar todas > Ascensores | Electricidad > Rechazar todas |
| T2-1A Diego Fernández | Rechazar todas > Ascensores | — |
| T3-1A Gabriela Torres | Ascensores > Rechazar todas | — |
| T3-2B Hernán Molina | Rechazar todas > Ascensores | Electricidad > Rechazar todas |

**Bruno no vota en la 3 ni en la 4**: si votara, contaría 2 (Carla le delegó) y en la 4 se
alcanzaría el quórum. La 5 no necesita votos.

Qué muestra cada una al cerrar:

- **Cuestión 3:** 4 de 8 expresados (justo el quórum). «Rechazar todas» 3 – Ascensores 1.
  **Cerrada sin adjudicar: ganó «Rechazar todas».** Se liberan los 0,002 ETH reservados.
- **Cuestión 4:** 2 de 8 expresados, por debajo del quórum de 4, aunque ambos votos prefieren la
  oferta. **Cerrada sin adjudicar: sin quórum.**
- **Cuestión 5:** **Cerrada sin adjudicar: sin ofertas.**

---

## Al final: el rastro

```sh
cd simulator
npm run sim -- history --network sepolia            # todo, en orden
npm run sim -- history --network sepolia --issue 2  # la vida completa de una cuestión
npm run sim -- list --network sepolia               # padrón, proveedores y tesorería
```

El historial muestra, por cuestión: planteo, ofertas, votos, cierre (con el motivo cuando no hay
adjudicación) y pago (con lo liberado). Cada fila trae el hash de la transacción, que se puede
abrir en Arbiscan.

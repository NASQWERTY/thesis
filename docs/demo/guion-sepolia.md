# Guion de la demo en Arbitrum Sepolia

La demo grabada muestra **una cuestión de punta a punta** (el camino feliz). Los demás resultados
posibles se generan **antes de grabar** y en el video se muestran en el historial, como rastro
de que el sistema los resolvió.

- Contrato: `0x6DAAb6C81C0a59a32E790C41EC0e6d4eB5822de2`
  ([Arbiscan](https://sepolia.arbiscan.io/address/0x6DAAb6C81C0a59a32E790C41EC0e6d4eB5822de2) ·
  [código verificado en Sourcify](https://sourcify.dev/server/repo-ui/421614/0x6DAAb6C81C0a59a32E790C41EC0e6d4eB5822de2))
- Plazos reales: **10 min de ofertas** desde que se crea cada cuestión, después **15 min de
  votación**. Quórum: 50 % del peso habilitado = **4 de 8**.
- Tope de delegación: nadie controla más de un tercio del peso (con 8 miembros, como máximo 2
  votos: el propio y una delegación).
- Propuestas en PDF: `docs/demo/propuestas/` (se regeneran con `node docs/demo/make-proposals.mjs`).

| # | Cuestión | Propone | Techo | Resultado | Cuándo |
|---|---|---|---|---|---|
| 1 | Pintura del hall del edificio 2 | T2-1A Diego Fernández | 0,002 | Adjudicada a Pinturas del Sur (la más cara) gracias a la delegación; pagada | Antes de grabar |
| 2 | Mantenimiento de ascensores | T3-1A Gabriela Torres | 0,002 | Sin adjudicar: ganó «Rechazar todas» | Antes de grabar |
| 3 | Cambio de luminarias del estacionamiento | T3-2B Hernán Molina | 0,001 | Sin adjudicar: sin quórum | Antes de grabar |
| 4 | Poda de árboles del parque común | T1-2B Bruno Díaz | 0,001 | Sin adjudicar: sin ofertas | Antes de grabar |
| 5 | Reparación del portón vehicular | T1-1A Ana Gómez | 0,003 | Adjudicada a Electricidad Serrana y pagada | **En la grabación** |

Los números son los que asigna el contrato si se crean en este orden.

---

## 0. Preparación

1. En la PC: uploader (`uploader/`, `npm start`), portal de proveedores (`supplier-portal/`,
   `npm run dev`), la app (`mobile/`, `npm start`) y el teléfono reflejado con
   `scrcpy --stay-awake --max-size 1280`.
2. App: **Mi cuenta → Red → Arbitrum Sepolia** (queda recordada al cambiar de cuenta).
3. MetaMask: importar las 3 cuentas de proveedor (claves en `simulator/cuentas-demo.sepolia.txt`)
   y elegir Arbitrum Sepolia en el portal.
4. QR de los miembros a mano: `npm run sim -- qr --html --network sepolia` en `simulator/` y abrir
   `qr.sepolia.html`.

Para cambiar de miembro en la app: **Mi cuenta → Cerrar sesión** e importar la clave del
siguiente (QR o pegada; con scrcpy se puede pegar desde la PC).

---

## Parte 1 — Antes de grabar

### 1.1 Delegaciones

Tienen que existir **antes** de crear las cuestiones: cada cuestión toma el padrón del momento en
que se crea. En la app, pestaña **Delegación**:

- **T2-3C Facundo López** delega en **T2-2B Elena Sosa**.
- **T1-3C Carla Ruiz** delega en **T1-2B Bruno Díaz**.

### 1.2 Crear las cuestiones y presentar las ofertas

Cada cuestión acepta ofertas durante 10 minutos desde que se crea: conviene crear una y presentar
sus ofertas en el portal enseguida, antes de pasar a la siguiente.

**Cuestión 1 · Pintura del hall del edificio 2** — app, como **T2-1A Diego Fernández**

- Título: `Pintura del hall del edificio 2`
- Descripción: `Las paredes del hall de entrada del edificio 2 tienen fisuras y manchas de
  humedad. Se pide repararlas y pintar el hall completo.`
- Rubro: **Obras** · Techo: `0.002`
- Ofertas:

  | Proveedor | Monto | PDF |
  |---|---|---|
  | Pinturas del Sur SA | `0.0019` | `pintura-pinturas-del-sur.pdf` |
  | Electricidad Serrana | `0.0015` | `pintura-electricidad-serrana.pdf` |

**Cuestión 2 · Mantenimiento de ascensores** — app, como **T3-1A Gabriela Torres**

- Título: `Mantenimiento de ascensores`
- Descripción: `Contratar el mantenimiento preventivo mensual de los tres ascensores durante seis
  meses, con atención de urgencias.`
- Rubro: **Mantenimiento** · Techo: `0.002`
- Oferta: Ascensores Andinos SRL · `0.002` (justo el techo) · `ascensores-ascensores-andinos.pdf`

**Cuestión 3 · Cambio de luminarias del estacionamiento** — app, como **T3-2B Hernán Molina**

- Título: `Cambio de luminarias del estacionamiento`
- Descripción: `Reemplazar los tubos fluorescentes del estacionamiento por luminarias LED con
  sensores de movimiento en los accesos.`
- Rubro: **Servicios** · Techo: `0.001`
- Oferta: Electricidad Serrana · `0.0009` · `luminarias-electricidad-serrana.pdf`

**Cuestión 4 · Poda de árboles del parque común** — app, como **T1-2B Bruno Díaz**

- Título: `Poda de árboles del parque común`
- Descripción: `Poda de mantenimiento de los árboles del parque común antes del verano.`
- Rubro: **General** · Techo: `0.001`
- Ofertas: **ninguna**.

### 1.3 Votar (cuando la app muestre «En votación»)

Ordenado por miembro, para iniciar sesión una sola vez con cada uno. «Rechazar todas» va última
salvo donde se indica.

| Miembro | Cuestión 1 (pintura) | Cuestión 2 (ascensores) | Cuestión 3 (luminarias) |
|---|---|---|---|
| T1-1A Ana Gómez | — | Rechazar todas > Ascensores | Electricidad > Rechazar todas |
| T1-2B Bruno Díaz | Electricidad > Pinturas | **no vota** | **no vota** |
| T1-3C Carla Ruiz | Pinturas > Electricidad | — | — |
| T2-1A Diego Fernández | Electricidad > Pinturas | Rechazar todas > Ascensores | — |
| T2-2B Elena Sosa | Pinturas > Electricidad | — | — |
| T3-1A Gabriela Torres | — | Ascensores > Rechazar todas | — |
| T3-2B Hernán Molina | — | Rechazar todas > Ascensores | Electricidad > Rechazar todas |

Bruno no vota en la 2 ni en la 3: si votara, contaría 2 (Carla le delegó) y cambiaría los
resultados. La 4 no necesita votos.

### 1.4 Cerrar y pagar

Terminada la votación, en el detalle de cada cuestión (app) o con `npm run sim -- close <n>
--network sepolia`: **Cerrar cuestión** en las cuatro. En la 1, **Ejecutar pago**.

Resultados esperados:

- **Cuestión 1:** Elena cuenta 2 (Facundo le delegó y no votó). Carla votó directo: cuenta solo
  por ella, y Bruno vota solo por sí mismo. Pinturas 3 – Electricidad 2, con 5 de 8 expresados:
  **adjudicada a Pinturas del Sur**, la oferta más cara. Sin la delegación de Facundo habría sido
  un empate 2 – 2 (sin adjudicar); sin el voto directo de Carla, Bruno contaría 2 y ganaría
  Electricidad. Al pagar vuelven 0,0001 ETH a la tesorería.
- **Cuestión 2:** 4 de 8 expresados (justo el quórum). «Rechazar todas» 3 – Ascensores 1:
  **sin adjudicar, ganó «Rechazar todas»**.
- **Cuestión 3:** 2 de 8 expresados, por debajo del quórum de 4, aunque los dos votos prefieren
  la oferta: **sin adjudicar, sin quórum**.
- **Cuestión 4:** **sin adjudicar, sin ofertas**.

Comprobación antes de grabar: `npm run sim -- history --network sepolia` muestra las cuatro con
su resultado, y `npm run sim -- list --network sepolia` una tesorería de 0,0081 ETH sin reservas.

---

## Parte 2 — La grabación: el camino feliz

Una sola cuestión, de punta a punta. Las esperas de los plazos se cortan en la edición.

**1. Plantear** — app, como **T1-1A Ana Gómez**. Mostrar antes «Mi cuenta» (padrón: habilitada;
tesorería: saldo libre).

- Título: `Reparación del portón vehicular`
- Descripción: `El portón del estacionamiento no cierra solo y el control remoto falla. Se pide
  reparar el motor o el tablero y dejarlo funcionando con controles nuevos.`
- Rubro: **Mantenimiento** · Techo: `0.003`

Mostrar la cuestión #5 en la lista, «Recibiendo ofertas», y en Mi cuenta el techo reservado.

**2. Ofertar** — portal de proveedores, MetaMask:

| Proveedor | Monto | PDF |
|---|---|---|
| Electricidad Serrana | `0.0025` | `porton-electricidad-serrana.pdf` |
| Ascensores Andinos SRL | `0.0028` | `porton-ascensores-andinos.pdf` |

Mostrar en la app el detalle con las dos ofertas y abrir una propuesta («Ver propuesta»).

*(corte: fin del período de ofertas)*

**3. Votar** — app:

| Miembro | Orden |
|---|---|
| T1-1A Ana Gómez | Electricidad > Ascensores > Rechazar todas |
| T1-2B Bruno Díaz | Ascensores > Electricidad > Rechazar todas (cuenta 2: Carla le delegó) |
| T2-1A Diego Fernández | Electricidad > Ascensores > Rechazar todas |
| T3-1A Gabriela Torres | Electricidad > Ascensores > Rechazar todas |
| T3-2B Hernán Molina | Electricidad > Ascensores > Rechazar todas |

Mostrar con Ana la votación completa (ordenar tocando, quitar una, confirmar). Los demás votos
pueden ir cortados.

*(corte: fin del período de votación)*

**4. Cerrar** — app, detalle de la cuestión: **Cerrar cuestión**. Electricidad 4 – Ascensores 2,
con 6 de 8 expresados: **Adjudicada a Electricidad Serrana**.

**5. Pagar** — **Ejecutar pago**. Mostrar «Adjudicada y pagada» (0,0025 ETH pagados, 0,0005 ETH
devueltos a la tesorería), el saldo del proveedor en el portal («Pagada a su cuenta») y la
tesorería en Mi cuenta.

**6. El rastro** — terminal:

```sh
cd simulator
npm run sim -- history --network sepolia            # las cinco cuestiones, en orden
npm run sim -- history --network sepolia --issue 5  # la vida completa de la grabada, con los CID de IPFS
```

Mostrar que las cuestiones 1 a 4 quedaron resueltas con su motivo (delegación, «Rechazar todas»,
sin quórum, sin ofertas), y abrir en Arbiscan una transacción del historial (el pago).

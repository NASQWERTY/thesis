# Prototype architecture

Thesis Figura 11, updated 2026-11-04 with the upload service: `docs/diagramas/fig11-architecture.svg`
(and `.png`). The original figure is `figures/fig10-11-supplier-portal-architecture.png`.

```
 Registrador            Miembro                 Proveedor
 (wallet)               (wallet)                (wallet)
    │                      │                       │
    ▼                      ▼                       ▼
 Simulador de          Aplicación móvil        Servicio web de       ──► Uploader (Node.js) ──► Pinata (IPFS)
 empadronamiento       plantear, delegar,      proveedores               holds the Pinata JWT     │
 y alta de proveedores votar, cerrar,          consultar, ofertar        POST /upload → CID       │
 historial             ejecutar                React · ethers.js ·           ▲                    │
 Node.js · ethers.js   React Native·ethers.js  MetaMask                      │                    │
    │                      │  └─ subir archivos ──────┼───────────────────────┘                    │
    │                      │  ◄── leer por gateway ───┼◄───────────────────────────────────────────┘
    ▼                      ▼                          ▼
 ┌──────────────── Arbitrum Sepolia (JSON-RPC) ────────────────┐
 │  CommunityGovernance.sol                                     │
 │  padrón · proveedores · cuestiones y reservas ·              │──► transfer (test ETH)
 │  delegaciones · boletas y escrutinio · tesorería             │     to awarded supplier
 └──────────────────────────────────────────────────────────────┘
                                (only the CID of each file goes on-chain)
```

The development environment (Hardhat: compile, test, deploy) is not part of the figure.

## Components

| Component | Folder | Stack | Responsibility |
|---|---|---|---|
| Smart contract | `contracts/` | Solidity ^0.8.24, Hardhat, OpenZeppelin 5.x, TypeScript tests | All rules in `spec.md` |
| Enrollment simulator | `simulator/` | Node.js (TS or JS), ethers v6, CLI | Registrar loads members (unit, owner, address, weight) and suppliers (name, address) from CSV/JSON; enable/disable; set weight; keeps the off-chain data (unit ↔ address, supplier names). Also: fund the treasury from the registrar account for the demo |
| Supplier portal | `supplier-portal/` | React + Vite, ethers v6, MetaMask | List open issues in bidding phase, show issue description from IPFS, submit bid with attachment (uploaded through the uploader) |
| Upload service | `uploader/` | Node.js 24, no dependencies | Holds the Pinata JWT; `POST /upload` pins a file on IPFS and returns its CID; `GET /config` tells clients the gateway to read from |
| Member app | `mobile/` | React Native (Expo — OPEN-7), ethers v6 | Issues list (Fig. 6), create issue with ceiling + attachment (Fig. 7), ranked vote (Fig. 8), delegation/revocation (Fig. 9), close & execute buttons, treasury balance |
| Shared | `shared/` (optional) | — | ABI + deployed address JSON exported by the deploy script, consumed by the three clients |

Both clients upload to Pinata **through the uploader**, a separate Node.js service on the same PC;
the Pinata JWT never reaches a browser or a phone. Reads go straight to the IPFS gateway.

## Target repo layout

```
contracts/
  contracts/CommunityGovernance.sol
  test/*.ts
  scripts/deploy.ts         # writes shared/deployments/<chainId>.json
  hardhat.config.ts
simulator/
  data/members.csv          # unit,owner,address,weight   (sample, fake owners)
  data/suppliers.csv        # name,address
  src/cli.ts
uploader/                   # holds the Pinata JWT; POST /upload → CID (portal and app)
supplier-portal/
mobile/
shared/deployments/
  31337.json                # local chain (`npm run node`) — not committed, changes per restart
  421614.json               # Arbitrum Sepolia — committed
docs/
```

Each deployment file holds `address`, `chainId`, `registrar`, `deployBlock` (clients read events
from it), the constructor `params` and the `abi`. One file per chain so a client can switch
between the local chain and the testnet without redeploying.

Legacy folders from the old scope — `circuits/`, `simulation/`, the nested `tfg-dao/` and
`tfg-dao.tar.gz` — are not part of this design. Propose removing them; don't delete without OK.

## Environment variables (`.env`, never committed)

```
ARBITRUM_SEPOLIA_RPC_URL=
ETHERSCAN_API_KEY=           # contract verification (Etherscan API v2 key covers Arbiscan)
DEPLOYER_PRIVATE_KEY=        # = registrar in the prototype; throwaway testnet key
PINATA_JWT=
PINATA_GATEWAY=              # e.g. <name>.mypinata.cloud
QUORUM_PERCENT=              # % of eligible weight at the snapshot; default 50 (ADR-0023)
BIDDING_PERIOD_SECONDS=      # required on the testnet; local default 300
VOTING_PERIOD_SECONDS=       # required on the testnet; local default 600
```

## Demo accounts

Testnet only. Suggest: 1 registrar, 6–8 members (enough to show delegation cap = 1/3 and an
override), 3 suppliers. Fund with an Arbitrum Sepolia faucet. Keys for demo accounts live in
`.env` / a local untracked file, never in the repo.

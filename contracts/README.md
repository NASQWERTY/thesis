# contracts — `CommunityGovernance`

Smart contract of the prototype (Solidity 0.8.28, Hardhat 3, OpenZeppelin 5).
Specification: [`docs/prototype/spec.md`](../docs/prototype/spec.md).

## Requirements

- Node.js 22 or later (developed with 24)

## Setup

```sh
cd contracts
npm install
```

## Commands

| Command | What it does |
|---|---|
| `npm run build` | Compiles the contracts → `artifacts/` (ABI + bytecode) and `types/` (TypeScript types) |
| `npm test` | Compiles and runs every test in `test/` on a fresh in-memory chain |
| `npx hardhat test --grep "zero quorum"` | Runs only the tests whose name matches |
| `npm run node` | Starts a local chain on port 8545 with 20 funded accounts, reachable from the LAN (Ctrl+C to stop) |
| `npm run deploy:local` | Deploys to the node above → `shared/deployments/31337.json` |
| `npm run deploy:sepolia` | Deploys to Arbitrum Sepolia → `shared/deployments/421614.json` |

## Layout

```
contracts/CommunityGovernance.sol   the contract
test/*.ts                           Mocha + Chai + ethers v6 tests, one file per area / HU
scripts/deploy.ts                   deployment; writes ../shared/deployments/<chainId>.json
hardhat.config.ts                   compiler version and networks
```

## Local chain

```sh
npm run node            # terminal 1 — keep it running
npm run deploy:local    # terminal 2
```

The node keeps state in memory only: after restarting it, deploy again. The first account
(`0xf39F…2266`) deploys and is therefore the registrar. Local defaults: quorum 4, bidding 300 s,
voting 600 s (override with `QUORUM`, `BIDDING_PERIOD_SECONDS`, `VOTING_PERIOD_SECONDS`).

From a phone on the same WiFi, the RPC URL is `http://<PC LAN IP>:8545`; from the Android
emulator, `http://10.0.2.2:8545`. Windows may ask to allow Node.js through the firewall the
first time — allow it on private networks.

## Arbitrum Sepolia

Fill `.env` at the repo root (see `.env.example`): `ARBITRUM_SEPOLIA_RPC_URL`,
`DEPLOYER_PRIVATE_KEY` (throwaway testnet key, funded from a faucet) and the three contract
parameters, which have no defaults outside the local chain. Then `npm run deploy:sepolia`.
The key can also live in the encrypted Hardhat keystore instead of `.env`:
`npx hardhat keystore set DEPLOYER_PRIVATE_KEY`.

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
| `npm run node` | Starts a local chain at `http://127.0.0.1:8545` with 20 funded accounts (Ctrl+C to stop) |

## Layout

```
contracts/CommunityGovernance.sol   the contract
test/*.ts                           Mocha + Chai + ethers v6 tests
hardhat.config.ts                   compiler version and networks
```

## Arbitrum Sepolia

The `arbitrumSepolia` network reads `ARBITRUM_SEPOLIA_RPC_URL` and `DEPLOYER_PRIVATE_KEY`
from environment variables or from the encrypted Hardhat keystore
(`npx hardhat keystore set DEPLOYER_PRIVATE_KEY`). Use a throwaway testnet key only.
Deployment instructions will be added with the deploy script.

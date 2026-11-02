# simulator — enrollment simulator (registrar)

Off-chain tool of the registrar (ADR-0015): loads the member registry and the supplier
registry from CSV files into the deployed `CommunityGovernance`, and inspects them.
Node.js 24 runs the TypeScript sources directly (no build step). Output is in Spanish.

## Setup

```sh
cd simulator
npm install
```

The contract must be deployed first (`contracts/`: `npm run node`, then `npm run deploy:local`).
The simulator reads `shared/deployments/<chainId>.json`.

## Commands

```sh
npm run sim -- <command> [args] [--network local|sepolia]    # default: local
```

| Command | What it does |
|---|---|
| `members [csv]` | Registers the CSV members that are not registered yet (safe to re-run) |
| `suppliers [csv]` | Same for suppliers |
| `eligibility <member> si\|no` | Enables / disables (moroso) a member |
| `weight <member> <n>` | Changes a member's vote weight |
| `remove <member>` | Removes a member |
| `list` | Registry, suppliers, treasury balance and contract parameters |
| `fund <eth>` | Sends ETH from the registrar to the treasury |
| `keys` | Prints the private keys of the demo accounts |
| `qr [member] [--html]` | QR code of each member's key (all, or one) for the member app to scan. `--html` writes `qr.<network>.html` (not committed) to open in a browser |
| `accounts <n>` | Generates `n` new accounts for the testnet → `accounts.sepolia.json` (not committed) |

`<member>` is an address or a unit from the members CSV (e.g. `T1-1A`).

## Data

```
data/local/members.csv      unidad,titular,direccion,peso   — Hardhat accounts 1–8
data/local/suppliers.csv    nombre,direccion                — Hardhat accounts 9–11
data/sepolia/               to be created for the testnet deployment
```

Owners and supplier names are fictitious. The supplier name lives only in the CSV
(decided 2026-10-23); the contract keeps the address.

On the local chain the registrar is Hardhat account 0 and the other keys come from the public
Hardhat mnemonic. On Sepolia the registrar is `DEPLOYER_PRIVATE_KEY` from the repo `.env`.

## Typical local session

```sh
npm run sim -- members
npm run sim -- suppliers
npm run sim -- fund 10
npm run sim -- list
```

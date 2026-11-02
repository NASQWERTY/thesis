# supplier-portal — portal de proveedores

Web app for registered suppliers (HU-004): connect MetaMask, see the issues open to bids,
submit a bid with its proposal document (uploaded to IPFS), and follow their bids.
React 19 + Vite + TypeScript + ethers v6. UI in Spanish.

## Setup

```sh
cd supplier-portal
npm install
```

## Run (local chain)

Four terminals:

```sh
cd contracts && npm run node              # 1. local chain
cd contracts && npm run deploy:local      # 2. contract (again after every node restart)
cd uploader && npm start                  # 3. upload service (needs PINATA_JWT, PINATA_GATEWAY)
cd supplier-portal && npm run dev         # 4. portal → http://localhost:5173
```

Load the registry and create an issue to bid on (from `simulator/`):

```sh
npm run sim -- members
npm run sim -- suppliers
npm run sim -- fund 10
npm run sim -- issue T1-1A 4 "Reparación del ascensor de la torre 1" --topic ascensor
```

### MetaMask

1. **Import a supplier account**: `npm run sim -- keys` lists the keys (e.g. *Ascensores Andinos
   SRL*). MetaMask → account menu → *Add account or hardware wallet* → *Import account*.
2. **Connect** in the portal: it switches MetaMask to the selected network and adds it the first
   time (local: `http://127.0.0.1:8545`, chainId 31337).
3. **After every node restart**, the chain starts from zero but MetaMask remembers old nonces and
   transactions fail ("nonce too high"). MetaMask → *Settings → Advanced → Clear activity tab data*.

## How it works

| Screen part | Source |
|---|---|
| Supplier status, balance | `isSupplier(account)`, provider balance |
| Open issues | ids `1 … nextIssueId - 1` with `phaseOf == Bidding`; `issues`, `getBids`, `hasBid` |
| Issue description | text fetched from the IPFS gateway (`descriptionCid`) |
| Submit bid | file → uploader → CID → `submitBid(issueId, amount, cid)` signed in MetaMask |
| My bids | `BidSubmitted` events filtered by the supplier (indexed), then `bids` and `phaseOf` |

Reads go straight to the RPC (not through MetaMask) so they are never stale; writes are signed
by MetaMask. Countdowns run on chain time, which on the local chain can be moved forward with
`npm run sim -- time <seconds>`. The data refreshes every 15 s.

`npm run dev` / `build` first copy `shared/deployments/*.json` into `src/generated/` (not
committed): after redeploying, restart the dev server.

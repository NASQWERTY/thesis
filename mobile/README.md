# mobile — member app

React Native app for the community members (Expo SDK 58, TypeScript, ethers v6). UI in Spanish.

Current state: **wallet spike** — import a testnet key, read the member's status and the
treasury from the contract, and sign a transaction (a contribution to the treasury).

Wallet strategy (OPEN-7, decided 2026-10-27): the app holds an imported testnet key in the
device's secure storage (`expo-secure-store`) and signs locally. Prototype limitation.

## Setup

```sh
cd mobile
npm install
```

## Run on an Android phone (Expo Go)

1. Install **Expo Go** from the Play Store. Phone and PC on the same WiFi.
2. Local chain running and contract deployed (`contracts/`: `npm run node`, `npm run deploy:local`)
   and the registry loaded (`simulator/`: `npm run sim -- members`, `suppliers`, `fund 10`).
3. `npm start` — copies `shared/deployments/*.json` into the app and shows a QR code.
4. Scan the QR code with Expo Go.
5. Import a member key: `npm run sim -- keys` in `simulator/` lists them.

The app derives the local RPC URL from the address it was loaded from
(`http://<PC IP>:8545`); it can be edited on the home screen. After redeploying the contract,
restart `npm start` so the new address is copied.

If the phone cannot connect: allow Node.js on **private networks** in the Windows firewall
(ports 8081 for Expo and 8545 for the chain), and check that the WiFi is not a guest network
with client isolation.

## Android emulator (for the demo)

Requires Android Studio with an emulator image. With the emulator running, `npm start` and
press `a`. From the emulator the PC is `10.0.2.2`.

## Scripts

| Script | What it does |
|---|---|
| `npm start` | Syncs deployments, starts the Expo dev server |
| `npm run typecheck` | TypeScript check |

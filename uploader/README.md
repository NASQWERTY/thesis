# uploader — IPFS upload service

The only component that holds the Pinata JWT. The supplier portal and the member app send
files here and receive their IPFS CID, which is what goes on-chain (ADR-0018). The JWT never
reaches a browser or a phone.

Node.js 24, no dependencies (native `fetch`, `FormData`, `Request`).

## Setup

In the repo-level `.env`:

```
PINATA_JWT=...                      # Pinata → API Keys → New Key
PINATA_GATEWAY=xxx.mypinata.cloud   # Pinata → Gateways
```

## Run

```sh
cd uploader
npm start          # listens on 0.0.0.0:8787 (UPLOADER_PORT to change it)
```

## API

| Method | Path | Body | Response |
|---|---|---|---|
| `POST` | `/upload` | `multipart/form-data` with a `file` field (≤ 10 MB) | `{ cid, url }` |
| `GET` | `/config` | — | `{ gateway }` — clients build `https://<gateway>/ipfs/<cid>` |
| `GET` | `/health` | — | `{ ok: true }` |

Errors come back as `{ error }` in Spanish (shown to the user as is). Uploads use the Pinata
Files API v3 (`POST https://uploads.pinata.cloud/v3/files`, `network=public`).

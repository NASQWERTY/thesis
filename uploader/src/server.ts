// Upload service: the only component that holds the Pinata JWT (never shipped to a browser or a
// phone). The supplier portal and the member app send files here and get back their IPFS CID.
//
//   POST /upload   multipart/form-data with a "file" field  → { cid, url }
//   GET  /config   → { gateway }   so clients can build links to uploaded files
//   GET  /health   → { ok: true }
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { Readable } from "node:stream";

try {
  process.loadEnvFile(new URL("../../.env", import.meta.url));
} catch {
  // Checked below.
}

const PINATA_JWT = process.env.PINATA_JWT;
const PINATA_GATEWAY = process.env.PINATA_GATEWAY || null;
const PORT = Number(process.env.UPLOADER_PORT || 8787);
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB: proposals are documents, not media

if (!PINATA_JWT) {
  console.error("Falta PINATA_JWT en el .env de la raíz del repo.");
  process.exit(1);
}
if (!PINATA_GATEWAY) console.warn("Aviso: falta PINATA_GATEWAY; los clientes no podrán mostrar los archivos.");

function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    // Any origin: the portal runs on a dev server and the app on a phone. Uploading is not a
    // secret operation; the JWT stays here.
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(body));
}

/** Parses the multipart body with the standard Request API (no dependencies). */
async function readFile(req: IncomingMessage): Promise<File> {
  const length = Number(req.headers["content-length"] ?? 0);
  if (length > MAX_BYTES) throw new HttpError(413, "El archivo supera los 10 MB.");

  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) if (typeof v === "string") headers.set(k, v);
  const request = new Request(`http://localhost${req.url}`, {
    method: "POST",
    headers,
    body: Readable.toWeb(req) as ReadableStream,
    duplex: "half",
  } as RequestInit);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw new HttpError(400, 'Se esperaba multipart/form-data con un campo "file".');
  }
  const file = form.get("file");
  if (!(file instanceof File)) throw new HttpError(400, 'Falta el campo "file".');
  if (file.size === 0) throw new HttpError(400, "El archivo está vacío.");
  if (file.size > MAX_BYTES) throw new HttpError(413, "El archivo supera los 10 MB.");
  return file;
}

/** Pinata Files API v3: public upload, returns the CID. https://docs.pinata.cloud/quickstart */
async function pinToIpfs(file: File): Promise<string> {
  const body = new FormData();
  body.append("file", file, file.name || "archivo");
  body.append("network", "public");

  const response = await fetch("https://uploads.pinata.cloud/v3/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${PINATA_JWT}` },
    body,
  });
  if (!response.ok) {
    console.error(`Pinata respondió ${response.status}: ${await response.text()}`);
    throw new HttpError(502, `Pinata rechazó la subida (HTTP ${response.status}).`);
  }
  const json = (await response.json()) as { data?: { cid?: string } };
  if (!json.data?.cid) throw new HttpError(502, "Pinata no devolvió un CID.");
  return json.data.cid;
}

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const gatewayUrl = (cid: string) => (PINATA_GATEWAY ? `https://${PINATA_GATEWAY}/ipfs/${cid}` : null);

const server = createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") return send(res, 204, null);
    if (req.method === "GET" && req.url === "/health") return send(res, 200, { ok: true });
    if (req.method === "GET" && req.url === "/config") return send(res, 200, { gateway: PINATA_GATEWAY });
    if (req.method === "POST" && req.url === "/upload") {
      const file = await readFile(req);
      const cid = await pinToIpfs(file);
      console.log(`Subido ${file.name} (${file.size} bytes) → ${cid}`);
      return send(res, 200, { cid, url: gatewayUrl(cid) });
    }
    send(res, 404, { error: "No encontrado." });
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 500;
    if (!(err instanceof HttpError)) console.error(err);
    send(res, status, { error: err instanceof HttpError ? err.message : "Error interno del servidor." });
  }
});

// 0.0.0.0: reachable from the phone on the same WiFi, like the local chain.
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Uploader escuchando en http://0.0.0.0:${PORT} (gateway: ${PINATA_GATEWAY ?? "sin configurar"})`);
});

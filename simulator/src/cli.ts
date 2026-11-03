// Enrollment simulator: the registrar's off-chain tool (ADR-0015). Loads the member registry and
// the supplier registry from CSV files into the contract, and inspects them.
import { readFile, writeFile } from "node:fs/promises";
import { relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { Contract, encodeBytes32String, formatEther, getAddress, isAddress, parseEther, Wallet } from "ethers";
import QRCode from "qrcode";
import { connect, dataDir, hardhatAccount, type Connection, type NetworkName } from "./chain.ts";
import { readMembers, readSuppliers, type MemberRow, type SupplierRow } from "./csv.ts";
import { describeError, UserError } from "./errors.ts";
import { CLOSE_REASONS, history } from "./history.ts";

const HELP = `Simulador de empadronamiento (registrador)

Uso: npm run sim -- <comando> [argumentos] [--network local|sepolia]

Comandos:
  members [csv]               Da de alta los miembros del CSV que no estén registrados
  suppliers [csv]             Da de alta los proveedores del CSV que no estén registrados
  eligibility <miembro> si|no Habilita o deshabilita (moroso) a un miembro
  weight <miembro> <peso>     Cambia el peso de voto de un miembro
  remove <miembro>            Da de baja a un miembro
  list                        Muestra el padrón, los proveedores y la tesorería
  history [--issue <n>]       Historial de eventos del contrato (o de una cuestión)
  fund <eth>                  Envía ETH del registrador a la tesorería del contrato
  gas <eth>                   Completa hasta <eth> el saldo de cada miembro y proveedor de los
                              CSV, para que puedan pagar el gas (desde el registrador)
  close <n>                   Cierra la cuestión n y muestra el resultado (cualquier cuenta
                              puede cerrar; firma el registrador)
  execute <n>                 Paga al proveedor adjudicado en la cuestión n (también
                              sin permisos; firma el registrador)
  keys [--file]               Muestra las claves privadas de las cuentas de demo
                              (--file genera cuentas-demo.<red>.txt para entregar)
  qr [miembro] [--html]       Muestra el QR de la clave de cada miembro, para escanear con la app
                              (--html genera una página para abrir en el navegador)
  accounts <n>                Genera n cuentas nuevas para la testnet (sepolia)

Solo red local (demo):
  issue <miembro> <techo> [descripción] [--topic t]
                              Plantea una cuestión en nombre del miembro (techo en ETH).
                              Sube la descripción con el uploader si está corriendo
  time <segundos>             Adelanta el reloj de la cadena (p. ej. para cerrar las ofertas)

<miembro> es una dirección o una unidad del CSV de miembros (p. ej. T1-1A).
Por defecto se usan data/<red>/members.csv y data/<red>/suppliers.csv.`;

const { values: opts, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    network: { type: "string", short: "n", default: "local" },
    html: { type: "boolean" },
    file: { type: "boolean" },
    issue: { type: "string" },
    topic: { type: "string", default: "general" },
    help: { type: "boolean", short: "h" },
  },
});

const network = opts.network as NetworkName;
const [command, ...args] = positionals;

const short = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`;
const shown = (path: string) => relative(process.cwd(), path) || path;
const membersCsv = (path?: string) => path ?? fileURLToPath(new URL("members.csv", dataDir(network)));
const suppliersCsv = (path?: string) => path ?? fileURLToPath(new URL("suppliers.csv", dataDir(network)));
const accountsFile = fileURLToPath(new URL(`../accounts.${network}.json`, import.meta.url));
const qrHtmlFile = fileURLToPath(new URL(`../qr.${network}.html`, import.meta.url));
const keysFile = fileURLToPath(new URL(`../cuentas-demo.${network}.txt`, import.meta.url));

/** Members CSV indexed by address, empty if the file does not exist. */
async function membersByAddress(): Promise<Map<string, MemberRow>> {
  try {
    return new Map((await readMembers(membersCsv())).map((m) => [m.address, m]));
  } catch {
    return new Map();
  }
}

async function suppliersByAddress(): Promise<Map<string, SupplierRow>> {
  try {
    return new Map((await readSuppliers(suppliersCsv())).map((s) => [s.address, s]));
  } catch {
    return new Map();
  }
}

/** Accepts an address or a unit label from the members CSV. */
async function resolveMember(arg: string | undefined): Promise<string> {
  if (!arg) throw new UserError("Falta el miembro (dirección o unidad)");
  const unit = arg.toLowerCase();
  if (isAddress(arg)) return getAddress(arg);
  for (const m of (await membersByAddress()).values()) {
    if (m.unit.toLowerCase() === unit) return m.address;
  }
  throw new UserError(`"${arg}" no es una dirección ni una unidad del CSV de miembros`);
}

async function label(address: string): Promise<string> {
  const m = (await membersByAddress()).get(address);
  return m ? `${m.unit} ${m.owner} (${short(address)})` : address;
}

/** Sends a registrar transaction and waits for it to be mined. */
async function send(c: Connection, description: string, tx: () => Promise<{ wait: () => Promise<unknown> }>) {
  try {
    await (await tx()).wait();
    console.log(`  ✔ ${description}`);
    return true;
  } catch (err) {
    console.log(`  ✘ ${description}: ${describeError(err, c.gov.interface)}`);
    return false;
  }
}

function checkRegistrar(c: Connection) {
  if (c.registrar.address !== getAddress(c.deployment.registrar)) {
    throw new UserError(
      `La cuenta ${c.registrar.address} no es el registrador del contrato (${c.deployment.registrar})`,
    );
  }
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

async function members(c: Connection, path?: string) {
  checkRegistrar(c);
  const rows = await readMembers(membersCsv(path));
  console.log(`Alta de ${rows.length} miembros desde ${shown(membersCsv(path))}`);
  let added = 0;
  for (const m of rows) {
    const desc = `${m.unit.padEnd(6)} ${m.owner.padEnd(18)} ${short(m.address)} peso ${m.weight}`;
    if ((await c.gov.members(m.address)).registered) {
      console.log(`  · ${desc}: ya registrado`);
      continue;
    }
    if (await send(c, desc, () => c.gov.registerMember(m.address, m.weight))) added++;
  }
  console.log(`${added} alta(s) nueva(s).`);
}

async function suppliers(c: Connection, path?: string) {
  checkRegistrar(c);
  const rows = await readSuppliers(suppliersCsv(path));
  console.log(`Alta de ${rows.length} proveedores desde ${shown(suppliersCsv(path))}`);
  let added = 0;
  for (const s of rows) {
    const desc = `${s.name.padEnd(24)} ${short(s.address)}`;
    if (await c.gov.isSupplier(s.address)) {
      console.log(`  · ${desc}: ya registrado`);
      continue;
    }
    if (await send(c, desc, () => c.gov.registerSupplier(s.address))) added++;
  }
  console.log(`${added} alta(s) nueva(s).`);
}

async function eligibility(c: Connection, memberArg?: string, value?: string) {
  checkRegistrar(c);
  const member = await resolveMember(memberArg);
  if (value !== "si" && value !== "no") throw new UserError('Indicá "si" (habilitar) o "no" (deshabilitar)');
  const eligible = value === "si";
  await send(c, `${eligible ? "Habilitar" : "Deshabilitar"} a ${await label(member)}`, () =>
    c.gov.setEligibility(member, eligible),
  );
}

async function weight(c: Connection, memberArg?: string, value?: string) {
  checkRegistrar(c);
  const member = await resolveMember(memberArg);
  const w = Number(value);
  if (!Number.isInteger(w) || w <= 0) throw new UserError("El peso debe ser un entero mayor que 0");
  await send(c, `Peso ${w} para ${await label(member)}`, () => c.gov.setWeight(member, w));
}

async function remove(c: Connection, memberArg?: string) {
  checkRegistrar(c);
  const member = await resolveMember(memberArg);
  await send(c, `Baja de ${await label(member)}`, () => c.gov.removeMember(member));
}

async function list(c: Connection) {
  const csvMembers = await membersByAddress();
  const csvSuppliers = await suppliersByAddress();
  const now = (await c.provider.getBlock("latest"))!.timestamp;

  console.log(`Contrato ${c.deployment.address} en ${network} (chainId ${c.deployment.chainId})`);
  console.log(`Registrador ${c.deployment.registrar}\n`);

  const count = Number(await c.gov.memberCount());
  console.log(`Padrón (${count})`);
  console.log(`  ${"Unidad".padEnd(7)}${"Titular".padEnd(19)}${"Dirección".padEnd(14)}${"Estado".padEnd(14)}Peso  Delegado      Recibido`);
  for (let i = 0; i < count; i++) {
    const address: string = await c.gov.memberList(i);
    const m = await c.gov.members(address);
    const row = csvMembers.get(address);
    const status = !m.registered ? "dado de baja" : m.eligible ? "habilitado" : "deshabilitado";
    const delegate = m.delegate === "0x0000000000000000000000000000000000000000" ? "—" : short(m.delegate);
    console.log(
      `  ${(row?.unit ?? "?").padEnd(7)}${(row?.owner ?? "?").padEnd(19)}${short(address).padEnd(14)}` +
        `${status.padEnd(14)}${String(m.weight).padEnd(6)}${delegate.padEnd(14)}${m.receivedWeight}`,
    );
  }
  console.log(`  Peso total habilitado: ${await c.gov.totalWeightAt(now)}\n`);

  // Suppliers are a mapping on-chain: enumerate them from their registration events.
  const events = await c.gov.queryFilter(c.gov.filters.SupplierRegistered(), c.deployment.deployBlock);
  console.log(`Proveedores (${events.length})`);
  for (const ev of events) {
    const address: string = (ev as unknown as { args: [string] }).args[0];
    console.log(`  ${(csvSuppliers.get(address)?.name ?? "?").padEnd(26)}${address}`);
  }

  const balance = await c.provider.getBalance(c.deployment.address);
  console.log(`\nTesorería: ${formatEther(balance)} ETH`);
  console.log(
    `Parámetros: quórum ${c.deployment.params.quorumPercent} %, ofertas ${c.deployment.params.biddingPeriod} s, ` +
      `votación ${c.deployment.params.votingPeriod} s`,
  );
}

async function fund(c: Connection, amount?: string) {
  let value: bigint;
  try {
    value = parseEther(amount ?? "");
  } catch {
    throw new UserError("Indicá el monto en ETH, p. ej. 1.5");
  }
  await send(c, `Envío de ${amount} ETH a la tesorería`, () =>
    c.registrar.sendTransaction({ to: c.deployment.address, value }),
  );
  console.log(`Tesorería: ${formatEther(await c.provider.getBalance(c.deployment.address))} ETH`);
}

/** Private key of each demo account: Hardhat accounts locally, generated accounts on Sepolia. */
async function demoKeys(): Promise<(address: string) => string | undefined> {
  if (network === "local") {
    const local = new Map(Array.from({ length: 20 }, (_, i) => hardhatAccount(i)).map((w) => [w.address, w.privateKey]));
    return (a) => local.get(a);
  }
  let saved: { address: string; privateKey: string }[];
  try {
    saved = JSON.parse(await readFile(accountsFile, "utf8"));
  } catch {
    throw new UserError(`No existe ${shown(accountsFile)}. Generá las cuentas con \`accounts <n>\`.`);
  }
  const byAddress = new Map(saved.map((a) => [getAddress(a.address), a.privateKey]));
  return (a) => byAddress.get(a);
}

const KEYS_WARNING = "Claves de las cuentas de demo. SOLO TESTNET: nunca uses estas claves con fondos reales.";

/**
 * Private keys of the demo accounts, to import them into the member app or a browser wallet.
 * `--file` writes them, with the contract and how to use them, to a text file meant to be handed
 * over with the delivery (not versioned).
 */
async function keys(toFile: boolean) {
  const keyOf = await demoKeys();
  if (toFile) return writeKeysFile(keyOf);
  console.log(`${KEYS_WARNING}\n`);
  console.log("Miembros");
  for (const m of (await membersByAddress()).values()) {
    console.log(`  ${m.unit.padEnd(7)}${m.owner.padEnd(19)}${m.address}\n         ${keyOf(m.address) ?? "(clave desconocida)"}`);
  }
  console.log("Proveedores");
  for (const s of (await suppliersByAddress()).values()) {
    console.log(`  ${s.name.padEnd(26)}${s.address}\n         ${keyOf(s.address) ?? "(clave desconocida)"}`);
  }
}

const CHAIN_IDS: Record<NetworkName, number> = { local: 31337, sepolia: 421614 };
const EXPLORERS: Partial<Record<NetworkName, string>> = { sepolia: "https://sepolia.arbiscan.io" };

async function writeKeysFile(keyOf: (address: string) => string | undefined) {
  let contract = "(sin desplegar)";
  try {
    const file = new URL(`../../shared/deployments/${CHAIN_IDS[network]}.json`, import.meta.url);
    contract = JSON.parse(await readFile(file, "utf8")).address;
  } catch {
    // No deployment yet: the file still lists the accounts.
  }
  const explorer = EXPLORERS[network];
  const key = (address: string) => keyOf(address) ?? "(clave desconocida)";

  const lines = [
    `CUENTAS DE DEMO — ${network === "sepolia" ? "Arbitrum Sepolia (testnet, chainId 421614)" : "red local de Hardhat"}`,
    "",
    "SOLO TESTNET. Estas claves no tienen ni deben tener valor económico: nunca las uses en una red",
    "real ni les envíes fondos reales.",
    "",
    `Contrato: ${contract}`,
    ...(explorer && contract.startsWith("0x") ? [`Explorador: ${explorer}/address/${contract}`] : []),
    "",
    "Cómo usarlas:",
    "- Miembros: en la app móvil, pegar la clave en «O pegá la clave privada» y tocar «Importar»",
    "  (o «Escanear QR» con el código de `npm run sim -- qr`).",
    "- Proveedores: en MetaMask, «Importar cuenta» con la clave privada; después, en el portal de",
    "  proveedores, «Conectar MetaMask».",
    "",
    "MIEMBROS (unidad, titular)",
    "",
  ];
  for (const m of (await membersByAddress()).values()) {
    lines.push(`${m.unit}  ${m.owner}`, `  Dirección:     ${m.address}`, `  Clave privada: ${key(m.address)}`, "");
  }
  lines.push("PROVEEDORES", "");
  for (const s of (await suppliersByAddress()).values()) {
    lines.push(s.name, `  Dirección:     ${s.address}`, `  Clave privada: ${key(s.address)}`, "");
  }
  await writeFile(keysFile, lines.join("\n"));
  console.log(`Cuentas de demo en ${shown(keysFile)} (no se versiona). Entregalo aparte del código.`);
}

/**
 * QR code of each member's private key, scanned by the member app to import the account.
 * The QR content is the bare key (0x + 64 hex chars). Terminal by default; `--html` writes a page
 * (not committed) for screens where the terminal QR does not scan well.
 */
async function qr(memberArg: string | undefined, html: boolean) {
  const keyOf = await demoKeys();
  let selected = [...(await membersByAddress()).values()];
  if (memberArg) {
    const address = await resolveMember(memberArg);
    selected = selected.filter((m) => m.address === address);
    if (selected.length === 0) throw new UserError(`${memberArg} no está en el CSV de miembros`);
  }

  const entries = selected.map((m) => ({ ...m, key: keyOf(m.address) })).filter((m) => m.key);
  if (entries.length === 0) throw new UserError("No hay claves conocidas para esos miembros");

  if (html) {
    const cards = await Promise.all(
      entries.map(
        async (m) => `<figure><img src="${await QRCode.toDataURL(m.key!, { margin: 2, width: 260 })}" alt="">
  <figcaption><b>${m.unit}</b> ${m.owner}<br><small>${m.address}</small></figcaption></figure>`,
      ),
    );
    const page = `<!doctype html><html lang="es"><meta charset="utf-8"><title>Claves QR (${network})</title>
<style>body{font-family:system-ui,sans-serif;margin:24px;background:#fff;color:#111}
main{display:flex;flex-wrap:wrap;gap:24px}figure{margin:0;text-align:center;border:1px solid #ddd;border-radius:8px;padding:12px}
small{color:#666;font-size:11px}p{color:#b00}</style>
<h1>Claves de miembros — ${network}</h1><p>${KEYS_WARNING}</p><main>${cards.join("\n")}</main></html>\n`;
    await writeFile(qrHtmlFile, page);
    console.log(`Página con ${entries.length} QR en ${shown(qrHtmlFile)} (no se versiona). Abrila en el navegador.`);
    return;
  }

  console.log(`${KEYS_WARNING}\n`);
  for (const m of entries) {
    console.log(`${m.unit} ${m.owner} (${short(m.address)})`);
    console.log(await QRCode.toString(m.key!, { type: "terminal", small: true }));
  }
}

async function accounts(countArg?: string) {
  if (network === "local") throw new UserError("En la red local se usan las cuentas de Hardhat; no hace falta generar.");
  const n = Number(countArg);
  if (!Number.isInteger(n) || n <= 0) throw new UserError("Indicá cuántas cuentas generar, p. ej. accounts 11");
  try {
    await readFile(accountsFile);
    throw new UserError(`${shown(accountsFile)} ya existe; no se sobrescribe.`);
  } catch (err) {
    if (err instanceof UserError) throw err;
  }

  const wallets = Array.from({ length: n }, () => Wallet.createRandom());
  const data = wallets.map((w) => ({ address: w.address, privateKey: w.privateKey }));
  await writeFile(accountsFile, JSON.stringify(data, null, 2) + "\n");
  console.log(`${n} cuentas guardadas en ${shown(accountsFile)} (no se versiona).`);
  console.log("Copiá las direcciones a los CSV de data/sepolia/ y fondealas desde un faucet:");
  for (const w of wallets) console.log(`  ${w.address}`);
}

/** Uploads text through the uploader service; null if it is not running. */
async function uploadText(name: string, text: string): Promise<string | null> {
  const url = process.env.UPLOADER_URL || "http://127.0.0.1:8787";
  const body = new FormData();
  body.append("file", new Blob([text], { type: "text/plain;charset=utf-8" }), name);
  try {
    const response = await fetch(`${url}/upload`, { method: "POST", body });
    const json = (await response.json()) as { cid?: string; error?: string };
    if (!response.ok || !json.cid) throw new UserError(`El uploader rechazó la subida: ${json.error ?? response.status}`);
    return json.cid;
  } catch (err) {
    if (err instanceof UserError) throw err;
    return null; // not running
  }
}

// Placeholder used when the uploader is not running: the contract only checks the CID is not empty.
const PLACEHOLDER_CID = "bafkreiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

/** Demo only: raises an issue signing with the member's local Hardhat key. */
async function issue(c: Connection, memberArg?: string, ceilingArg?: string, description?: string) {
  if (network !== "local") throw new UserError("Solo en la red local: en testnet el simulador no tiene las claves de los miembros.");
  const member = await resolveMember(memberArg);
  let ceiling: bigint;
  try {
    ceiling = parseEther(ceilingArg ?? "");
  } catch {
    throw new UserError("Indicá el techo en ETH, p. ej. 2.5");
  }
  const key = (await demoKeys())(member);
  if (!key) throw new UserError(`No hay clave local para ${member}`);

  const text = description ?? "Cuestión de prueba creada desde el simulador.";
  let cid = await uploadText("descripcion.txt", text);
  if (cid) console.log(`  Descripción subida a IPFS: ${cid}`);
  else {
    cid = PLACEHOLDER_CID;
    console.log("  Aviso: el uploader no está corriendo; se usa un CID de ejemplo.");
  }

  const gov = c.gov.connect(new Wallet(key, c.provider)) as Contract;
  const topic = encodeBytes32String(opts.topic!.slice(0, 31));
  let issueId: bigint | undefined;
  await send(c, `Cuestión de ${await label(member)} con techo ${ceilingArg} ETH`, async () => {
    const tx = await gov.createIssue(cid, topic, ceiling);
    return {
      wait: async () => {
        const receipt = await tx.wait();
        for (const log of receipt.logs) {
          const parsed = gov.interface.parseLog(log);
          if (parsed?.name === "IssueCreated") issueId = parsed.args.issueId;
        }
      },
    };
  });
  if (issueId !== undefined) console.log(`Cuestión #${issueId} en fase de ofertas.`);
}

/** Demo only: moves the local chain's clock forward and mines a block. */
async function advanceTime(c: Connection, secondsArg?: string) {
  if (network !== "local") throw new UserError("Solo en la red local: el tiempo de la testnet no se puede adelantar.");
  const seconds = Number(secondsArg);
  if (!Number.isInteger(seconds) || seconds <= 0) throw new UserError("Indicá los segundos, p. ej. time 300");
  await c.provider.send("evm_increaseTime", [seconds]);
  await c.provider.send("evm_mine", []);
  const block = (await c.provider.getBlock("latest"))!;
  console.log(`Reloj adelantado ${seconds} s. Hora de la cadena: ${new Date(block.timestamp * 1000).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "medium" })}`);
}

/**
 * Closes an issue and prints the outcome. closeIssue is permissionless: the registrar account
 * just pays the gas, any account could do it (ADR-0016).
 */
async function close(c: Connection, arg?: string) {
  const issueId = issueNumber(arg, "close 1");
  if (!(await send(c, `Cierre de la cuestión #${issueId}`, () => c.gov.closeIssue(issueId)))) return;

  const issue = await c.gov.issues(issueId);
  if (issue.status === 1n) {
    const bid = await c.gov.bids(issue.winningBidId);
    const supplier = (await suppliersByAddress()).get(bid.supplier)?.name ?? bid.supplier;
    console.log(`Adjudicada a la oferta #${issue.winningBidId}: ${supplier} · ${formatEther(bid.amount)} ETH`);
  } else {
    console.log(`Cerrada sin adjudicar: ${CLOSE_REASONS[Number(issue.closeReason)]}. Se liberó la reserva.`);
  }
}

/**
 * Tops up every member and supplier of the CSVs to `amount` ETH for gas, from the registrar.
 * On the testnet each faucet asks for a login per address; funding the demo accounts from the
 * registrar is the practical way. Accounts already at or above `amount` are skipped.
 */
async function gas(c: Connection, amount?: string) {
  let target: bigint;
  try {
    target = parseEther(amount ?? "");
  } catch {
    throw new UserError("Indicá el saldo objetivo en ETH, p. ej. gas 0.002");
  }
  const accounts = [
    ...(await readMembers(membersCsv())).map((m) => ({ address: m.address, label: `${m.unit} ${m.owner}` })),
    ...(await readSuppliers(suppliersCsv())).map((s) => ({ address: s.address, label: s.name })),
  ];
  console.log(`Saldo para gas: ${amount} ETH a ${accounts.length} cuentas`);
  for (const a of accounts) {
    const balance = await c.provider.getBalance(a.address);
    const desc = `${a.label.padEnd(26)} ${short(a.address)}`;
    if (balance >= target) {
      console.log(`  · ${desc}: ya tiene ${formatEther(balance)} ETH`);
      continue;
    }
    const value = target - balance;
    await send(c, `${desc}: +${formatEther(value)} ETH`, () => c.registrar.sendTransaction({ to: a.address, value }));
  }
  console.log(`Saldo del registrador: ${formatEther(await c.provider.getBalance(c.registrar.address))} ETH`);
}

/** Pays the awarded supplier (HU-009). Permissionless too: the registrar account pays the gas. */
async function execute(c: Connection, arg?: string) {
  const issueId = issueNumber(arg, "execute 1");
  const issue = await c.gov.issues(issueId);
  const bid = await c.gov.bids(issue.winningBidId);
  const supplier = (await suppliersByAddress()).get(bid.supplier)?.name ?? bid.supplier;
  const desc = `Pago de la cuestión #${issueId}`;
  if (!(await send(c, desc, () => c.gov.executeTransfer(issueId)))) return;
  console.log(
    `Se pagaron ${formatEther(bid.amount)} ETH a ${supplier}. ` +
      `Se liberaron ${formatEther(issue.ceiling - bid.amount)} ETH del techo.`,
  );
}

function issueNumber(arg: string | undefined, example: string): bigint {
  if (!/^[0-9]+$/.test(arg ?? "")) throw new UserError(`Indicá el número de la cuestión, p. ej. ${example}`);
  return BigInt(arg!);
}

function issueArg(): bigint | undefined {
  if (opts.issue === undefined) return undefined;
  if (!/^[0-9]+$/.test(opts.issue)) throw new UserError("--issue debe ser el número de la cuestión");
  return BigInt(opts.issue);
}

// ---------------------------------------------------------------------------

async function main() {
  if (opts.help || !command) {
    console.log(HELP);
    return;
  }
  if (network !== "local" && network !== "sepolia") throw new UserError(`Red desconocida: ${network}`);

  // Commands that do not need the chain.
  if (command === "accounts") return accounts(args[0]);
  if (command === "keys") return keys(opts.file ?? false);
  if (command === "qr") return qr(args[0], opts.html ?? false);

  const commands: Record<string, (c: Connection) => Promise<void>> = {
    members: (c) => members(c, args[0]),
    suppliers: (c) => suppliers(c, args[0]),
    eligibility: (c) => eligibility(c, args[0], args[1]),
    weight: (c) => weight(c, args[0], args[1]),
    remove: (c) => remove(c, args[0]),
    list: (c) => list(c),
    issue: (c) => issue(c, args[0], args[1], args.slice(2).join(" ") || undefined),
    time: (c) => advanceTime(c, args[0]),
    close: (c) => close(c, args[0]),
    execute: (c) => execute(c, args[0]),
    gas: (c) => gas(c, args[0]),
    history: async (c) => history(c, await membersByAddress(), await suppliersByAddress(), issueArg()),
    fund: (c) => fund(c, args[0]),
  };
  const run = commands[command];
  if (!run) throw new UserError(`Comando desconocido: ${command}. Usá --help para ver los comandos.`);

  const c = await connect(network);
  try {
    await run(c);
  } finally {
    c.provider.destroy();
  }
}

main().catch((err) => {
  console.error(err instanceof UserError ? `Error: ${err.message}` : err);
  process.exitCode = 1;
});

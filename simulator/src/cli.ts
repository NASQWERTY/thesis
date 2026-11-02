// Enrollment simulator: the registrar's off-chain tool (ADR-0015). Loads the member registry and
// the supplier registry from CSV files into the contract, and inspects them.
import { readFile, writeFile } from "node:fs/promises";
import { relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { formatEther, getAddress, isAddress, parseEther, Wallet } from "ethers";
import QRCode from "qrcode";
import { connect, dataDir, hardhatAccount, type Connection, type NetworkName } from "./chain.ts";
import { readMembers, readSuppliers, type MemberRow, type SupplierRow } from "./csv.ts";
import { describeError, UserError } from "./errors.ts";
import { history } from "./history.ts";

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
  keys                        Muestra las claves privadas de las cuentas de demo
  qr [miembro] [--html]       Muestra el QR de la clave de cada miembro, para escanear con la app
                              (--html genera una página para abrir en el navegador)
  accounts <n>                Genera n cuentas nuevas para la testnet (sepolia)

<miembro> es una dirección o una unidad del CSV de miembros (p. ej. T1-1A).
Por defecto se usan data/<red>/members.csv y data/<red>/suppliers.csv.`;

const { values: opts, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    network: { type: "string", short: "n", default: "local" },
    html: { type: "boolean" },
    issue: { type: "string" },
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

/** Private keys of the demo accounts, to import them into the member app or a browser wallet. */
async function keys() {
  const keyOf = await demoKeys();
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
  if (command === "keys") return keys();
  if (command === "qr") return qr(args[0], opts.html ?? false);

  const commands: Record<string, (c: Connection) => Promise<void>> = {
    members: (c) => members(c, args[0]),
    suppliers: (c) => suppliers(c, args[0]),
    eligibility: (c) => eligibility(c, args[0], args[1]),
    weight: (c) => weight(c, args[0], args[1]),
    remove: (c) => remove(c, args[0]),
    list: (c) => list(c),
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

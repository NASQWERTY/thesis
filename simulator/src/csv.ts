import { readFile } from "node:fs/promises";
import { getAddress, isAddress } from "ethers";
import { UserError } from "./errors.ts";

export interface MemberRow {
  unit: string;
  owner: string;
  address: string;
  weight: number;
}

export interface SupplierRow {
  name: string;
  address: string;
}

/** Minimal CSV reader: header row, comma-separated, no quoted fields. `#` lines are comments. */
async function readCsv(path: string, columns: string[]): Promise<Record<string, string>[]> {
  let text: string;
  try {
    text = await readFile(path, "utf8");
  } catch {
    throw new UserError(`No se encontró el archivo ${path}`);
  }

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l !== "" && !l.startsWith("#"));
  const header = lines.shift()?.split(",").map((h) => h.trim()) ?? [];
  for (const c of columns) {
    if (!header.includes(c)) throw new UserError(`${path}: falta la columna "${c}"`);
  }

  return lines.map((line, i) => {
    const cells = line.split(",").map((c) => c.trim());
    if (cells.length !== header.length) {
      throw new UserError(`${path}, fila ${i + 1}: se esperaban ${header.length} columnas`);
    }
    return Object.fromEntries(header.map((h, j) => [h, cells[j]]));
  });
}

function checkedAddress(value: string, where: string): string {
  if (!isAddress(value)) throw new UserError(`${where}: "${value}" no es una dirección válida`);
  return getAddress(value);
}

export async function readMembers(path: string): Promise<MemberRow[]> {
  const rows = await readCsv(path, ["unidad", "titular", "direccion", "peso"]);
  return rows.map((r) => {
    const weight = Number(r.peso);
    if (!Number.isInteger(weight) || weight <= 0) {
      throw new UserError(`${path}, unidad ${r.unidad}: el peso debe ser un entero mayor que 0`);
    }
    return { unit: r.unidad, owner: r.titular, address: checkedAddress(r.direccion, path), weight };
  });
}

export async function readSuppliers(path: string): Promise<SupplierRow[]> {
  const rows = await readCsv(path, ["nombre", "direccion"]);
  return rows.map((r) => ({ name: r.nombre, address: checkedAddress(r.direccion, path) }));
}

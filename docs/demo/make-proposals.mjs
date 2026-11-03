// Generates the fictitious supplier proposals (one-page PDFs) used in the Arbitrum Sepolia demo
// (docs/demo/guion-sepolia.md). No dependencies: the PDF is written by hand with the standard
// Helvetica fonts and WinAnsiEncoding, which covers Spanish accents.
//
//   node docs/demo/make-proposals.mjs   → docs/demo/propuestas/*.pdf
import { mkdir, writeFile } from "node:fs/promises";

const SUPPLIERS = {
  electricidad: {
    name: "Electricidad Serrana",
    tagline: "Instalaciones eléctricas y automatismos",
    address: "Av. Colón 1450, Córdoba",
    account: "0x70ee9Abd1293296692F040B19ff9F7405F714634",
    color: [0.85, 0.55, 0.1],
  },
  ascensores: {
    name: "Ascensores Andinos SRL",
    tagline: "Ascensores, portones y equipos electromecánicos",
    address: "Bv. San Juan 820, Córdoba",
    account: "0xfFdd1Bb39fb39600C035C1A9Ca3D9ACc14348eAB",
    color: [0.2, 0.35, 0.6],
  },
  pinturas: {
    name: "Pinturas del Sur SA",
    tagline: "Pintura de obra, impermeabilización y revestimientos",
    address: "Av. Vélez Sarsfield 2300, Córdoba",
    account: "0x8062d6D5BFE5D6e5672fbf62544C39939009f8b6",
    color: [0.15, 0.55, 0.4],
  },
};

const PROPOSALS = [
  {
    file: "1-porton-electricidad-serrana.pdf",
    supplier: "electricidad",
    number: "ES-2026-0412",
    issue: "Reparación del portón vehicular",
    items: [
      "Diagnóstico del motor y del tablero de control del portón.",
      "Reemplazo de la placa de control y de los finales de carrera.",
      "Ajuste de cadena, guías y sensores de seguridad (fotocélulas).",
      "Programación de 2 controles remotos nuevos.",
      "Prueba de funcionamiento con la administración.",
    ],
    term: "5 días hábiles desde la adjudicación.",
    warranty: "6 meses sobre mano de obra y repuestos.",
    amount: "0,0025",
  },
  {
    file: "1-porton-ascensores-andinos.pdf",
    supplier: "ascensores",
    number: "AA-2026-0098",
    issue: "Reparación del portón vehicular",
    items: [
      "Reemplazo completo del motor por un equipo nuevo de 1/2 HP.",
      "Instalación de tablero de control con batería de respaldo.",
      "Reemplazo de fotocélulas y semáforo de salida.",
      "Programación de 4 controles remotos.",
      "Capacitación al encargado del edificio.",
    ],
    term: "10 días hábiles desde la adjudicación.",
    warranty: "12 meses sobre el equipo completo.",
    amount: "0,0028",
  },
  {
    file: "2-pintura-pinturas-del-sur.pdf",
    supplier: "pinturas",
    number: "PS-2026-1187",
    issue: "Pintura del hall del edificio 2",
    items: [
      "Protección de pisos, carpinterías y artefactos.",
      "Lijado, reparación de fisuras y enduido completo de paredes.",
      "Fijador y dos manos de látex lavable de primera calidad.",
      "Esmalte sintético en zócalos y marcos.",
      "Limpieza final de obra.",
    ],
    term: "7 días hábiles, sin interrumpir el acceso al edificio.",
    warranty: "24 meses sobre la terminación.",
    amount: "0,0019",
  },
  {
    file: "2-pintura-electricidad-serrana.pdf",
    supplier: "electricidad",
    number: "ES-2026-0415",
    issue: "Pintura del hall del edificio 2",
    items: [
      "Retoque de fisuras visibles.",
      "Una mano de látex interior estándar en paredes.",
      "Limpieza final.",
    ],
    term: "4 días hábiles.",
    warranty: "6 meses.",
    amount: "0,0015",
  },
  {
    file: "3-ascensores-ascensores-andinos.pdf",
    supplier: "ascensores",
    number: "AA-2026-0101",
    issue: "Mantenimiento de ascensores",
    items: [
      "Mantenimiento preventivo mensual de los 3 ascensores durante 6 meses.",
      "Lubricación, ajuste de frenos y revisión de cables de tracción.",
      "Inspección de puertas, botoneras y sistema de emergencia.",
      "Libro de mantenimiento al día y certificado municipal.",
      "Atención de urgencias las 24 horas.",
    ],
    term: "Inicio inmediato; contrato por 6 meses.",
    warranty: "Incluida durante la vigencia del contrato.",
    amount: "0,0020",
  },
  {
    file: "4-luminarias-electricidad-serrana.pdf",
    supplier: "electricidad",
    number: "ES-2026-0420",
    issue: "Cambio de luminarias del estacionamiento",
    items: [
      "Retiro de 24 luminarias fluorescentes existentes.",
      "Provisión e instalación de 24 luminarias LED de 40 W.",
      "Sensores de movimiento en los 2 accesos.",
      "Disposición de los tubos retirados en punto limpio.",
    ],
    term: "3 días hábiles.",
    warranty: "24 meses sobre las luminarias.",
    amount: "0,0009",
  },
];

// ---------------------------------------------------------------------------
// Minimal PDF writer (A4, one page, Helvetica / Helvetica-Bold, WinAnsiEncoding)

const A4 = { w: 595, h: 842 };
const MARGIN = 56;

/** PDF string literal in WinAnsi (Latin-1 for the characters used here). */
function pdfString(text) {
  return `(${text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)")})`;
}

/** Greedy word wrap with Helvetica's average width (~0.5 em): good enough for body text. */
function wrap(text, size, width) {
  const max = Math.floor(width / (size * 0.5));
  const lines = [];
  let line = "";
  for (const word of text.split(" ")) {
    if ((line + " " + word).trim().length > max) {
      lines.push(line);
      line = word;
    } else {
      line = (line + " " + word).trim();
    }
  }
  if (line) lines.push(line);
  return lines;
}

class Page {
  ops = [];
  y = A4.h;

  rect(x, y, w, h, [r, g, b]) {
    this.ops.push(`q ${r} ${g} ${b} rg ${x} ${y} ${w} ${h} re f Q`);
  }

  line(x1, y1, x2, y2, gray = 0.75) {
    this.ops.push(`q ${gray} G 0.8 w ${x1} ${y1} m ${x2} ${y2} l S Q`);
  }

  text(x, y, str, { size = 11, bold = false, color = [0.1, 0.1, 0.1] } = {}) {
    const [r, g, b] = color;
    this.ops.push(`BT /${bold ? "F2" : "F1"} ${size} Tf ${r} ${g} ${b} rg ${x} ${y} Td ${pdfString(str)} Tj ET`);
  }

  /** Wrapped paragraph from the current y; moves y down. */
  paragraph(str, { size = 11, indent = 0, gap = 4, ...style } = {}) {
    for (const l of wrap(str, size, A4.w - 2 * MARGIN - indent)) {
      this.y -= size + gap;
      this.text(MARGIN + indent, this.y, l, { size, ...style });
    }
  }
}

function buildPdf(contents) {
  const stream = Buffer.from(contents, "latin1");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4.w} ${A4.h}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    null, // content stream, written with its binary body below
  ];
  const chunks = [Buffer.from("%PDF-1.4\n%\xe2\xe3\xcf\xd3\n", "latin1")];
  const offsets = [];
  let length = chunks[0].length;
  const push = (buf) => {
    chunks.push(buf);
    length += buf.length;
  };
  objects.forEach((body, i) => {
    offsets.push(length);
    if (body === null) {
      push(Buffer.from(`${i + 1} 0 obj\n<< /Length ${stream.length} >>\nstream\n`, "latin1"));
      push(stream);
      push(Buffer.from("\nendstream\nendobj\n", "latin1"));
    } else {
      push(Buffer.from(`${i + 1} 0 obj\n${body}\nendobj\n`, "latin1"));
    }
  });
  const xref = length;
  let table = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) table += `${String(o).padStart(10, "0")} 00000 n \n`;
  table += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  push(Buffer.from(table, "latin1"));
  return Buffer.concat(chunks);
}

function proposalPage(p) {
  const s = SUPPLIERS[p.supplier];
  const page = new Page();
  const white = [1, 1, 1];
  const muted = [0.4, 0.4, 0.4];

  // Header band with the supplier's identity.
  page.rect(0, A4.h - 110, A4.w, 110, s.color);
  page.text(MARGIN, A4.h - 52, s.name, { size: 22, bold: true, color: white });
  page.text(MARGIN, A4.h - 74, s.tagline, { size: 11, color: white });
  page.text(MARGIN, A4.h - 92, s.address, { size: 10, color: white });

  page.y = A4.h - 150;
  page.text(MARGIN, page.y, "PRESUPUESTO", { size: 16, bold: true });
  page.text(A4.w - MARGIN - 150, page.y, `N.º ${p.number}`, { size: 11, bold: true });
  page.y -= 18;
  page.text(A4.w - MARGIN - 150, page.y, "Córdoba, 3 de noviembre de 2026", { size: 9, color: muted });

  page.y -= 30;
  page.text(MARGIN, page.y, "Para:", { size: 10, bold: true, color: muted });
  page.text(MARGIN + 70, page.y, "Consorcio Complejo Jardines del Sur", { size: 11 });
  page.y -= 18;
  page.text(MARGIN, page.y, "Referencia:", { size: 10, bold: true, color: muted });
  page.text(MARGIN + 70, page.y, `Cuestión «${p.issue}»`, { size: 11 });

  page.y -= 22;
  page.line(MARGIN, page.y, A4.w - MARGIN, page.y);

  page.y -= 28;
  page.text(MARGIN, page.y, "Trabajos incluidos", { size: 13, bold: true });
  page.y -= 4;
  p.items.forEach((item, i) => page.paragraph(`${i + 1}.  ${item}`, { indent: 8, gap: 7 }));

  page.y -= 26;
  page.text(MARGIN, page.y, "Condiciones", { size: 13, bold: true });
  for (const [label, value] of [
    ["Plazo de ejecución", p.term],
    ["Garantía", p.warranty],
    ["Validez de la oferta", "Hasta el cierre de la votación de la cuestión."],
    ["Forma de pago", "Pago único al adjudicarse, ejecutado por el contrato del consorcio."],
  ]) {
    page.y -= 20;
    page.text(MARGIN + 8, page.y, `${label}:`, { size: 10, bold: true, color: muted });
    page.text(MARGIN + 140, page.y, value, { size: 10 });
  }

  // Amount box.
  page.y -= 50;
  page.rect(MARGIN, page.y - 14, A4.w - 2 * MARGIN, 52, [0.95, 0.95, 0.95]);
  page.rect(MARGIN, page.y - 14, 5, 52, s.color);
  page.text(MARGIN + 20, page.y + 18, "MONTO OFERTADO", { size: 10, bold: true, color: muted });
  page.text(MARGIN + 20, page.y - 2, `${p.amount} ETH`, { size: 20, bold: true });
  page.text(MARGIN + 200, page.y, "Red de prueba Arbitrum Sepolia (sin valor económico)", { size: 9, color: muted });

  page.y -= 50;
  page.text(MARGIN, page.y, "Cuenta de cobro:", { size: 10, bold: true, color: muted });
  page.text(MARGIN + 95, page.y, s.account, { size: 10 });

  // Signature.
  page.y -= 70;
  page.line(A4.w - MARGIN - 180, page.y, A4.w - MARGIN, page.y, 0.4);
  page.text(A4.w - MARGIN - 180, page.y - 14, s.name, { size: 10, bold: true });
  page.text(A4.w - MARGIN - 180, page.y - 27, "Responsable técnico", { size: 9, color: muted });

  // Footer disclaimer.
  page.line(MARGIN, 60, A4.w - MARGIN, 60);
  page.text(MARGIN, 44, "Documento ficticio, generado para la demostración del prototipo de gobernanza comunitaria.", {
    size: 8,
    color: muted,
  });
  page.text(MARGIN, 33, "Proveedor, montos y datos sin validez comercial.", { size: 8, color: muted });

  return buildPdf(page.ops.join("\n"));
}

const outDir = new URL("./propuestas/", import.meta.url);
await mkdir(outDir, { recursive: true });
for (const p of PROPOSALS) {
  await writeFile(new URL(p.file, outDir), proposalPage(p));
  console.log(`propuestas/${p.file}`);
}

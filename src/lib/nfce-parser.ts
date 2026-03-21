/**
 * NFCe (Nota Fiscal do Consumidor Eletrônica) parser.
 *
 * Brazilian consumer receipts have QR codes linking to SEFAZ public consultation pages.
 * This parser fetches the page and extracts structured item data from the HTML.
 *
 * QR code URL format (v2, current standard):
 *   https://<domain>/qrcode?p=<chNFe>|<nVersao>|<tpAmb>|<cIdToken>|<cHashQRCode>
 *
 * SP SEFAZ HTML structure (primary target — Hortolândia/SP):
 *   #tabResult table.toggable > tbody > tr
 *     - Product row: .txtTit = description, .RCod = code
 *     - Detail row (tr.toggle): .Rqtd = qty, .RUN = unit, .RvlUnit = unit price, .valor = total
 *   #totalNota: .txtMax = total values
 *   #conteudo: .txtTit = emitter name, .text = CNPJ
 */

export interface NfceItem {
  code: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

export interface NfceData {
  accessKey: string;
  marketName: string | null;
  marketCnpj: string | null;
  date: string | null;      // YYYY-MM-DD
  totalValue: number | null;
  items: NfceItem[];
  rawUrl: string;
}

// State codes (first 2 digits of access key)
const STATE_CODES: Record<string, string> = {
  "11": "RO", "12": "AC", "13": "AM", "14": "RR", "15": "PA", "16": "AP",
  "17": "TO", "21": "MA", "22": "PI", "23": "CE", "24": "RN", "25": "PB",
  "26": "PE", "27": "AL", "28": "SE", "29": "BA", "31": "MG", "32": "ES",
  "33": "RJ", "35": "SP", "41": "PR", "42": "SC", "43": "RS", "50": "MS",
  "51": "MT", "52": "GO", "53": "DF",
};

/**
 * Extract the access key (chNFe, 44 digits) from a QR code URL.
 */
export function extractAccessKey(url: string): string | null {
  // v2/v3: ?p=<44 digits>|...
  const pMatch = url.match(/[?&]p=(\d{44})\|/i);
  if (pMatch) return pMatch[1];

  // v1 legacy: ?chNFe=<44 digits>
  const chMatch = url.match(/[?&]chNFe=(\d{44})/i);
  if (chMatch) return chMatch[1];

  // Raw 44-digit key
  const rawMatch = url.match(/(\d{44})/);
  if (rawMatch) return rawMatch[1];

  return null;
}

/** Parse Brazilian number format: 1.234,56 → 1234.56 */
function parseBrNumber(str: string): number {
  const cleaned = str.trim().replace(/\./g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

/**
 * Parse NFCe HTML — SP SEFAZ format (primary).
 * Uses CSS class-based selectors matching the SP WebForms structure.
 */
export function parseNfceHtml(html: string): Omit<NfceData, "accessKey" | "rawUrl"> {
  const items: NfceItem[] = [];

  // ── Extract emitter (market) info ──
  let marketName: string | null = null;
  let marketCnpj: string | null = null;

  // SP: <div class="txtTopo">MARKET NAME</div>
  const topoMatch = html.match(/class="txtTopo"[^>]*>([^<]+)/i);
  if (topoMatch) marketName = topoMatch[1].trim();

  // Fallback: #conteudo .txtTit first occurrence
  if (!marketName) {
    const emiMatch = html.match(/id="conteudo"[\s\S]*?class="txtTit"[^>]*>([^<]+)/i);
    if (emiMatch) marketName = emiMatch[1].trim();
  }

  // CNPJ
  const cnpjMatch = html.match(/CNPJ[:\s]*(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/i);
  if (cnpjMatch) marketCnpj = cnpjMatch[1].replace(/[.\/-]/g, "");

  // ── Extract date ──
  let date: string | null = null;
  // Pattern: "Emissão: DD/MM/YYYY" or "Data de Emissão" or datetime
  const dateMatch = html.match(
    /Emiss[aã]o[:\s]*(\d{2}\/\d{2}\/\d{4})/i
  );
  if (dateMatch) {
    const [d, m, y] = dateMatch[1].split("/");
    date = `${y}-${m}-${d}`;
  }

  // ── Extract total ──
  let totalValue: number | null = null;
  const totalMatch = html.match(
    /Valor\s*total\s*R?\$?\s*:?\s*([\d.,]+)/i
  );
  if (totalMatch) {
    totalValue = parseBrNumber(totalMatch[1]);
  }
  // Fallback: #totalNota .txtMax
  if (!totalValue) {
    const totalMaxMatch = html.match(
      /id="totalNota"[\s\S]*?class="txtMax"[^>]*>([\d.,]+)/i
    );
    if (totalMaxMatch) totalValue = parseBrNumber(totalMaxMatch[1]);
  }

  // ── Extract items — Strategy 1: SP SEFAZ class-based ──
  // Product description: class="txtTit" (in product rows)
  // Detail: class="Rqtd" (qty), class="RUN" (unit), class="RvlUnit" (unit price), class="valor" (total)
  const spItemRegex =
    /class="txtTit"[^>]*>\s*([^<]+?)\s*<[\s\S]*?class="RCod"[^>]*>\s*([^<]*?)\s*<[\s\S]*?class="Rqtd"[^>]*>\s*([\d.,]+)\s*<[\s\S]*?class="RUN"[^>]*>\s*(\w+)\s*<[\s\S]*?class="RvlUnit"[^>]*>\s*([\d.,]+)\s*<[\s\S]*?class="valor"[^>]*>\s*([\d.,]+)\s*</gi;

  let m;
  while ((m = spItemRegex.exec(html)) !== null) {
    const name = m[1].trim();
    // Skip section headers that match txtTit but aren't products
    if (name.length < 2 || name.match(/^(Qtde|UN|Vl\.|Total|CNPJ)/i)) continue;

    items.push({
      code: m[2].trim(),
      name,
      quantity: parseBrNumber(m[3]),
      unit: m[4].trim(),
      unitPrice: parseBrNumber(m[5]),
      totalPrice: parseBrNumber(m[6]),
    });
  }

  // ── Strategy 2: Generic Qtde/UN/Vl pattern (other states) ──
  if (items.length === 0) {
    const genericRegex =
      /class="txtTit"[^>]*>\s*([^<]{3,}?)\s*<[\s\S]*?Qtde[.\s:]*[\s\S]*?>([\d.,]+)<[\s\S]*?UN[.\s:]*[\s\S]*?>(\w+)<[\s\S]*?Vl\.\s*Unit[.\s:]*[\s\S]*?>([\d.,]+)<[\s\S]*?Vl\.\s*Total[.\s:]*[\s\S]*?>([\d.,]+)</gi;

    while ((m = genericRegex.exec(html)) !== null) {
      items.push({
        code: "",
        name: m[1].trim(),
        quantity: parseBrNumber(m[2]),
        unit: m[3].trim(),
        unitPrice: parseBrNumber(m[4]),
        totalPrice: parseBrNumber(m[5]),
      });
    }
  }

  // ── Strategy 3: Table rows (fallback for simpler HTML) ──
  if (items.length === 0) {
    const tableRegex =
      /<tr[^>]*>[\s\S]*?<td[^>]*>\s*(\d+)\s*<\/td>[\s\S]*?<td[^>]*>\s*([^<]{3,}?)\s*<\/td>[\s\S]*?<td[^>]*>\s*([\d.,]+)\s*<\/td>[\s\S]*?<td[^>]*>\s*(\w+)\s*<\/td>[\s\S]*?<td[^>]*>\s*([\d.,]+)\s*<\/td>[\s\S]*?<td[^>]*>\s*([\d.,]+)\s*<\/td>/gi;

    while ((m = tableRegex.exec(html)) !== null) {
      items.push({
        code: m[1].trim(),
        name: m[2].trim(),
        quantity: parseBrNumber(m[3]),
        unit: m[4].trim(),
        unitPrice: parseBrNumber(m[5]),
        totalPrice: parseBrNumber(m[6]),
      });
    }
  }

  return { marketName, marketCnpj, date, totalValue, items };
}

/**
 * Fetch and parse an NFCe from its QR code URL.
 */
export async function fetchAndParseNfce(url: string): Promise<NfceData> {
  const accessKey = extractAccessKey(url);
  if (!accessKey) {
    throw new Error(
      "Não foi possível extrair a chave de acesso (44 dígitos) da URL. " +
      "Formato esperado: ...?p=<44 dígitos>|..."
    );
  }

  const stateCode = accessKey.substring(0, 2);
  const state = STATE_CODES[stateCode] || "??";

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(
      `SEFAZ ${state} retornou status ${response.status}. ` +
      "A página pode estar temporariamente indisponível."
    );
  }

  const html = await response.text();

  if (html.length < 500) {
    throw new Error(
      "A página retornada é muito curta — pode ser um CAPTCHA ou erro de JavaScript. " +
      "Algumas SEFAZes requerem navegador real para renderizar."
    );
  }

  const parsed = parseNfceHtml(html);

  return {
    ...parsed,
    accessKey,
    rawUrl: url,
  };
}

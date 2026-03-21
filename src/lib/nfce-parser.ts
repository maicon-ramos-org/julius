/**
 * NFCe (Nota Fiscal do Consumidor Eletrônica) parser.
 *
 * Brazilian consumer receipts have QR codes linking to SEFAZ public consultation pages.
 * This parser fetches the page and extracts structured item data from the HTML.
 *
 * QR code URL formats by state:
 * - SP: https://www.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/Consulta/QrCode?chNFe=...
 * - Generic: contains ?chNFe=<44 digit access key>&...
 *
 * The public consultation page renders a table with columns:
 *   Código | Descrição | Qtde | UN | Vl Unit | Vl Total
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

/**
 * Extract the access key (chNFe) from a QR code URL.
 */
export function extractAccessKey(url: string): string | null {
  // Try URL param: ?chNFe=...
  const match = url.match(/[?&]chNFe=(\d{44})/i);
  if (match) return match[1];

  // Try URL param: ?p=... (some states use this)
  const pMatch = url.match(/[?&]p=(\d{44})/i);
  if (pMatch) return pMatch[1];

  // Try raw 44-digit key
  const rawMatch = url.match(/(\d{44})/);
  if (rawMatch) return rawMatch[1];

  return null;
}

/**
 * Parse NFCe HTML from SEFAZ public consultation page.
 * Extracts items, market info, date, and total.
 */
export function parseNfceHtml(html: string): Omit<NfceData, "accessKey" | "rawUrl"> {
  const items: NfceItem[] = [];

  // Extract market name from the emit section
  // Pattern: <div class="txtTopo">RAZAO SOCIAL</div> or similar
  let marketName: string | null = null;
  const emiMatch = html.match(
    /class="txtTopo"[^>]*>([^<]+)/i
  );
  if (emiMatch) {
    marketName = emiMatch[1].trim();
  }
  // Fallback: look for CNPJ/Razão Social patterns
  if (!marketName) {
    const razaoMatch = html.match(
      /Raz[aã]o\s*Social[^:]*:\s*([^<\n]+)/i
    );
    if (razaoMatch) marketName = razaoMatch[1].trim();
  }

  // Extract CNPJ
  let marketCnpj: string | null = null;
  const cnpjMatch = html.match(/CNPJ[:\s]*(\d{2}[.\s]?\d{3}[.\s]?\d{3}[/\s]?\d{4}[-\s]?\d{2})/i);
  if (cnpjMatch) marketCnpj = cnpjMatch[1].replace(/[.\s/-]/g, "");

  // Extract date
  let date: string | null = null;
  const dateMatch = html.match(/Emiss[aã]o[:\s]*(\d{2}\/\d{2}\/\d{4})/i);
  if (dateMatch) {
    const [d, m, y] = dateMatch[1].split("/");
    date = `${y}-${m}-${d}`;
  }

  // Extract total
  let totalValue: number | null = null;
  const totalMatch = html.match(/Valor\s*total[^R$]*R?\$?\s*([\d.,]+)/i);
  if (totalMatch) {
    totalValue = parseFloat(totalMatch[1].replace(/\./g, "").replace(",", "."));
  }

  // Extract items from table rows
  // Common patterns:
  // 1. <span class="txtTit">DESCRIPTION</span> ... Qtde ... UN ... Vl Unit ... Vl Total
  // 2. Table rows with specific classes

  // Pattern 1: SP format - product entries in divs
  const itemRegex =
    /class="txtTit"[^>]*>\s*([^<]+)<[\s\S]*?Qtde[.\s:]*<[^>]*>\s*([\d.,]+)[\s\S]*?UN[.\s:]*<[^>]*>\s*(\w+)[\s\S]*?Vl\.\s*Unit[.\s:]*<[^>]*>\s*([\d.,]+)[\s\S]*?Vl\.\s*Total[.\s:]*<[^>]*>\s*([\d.,]+)/gi;

  let m;
  while ((m = itemRegex.exec(html)) !== null) {
    items.push({
      code: "",
      name: m[1].trim(),
      quantity: parseFloat(m[2].replace(",", ".")),
      unit: m[3].trim(),
      unitPrice: parseFloat(m[4].replace(/\./g, "").replace(",", ".")),
      totalPrice: parseFloat(m[5].replace(/\./g, "").replace(",", ".")),
    });
  }

  // Pattern 2: generic table rows if pattern 1 didn't match
  if (items.length === 0) {
    // Try: <td>CODE</td><td>DESC</td><td>QTD</td><td>UN</td><td>VLUNIT</td><td>VLTOTAL</td>
    const rowRegex =
      /<tr[^>]*>[\s\S]*?<td[^>]*>\s*(\d+)\s*<\/td>[\s\S]*?<td[^>]*>\s*([^<]+)<\/td>[\s\S]*?<td[^>]*>\s*([\d.,]+)\s*<\/td>[\s\S]*?<td[^>]*>\s*(\w+)\s*<\/td>[\s\S]*?<td[^>]*>\s*([\d.,]+)\s*<\/td>[\s\S]*?<td[^>]*>\s*([\d.,]+)\s*<\/td>/gi;

    while ((m = rowRegex.exec(html)) !== null) {
      items.push({
        code: m[1].trim(),
        name: m[2].trim(),
        quantity: parseFloat(m[3].replace(",", ".")),
        unit: m[4].trim(),
        unitPrice: parseFloat(m[5].replace(/\./g, "").replace(",", ".")),
        totalPrice: parseFloat(m[6].replace(/\./g, "").replace(",", ".")),
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
    throw new Error("Could not extract access key from URL. Expected 44-digit chNFe.");
  }

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36",
      Accept: "text/html",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`SEFAZ returned status ${response.status}. The page may be temporarily unavailable.`);
  }

  const html = await response.text();
  const parsed = parseNfceHtml(html);

  return {
    ...parsed,
    accessKey,
    rawUrl: url,
  };
}

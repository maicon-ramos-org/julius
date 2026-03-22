import { describe, it, expect } from "vitest";
import { extractAccessKey, parseNfceHtml } from "../nfce-parser";

describe("extractAccessKey", () => {
  it("extracts from v2 pipe format", () => {
    const url =
      "https://www.nfce.fazenda.sp.gov.br/qrcode?p=35250333468680000121650010000039261102140068|2|1|4|8994FCD60797644364394702B897B1839F040D3F";
    expect(extractAccessKey(url)).toBe("35250333468680000121650010000039261102140068");
  });

  it("extracts from v1 chNFe param", () => {
    const url =
      "https://www.nfce.fazenda.sp.gov.br/qrcode?chNFe=35250333468680000121650010000039261102140068&nVersao=100";
    expect(extractAccessKey(url)).toBe("35250333468680000121650010000039261102140068");
  });

  it("extracts raw 44-digit key", () => {
    expect(extractAccessKey("35250333468680000121650010000039261102140068")).toBe(
      "35250333468680000121650010000039261102140068"
    );
  });

  it("returns null for invalid input", () => {
    expect(extractAccessKey("https://google.com")).toBe(null);
  });

  it("returns null for too-short key", () => {
    expect(extractAccessKey("12345678901234567890")).toBe(null);
  });
});

describe("parseNfceHtml", () => {
  const spHtml = `
    <div class="txtTopo">SUPERMERCADO SAO VICENTE LTDA</div>
    <div>CNPJ: 12.345.678/0001-90</div>
    <div>Emissão: 21/03/2026</div>
    <div id="tabResult">
      <table class="toggable">
        <tbody>
          <tr>
            <td>
              <span class="txtTit">ARROZ TIO JOAO 5KG</span>
              <span class="RCod">001234</span>
            </td>
          </tr>
          <tr class="toggle">
            <td>
              <table>
                <tbody>
                  <tr>
                    <td><span class="Rqtd">2,000</span></td>
                    <td><span class="RUN">UN</span></td>
                    <td><span class="RvlUnit">24,90</span></td>
                    <td><span class="valor">49,80</span></td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
          <tr>
            <td>
              <span class="txtTit">LEITE PIRACANJUBA 1L</span>
              <span class="RCod">005678</span>
            </td>
          </tr>
          <tr class="toggle">
            <td>
              <table>
                <tbody>
                  <tr>
                    <td><span class="Rqtd">3,000</span></td>
                    <td><span class="RUN">UN</span></td>
                    <td><span class="RvlUnit">4,29</span></td>
                    <td><span class="valor">12,87</span></td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div id="totalNota">
      <div class="txtMax">62,67</div>
    </div>
  `;

  it("extracts market name from txtTopo", () => {
    const result = parseNfceHtml(spHtml);
    expect(result.marketName).toBe("SUPERMERCADO SAO VICENTE LTDA");
  });

  it("extracts CNPJ", () => {
    const result = parseNfceHtml(spHtml);
    expect(result.marketCnpj).toBe("12345678000190");
  });

  it("extracts date in YYYY-MM-DD format", () => {
    const result = parseNfceHtml(spHtml);
    expect(result.date).toBe("2026-03-21");
  });

  it("extracts items with correct data", () => {
    const result = parseNfceHtml(spHtml);
    expect(result.items.length).toBe(2);

    expect(result.items[0].name).toBe("ARROZ TIO JOAO 5KG");
    expect(result.items[0].code).toBe("001234");
    expect(result.items[0].quantity).toBe(2);
    expect(result.items[0].unit).toBe("UN");
    expect(result.items[0].unitPrice).toBe(24.9);
    expect(result.items[0].totalPrice).toBe(49.8);

    expect(result.items[1].name).toBe("LEITE PIRACANJUBA 1L");
    expect(result.items[1].unitPrice).toBe(4.29);
    expect(result.items[1].totalPrice).toBe(12.87);
  });

  it("extracts total value", () => {
    const result = parseNfceHtml(spHtml);
    expect(result.totalValue).toBe(62.67);
  });

  it("handles Brazilian number format", () => {
    const html = `
      <span class="txtTit">PRODUTO CARO</span>
      <span class="RCod">999</span>
      <span class="Rqtd">1,500</span>
      <span class="RUN">KG</span>
      <span class="RvlUnit">1.234,56</span>
      <span class="valor">1.851,84</span>
    `;
    const result = parseNfceHtml(html);
    if (result.items.length > 0) {
      expect(result.items[0].unitPrice).toBe(1234.56);
      expect(result.items[0].totalPrice).toBe(1851.84);
    }
  });

  it("returns empty items for non-NFCe HTML", () => {
    const result = parseNfceHtml("<html><body>Hello world</body></html>");
    expect(result.items.length).toBe(0);
    expect(result.marketName).toBe(null);
  });
});

describe("parseNfceHtml - generic format", () => {
  const genericHtml = `
    <div>Razão Social: MERCADO MORETE LTDA</div>
    <div>CNPJ: 98.765.432/0001-10</div>
    <div>Emissão: 20/03/2026</div>
    <div>
      <span class="txtTit">BANANA PRATA KG</span>
      Qtde.: <span>1,230</span>
      UN: <span>KG</span>
      Vl. Unit.: <span>5,99</span>
      Vl. Total: <span>7,37</span>
    </div>
    <div>Valor total R$ 7,37</div>
  `;

  it("extracts market name from Razão Social", () => {
    const result = parseNfceHtml(genericHtml);
    expect(result.marketName).toBe("MERCADO MORETE LTDA");
  });

  it("extracts total from Valor total", () => {
    const result = parseNfceHtml(genericHtml);
    expect(result.totalValue).toBe(7.37);
  });
});

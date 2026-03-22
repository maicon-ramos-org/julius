import { describe, it, expect } from "vitest";
import { normalizeText, marketNamesMatch } from "../normalize";

describe("normalizeText", () => {
  it("lowercases text", () => {
    expect(normalizeText("ATACADÃO")).toBe("atacadao");
  });

  it("removes accents", () => {
    expect(normalizeText("São Vicente")).toBe("sao vicente");
  });

  it("trims whitespace", () => {
    expect(normalizeText("  Tenda Atacado  ")).toBe("tenda atacado");
  });

  it("collapses multiple spaces", () => {
    expect(normalizeText("Tenda   Atacado")).toBe("tenda atacado");
  });

  it("handles combined transformations", () => {
    expect(normalizeText("  ASSAÍ  Atacadista  ")).toBe("assai atacadista");
  });
});

describe("marketNamesMatch", () => {
  it("matches exact names", () => {
    expect(marketNamesMatch("Atacadão", "Atacadão")).toBe(true);
  });

  it("matches case-insensitive", () => {
    expect(marketNamesMatch("ATACADÃO", "atacadão")).toBe(true);
  });

  it("matches with/without accents", () => {
    expect(marketNamesMatch("Atacadão", "Atacadao")).toBe(true);
  });

  it("matches partial name (one contains the other)", () => {
    expect(marketNamesMatch("Tenda", "Tenda Atacado")).toBe(true);
  });

  it("matches with extra whitespace", () => {
    expect(marketNamesMatch("Tenda Atacado", "Tenda Atacado ")).toBe(true);
  });

  it("does not match completely different names", () => {
    expect(marketNamesMatch("Atacadão", "São Vicente")).toBe(false);
  });

  it("matches São Vicente variations", () => {
    expect(marketNamesMatch("São Vicente", "Sao Vicente Supermercados")).toBe(true);
  });

  it("matches Assaí variations", () => {
    expect(marketNamesMatch("Assaí", "ASSAI ATACADISTA")).toBe(true);
  });
});

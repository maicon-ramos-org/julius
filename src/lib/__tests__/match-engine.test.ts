import { describe, it, expect } from "vitest";
import { matchProductToNeeds } from "../match-engine";

const mockNeeds = [
  { id: 1, name: "Cerveja", keywords: ["cerveja", "beer", "cerv"], active: true },
  { id: 2, name: "Margarina", keywords: ["margarina", "manteiga", "marg"], active: true },
  { id: 3, name: "Arroz", keywords: ["arroz"], active: true },
  { id: 4, name: "Açúcar", keywords: ["acucar", "açúcar", "sugar"], active: true },
  { id: 5, name: "Leite", keywords: ["leite", "milk"], active: true },
];

describe("matchProductToNeeds", () => {
  it("matches exact keyword substring", () => {
    const results = matchProductToNeeds("Cerveja Brahma Lata 350ml", mockNeeds);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].needId).toBe(1);
    expect(results[0].confidence).toBeGreaterThanOrEqual(0.5);
  });

  it("matches abbreviated keyword", () => {
    const results = matchProductToNeeds("Marg. Qualy 500g", mockNeeds);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].needId).toBe(2); // Margarina
  });

  it("matches case-insensitive", () => {
    const results = matchProductToNeeds("ARROZ TIO JOAO 5KG", mockNeeds);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].needId).toBe(3);
  });

  it("returns empty for no match", () => {
    const results = matchProductToNeeds("Sabonete Dove", mockNeeds);
    expect(results.length).toBe(0);
  });

  it("returns empty for empty product name", () => {
    const results = matchProductToNeeds("", mockNeeds);
    expect(results.length).toBe(0);
  });

  it("returns empty for empty needs list", () => {
    const results = matchProductToNeeds("Cerveja Brahma", []);
    expect(results.length).toBe(0);
  });

  it("sorts by confidence descending", () => {
    const results = matchProductToNeeds("Leite Integral Piracanjuba 1L", mockNeeds);
    expect(results.length).toBeGreaterThan(0);
    for (let i = 1; i < results.length; i++) {
      expect(results[i].confidence).toBeLessThanOrEqual(results[i - 1].confidence);
    }
  });

  it("matches product with accent variation", () => {
    const results = matchProductToNeeds("Acucar Uniao 1kg", mockNeeds);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].needId).toBe(4);
  });

  it("handles multiple keyword matches for same need", () => {
    const results = matchProductToNeeds("Margarina Delícia 500g", mockNeeds);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].needId).toBe(2);
    // Should only appear once, not duplicated
    const margarinMatches = results.filter((r) => r.needId === 2);
    expect(margarinMatches.length).toBe(1);
  });
});

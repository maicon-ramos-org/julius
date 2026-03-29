// Helper function to infer generic category name from product name
export function inferGenericName(productName: string): string {
  // Common brands to remove
  const commonBrands = [
    "heineken", "brahma", "skol", "antarctica", "budweiser", "stella", "corona",
    "sadia", "perdigão", "seara", "swift", "friboi", "aurora",
    "nestlé", "nestle", "danone", "vigor", "itambé", "parmalat", "piracanjuba",
    "coca", "pepsi", "fanta", "sprite", "guaraná", "sukita",
    "tio joão", "uncle ben", "camil", "namorado", "cristal",
    "bauducco", "marilan", "adria", "piraque", "todeschini",
    "omo", "tide", "ariel", "downy", "comfort", "assim",
    "gillette", "head", "shoulders", "pantene", "loreal", "nivea",
    "pullman", "wickbold", "panco", "plus vita", "nutrella",
    "qualy", "delícia", "doriana", "becel", "primor"
  ];

  // Size/quantity patterns to remove
  const sizePatterns = [
    /\b\d+\s*(ml|l|g|kg|un|unid|unidade|unidades|lata|latas|pacote|cx|caixa)\b/gi,
    /\b\d+x\d+\s*(ml|l|g|kg|un)\b/gi,
    /\blata\s+\d+\s*ml\b/gi,
    /\bpacote\s+\d+\s*(g|kg|un)\b/gi,
    /\b\d+\s*%\b/gi
  ];

  // Trivial words to remove
  const trivialWords = [
    "da", "de", "do", "com", "sem", "para", "por", "original", "tradicional",
    "natural", "especial", "premium", "light", "diet", "zero", "integral",
    "gelado", "gelada", "fresco", "fresca", "congelado", "congelada"
  ];

  let cleaned = productName.toLowerCase().trim();

  // Remove brands
  for (const brand of commonBrands) {
    const regex = new RegExp(`\\b${brand}\\b`, "gi");
    cleaned = cleaned.replace(regex, "");
  }

  // Remove sizes and quantities
  for (const pattern of sizePatterns) {
    cleaned = cleaned.replace(pattern, "");
  }

  // Remove trivial words
  for (const word of trivialWords) {
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    cleaned = cleaned.replace(regex, "");
  }

  // Clean up extra spaces and punctuation
  cleaned = cleaned
    .replace(/[^\w\sáéíóúâêîôûãõàèìòùç]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Split into words and take meaningful ones
  const words = cleaned.split(" ").filter(word => word.length > 2);

  if (words.length === 0) {
    // Fallback: use first meaningful word from original name
    const originalWords = productName.split(" ")
      .filter(word => word.length > 2)
      .filter(word => !["da", "de", "do", "com", "sem"].includes(word.toLowerCase()));
    return originalWords[0] || productName.split(" ")[0] || "Produto";
  }

  // Take up to 2 most meaningful words
  const genericName = words.slice(0, 2).join(" ");

  // Capitalize first letter of each word
  return genericName
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Generate keywords array from generic name
export function generateKeywords(genericName: string): string[] {
  const base = genericName.toLowerCase();
  const words = base.split(" ");

  const keywords = [
    base,
    ...words.filter(word => word.length > 2),
  ];

  // Add common variations
  const variations: Record<string, string[]> = {
    "cerveja": ["beer", "bebida alcoólica"],
    "refrigerante": ["refri", "soda", "bebida"],
    "água": ["agua", "h2o"],
    "leite": ["milk"],
    "pão": ["pao", "bread"],
    "arroz": ["rice"],
    "feijão": ["feijao", "beans"],
    "açúcar": ["acucar", "sugar"],
    "óleo": ["oleo", "oil"],
    "manteiga": ["butter"],
    "margarina": ["marg"],
    "queijo": ["cheese"],
    "presunto": ["ham"],
    "frango": ["chicken", "ave"],
    "carne": ["beef", "boi"],
    "peixe": ["fish"],
    "ovos": ["ovo", "eggs"]
  };

  for (const [key, syns] of Object.entries(variations)) {
    if (base.includes(key)) {
      keywords.push(...syns);
    }
  }

  return [...new Set(keywords)]; // Remove duplicates
}
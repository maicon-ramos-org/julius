/** Sanitize a string: trim and remove null bytes */
export function sanitize(val: unknown): string | null {
  if (typeof val !== "string") return null;
  return val.trim().replace(/\0/g, "");
}

/** Validate and return a positive number, or null */
export function positiveNumber(val: unknown): number | null {
  if (val === undefined || val === null) return null;
  const n = typeof val === "string" ? parseFloat(val) : Number(val);
  if (isNaN(n) || n < 0) return null;
  return n;
}

/** Validate and return a positive integer, or null */
export function positiveInt(val: unknown): number | null {
  const n = positiveNumber(val);
  if (n === null) return null;
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

/** Safe error response — never leak stack traces */
export function safeError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

// Base yield percentages per refinery method (Star Citizen 4.x game data).
// These are the method's inherent yield before any station modifier is applied.
export const METHOD_BASE_YIELD: Record<string, number> = {
  "Cormack":                57,
  "Dinyx Solventation":     76,
  "Electrostarolysis":      66,
  "Gaskin Process":         57,
  "Pyrometric Chromalysis": 76,
  "Shockpoint Thermalytic": 66,
  "Therion Process":        61,
  "XCR":                    70,
};

export const DEFAULT_YIELD = 65;

export function getMethodYield(method: string | null | undefined): number {
  if (!method) return DEFAULT_YIELD;
  // Try exact match first, then case-insensitive
  if (METHOD_BASE_YIELD[method] !== undefined) return METHOD_BASE_YIELD[method];
  const lower = method.toLowerCase();
  const key = Object.keys(METHOD_BASE_YIELD).find((k) => k.toLowerCase() === lower);
  return key ? METHOD_BASE_YIELD[key] : DEFAULT_YIELD;
}

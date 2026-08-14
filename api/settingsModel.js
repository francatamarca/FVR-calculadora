import { DEF } from "../src/lib/calc.js";

const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

export const sanitizeSettings = (input) => {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;

  const clean = {};
  for (const [key, fallback] of Object.entries(DEF)) {
    const value = hasOwn(input, key) ? input[key] : fallback;

    if (fallback === null) {
      if (value === null || value === "") clean[key] = null;
      else if (typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= 1e9) clean[key] = value;
      else return null;
      continue;
    }

    if (typeof fallback === "number") {
      if (typeof value !== "number" || !Number.isFinite(value) || Math.abs(value) > 1e9) return null;
      clean[key] = value;
      continue;
    }

    if (typeof fallback === "boolean") {
      if (typeof value !== "boolean") return null;
      clean[key] = value;
      continue;
    }

    if (typeof fallback === "string") {
      if (typeof value !== "string" || value.length > 4000) return null;
      clean[key] = value;
      continue;
    }

    return null;
  }
  return clean;
};

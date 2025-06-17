/**
 * Utility: Checks if value is a plain object (not null, array, or function)
 */
function isPlainObject(obj: unknown): obj is Record<string, unknown> {
  return typeof obj === "object" && obj !== null && !Array.isArray(obj);
}

// Example usage with safe spreading in your export(s) - adjust as needed:

export function toCsvLineItems(lineItems: unknown[]) {
  return lineItems
    .filter(isPlainObject)
    .map(item => ({
      ...(isPlainObject(item) ? item : {})  // Only spread if it's a plain object
      // ... add/modify other fields as needed
    }));
}

export function fromCsvLineItems(csvItems: unknown[]) {
  return csvItems
    .filter(isPlainObject)
    .map(item => ({
      ...(isPlainObject(item) ? item : {})
      // ... add/modify other fields as needed
    }));
}

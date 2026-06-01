/**
 * Key Detection Engine
 * Handles building, normalising, and validating reconciliation keys
 */

/**
 * Normalises a single value for key concatenation:
 * - Trims whitespace
 * - Lowercases strings
 * - Converts numbers to fixed-2 decimal strings
 * - Converts null/undefined to empty string
 */
function normaliseValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return value.toFixed(2);
  const str = String(value).trim().toLowerCase();
  return str;
}

/**
 * Builds a concatenated key for a single row from a set of column names.
 * Values are joined with a `|` separator after normalisation.
 *
 * @param {object} row - The row object
 * @param {string[]} columns - Column names to use
 * @returns {string} The concatenated unique key
 */
export function buildConcatKey(row, columns) {
  return columns
    .map(col => normaliseValue(row[col]))
    .join('|');
}

/**
 * Applies the key builder to every row in a dataset, appending a `__recon_key` field.
 *
 * @param {object[]} rows - Array of row objects
 * @param {string[]} columns - Columns to use for key
 * @returns {object[]} New array with `__recon_key` appended to each row
 */
export function applyKeyToDataset(rows, columns) {
  return rows.map(row => ({
    ...row,
    __recon_key: buildConcatKey(row, columns),
  }));
}

/**
 * Validates the uniqueness of keys across a dataset.
 *
 * @param {object[]} rows - Rows with `__recon_key` field
 * @returns {{ uniqueCount: number, totalCount: number, duplicates: string[], isUnique: boolean }}
 */
export function validateKeyUniqueness(rows) {
  const keyCounts = new Map();
  for (const row of rows) {
    const key = row.__recon_key;
    keyCounts.set(key, (keyCounts.get(key) || 0) + 1);
  }

  const duplicates = [];
  for (const [key, count] of keyCounts.entries()) {
    if (count > 1) duplicates.push(key);
  }

  return {
    uniqueCount: keyCounts.size,
    totalCount: rows.length,
    duplicates,
    isUnique: duplicates.length === 0,
  };
}

/**
 * Live uniqueness check for a column selection (works on preview rows).
 * Used in the UI to give instant feedback before running full reconciliation.
 *
 * @param {object[]} rows - Preview rows (not full dataset)
 * @param {string[]} columns - Columns to check
 * @returns {{ uniqueCount: number, totalCount: number, isUnique: boolean, percent: number }}
 */
export function checkColumnUniqueness(rows, columns) {
  if (!rows || rows.length === 0 || !columns || columns.length === 0) {
    return { uniqueCount: 0, totalCount: 0, isUnique: true, percent: 100 };
  }

  const keys = new Set(rows.map(row => buildConcatKey(row, columns)));
  const uniqueCount = keys.size;
  const totalCount = rows.length;
  const percent = Math.round((uniqueCount / totalCount) * 100);

  return {
    uniqueCount,
    totalCount,
    isUnique: uniqueCount === totalCount,
    percent,
  };
}

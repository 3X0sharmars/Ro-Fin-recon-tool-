/**
 * Gemini API client — calls the backend proxy to keep the API key server-side.
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

/**
 * Sends column headers and sample rows to the backend Gemini proxy
 * and returns the detected key columns plus a rationale string.
 *
 * @param {{
 *   sheet1Headers: string[],
 *   sheet2Headers: string[],
 *   sheet1Sample: object[],
 *   sheet2Sample: object[]
 * }} payload
 * @returns {Promise<{ sheet1Columns: string[], sheet2Columns: string[], rationale: string }>}
 */
export async function detectKey(payload) {
  const response = await fetch(`${BACKEND_URL}/api/detect-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Server error: ${response.status}`);
  }

  return response.json();
}

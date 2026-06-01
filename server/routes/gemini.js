const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const rateLimit = require('express-rate-limit');

// Rate limit: 10 requests per minute per IP
const detectKeyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many requests. Please wait a moment before retrying.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/detect-key', detectKeyLimiter, async (req, res) => {
  const { sheet1Headers, sheet2Headers, sheet1Sample, sheet2Sample } = req.body;

  if (!sheet1Headers || !sheet2Headers || !Array.isArray(sheet1Headers) || !Array.isArray(sheet2Headers)) {
    return res.status(400).json({ error: 'Invalid request: sheet1Headers and sheet2Headers are required arrays.' });
  }

  const apiKey = process.env.GOOGLE_AI_STUDIO_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server configuration error: AI API key is not set.' });
  }

  // Use max 100 rows to protect user data privacy
  const s1Sample = (sheet1Sample || []).slice(0, 100);
  const s2Sample = (sheet2Sample || []).slice(0, 100);

  const prompt = `
You are a financial data reconciliation expert. You are given two datasets (Sheet 1 and Sheet 2) and your task is to identify the minimal set of columns whose concatenation forms a unique identifier across BOTH datasets, enabling row-level matching between them.

Sheet 1 columns: ${JSON.stringify(sheet1Headers)}
Sheet 2 columns: ${JSON.stringify(sheet2Headers)}

Sheet 1 sample data (first ${s1Sample.length} rows):
${JSON.stringify(s1Sample, null, 2)}

Sheet 2 sample data (first ${s2Sample.length} rows):
${JSON.stringify(s2Sample, null, 2)}

Instructions:
1. Identify the minimal combination of columns from Sheet 1 and the corresponding columns from Sheet 2 whose concatenated values will serve as a unique match key.
2. The columns may have different names but semantically equivalent data (e.g., "TxnDate" in Sheet 1 and "TransactionDate" in Sheet 2).
3. Prefer fewer columns over more columns (minimal key principle).
4. Provide a brief, plain-English rationale explaining WHY this column combination creates a unique key.

Respond with ONLY valid JSON in this exact format:
{
  "sheet1Columns": ["column_name_1", "column_name_2"],
  "sheet2Columns": ["column_name_1", "column_name_2"],
  "rationale": "Brief explanation of why this key combination is unique and appropriate."
}
`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      return res.status(502).json({ error: 'AI returned an invalid response. Please try again or use manual key selection.' });
    }

    // Validate the response structure
    if (!parsed.sheet1Columns || !parsed.sheet2Columns || !Array.isArray(parsed.sheet1Columns) || !Array.isArray(parsed.sheet2Columns)) {
      return res.status(502).json({ error: 'AI response was missing required fields. Please try again.' });
    }

    // Validate that the suggested columns actually exist in the headers
    const invalidS1 = parsed.sheet1Columns.filter(c => !sheet1Headers.includes(c));
    const invalidS2 = parsed.sheet2Columns.filter(c => !sheet2Headers.includes(c));

    if (invalidS1.length > 0 || invalidS2.length > 0) {
      return res.status(502).json({
        error: `AI suggested columns that don't exist: ${[...invalidS1, ...invalidS2].join(', ')}. Please use manual key selection.`,
      });
    }

    // Never log sample data rows
    console.log(`[/api/detect-key] Key detected for ${sheet1Headers.length}-col vs ${sheet2Headers.length}-col dataset`);

    return res.json({
      sheet1Columns: parsed.sheet1Columns,
      sheet2Columns: parsed.sheet2Columns,
      rationale: parsed.rationale || 'No rationale provided.',
    });

  } catch (err) {
    console.error('[/api/detect-key] Gemini API error:', err.message);
    return res.status(503).json({
      error: 'The AI service is temporarily unavailable. Please try again or use manual key selection.',
    });
  }
});

module.exports = router;

const express = require('express');
const cors = require('cors');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const geminiRoutes = require('./routes/gemini');
app.use('/api', geminiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`DataRecon backend running on http://localhost:${PORT}`);
  console.log(`Gemini API key configured: ${!!process.env.GOOGLE_AI_STUDIO_API_KEY}`);
});

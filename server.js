const express = require('express');
const cors = require('cors');
const scrapeRoute = require('./src/routes/scrapeRoute');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/scrape', scrapeRoute);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware - sempre retornar HTTP 200 para n8n
app.use((err, req, res, next) => {
  console.error('Error:', err);
  const { formatError, ERROR_TYPES } = require('./src/utils/responseFormatter');
  const response = formatError(err, null, req.body?.url || req.query?.url, Date.now(), ERROR_TYPES.FATAL);
  // Sempre retornar HTTP 200, mesmo em erros
  res.status(200).json(response);
});

app.listen(PORT, () => {
  console.log(`🚀 FSBO Scraper running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`🔍 Scrape endpoint: http://localhost:${PORT}/scrape`);
});



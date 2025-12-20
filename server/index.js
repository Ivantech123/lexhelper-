import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initBot } from './telegram.js';
import { saveHistory, getHistory, deleteHistory } from './db.js';

const PORT = Number(process.env.PORT || 8080);
const BOT_TOKEN = process.env.BOT_TOKEN;

const WEBHOOK_PATH = process.env.WEBHOOK_PATH || '/telegram/webhook';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';
const WEB_APP_URL = process.env.WEB_APP_URL || '';

const bot = BOT_TOKEN
  ? initBot({
      token: BOT_TOKEN,
      webAppUrl: WEB_APP_URL,
    })
  : null;

const app = express();
app.disable('x-powered-by');

app.get('/healthz', (_req, res) => {
  res.status(200).send('ok');
});

// API Routes for History
app.use('/api', express.json({ limit: '10mb' }));

app.get('/api/history', async (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).send('userId required');
  const history = await getHistory(userId);
  res.json(history);
});

app.post('/api/history', async (req, res) => {
  const { userId, item } = req.body;
  if (!userId || !item) return res.status(400).send('Invalid data');
  await saveHistory(userId, item);
  res.sendStatus(200);
});

app.delete('/api/history/:id', async (req, res) => {
  const userId = req.query.userId;
  const historyId = req.params.id;
  if (!userId) return res.status(400).send('userId required');
  await deleteHistory(userId, historyId);
  res.sendStatus(200);
});

app.post(
  WEBHOOK_PATH,
  express.json({ limit: '10mb' }),
  (req, res, next) => {
    if (!WEBHOOK_SECRET) return next();
    const secret = req.get('x-telegram-bot-api-secret-token');
    if (secret !== WEBHOOK_SECRET) return res.sendStatus(401);
    next();
  },
  async (req, res) => {
    if (!bot) {
      return res.status(503).json({
        ok: false,
        error: 'BOT_TOKEN not configured',
      });
    }
    try {
      await bot.handleUpdate(req.body, res);
    } catch (err) {
      console.error('Telegram webhook error:', err);
      if (!res.headersSent) res.sendStatus(500);
    }
  }
);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '..', 'dist');

if (fs.existsSync(distDir)) {
  app.use(express.static(distDir, { index: false }));

  app.get('*', async (_req, res) => {
    try {
      const indexPath = path.join(distDir, 'index.html');
      let html = await fs.promises.readFile(indexPath, 'utf-8');
      
      // Inject API Key from server environment to client runtime
      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
      if (apiKey) {
        const script = `<script>window.GEMINI_API_KEY = "${apiKey}";</script>`;
        html = html.replace('</head>', `${script}</head>`);
      }
      
      res.send(html);
    } catch (err) {
      console.error('Error serving index.html:', err);
      res.status(500).send('Internal Server Error');
    }
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Listening on ${PORT}`);
  console.log(`Webhook: POST ${WEBHOOK_PATH}`);
  if (!BOT_TOKEN) {
    console.warn('BOT_TOKEN is not set: bot features are disabled until configured.');
  }
});

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
console.log('[Server] Dist Directory:', distDir);

// Debug route to inspect server environment
app.get('/debug/info', (req, res) => {
  try {
    const info = {
      env: process.env.NODE_ENV,
      cwd: process.cwd(),
      dirname: __dirname,
      distDir: distDir,
      distExists: fs.existsSync(distDir),
      distContents: fs.existsSync(distDir) ? fs.readdirSync(distDir) : null,
      rootContents: fs.readdirSync(process.cwd()),
    };
    res.json(info);
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

// API Proxy for Gemini (handles Service Worker requests)
app.use('/api-proxy', express.json({ limit: '10mb' }), async (req, res) => {
  try {
    // Priority: Env Var > Hardcoded Fallback (User provided)
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || 'AIzaSyDmI8WcphbBXLikmVAlwtGBuOWViy0Ry9U';
    
    if (!apiKey) {
       console.error('[Proxy] No GEMINI_API_KEY found!');
    }

    // Construct URL and force inject the API Key from server env
    const targetUrl = new URL(`https://generativelanguage.googleapis.com${req.url}`);
    if (apiKey) {
      targetUrl.searchParams.set('key', apiKey);
    }

    console.log(`[Proxy] Forwarding ${req.method} request to: ${targetUrl.origin}${targetUrl.pathname} (key injected: ${!!apiKey})`);

    const options = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      options.body = JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl.toString(), options);
    
    // Forward the status code
    res.status(response.status);

    // Forward the response body
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('[Proxy] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

if (fs.existsSync(distDir)) {
  console.log('[Server] Dist directory exists. Contents:', fs.readdirSync(distDir));
  
  // Serve static files
  app.use(express.static(distDir, { index: false }));

  // Prevent index.html fallback for missing assets (strict 404)
  app.use((req, res, next) => {
    if (/(.ico|.js|.css|.jpg|.png|.map|.woff|.woff2|.ttf)$/i.test(req.path)) {
        console.warn(`[Server] 404 for asset: ${req.path}`);
        return res.status(404).send('Asset not found');
    }
    next();
  });

  app.get('*', async (_req, res) => {
    try {
      const indexPath = path.join(distDir, 'index.html');
      if (!fs.existsSync(indexPath)) {
        console.error('[Server] index.html not found in dist folder');
        return res.status(404).send('index.html not found');
      }
      
      let html = await fs.promises.readFile(indexPath, 'utf-8');
      console.log('[Server] Serving index.html. Preview:', html.substring(0, 200));
      
      // Inject API Key from server environment to client runtime
      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || 'AIzaSyDmI8WcphbBXLikmVAlwtGBuOWViy0Ry9U';
      if (apiKey) {
        console.log(`[Server] Injecting API Key into client (Length: ${apiKey.length})`);
        const script = `<script>window.GEMINI_API_KEY = "${apiKey}";</script>`;
        html = html.replace('</head>', `${script}</head>`);
      } else {
        console.warn("[Server] No API Key found in environment variables!");
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

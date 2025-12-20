import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initBot } from './telegram.js';
import { saveHistory, getHistory, deleteHistory } from './db.js';
import * as speech from '@google-cloud/speech';
import * as textToSpeech from '@google-cloud/text-to-speech';

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

const { SpeechClient } = speech.v2;
const TextToSpeechClient = textToSpeech.TextToSpeechClient || textToSpeech.v1?.TextToSpeechClient;

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

app.post('/api/speech/transcribe', express.json({ limit: '25mb' }), async (req, res) => {
  try {
    const { audioBase64, mimeType, languageCode } = req.body || {};

    if (!audioBase64 || typeof audioBase64 !== 'string') {
      return res.status(400).json({ error: 'audioBase64 required' });
    }

    const sttLocation = process.env.STT_LOCATION || 'us';
    const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
    if (!projectId) {
      return res.status(500).json({ error: 'GOOGLE_CLOUD_PROJECT is not set' });
    }

    const apiEndpoint = process.env.STT_API_ENDPOINT;
    const client = apiEndpoint ? new SpeechClient({ apiEndpoint }) : new SpeechClient();

    const audioBytes = Buffer.from(audioBase64, 'base64');
    const lang = languageCode || 'ru-RU';

    const request = {
      recognizer: `projects/${projectId}/locations/${sttLocation}/recognizers/_`,
      config: {
        autoDecodingConfig: {},
        languageCodes: [lang],
        model: 'chirp_3',
      },
      content: audioBytes,
    };

    const [response] = await client.recognize(request);

    const results = response?.results || [];
    const transcript = results
      .map(r => (r.alternatives && r.alternatives[0] ? r.alternatives[0].transcript : ''))
      .filter(Boolean)
      .join('\n');

    return res.json({ transcript, mimeType: mimeType || null, languageCode: lang });
  } catch (error) {
    console.error('[STT] Transcribe error:', error);
    return res.status(500).json({ error: error?.message || String(error) });
  }
});

app.post('/api/tts/speak', express.json({ limit: '1mb' }), async (req, res) => {
  try {
    const { text, languageCode, voiceName } = req.body || {};
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'text required' });
    }

    if (!TextToSpeechClient) {
      return res.status(500).json({ error: 'TextToSpeechClient not available' });
    }

    const client = new TextToSpeechClient();
    const lang = (languageCode && typeof languageCode === 'string' ? languageCode : 'ru-RU');
    const voice = {
      languageCode: lang,
      ...(voiceName && typeof voiceName === 'string' ? { name: voiceName } : {}),
    };

    const [response] = await client.synthesizeSpeech({
      input: { text: text },
      voice,
      audioConfig: { audioEncoding: 'MP3' },
    });

    const audioContent = response?.audioContent;
    if (!audioContent) {
      return res.status(500).json({ error: 'No audioContent returned' });
    }

    const audioBase64 = Buffer.isBuffer(audioContent)
      ? audioContent.toString('base64')
      : Buffer.from(audioContent).toString('base64');

    return res.json({ audioBase64, mimeType: 'audio/mpeg', languageCode: lang });
  } catch (error) {
    console.error('[TTS] Speak error:', error);
    return res.status(500).json({ error: error?.message || String(error) });
  }
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

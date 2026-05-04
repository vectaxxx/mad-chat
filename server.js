const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

// ─── Config ────────────────────────────────────────────────────────────────
const config = {
  port: process.env.PORT || 3000,
  slackBotToken: process.env.SLACK_BOT_TOKEN,
  slackSigningSecret: process.env.SLACK_SIGNING_SECRET,
  slackChannelId: process.env.SLACK_CHANNEL_ID,
};

const slackEnabled = !!(
  config.slackBotToken &&
  config.slackBotToken !== 'xoxb-placeholder' &&
  config.slackSigningSecret &&
  config.slackSigningSecret !== 'placeholder'
);

// ─── Slack (опционально) ───────────────────────────────────────────────────
let slack = null;
let slackEvents = null;

if (slackEnabled) {
  try {
    const { WebClient } = require('@slack/web-api');
    const { createEventAdapter } = require('@slack/events-api');
    slack = new WebClient(config.slackBotToken);
    slackEvents = createEventAdapter(config.slackSigningSecret);
    console.log('[Slack] ✅ Enabled');
  } catch(e) {
    console.error('[Slack] Failed to init:', e.message);
  }
} else {
  console.log('[Slack] ⚠️  Disabled — fill .env to enable');
}

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// ─── Session Store ─────────────────────────────────────────────────────────
const sessions = new Map();
const threadToSession = new Map();

// ─── GeoIP ─────────────────────────────────────────────────────────────────
async function getGeoByIp(ip) {
  try {
    if (!ip || ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') {
      return { city: 'Localhost', country: 'DEV' };
    }
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=city,country`);
    const data = await res.json();
    return { city: data.city || 'Неизвестно', country: data.country || '' };
  } catch {
    return { city: 'Неизвестно', country: '' };
  }
}

// ─── Format Slack message ──────────────────────────────────────────────────
function formatSlackMessage(session) {
  const { user, geo, page } = session;
  const isAuth = !!user?.id;

  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: isAuth ? `💬 Новый чат — ${user.name || user.id}` : `💬 Новый чат — Анонимный пользователь`,
        emoji: true
      }
    },
    { type: 'divider' },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*👤 Пользователь:*\n${isAuth ? user.name || 'Без имени' : 'Анонимный'}` },
        { type: 'mrkdwn', text: `*🏙 Город:*\n${geo?.city || '—'}, ${geo?.country || ''}` }
      ]
    }
  ];

  if (isAuth) {
    const fields = [];
    if (user.email)    fields.push({ type: 'mrkdwn', text: `*📧 Email:*\n${user.email}` });
    if (user.balance !== undefined) fields.push({ type: 'mrkdwn', text: `*💰 Баланс:*\n${user.balance} ${user.currency || ''}` });
    if (user.status)   fields.push({ type: 'mrkdwn', text: `*🏷 Статус:*\n${user.status}` });
    if (user.orders !== undefined) fields.push({ type: 'mrkdwn', text: `*📦 Заказов:*\n${user.orders}` });

    const known = ['id','name','email','balance','currency','status','orders'];
    Object.entries(user).forEach(([k, v]) => {
      if (!known.includes(k)) fields.push({ type: 'mrkdwn', text: `*${k}:*\n${v}` });
    });

    if (fields.length) blocks.push({ type: 'section', fields: fields.slice(0, 10) });
  }

  if (page?.url) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*📄 Страница:* <${page.url}|${page.title || page.url}>` }
    });
  }

  blocks.push({ type: 'divider' });
  blocks.push({
    type: 'context',
    elements: [{ type: 'mrkdwn', text: `Session: \`${session.sessionId}\` · ${new Date(session.startedAt).toLocaleString('ru-RU')}` }]
  });

  return blocks;
}

// ─── WebSocket ─────────────────────────────────────────────────────────────
wss.on('connection', (ws, req) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
  const sessionId = uuidv4();

  ws.sessionId = sessionId;
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', async (raw) => {
    let data;
    try { data = JSON.parse(raw); } catch { return; }

    switch (data.type) {

      case 'init': {
        const geo = await getGeoByIp(ip);
        const session = {
          sessionId,
          ws,
          user: data.user || null,
          geo,
          page: data.page || {},
          startedAt: Date.now(),
          slackThreadTs: null,
        };
        sessions.set(sessionId, session);
        ws.send(JSON.stringify({ type: 'session', sessionId }));
        console.log(`[Session] New: ${sessionId} | ${geo.city} | user: ${data.user?.id || 'anon'}`);
        break;
      }

      case 'user_message': {
        const session = sessions.get(sessionId);
        if (!session) break;

        const text = data.text?.trim();
        if (!text) break;

        console.log(`[Msg] ${sessionId}: ${text}`);

        if (!slackEnabled || !slack) break;

        // Создаём тред при первом сообщении
        if (!session.slackThreadTs) {
          try {
            const res = await slack.chat.postMessage({
              channel: config.slackChannelId,
              blocks: formatSlackMessage(session),
              text: `Новый чат от ${session.user?.name || 'анонима'} (${session.geo.city})`,
            });
            session.slackThreadTs = res.ts;
            threadToSession.set(res.ts, sessionId);
            console.log(`[Slack] Thread: ${res.ts}`);
          } catch (err) {
            console.error('[Slack] Create thread error:', err.message);
          }
        }

        // Шлём сообщение в тред
        if (session.slackThreadTs) {
          try {
            await slack.chat.postMessage({
              channel: config.slackChannelId,
              thread_ts: session.slackThreadTs,
              text: `👤 *${session.user?.name || 'Пользователь'}:* ${text}`,
            });
          } catch (err) {
            console.error('[Slack] Post message error:', err.message);
          }
        }
        break;
      }

      case 'chat_opened':
        console.log(`[Chat] Opened: ${sessionId}`);
        break;
    }
  });

  ws.on('close', () => {
    const session = sessions.get(sessionId);
    if (session?.slackThreadTs && slack) {
      slack.chat.postMessage({
        channel: config.slackChannelId,
        thread_ts: session.slackThreadTs,
        text: '🔴 Пользователь закрыл чат',
      }).catch(() => {});
    }
    sessions.delete(sessionId);
    console.log(`[Session] Closed: ${sessionId}`);
  });

  ws.send(JSON.stringify({ type: 'connected' }));
});

// ─── Heartbeat ─────────────────────────────────────────────────────────────
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

// ─── Slack Events (ответы агента) ──────────────────────────────────────────
if (slackEnabled && slackEvents) {
  app.use('/slack/events', slackEvents.requestListener());

  slackEvents.on('message', async (event) => {
    if (event.bot_id || event.subtype || !event.thread_ts) return;

    const sid = threadToSession.get(event.thread_ts);
    if (!sid) return;

    const session = sessions.get(sid);
    if (!session?.ws || session.ws.readyState !== WebSocket.OPEN) return;

    session.ws.send(JSON.stringify({
      type: 'agent_message',
      text: event.text,
      time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    }));

    console.log(`[Slack→Widget] ${sid}: ${event.text}`);
  });

  slackEvents.on('error', (err) => console.error('[Slack Events]', err.message));
}

// ─── Body parser (after Slack events!) ────────────────────────────────────────
app.use((req, res, next) => {
  if (req.path === '/slack/events') return next();
  express.json()(req, res, next);
});

// ─── Static files ──────────────────────────────────────────────────────────
app.get('/widget.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.sendFile(__dirname + '/widget.js');
});

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));
app.get('/demo', (req, res) => res.sendFile(__dirname + '/index.html'));

// ─── REST API ──────────────────────────────────────────────────────────────

// POST /api/proactive — агент инициирует чат
app.post('/api/proactive', (req, res) => {
  const { sessionId, allActive, text } = req.body;

  if (allActive) {
    let count = 0;
    sessions.forEach((session) => {
      if (session.ws?.readyState === WebSocket.OPEN) {
        session.ws.send(JSON.stringify({ type: 'proactive', text }));
        count++;
      }
    });
    return res.json({ ok: true, sent: count });
  }

  const session = sessions.get(sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  session.ws.send(JSON.stringify({ type: 'proactive', text }));
  res.json({ ok: true });
});

// GET /api/sessions
app.get('/api/sessions', (req, res) => {
  const list = [];
  sessions.forEach((s, id) => {
    list.push({
      sessionId: id,
      user: s.user ? { id: s.user.id, name: s.user.name } : null,
      geo: s.geo,
      page: s.page,
      startedAt: s.startedAt,
      hasSlackThread: !!s.slackThreadTs,
    });
  });
  res.json(list);
});

app.get('/health', (req, res) => res.json({ ok: true, sessions: sessions.size, slack: slackEnabled }));

// CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// ─── Start ─────────────────────────────────────────────────────────────────
server.listen(config.port, () => {
  console.log(`
  ╔══════════════════════════════╗
  ║   Mad Chat Server            ║
  ║   Port: ${config.port}               ║
  ║   Demo: http://localhost:${config.port} ║
  ╚══════════════════════════════╝
  `);
});

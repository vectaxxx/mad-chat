(function () {
  'use strict';

  // ─── Config ───────────────────────────────────────────────────────────────
  const cfg = window.MadChat || {};
  const SERVER_URL = cfg.serverUrl || 'http://localhost:3000';
  const WS_URL = SERVER_URL.replace(/^http/, 'ws');
  const AGENT_NAME = cfg.agentName || 'Алексей';
  const AGENT_INITIALS = AGENT_NAME[0].toUpperCase();

  // ─── Styles ───────────────────────────────────────────────────────────────
  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap');

    :host {
      --mad-red: #FF1744;
      --mad-red-dark: #D50000;
      --mad-pink: #FF4081;
      --mad-green: #4CAF50;
      --mad-bg: #F2F2F7;
      --mad-white: #FFFFFF;
      --mad-text: #1C1C1E;
      --mad-subtext: #8E8E93;
      --mad-border: rgba(0,0,0,0.08);
      --mad-shadow: 0 8px 40px rgba(255,23,68,0.25), 0 2px 12px rgba(0,0,0,0.12);
      --mad-font: 'Manrope', -apple-system, sans-serif;
      font-family: var(--mad-font);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    /* ── Launcher button ── */
    .mad-launcher {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 58px;
      height: 58px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--mad-pink), var(--mad-red));
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: var(--mad-shadow);
      z-index: 9999;
      transition: transform 0.2s cubic-bezier(.34,1.56,.64,1), box-shadow 0.2s ease;
      outline: none;
    }
    .mad-launcher:hover {
      transform: scale(1.08);
      box-shadow: 0 12px 48px rgba(255,23,68,0.35), 0 4px 16px rgba(0,0,0,0.15);
    }
    .mad-launcher:active { transform: scale(0.96); }
    .mad-launcher svg { width: 26px; height: 26px; }

    .mad-badge {
      position: absolute;
      top: 1px;
      right: 1px;
      width: 14px;
      height: 14px;
      background: #FF1744;
      border: 2.5px solid white;
      border-radius: 50%;
      display: none;
    }
    .mad-badge.visible { display: block; }

    /* ── Proactive popup ── */
    .mad-proactive {
      position: fixed;
      bottom: 96px;
      right: 24px;
      width: 320px;
      background: var(--mad-white);
      border-radius: 20px;
      box-shadow: 0 12px 48px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08);
      z-index: 9998;
      overflow: hidden;
      transform: translateY(16px) scale(0.96);
      opacity: 0;
      pointer-events: none;
      transition: transform 0.3s cubic-bezier(.34,1.56,.64,1), opacity 0.25s ease;
    }
    .mad-proactive.visible {
      transform: translateY(0) scale(1);
      opacity: 1;
      pointer-events: all;
    }

    .mad-proactive-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px 16px 10px;
    }
    .mad-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--mad-pink), var(--mad-red));
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 16px;
      color: white;
      flex-shrink: 0;
      position: relative;
    }
    .mad-avatar-dot {
      position: absolute;
      bottom: 1px;
      right: 1px;
      width: 10px;
      height: 10px;
      background: var(--mad-green);
      border: 2px solid white;
      border-radius: 50%;
    }
    .mad-agent-info { flex: 1; }
    .mad-agent-name {
      font-weight: 700;
      font-size: 15px;
      color: var(--mad-text);
      line-height: 1.2;
    }
    .mad-agent-status {
      font-size: 12px;
      color: var(--mad-green);
      font-weight: 500;
      margin-top: 1px;
    }
    .mad-close-btn {
      width: 28px;
      height: 28px;
      border: none;
      background: var(--mad-bg);
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--mad-subtext);
      font-size: 14px;
      transition: background 0.15s;
      flex-shrink: 0;
    }
    .mad-close-btn:hover { background: #E5E5EA; }

    .mad-proactive-body { padding: 0 16px 14px; }
    .mad-proactive-text {
      font-size: 14px;
      line-height: 1.55;
      color: var(--mad-text);
    }
    .mad-typing {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 10px;
      color: var(--mad-subtext);
      font-size: 12px;
    }
    .mad-typing-dots {
      display: flex;
      gap: 3px;
    }
    .mad-typing-dots span {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: var(--mad-subtext);
      animation: madBounce 1.2s infinite ease-in-out;
    }
    .mad-typing-dots span:nth-child(2) { animation-delay: 0.2s; }
    .mad-typing-dots span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes madBounce {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
      30% { transform: translateY(-4px); opacity: 1; }
    }

    .mad-proactive-actions {
      display: flex;
      gap: 8px;
      padding: 0 16px 16px;
    }
    .mad-btn-primary {
      flex: 1;
      padding: 13px 16px;
      background: linear-gradient(135deg, var(--mad-pink), var(--mad-red));
      color: white;
      border: none;
      border-radius: 14px;
      font-family: var(--mad-font);
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.15s, transform 0.15s;
    }
    .mad-btn-primary:hover { opacity: 0.92; transform: translateY(-1px); }
    .mad-btn-primary:active { transform: translateY(0); opacity: 1; }

    .mad-btn-secondary {
      padding: 13px 16px;
      background: var(--mad-bg);
      color: var(--mad-text);
      border: none;
      border-radius: 14px;
      font-family: var(--mad-font);
      font-size: 15px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s;
    }
    .mad-btn-secondary:hover { background: #E5E5EA; }

    /* ── Chat window ── */
    .mad-chat {
      position: fixed;
      bottom: 96px;
      right: 24px;
      width: 360px;
      height: 560px;
      background: var(--mad-white);
      border-radius: 24px;
      box-shadow: 0 20px 64px rgba(0,0,0,0.16), 0 4px 16px rgba(0,0,0,0.08);
      z-index: 9997;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transform: translateY(20px) scale(0.95);
      opacity: 0;
      pointer-events: none;
      transition: transform 0.35s cubic-bezier(.34,1.56,.64,1), opacity 0.28s ease;
    }
    .mad-chat.visible {
      transform: translateY(0) scale(1);
      opacity: 1;
      pointer-events: all;
    }

    /* Chat header */
    .mad-chat-header {
      background: linear-gradient(135deg, var(--mad-pink) 0%, var(--mad-red) 100%);
      padding: 16px 16px 14px;
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
    }
    .mad-header-back {
      width: 32px;
      height: 32px;
      border: none;
      background: rgba(255,255,255,0.2);
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      transition: background 0.15s;
      flex-shrink: 0;
    }
    .mad-header-back:hover { background: rgba(255,255,255,0.3); }
    .mad-header-avatar {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: rgba(255,255,255,0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 15px;
      color: white;
      position: relative;
      flex-shrink: 0;
    }
    .mad-header-avatar-dot {
      position: absolute;
      bottom: 1px;
      right: 1px;
      width: 9px;
      height: 9px;
      background: var(--mad-green);
      border: 2px solid var(--mad-red);
      border-radius: 50%;
    }
    .mad-header-info { flex: 1; }
    .mad-header-name {
      font-weight: 700;
      font-size: 16px;
      color: white;
      line-height: 1.2;
    }
    .mad-header-sub {
      font-size: 12px;
      color: rgba(255,255,255,0.8);
      margin-top: 1px;
    }
    .mad-header-logo {
      width: 32px;
      height: 32px;
      background: rgba(255,255,255,0.2);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .mad-header-logo svg { width: 18px; height: 18px; }

    /* Messages area */
    .mad-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px 12px;
      background: var(--mad-bg);
      display: flex;
      flex-direction: column;
      gap: 4px;
      scroll-behavior: smooth;
    }
    .mad-messages::-webkit-scrollbar { width: 4px; }
    .mad-messages::-webkit-scrollbar-track { background: transparent; }
    .mad-messages::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 2px; }

    .mad-date-divider {
      text-align: center;
      font-size: 12px;
      color: var(--mad-subtext);
      margin: 8px 0 12px;
      font-weight: 500;
    }

    .mad-msg-row {
      display: flex;
      align-items: flex-end;
      gap: 6px;
      margin-bottom: 2px;
    }
    .mad-msg-row.user {
      flex-direction: row-reverse;
    }
    .mad-msg-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--mad-pink), var(--mad-red));
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 11px;
      color: white;
      flex-shrink: 0;
      margin-bottom: 18px;
    }
    .mad-msg-avatar.hidden { visibility: hidden; }

    .mad-msg-content { max-width: 240px; }
    .mad-bubble {
      padding: 10px 14px;
      border-radius: 18px;
      font-size: 14px;
      line-height: 1.5;
      color: var(--mad-text);
      background: var(--mad-white);
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
      word-break: break-word;
    }
    .mad-msg-row.user .mad-bubble {
      background: linear-gradient(135deg, var(--mad-pink), var(--mad-red));
      color: white;
    }
    .mad-msg-time {
      font-size: 11px;
      color: var(--mad-subtext);
      margin-top: 3px;
      padding: 0 4px;
    }
    .mad-msg-row.user .mad-msg-time { text-align: right; }

    /* Typing indicator bubble */
    .mad-typing-bubble {
      background: var(--mad-white);
      padding: 12px 16px;
      border-radius: 18px;
      display: flex;
      gap: 4px;
      align-items: center;
      width: fit-content;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    .mad-typing-bubble span {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--mad-subtext);
      animation: madBounce 1.2s infinite ease-in-out;
    }
    .mad-typing-bubble span:nth-child(2) { animation-delay: 0.2s; }
    .mad-typing-bubble span:nth-child(3) { animation-delay: 0.4s; }

    /* Input area */
    .mad-input-area {
      padding: 10px 12px 14px;
      background: var(--mad-white);
      border-top: 1px solid var(--mad-border);
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }
    .mad-attach-btn {
      width: 36px;
      height: 36px;
      border: none;
      background: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--mad-subtext);
      border-radius: 50%;
      transition: background 0.15s, color 0.15s;
      flex-shrink: 0;
    }
    .mad-attach-btn:hover { background: var(--mad-bg); color: var(--mad-text); }

    .mad-input {
      flex: 1;
      border: none;
      outline: none;
      font-family: var(--mad-font);
      font-size: 14px;
      color: var(--mad-text);
      background: none;
      resize: none;
      line-height: 1.4;
      max-height: 80px;
      overflow-y: auto;
    }
    .mad-input::placeholder { color: var(--mad-subtext); }

    .mad-send-btn {
      width: 36px;
      height: 36px;
      border: none;
      background: var(--mad-bg);
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--mad-subtext);
      transition: background 0.2s, color 0.2s, transform 0.15s;
      flex-shrink: 0;
    }
    .mad-send-btn.active {
      background: linear-gradient(135deg, var(--mad-pink), var(--mad-red));
      color: white;
    }
    .mad-send-btn.active:hover { transform: scale(1.08); }
    .mad-send-btn svg { width: 18px; height: 18px; }

    /* ── Connection status ── */
    .mad-conn-bar {
      background: #FF9800;
      color: white;
      text-align: center;
      font-size: 11px;
      font-weight: 600;
      padding: 4px 8px;
      flex-shrink: 0;
      display: none;
    }
    .mad-conn-bar.visible { display: block; }

    /* ── Mobile responsive ── */
    @media (max-width: 480px) {
      .mad-chat {
        bottom: 0;
        right: 0;
        width: 100%;
        height: 100%;
        border-radius: 0;
      }
      .mad-proactive {
        right: 12px;
        left: 12px;
        width: auto;
      }
      .mad-launcher {
        bottom: 16px;
        right: 16px;
      }
    }
  `;

  // ─── SVG Icons ─────────────────────────────────────────────────────────────
  const ICON_BOLT = `<svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
    <path d="M13 2L4.5 13.5H11L10 22L20.5 10H14L13 2Z"/>
  </svg>`;

  const ICON_CHEVRON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="18 15 12 9 6 15"/>
  </svg>`;

  const ICON_CLOSE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>`;

  const ICON_ATTACH = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
  </svg>`;

  const ICON_SEND = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>`;

  // ─── State ─────────────────────────────────────────────────────────────────
  let ws = null;
  let sessionId = null;
  let chatOpen = false;
  let messages = [];
  let proactiveShown = false;
  let reconnectTimer = null;
  let reconnectAttempts = 0;

  // ─── DOM Setup ─────────────────────────────────────────────────────────────
  const host = document.createElement('div');
  host.id = 'mad-chat-root';
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: 'open' });

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  shadow.appendChild(styleEl);

  // Launcher
  const launcher = document.createElement('button');
  launcher.className = 'mad-launcher';
  launcher.innerHTML = `${ICON_BOLT}<span class="mad-badge" id="mad-badge"></span>`;
  shadow.appendChild(launcher);

  // Proactive popup
  const proactive = document.createElement('div');
  proactive.className = 'mad-proactive';
  proactive.innerHTML = `
    <div class="mad-proactive-header">
      <div class="mad-avatar">
        ${AGENT_INITIALS}
        <span class="mad-avatar-dot"></span>
      </div>
      <div class="mad-agent-info">
        <div class="mad-agent-name">${AGENT_NAME}</div>
        <div class="mad-agent-status">Онлайн · отвечу сейчас</div>
      </div>
      <button class="mad-close-btn" id="mad-proactive-close">${ICON_CLOSE}</button>
    </div>
    <div class="mad-proactive-body">
      <div class="mad-proactive-text" id="mad-proactive-text"></div>
      <div class="mad-typing">
        <div class="mad-typing-dots">
          <span></span><span></span><span></span>
        </div>
        <span>печатает ответ...</span>
      </div>
    </div>
    <div class="mad-proactive-actions">
      <button class="mad-btn-primary" id="mad-open-chat">Открыть чат</button>
      <button class="mad-btn-secondary" id="mad-later">Позже</button>
    </div>
  `;
  shadow.appendChild(proactive);

  // Chat window
  const chatWindow = document.createElement('div');
  chatWindow.className = 'mad-chat';
  chatWindow.innerHTML = `
    <div class="mad-chat-header">
      <button class="mad-header-back" id="mad-back">${ICON_CHEVRON}</button>
      <div class="mad-header-avatar">
        ${AGENT_INITIALS}
        <span class="mad-header-avatar-dot"></span>
      </div>
      <div class="mad-header-info">
        <div class="mad-header-name">${AGENT_NAME}</div>
        <div class="mad-header-sub">Онлайн · Mad Support</div>
      </div>
      <div class="mad-header-logo">${ICON_BOLT}</div>
    </div>
    <div class="mad-conn-bar" id="mad-conn-bar">Переподключение...</div>
    <div class="mad-messages" id="mad-messages"></div>
    <div class="mad-input-area">
      <button class="mad-attach-btn">${ICON_ATTACH}</button>
      <textarea class="mad-input" id="mad-input" placeholder="Написать сообщение..." rows="1"></textarea>
      <button class="mad-send-btn" id="mad-send">${ICON_SEND}</button>
    </div>
  `;
  shadow.appendChild(chatWindow);

  // ─── Element refs ──────────────────────────────────────────────────────────
  const $ = (id) => shadow.getElementById(id);
  const messagesEl = $('mad-messages');
  const inputEl = $('mad-input');
  const sendBtn = $('mad-send');
  const badge = $('mad-badge');
  const connBar = $('mad-conn-bar');

  // ─── WebSocket ─────────────────────────────────────────────────────────────
  function connect() {
    try {
      ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        reconnectAttempts = 0;
        connBar.classList.remove('visible');
        // Send init with user context
        ws.send(JSON.stringify({
          type: 'init',
          user: cfg.user || null,
          page: {
            url: window.location.href,
            title: document.title
          }
        }));
      };

      ws.onmessage = (e) => {
        const data = JSON.parse(e.data);
        handleServerMessage(data);
      };

      ws.onclose = () => {
        scheduleReconnect();
      };

      ws.onerror = () => {
        connBar.classList.add('visible');
      };
    } catch (err) {
      scheduleReconnect();
    }
  }

  function scheduleReconnect() {
    // Показываем баннер только после 2й попытки, чтобы не мелькало при старте
    if (reconnectAttempts >= 1) {
      connBar.classList.add('visible');
    }
    clearTimeout(reconnectTimer);
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
    reconnectAttempts++;
    reconnectTimer = setTimeout(connect, delay);
  }

  function send(payload) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }

  // ─── Server message handler ────────────────────────────────────────────────
  function handleServerMessage(data) {
    switch (data.type) {
      case 'session':
        sessionId = data.sessionId;
        break;

      case 'agent_message':
        addMessage({ role: 'agent', text: data.text, time: data.time });
        if (!chatOpen) {
          badge.classList.add('visible');
          showNotification(data.text);
        }
        break;

      case 'proactive':
        if (!proactiveShown && !chatOpen) {
          showProactive(data.text);
        }
        break;

      case 'typing':
        showTypingInChat(data.show);
        break;
    }
  }

  // ─── Proactive popup ───────────────────────────────────────────────────────
  function showProactive(text) {
    proactiveShown = true;
    $('mad-proactive-text').textContent = text || 'Привет! Могу помочь с вашим вопросом 👋';
    proactive.classList.add('visible');
    badge.classList.add('visible');
  }

  $('mad-proactive-close').addEventListener('click', () => {
    proactive.classList.remove('visible');
  });

  $('mad-later').addEventListener('click', () => {
    proactive.classList.remove('visible');
  });

  $('mad-open-chat').addEventListener('click', () => {
    proactive.classList.remove('visible');
    openChat();
  });

  // ─── Chat open/close ───────────────────────────────────────────────────────
  function openChat() {
    chatOpen = true;
    chatWindow.classList.add('visible');
    proactive.classList.remove('visible');
    badge.classList.remove('visible');
    scrollToBottom();
    inputEl.focus();
    send({ type: 'chat_opened' });

    // Если сервер недоступен и сообщений ещё нет — показываем приветствие
    if (messages.length === 0 && (!ws || ws.readyState !== WebSocket.OPEN)) {
      setTimeout(() => {
        showTypingInChat(true);
        setTimeout(() => {
          showTypingInChat(false);
          addMessage({ role: 'agent', text: 'Привет! 👋 Рад помочь. Какой у вас вопрос?' });
        }, 1200);
      }, 400);
    }
  }

  function closeChat() {
    chatOpen = false;
    chatWindow.classList.remove('visible');
  }

  launcher.addEventListener('click', () => {
    if (chatOpen) {
      closeChat();
    } else {
      openChat();
    }
  });

  $('mad-back').addEventListener('click', closeChat);

  // ─── Messages ──────────────────────────────────────────────────────────────
  function addMessage({ role, text, time }) {
    const now = time || new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    messages.push({ role, text, time: now });

    // Remove typing indicator if present
    const typingEl = messagesEl.querySelector('.mad-typing-row');
    if (typingEl) typingEl.remove();

    // Add date divider on first message
    if (messages.length === 1) {
      const div = document.createElement('div');
      div.className = 'mad-date-divider';
      div.textContent = 'Сегодня';
      messagesEl.appendChild(div);
    }

    const isUser = role === 'user';
    const row = document.createElement('div');
    row.className = `mad-msg-row ${isUser ? 'user' : ''}`;

    row.innerHTML = `
      ${!isUser ? `<div class="mad-msg-avatar">${AGENT_INITIALS}</div>` : ''}
      <div class="mad-msg-content">
        <div class="mad-bubble">${escapeHtml(text)}</div>
        <div class="mad-msg-time">${now}</div>
      </div>
      ${isUser ? `<div class="mad-msg-avatar" style="background:linear-gradient(135deg,#667eea,#764ba2)">Я</div>` : ''}
    `;
    messagesEl.appendChild(row);
    scrollToBottom();
  }

  let typingRow = null;
  function showTypingInChat(show) {
    if (show && !messagesEl.querySelector('.mad-typing-row')) {
      typingRow = document.createElement('div');
      typingRow.className = 'mad-msg-row mad-typing-row';
      typingRow.innerHTML = `
        <div class="mad-msg-avatar">${AGENT_INITIALS}</div>
        <div class="mad-typing-bubble">
          <span></span><span></span><span></span>
        </div>
      `;
      messagesEl.appendChild(typingRow);
      scrollToBottom();
    } else if (!show && typingRow) {
      typingRow.remove();
      typingRow = null;
    }
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    });
  }

  // Notification (desktop)
  function showNotification(text) {
    if (!proactiveShown) {
      showProactive(text);
    }
  }

  // ─── Send message ──────────────────────────────────────────────────────────
  function sendMessage() {
    const text = inputEl.value.trim();
    if (!text) return;

    addMessage({ role: 'user', text });
    send({ type: 'user_message', text, sessionId });

    inputEl.value = '';
    inputEl.style.height = 'auto';
    updateSendBtn();
  }

  sendBtn.addEventListener('click', sendMessage);

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  inputEl.addEventListener('input', () => {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 80) + 'px';
    updateSendBtn();
  });

  function updateSendBtn() {
    if (inputEl.value.trim()) {
      sendBtn.classList.add('active');
    } else {
      sendBtn.classList.remove('active');
    }
  }

  // ─── Utils ─────────────────────────────────────────────────────────────────
  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/\n/g, '<br>');
  }

  // ─── Init ──────────────────────────────────────────────────────────────────
  connect();

  // Public API
  window.MadChat = window.MadChat || {};
  window.MadChat.open = openChat;
  window.MadChat.close = closeChat;
  window.MadChat.trigger = (text) => showProactive(text);

})();

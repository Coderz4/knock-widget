// widget.js — Drop-in chat widget (loads via <script src=...>)
// Renders a floating chat bubble. No iframe required.
(function () {
  const SCRIPT = document.currentScript;
  const API_URL = (SCRIPT && SCRIPT.getAttribute('data-api')) || '/api/chat';
  const TITLE = (SCRIPT && SCRIPT.getAttribute('data-title')) || 'FaithBot';
  const WELCOME = (SCRIPT && SCRIPT.getAttribute('data-welcome')) || 'Welcome! How are you doing today?';

  // --- Styles (scoped with fbw- prefix) ---
  const style = document.createElement('style');
  style.textContent = `
  .fbw-root{position:fixed;right:20px;bottom:20px;z-index:2147483647;font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,'Helvetica Neue',Arial,'Noto Sans',sans-serif}
  .fbw-btn{width:56px;height:56px;border-radius:9999px;border:0;background:#2563eb;color:#fff;cursor:pointer;box-shadow:0 8px 18px rgba(0,0,0,.15);font-size:22px}
  .fbw-panel{width:360px;height:520px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;box-shadow:0 12px 28px rgba(0,0,0,.18);display:none;flex-direction:column;overflow:hidden}
  .fbw-header{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#f8fafc;border-bottom:1px solid #eef2f7}
  .fbw-title{font-weight:600}
  .fbw-close{border:0;background:transparent;font-size:20px;cursor:pointer;color:#6b7280}
  .fbw-body{flex:1;overflow:auto;padding:12px;background:#ffffff}
  .fbw-row{margin:8px 0;display:flex}
  .fbw-msg{max-width:75%;padding:8px 10px;border-radius:10px;line-height:1.35;font-size:14px;white-space:pre-wrap}
  .fbw-bot{justify-content:flex-start}
  .fbw-bot .fbw-msg{background:#f3f4f6;color:#111827;border-top-left-radius:4px}
  .fbw-user{justify-content:flex-end}
  .fbw-user .fbw-msg{background:#e0ecff;color:#1f2937;border-top-right-radius:4px}
  .fbw-input{display:flex;border-top:1px solid #eef2f7}
  .fbw-input input{flex:1;border:0;padding:10px 12px;outline:none;font-size:14px}
  .fbw-send{border:0;background:#2563eb;color:#fff;padding:0 14px;font-weight:600;cursor:pointer}
  `;
  document.head.appendChild(style);

  // --- Root elements ---
  const root = document.createElement('div');
  root.className = 'fbw-root';
  const btn = document.createElement('button');
  btn.className = 'fbw-btn';
  btn.setAttribute('aria-label', 'Open chat');
  btn.textContent = '💬';
  const panel = document.createElement('div');
  panel.className = 'fbw-panel';

  // Header
  const header = document.createElement('div');
  header.className = 'fbw-header';
  const title = document.createElement('div');
  title.className = 'fbw-title';
  title.textContent = TITLE;
  const close = document.createElement('button');
  close.className = 'fbw-close';
  close.setAttribute('aria-label', 'Close');
  close.textContent = '×';
  header.appendChild(title);
  header.appendChild(close);

  // Body
  const body = document.createElement('div');
  body.className = 'fbw-body';

  // Input row
  const inputRow = document.createElement('div');
  inputRow.className = 'fbw-input';
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Type your message…';
  const sendBtn = document.createElement('button');
  sendBtn.className = 'fbw-send';
  sendBtn.textContent = 'Send';
  inputRow.appendChild(input);
  inputRow.appendChild(sendBtn);

  panel.appendChild(header);
  panel.appendChild(body);
  panel.appendChild(inputRow);
  root.appendChild(panel);
  root.appendChild(btn);
  document.body.appendChild(root);

  // --- Chat state ---
  const history = [];
  function addMessage(role, text) {
    const row = document.createElement('div');
    row.className = 'fbw-row ' + (role === 'bot' ? 'fbw-bot' : 'fbw-user');
    const bubble = document.createElement('div');
    bubble.className = 'fbw-msg';
    bubble.textContent = text;
    row.appendChild(bubble);
    body.appendChild(row);
    body.scrollTop = body.scrollHeight;
  }

  // Welcome on first open
  let openedOnce = false;
  function openPanel() {
    panel.style.display = 'flex';
    btn.style.display = 'none';
    if (!openedOnce) {
      addMessage('bot', WELCOME);
      openedOnce = true;
    }
    input.focus();
  }
  function closePanel() {
    panel.style.display = 'none';
    btn.style.display = 'inline-block';
  }

  btn.addEventListener('click', openPanel);
  close.addEventListener('click', closePanel);

  async function send() {
    const text = (input.value || '').trim();
    if (!text) return;
    input.value = '';
    addMessage('user', text);
    history.push({ role: 'user', content: text });

    // show typing
    const typingRow = document.createElement('div');
    typingRow.className = 'fbw-row fbw-bot';
    const typingBubble = document.createElement('div');
    typingBubble.className = 'fbw-msg';
    typingBubble.textContent = '…';
    typingRow.appendChild(typingBubble);
    body.appendChild(typingRow);
    body.scrollTop = body.scrollHeight;

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history })
      });
      const data = await res.json();
      body.removeChild(typingRow);

      const reply = data && (data.text || data.reply || data.message) || 'Sorry, something went wrong.';
      addMessage('bot', reply);
      history.push({ role: 'assistant', content: reply });
    } catch (e) {
      body.removeChild(typingRow);
      addMessage('bot', 'Network error. Please try again.');
    }
  }

  sendBtn.addEventListener('click', send);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') send();
  });
})();

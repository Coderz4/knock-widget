// api/chat.js — Vercel Serverless Function (structured JSON + text)
module.exports = async (req, res) => {
  // --- CORS ---
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  // Read JSON body
  let body = '';
  await new Promise((resolve) => {
    req.on('data', (c) => (body += c));
    req.on('end', resolve);
  });
  const { message, history = [] } = JSON.parse(body || '{}');

  // System prompt to force JSON
  const systemPrompt =
    "You are FaithBot, a warm, empathetic Christian coach. " +
    "When the user shares an issue, respond ONLY with a strict JSON object (no Markdown, no extra text) " +
    "with keys: topic (string), verses (array of {ref, text}), prayers (array of strings), " +
    "guidance (array of short strings), ask (string follow-up question). " +
    "Use KJV verse text unless the user asks otherwise. Provide 3–5 verses, 2–4 prayers, and 2–4 guidance bullets. " +
    "Keep each verse ≤ 45 words.";

  // Build request to OpenAI
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.7,
      messages: [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: `Issue: ${message}\n\nReturn ONLY JSON.` },
      ],
    }),
  });

  const data = await resp.json();
  const raw = data?.choices?.[0]?.message?.content ?? '';

  let structured = null;
  try { structured = JSON.parse(raw); } catch (_) {}

  // Make a readable fallback text from structured JSON if available
  function summarize(s) {
    if (!s) return raw || 'Sorry, I could not get a response.';
    const parts = [];
    if (s.guidance?.length) {
      parts.push('Here are a few thoughts:');
      s.guidance.forEach(g => parts.push(`• ${g}`));
    }
    if (s.verses?.length) {
      parts.push('\nBible verses:');
      s.verses.forEach(v => parts.push(`• ${v.ref}: ${v.text}`));
    }
    if (s.prayers?.length) {
      parts.push('\nPrayers you can declare:');
      s.prayers.forEach(p => parts.push(`• ${p}`));
    }
    if (s.ask) parts.push(`\n${s.ask}`);
    return parts.join('\n');
  }

  const text = summarize(structured);
  return res.status(200).json({ text, structured });
};

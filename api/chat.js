// api/chat.js  — Vercel Serverless Function (no iframe needed)
module.exports = async (req, res) => {
  // --- CORS (so your Weebly/Wix page can call this) ---
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  // Read JSON body safely
  let body = '';
  await new Promise((resolve) => {
    req.on('data', (c) => (body += c));
    req.on('end', resolve);
  });
  const { message, history = [] } = JSON.parse(body || '{}');

  const systemPrompt =
    "You are FaithBot, a warm, empathetic Christian coach. "
    + "Gently encourage the user. If they share a problem, provide: "
    + "1) 3–5 relevant Bible verses (book chapter:verse), "
    + "2) 2–4 short declarative prayers, "
    + "3) brief guidance (2–4 bullets). "
    + "Be concise. Ask a clarifying question if needed.";

  try {
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
          ...history, // [{role:'user'|'assistant', content:'...'}]
          { role: 'user', content: message || '' },
        ],
      }),
    });

    const data = await resp.json();
    const text =
      (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content)
      || 'Sorry, I could not get a response.';
    return res.status(200).json({ text });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'OpenAI request failed' });
  }
};

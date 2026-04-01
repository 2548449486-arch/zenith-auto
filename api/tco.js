// api/tco.js — Gemini TCO verdict
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { carA, carB, tcoA, tcoB, params, lang = 'zh' } = body;
    const OR_KEY = process.env.OPENROUTER_API_KEY;

    const fmt = n => '¥' + Math.round(n).toLocaleString();
    const prompt = lang === 'en'
      ? `Compare ${carA}(5yr TCO ${fmt(tcoA)}) vs ${carB}(5yr TCO ${fmt(tcoB)}), ${params.years}yr, ${params.km/10000}万km/yr, fuel¥${params.fuel}/L, elec¥${params.elec}/kWh. Give 70-char English verdict, data-first.`
      : `对比${carA}(${params.years}年总TCO ${fmt(tcoA)})和${carB}(总TCO ${fmt(tcoB)})，年行驶${params.km/10000}万km，油价¥${params.fuel}/L，电价¥${params.elec}/kWh。请用70字中文给出结论先行的建议，突出关键数字。`;

    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OR_KEY}`,
        'HTTP-Referer': 'https://zenith-auto.vercel.app',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
      }),
    });
    const d = await resp.json();
    const verdict = d.choices?.[0]?.message?.content || '';
    return res.status(200).json({ success: true, verdict });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
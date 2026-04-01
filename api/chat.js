// api/chat.js — Multi-tier AI chat (Qwen free / Claude Pro)
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { messages, tier = 'free', lang = 'zh' } = body;

    const QWEN_KEY = process.env.QWEN_API_KEY;
    const OR_KEY   = process.env.OPENROUTER_API_KEY;

    const SYSTEMS = {
      free_zh: '你是Zenith Auto α，中国顶级汽车精算师。简洁精准，结论先行，数据说话。专治4S套路。',
      pro_zh:  '你是Zenith Auto α专家版(Claude Sonnet驱动)，提供律师级汽车谈判策略。Markdown格式，含法律依据和成功率数据。每条话术都要可以直接说出口。',
      free_en: 'You are Zenith Auto Alpha, top automotive finance analyst. Be concise and data-driven.',
      pro_en:  'You are Zenith Auto Alpha Pro (Claude Sonnet). Provide lawyer-grade car negotiation scripts with legal basis and success rate data.',
      nego_zh: '你是一个中国4S店的销售顾问，正在与客户谈判。要像真实销售一样：有时强硬，有时妥协，会用各种话术。用第一人称扮演销售员，不要破坏角色。',
    };

    const sysKey = `${tier}_${lang}`;
    const system = SYSTEMS[sysKey] || SYSTEMS.free_zh;

    let result = '';

    if (tier === 'free') {
      const resp = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${QWEN_KEY}`,
        },
        body: JSON.stringify({
          model: 'qwen-plus',
          messages: [{ role: 'system', content: system }, ...messages],
          max_tokens: 700,
          temperature: 0.7,
        }),
      });
      const d = await resp.json();
      result = d.choices?.[0]?.message?.content || '';
    } else {
      const model = tier === 'nego' ? 'anthropic/claude-sonnet-4-5' : 'anthropic/claude-sonnet-4-5';
      const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OR_KEY}`,
          'HTTP-Referer': 'https://zenith-auto.vercel.app',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'system', content: system }, ...messages],
          max_tokens: 900,
        }),
      });
      const d = await resp.json();
      result = d.choices?.[0]?.message?.content || '';
    }

    return res.status(200).json({ success: true, content: result });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
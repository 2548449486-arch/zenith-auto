// api/analyze.js — Gemini Vision OCR for quote images
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { image, mimeType = 'image/jpeg', type = 'quote' } = body;
    if (!image) return res.status(400).json({ error: 'No image provided' });

    const prompts = {
      quote: `你是中国汽车4S店报价单专家。解析这张报价单图片，提取所有费用项目。
返回严格JSON（不要markdown代码块）：
{
  "carModel": "车型名称",
  "dealerName": "经销商名称（如有）",
  "totalPrice": 总价数字,
  "items": [
    {
      "name": "费用名称",
      "amount": 金额数字,
      "category": "danger或warning或ok",
      "reason": "一句话说明是否合理"
    }
  ]
}
category规则：danger=违规/强制/暴利收费，warning=偏高可议价，ok=合规正常费用。`,
      contract: `你是中国汽车消费法律专家。审查这份合同图片，找出所有对消费者不利的条款。
返回严格JSON：
{
  "riskLevel": "high/medium/low",
  "issues": [
    {
      "clause": "条款名称或位置",
      "risk": "风险描述",
      "severity": "danger/warning",
      "script": "可直接对经销商说的话"
    }
  ],
  "summary": "整体评价（50字内）"
}`
    };

    const OR_KEY = process.env.OPENROUTER_API_KEY;
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OR_KEY}`,
        'HTTP-Referer': 'https://zenith-auto.vercel.app',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${image}` } },
            { type: 'text', text: prompts[type] || prompts.quote }
          ]
        }],
        max_tokens: 1500,
      }),
    });

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || '{}';
    content = content.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim();

    try {
      const parsed = JSON.parse(content);
      return res.status(200).json({ success: true, data: parsed });
    } catch {
      return res.status(200).json({ success: true, raw: content, data: null });
    }
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
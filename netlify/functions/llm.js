// LLM 代理:轉發對話給 GitHub Models,金鑰只存在伺服器環境變數
export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (!process.env.GH_MODELS_TOKEN) return new Response('{"error":"GH_MODELS_TOKEN not set"}', { status: 500 });
  const r = await fetch('https://models.inference.ai.azure.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GH_MODELS_TOKEN}`
    },
    body: await req.text()
  });
  return new Response(await r.text(), { status: r.status, headers: { 'content-type': 'application/json' } });
};

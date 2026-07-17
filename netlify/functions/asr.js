// 語音轉文字代理:轉發音訊給 Groq Whisper,金鑰只存在伺服器環境變數
export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (!process.env.GROQ_API_KEY) return new Response('{"error":"GROQ_API_KEY not set"}', { status: 500 });
  const buf = await req.arrayBuffer();
  const fd = new FormData();
  fd.append('file', new Blob([buf], { type: req.headers.get('content-type') || 'audio/webm' }), 'voice.webm');
  fd.append('model', 'whisper-large-v3');
  const r = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: fd
  });
  return new Response(await r.text(), { status: r.status, headers: { 'content-type': 'application/json' } });
};

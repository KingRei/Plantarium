# Cloudflare AI 代理設定指南

把 AI 金鑰從瀏覽器搬到 Cloudflare,並取得集中管理、速率限制與用量分析。

架構:`瀏覽器 → Cloudflare Worker → AI Gateway → Groq / GitHub Models`
網站本身可以繼續放在 Netlify,只有 AI 請求走 Cloudflare。

---

## 一、建立 AI Gateway

1. Cloudflare 儀表板 → 左側 **AI** → **AI Gateway** → **Create Gateway**
2. 名稱填 `stargzr`,建立後記下:
   - **Account ID**(網址列或 Gateway 頁面上)
   - **Gateway ID**(就是 `stargzr`)
3. 進入該 Gateway 的 **Settings**:
   - 開啟 **Authenticated Gateway** → 產生一組 token,記下來(下面的 `CF_AIG_TOKEN`)
   - 這樣別人就算知道你的 Gateway 網址也叫不動

## 二、金鑰放哪裡(二選一)

**A. 存在 AI Gateway(推薦,你要的「一處管理、隨時拿掉」)**

Gateway → **Provider Keys** → **Add API Key** → 分別加入 Groq 與 Azure OpenAI(GitHub Models 相容)的金鑰。
金鑰由 Cloudflare Secrets Store 保管,之後在儀表板即可輪替或刪除,Worker 完全不必知道金鑰。

**B. 存在 Worker Secrets**

若你偏好金鑰留在 Worker,跳過 Provider Keys,改用第三步的 `wrangler secret put`。

## 三、部署 Worker

```bash
npm install -g wrangler          # 或用 npx
wrangler login

# 編輯 wrangler.toml：填入 CF_ACCOUNT_ID、CF_GATEWAY_ID、ALLOWED_ORIGINS
wrangler secret put CF_AIG_TOKEN        # 第一步產生的 token

# 只有選擇方案 B 才需要這兩個：
wrangler secret put GROQ_API_KEY
wrangler secret put GH_MODELS_TOKEN

wrangler deploy
```

部署完會得到網址,例如 `https://stargzr-ai.你的帳號.workers.dev`。

## 四、接上前端

打開 `celestial-simulator.js`,找到最上方的:

```js
const AI_PROXY_BASE='';
```

改成你的 Worker 網址:

```js
const AI_PROXY_BASE='https://stargzr-ai.你的帳號.workers.dev';
```

留空則沿用同網域的 Netlify Functions。兩者皆失敗時,前端仍會退回「請使用者自備金鑰」模式。

同時把 `wrangler.toml` 的 `ALLOWED_ORIGINS` 設成你的網站網址,避免別人盜用你的 Worker。

## 五、日常管理(這是改用 Cloudflare 的主要理由)

在 AI Gateway 儀表板可以:

| 功能 | 用途 |
|---|---|
| **Analytics** | 請求數、token 數、每個 provider 的花費 |
| **Logs** | 逐筆看到使用者說了什麼、模型回了什麼、耗時多久 |
| **Rate limiting** | 例如「每分鐘 10 次」,防止被刷爆 |
| **Spend limits** | 設定金額上限,到頂自動停止 |
| **Caching** | 相同請求直接回快取,省錢又快 |
| **Provider Keys** | 隨時輪替或**直接刪除金鑰**——服務立刻停用 |
| **Guardrails** | 過濾不當內容 |

你要的「用太兇就從後台拿掉」= 刪掉 Provider Key,或把 Rate limit 調到 0。
前端偵測到代理失效會自動退回本機金鑰模式,不會壞掉。

---

## 附註:端點對照

Worker 內部把請求轉給 AI Gateway:

- Groq:`https://api.groq.com/openai/v1` → `https://gateway.ai.cloudflare.com/v1/{account}/{gateway}/groq`
- GitHub Models(Azure OpenAI 相容):→ `.../azure-openai/chat/completions`

若你之後想換模型供應商(Anthropic、Google、OpenAI…),AI Gateway 支援 20 家以上,只要改 Worker 裡的一段路徑即可。

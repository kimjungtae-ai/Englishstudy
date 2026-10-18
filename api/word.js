// GET /api/word?w=transport → 어원 카드 JSON
// API 키는 Vercel 환경 변수 ANTHROPIC_API_KEY 에만 있고, 브라우저로는 절대 나가지 않음.
// 단어 하나만 받고 프롬프트는 서버에서 만들기 때문에, 이 주소를 아무 질문이나 하는 데 쓸 수는 없음.
const { Anthropic } = require("@anthropic-ai/sdk");
const { buildPrompt } = require("../prompt.js");

const WORD = /^[a-z][a-z\-']{1,30}$/;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "https://kimjungtae-ai.github.io")
  .split(",").map(s => s.trim()).filter(Boolean);
const PER_HOUR = Number(process.env.RATE_LIMIT_PER_HOUR || 30);

// 같은 서버 인스턴스 안에서만 세는 간단한 제한 (IP당 1시간에 PER_HOUR번).
// 진짜 비용 상한은 Anthropic Console의 월 사용 한도로 걸어 둘 것.
const hits = new Map();
function limited(ip) {
  const now = Date.now(), hour = 3600e3;
  const list = (hits.get(ip) || []).filter(t => now - t < hour);
  if (list.length >= PER_HOUR) { hits.set(ip, list); return true; }
  list.push(now); hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return false;
}

let client;
const send = (res, status, body) => { res.statusCode = status; res.setHeader("content-type", "application/json; charset=utf-8"); res.end(JSON.stringify(body)); };

module.exports = async (req, res) => {
  const origin = req.headers.origin;
  res.setHeader("Vary", "Origin");
  if (origin && ALLOWED_ORIGINS.includes(origin)) res.setHeader("Access-Control-Allow-Origin", origin);
  if (req.method === "OPTIONS") { res.setHeader("Access-Control-Allow-Methods", "GET"); res.statusCode = 204; return res.end(); }
  if (req.method !== "GET") return send(res, 405, { code: "api_error" });

  const w = String((req.query && req.query.w) || new URL(req.url, "http://x").searchParams.get("w") || "").trim().toLowerCase();
  if (!WORD.test(w)) return send(res, 400, { code: "bad_word" });
  if (!process.env.ANTHROPIC_API_KEY) return send(res, 503, { code: "server_not_ready" });
  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "?";
  if (limited(ip)) return send(res, 429, { code: "rate_limited" });

  client = client || new Anthropic();
  let msg;
  try {
    msg = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      output_config: { effort: "low" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      messages: [{ role: "user", content: buildPrompt(w) }]
    });
  } catch (e) {
    console.error("anthropic error", e && e.status, e && e.message);
    return send(res, e instanceof Anthropic.RateLimitError ? 429 : 502, { code: e instanceof Anthropic.RateLimitError ? "rate_limited" : "api_error" });
  }
  if (msg.stop_reason === "refusal") return send(res, 422, { code: "refused" });

  const text = (msg.content || []).filter(b => b.type === "text").map(b => b.text).join("");
  const a = text.indexOf("{"), b = text.lastIndexOf("}");
  let data;
  try { data = JSON.parse(text.slice(a, b + 1)); } catch (e) { return send(res, 502, { code: "invalid_json" }); }
  if (a < 0 || !data || typeof data !== "object") return send(res, 502, { code: "invalid_json" });

  // 같은 단어는 Vercel CDN이 30일 동안 저장해 두었다가 바로 돌려줌 → API 비용 절약
  if (!data.error) res.setHeader("Cache-Control", "public, s-maxage=2592000, stale-while-revalidate=86400");
  return send(res, 200, data);
};

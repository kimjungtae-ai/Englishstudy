// GET /api/word?w=transport → 어원 카드 JSON
// API 키는 Vercel 환경 변수(GEMINI_API_KEY 또는 ANTHROPIC_API_KEY)에만 있고, 브라우저로는 절대 나가지 않음.
// 단어 하나만 받고 프롬프트는 서버에서 만들기 때문에, 이 주소를 아무 질문이나 하는 데 쓸 수는 없음.
// 미리 만든 사전(data/words/*.json)에 있는 단어는 화면이 먼저 찾아 보여 주므로 여기까지 오지 않음.
const { generateWord, pickProvider } = require("../lib/generate.js");

const WORD = /^[a-z][a-z\-']{1,30}$/;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "https://kimjungtae-ai.github.io")
  .split(",").map(s => s.trim()).filter(Boolean);
const PER_HOUR = Number(process.env.RATE_LIMIT_PER_HOUR || 30);

// 같은 서버 인스턴스 안에서만 세는 간단한 제한 (IP당 1시간에 PER_HOUR번).
const hits = new Map();
function limited(ip) {
  const now = Date.now(), hour = 3600e3;
  const list = (hits.get(ip) || []).filter(t => now - t < hour);
  if (list.length >= PER_HOUR) { hits.set(ip, list); return true; }
  list.push(now); hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return false;
}

const send = (res, status, body) => { res.statusCode = status; res.setHeader("content-type", "application/json; charset=utf-8"); res.end(JSON.stringify(body)); };

module.exports = async (req, res) => {
  const origin = req.headers.origin;
  res.setHeader("Vary", "Origin");
  if (origin && ALLOWED_ORIGINS.includes(origin)) res.setHeader("Access-Control-Allow-Origin", origin);
  if (req.method === "OPTIONS") { res.setHeader("Access-Control-Allow-Methods", "GET"); res.statusCode = 204; return res.end(); }
  if (req.method !== "GET") return send(res, 405, { code: "api_error" });

  const w = String((req.query && req.query.w) || new URL(req.url, "http://x").searchParams.get("w") || "").trim().toLowerCase();
  if (!WORD.test(w)) return send(res, 400, { code: "bad_word" });
  if (!pickProvider()) return send(res, 503, { code: "server_not_ready" });
  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "?";
  if (limited(ip)) return send(res, 429, { code: "rate_limited" });

  let data;
  try { data = await generateWord(w); }
  catch (e) {
    console.error("generate error", w, e && e.message);
    const code = (e && e.code) || "api_error";
    return send(res, code === "rate_limited" ? 429 : code === "refused" ? 422 : 502, { code });
  }

  // 같은 단어는 Vercel CDN이 30일 동안 저장해 두었다가 바로 돌려줌 → API 사용량 절약
  if (!data.error) res.setHeader("Cache-Control", "public, s-maxage=2592000, stale-while-revalidate=86400");
  return send(res, 200, data);
};

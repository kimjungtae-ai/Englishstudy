// 단어 하나 → 어원 카드 JSON. 서버 함수(api/word.js)와 사전 만들기 스크립트(scripts/build-dictionary.js)가 함께 씀.
// 키는 환경 변수에만 있음:
//   GEMINI_API_KEY    → Google Gemini (무료 등급 가능, 기본 선택)
//   ANTHROPIC_API_KEY → Claude. 이 칸에 Gemini 키(AIza…)를 넣어도 Gemini로 알아서 보냄.
const { buildPrompt } = require("../prompt.js");

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-5-5";

function pickProvider() {
  const g = process.env.GEMINI_API_KEY, a = process.env.ANTHROPIC_API_KEY;
  if (g) return { name: "gemini", key: g.trim() };
  if (a && /^AIza/.test(a.trim())) return { name: "gemini", key: a.trim() };
  if (a) return { name: "claude", key: a.trim() };
  return null;
}

class GenError extends Error {
  constructor(code, detail) { super(code + (detail ? ": " + detail : "")); this.code = code; }
}

// Gemini가 JSON 모양을 지키도록 거는 형식. 이 형식 덕분에 따옴표가 섞여도 JSON이 깨지지 않음.
const S = { type: "STRING" };
const SCHEMA = {
  type: "OBJECT",
  properties: {
    error: S, word: S, pos: S, meaning: S,
    certainty: { type: "STRING", enum: ["high", "low"] },
    parts: { type: "ARRAY", items: { type: "OBJECT", properties: {
      text: S, type: { type: "STRING", enum: ["prefix", "root", "suffix"] }, origin: S, meaning: S
    }, required: ["text", "type", "origin", "meaning"] } },
    rootTalk: S, history: S,
    derivatives: { type: "ARRAY", items: { type: "OBJECT", properties: {
      word: S, meaning: S, example: S, exampleKo: S
    }, required: ["word", "meaning", "example", "exampleKo"] } },
    synonyms: { type: "ARRAY", items: S },
    antonyms: { type: "ARRAY", items: S },
    phrases: { type: "ARRAY", items: S },
    imageSvg: S,
    story: { type: "OBJECT", properties: { title: S, text: S }, required: ["title", "text"] }
  },
  required: ["error", "word", "pos", "meaning", "certainty", "parts", "rootTalk", "history",
    "derivatives", "synonyms", "antonyms", "phrases", "imageSvg", "story"],
  propertyOrdering: ["error", "word", "pos", "meaning", "certainty", "parts", "rootTalk", "history",
    "derivatives", "synonyms", "antonyms", "phrases", "story", "imageSvg"]
};

async function callGemini(key, prompt, signal) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`;
  const body = (thinking) => JSON.stringify({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: SCHEMA,
      maxOutputTokens: 8192,
      ...(thinking ? { thinkingConfig: { thinkingLevel: "low" } } : {})
    }
  });
  const post = (thinking) => fetch(url, {
    method: "POST", signal,
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: body(thinking)
  });
  let r = await post(true);
  // 생각 수준 설정을 모르는 모델이면 설정 없이 한 번 더
  if (r.status === 400) {
    const t = await r.text();
    if (/thinking/i.test(t)) r = await post(false);
    else throw new GenError("api_error", "gemini 400 " + t.slice(0, 300));
  }
  if (r.status === 429) throw new GenError("rate_limited", "gemini 429");
  if (!r.ok) throw new GenError("api_error", "gemini " + r.status + " " + (await r.text()).slice(0, 300));
  const d = await r.json();
  if (d.promptFeedback && d.promptFeedback.blockReason) throw new GenError("refused", d.promptFeedback.blockReason);
  const c = d.candidates && d.candidates[0];
  if (!c) throw new GenError("api_error", "gemini: no candidate");
  if (c.finishReason === "SAFETY") throw new GenError("refused", "SAFETY");
  return ((c.content && c.content.parts) || []).filter(p => !p.thought && typeof p.text === "string").map(p => p.text).join("");
}

let anthropic;
async function callClaude(key, prompt) {
  const { Anthropic } = require("@anthropic-ai/sdk");
  anthropic = anthropic || new Anthropic({ apiKey: key });
  let msg;
  try {
    msg = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 8000,
      messages: [{ role: "user", content: prompt }]
    });
  } catch (e) {
    throw new GenError(e instanceof Anthropic.RateLimitError ? "rate_limited" : "api_error", e && e.message);
  }
  if (msg.stop_reason === "refusal") throw new GenError("refused");
  return (msg.content || []).filter(b => b.type === "text").map(b => b.text).join("");
}

function parse(text) {
  const a = text.indexOf("{"), b = text.lastIndexOf("}");
  if (a < 0 || b < a) throw new GenError("invalid_json");
  let d;
  try { d = JSON.parse(text.slice(a, b + 1)); } catch (e) { throw new GenError("invalid_json"); }
  if (!d || typeof d !== "object") throw new GenError("invalid_json");
  if (d.error) return { error: String(d.error) };
  delete d.error;
  if (!d.word || !Array.isArray(d.parts) || !d.parts.length || !Array.isArray(d.derivatives)) throw new GenError("invalid_json");
  d.word = String(d.word).toLowerCase();
  return d;
}

// 형식이 깨진 답은 한 번 더 시도
async function generateWord(w, { signal } = {}) {
  const p = pickProvider();
  if (!p) throw new GenError("server_not_ready");
  const prompt = buildPrompt(w);
  for (let i = 0; ; i++) {
    const text = p.name === "gemini" ? await callGemini(p.key, prompt, signal) : await callClaude(p.key, prompt);
    try { return Object.assign(parse(text), { source: p.name }); }
    catch (e) { if (i >= 1 || e.code !== "invalid_json") throw e; }
  }
}

module.exports = { generateWord, pickProvider, GenError };

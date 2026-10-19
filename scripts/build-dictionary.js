// 수능 단어 사전 미리 만들기.
// data/wordlist.txt 의 단어마다 어원 카드를 만들어 data/words/<단어>.json 으로 저장함.
// 이미 만든 단어는 건너뛰므로, 무료 한도에 걸려 멈춰도 다음에 다시 돌리면 이어서 만듦.
//
//   GEMINI_API_KEY=... node scripts/build-dictionary.js
//   (선택) LIMIT=500  이번에 만들 최대 단어 수
//   (선택) DELAY_MS=7000  요청 사이 간격. 무료 등급 분당 한도에 맞춘 값
const fs = require("fs");
const path = require("path");
const { generateWord, pickProvider } = require("../lib/generate.js");

const ROOT = path.join(__dirname, "..");
const LIST = path.join(ROOT, "data", "wordlist.txt");
const OUT = path.join(ROOT, "data", "words");
const LIMIT = Number(process.env.LIMIT || 1e9);
const DELAY = Number(process.env.DELAY_MS || 7000);
const WORD = /^[a-z][a-z\-']{1,30}$/;
const sleep = ms => new Promise(r => setTimeout(r, ms));

function readList() {
  const seen = new Set();
  for (const line of fs.readFileSync(LIST, "utf8").split(/\r?\n/)) {
    const w = line.replace(/#.*/, "").trim().toLowerCase();
    if (!w) continue;
    if (!WORD.test(w)) { console.warn("건너뜀(영어 단어 형식 아님):", w); continue; }
    seen.add(w);
  }
  return [...seen];
}

function writeIndex() {
  const words = fs.readdirSync(OUT).filter(f => f.endsWith(".json") && f !== "index.json").map(f => f.slice(0, -5)).sort();
  fs.writeFileSync(path.join(OUT, "index.json"), JSON.stringify(words) + "\n");
  return words.length;
}

async function main() {
  if (!pickProvider()) { console.error("GEMINI_API_KEY(또는 ANTHROPIC_API_KEY)가 없어요."); process.exit(1); }
  fs.mkdirSync(OUT, { recursive: true });
  const todo = readList().filter(w => !fs.existsSync(path.join(OUT, w + ".json")));
  console.log(`목록에서 아직 안 만든 단어 ${todo.length}개, 이번에 최대 ${Math.min(LIMIT, todo.length)}개 만듦`);
  let made = 0, failed = [];
  for (const w of todo) {
    if (made >= LIMIT) break;
    let tries = 0;
    for (;;) {
      try {
        const d = await generateWord(w);
        if (d.error) { console.warn(w, "→", d.error); failed.push(w); break; }
        delete d.source;
        fs.writeFileSync(path.join(OUT, w + ".json"), JSON.stringify(d, null, 1) + "\n");
        made++; console.log(`[${made}] ${w}`);
        break;
      } catch (e) {
        tries++;
        if (e.code === "rate_limited" && tries <= 3) { console.warn(w, "한도에 걸림, 1분 쉼"); await sleep(60e3); continue; }
        if (e.code === "rate_limited") { console.warn("하루 한도에 다 쓴 것 같아요. 여기서 멈추고 다음에 이어서 만들어요."); return finish(made, failed); }
        if (tries <= 1) { await sleep(DELAY); continue; }
        console.warn(w, "실패:", e.message); failed.push(w); break;
      }
    }
    await sleep(DELAY);
  }
  finish(made, failed);
}

function finish(made, failed) {
  const total = writeIndex();
  console.log(`이번에 ${made}개 만듦, 사전 전체 ${total}개` + (failed.length ? `, 실패 ${failed.length}개: ${failed.join(", ")}` : ""));
}

main().catch(e => { console.error(e); process.exit(1); });

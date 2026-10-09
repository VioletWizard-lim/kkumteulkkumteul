// 단어장 예문의 한국어 뜻을 만들어 js/data/examples-ko.js 에 저장합니다.
// GitHub Actions(.github/workflows/translate-examples.yml)에서 실행돼요.
// - 이미 번역된 예문은 건너뛰고, 새로 추가된 예문만 번역해요.
// - 무료 번역(Google 번역 공개 주소, 실패하면 MyMemory)을 써서 API 키가 필요 없어요.
// - 손으로 고친 번역은 그대로 유지돼요. (파일의 해당 줄만 고치면 다시 덮어쓰지 않음)

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const OUT = process.env.EXAMPLES_OUT || path.join(root, "js", "data", "examples-ko.js");
const UA = "Mozilla/5.0 (compatible; KkumteulTranslateBot/1.0)";
const TRANSLATE_URL = process.env.TRANSLATE_URL || "https://translate.googleapis.com/translate_a/single";
const MYMEMORY_URL = process.env.MYMEMORY_URL || "https://api.mymemory.translated.net/get";
const BATCH = 25;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// index.html 에 적힌 순서대로 단어장 파일을 읽어 예문을 모아요.
function loadExamples() {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const files = [...html.matchAll(/js\/data\/(words[^"]*\.js)/g)].map((m) => m[1]);
  const ctx = { window: {} };
  vm.createContext(ctx);
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(root, "js", "data", f), "utf8"), ctx);
  const set = new Set();
  for (const bank of Object.values(ctx.window.WORD_BANKS)) for (const w of bank.words) if (w[2]) set.add(w[2]);
  return [...set];
}

function loadExisting() {
  if (!fs.existsSync(OUT)) return {};
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(OUT, "utf8"), ctx);
  return ctx.window.EXAMPLE_KO || {};
}

async function google(lines) {
  const params = new URLSearchParams({ client: "gtx", sl: "en", tl: "ko", dt: "t" });
  const res = await fetch(`${TRANSLATE_URL}?${params}`, {
    method: "POST",
    headers: { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: new URLSearchParams({ q: lines.join("\n") }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`google HTTP ${res.status}`);
  const data = await res.json();
  const out = (data[0] || []).map((s) => s[0] || "").join("").split("\n").map((s) => s.trim());
  if (out.length !== lines.length || out.some((s) => !s)) throw new Error(`google: got ${out.length} lines for ${lines.length}`);
  return out;
}

async function myMemory(line) {
  const params = new URLSearchParams({ q: line, langpair: "en|ko" });
  const res = await fetch(`${MYMEMORY_URL}?${params}`, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`mymemory HTTP ${res.status}`);
  const data = await res.json();
  if (String(data.responseStatus) !== "200") throw new Error(`mymemory: ${data.responseDetails}`);
  return String(data.responseData?.translatedText || "").trim();
}

async function translateBatch(lines) {
  try {
    return await google(lines);
  } catch (e) {
    console.warn(`[batch] ${e.message} → 한 줄씩 다시 시도`);
  }
  const out = [];
  for (const line of lines) {
    let ko = "";
    try { ko = (await google([line]))[0]; } catch {
      try { ko = await myMemory(line); } catch (e) { console.warn(`[skip] ${line}: ${e.message}`); }
    }
    out.push(ko);
    await sleep(300);
  }
  return out;
}

function write(map, order) {
  const keys = order.filter((k) => map[k]);
  const body = keys.map((k) => `  ${JSON.stringify(k)}: ${JSON.stringify(map[k])}`).join(",\n");
  fs.writeFileSync(OUT,
    "// 단어장 예문의 한국어 뜻 (자동 번역: scripts/translate-examples.mjs)\n" +
    "// 어색한 번역은 이 파일에서 직접 고쳐도 돼요. 고친 줄은 다시 덮어쓰지 않아요.\n" +
    "window.EXAMPLE_KO = {\n" + body + "\n};\n");
}

const examples = loadExamples();
const map = loadExisting();
const todo = examples.filter((e) => !map[e]);
console.log(`[info] 예문 ${examples.length}개 중 번역할 것 ${todo.length}개`);
let done = 0;
for (let i = 0; i < todo.length; i += BATCH) {
  const lines = todo.slice(i, i + BATCH);
  const ko = await translateBatch(lines);
  lines.forEach((l, j) => { if (ko[j]) { map[l] = ko[j]; done++; } });
  if ((i / BATCH) % 10 === 0) { write(map, examples); console.log(`[progress] ${Math.min(i + BATCH, todo.length)}/${todo.length}`); }
  await sleep(500);
}
write(map, examples);
console.log(`[done] 새로 번역 ${done}개, 전체 ${Object.keys(map).filter((k) => examples.includes(k)).length}/${examples.length}개`);

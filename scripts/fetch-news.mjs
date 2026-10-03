// 핀란드 교육 뉴스를 RSS에서 찾아 data/live-news.json 에 저장합니다.
// GitHub Actions 에서 매일 실행됩니다 (.github/workflows/news.yml).
//
// - news-sources.json 의 RSS 에서 교육 관련 키워드가 들어간 새 기사를 고릅니다.
// - 최근 기사가 없으면 fallback 소스(더 오래된 기사까지 검색)에서 아직 저장하지 않은 기사를 찾습니다.
// - fullText 가 켜진 소스는 기사 페이지에서 본문을 추출합니다 (Mozilla Readability).
// - ANTHROPIC_API_KEY 가 있으면 Claude 로 한국어 제목·요약·핵심 단어를 만듭니다.
// - 제목·요약·본문은 무료 번역(Google 번역 공개 주소 → 실패 시 MyMemory)으로 한국어 번역을 붙입니다.
//   API 키가 필요 없고, 번역에 실패하면 영어만 저장합니다. 이미 저장된 기사도 번역이 없으면 채웁니다.
//
// 환경 변수
//   ANTHROPIC_API_KEY  (선택) 한국어 요약용
//   NEWS_PER_RUN       한 번에 추가할 기사 수 (기본 1, 처음 실행 시 3)
//   NEWS_SOURCES       소스 설정 파일 경로 (기본 scripts/news-sources.json)
//   NEWS_OUTPUT        저장 파일 경로 (기본 data/live-news.json)

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import Parser from "rss-parser";
import { JSDOM, VirtualConsole } from "jsdom";
import { Readability } from "@mozilla/readability";
import Anthropic from "@anthropic-ai/sdk";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const SOURCES_FILE = process.env.NEWS_SOURCES || path.join(here, "news-sources.json");
const OUTPUT_FILE = process.env.NEWS_OUTPUT || path.join(root, "data", "live-news.json");
const USER_AGENT = "Mozilla/5.0 (compatible; KkumteulNewsBot/1.0; +https://github.com/VioletWizard-lim/kkumteulkkumteul)";
const DEFAULT_MAX_AGE_DAYS = 10;
const MIN_BODY_CHARS = 400;

const config = JSON.parse(fs.readFileSync(SOURCES_FILE, "utf8"));
// 전체 스위치: false 면 어떤 소스든 기사 본문을 저장하지 않습니다 (저작권 보호).
const STORE_FULL_TEXT = config.storeFullText !== false;

function readExisting() {
  try {
    const data = JSON.parse(fs.readFileSync(OUTPUT_FILE, "utf8"));
    return Array.isArray(data.items) ? data.items : [];
  } catch {
    return [];
  }
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
const keywordRe = new RegExp("\\b(" + config.keywords.map(escapeRegExp).join("|") + ")\\b", "gi");
const SKIP_TITLE_RE = /^(video|podcast|live|watch)\b|podcast|this week in finland|news in brief/i;

// 제목에 교육 키워드가 있거나, 요약·분류에 서로 다른 교육 키워드가 2개 이상 있어야 교육 기사로 봅니다.
function isEducationArticle(title, text) {
  if (SKIP_TITLE_RE.test(title)) return false;
  if ((title.match(keywordRe) || []).length) return true;
  const hits = new Set((text.match(keywordRe) || []).map((k) => k.toLowerCase()));
  return hits.size >= 2;
}

function normTitle(t) {
  return t.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function idFor(url) {
  return "live-" + crypto.createHash("sha1").update(url).digest("hex").slice(0, 10);
}

async function fetchText(url, timeoutMs = 20000) {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" },
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return { text: await res.text(), finalUrl: res.url || url };
}

// 한국 시간 기준 날짜 (YYYY-MM-DD)
function seoulDate() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
}

// RSS 에서 후보 기사 모으기
async function collectCandidates(existing, feeds) {
  const parser = new Parser();
  const seenUrls = new Set(existing.map((i) => i.url));
  const seenTitles = new Set(existing.map((i) => normTitle(i.title)));
  const candidates = [];

  for (const [priority, feed] of feeds.entries()) {
    const cutoff = Date.now() - (feed.maxAgeDays || DEFAULT_MAX_AGE_DAYS) * 86400000;
    let parsed;
    try {
      const { text } = await fetchText(feed.url);
      parsed = await parser.parseString(text);
    } catch (e) {
      console.warn(`[skip] ${feed.name}: ${e.message}`);
      continue;
    }
    let matched = 0;
    for (const item of parsed.items || []) {
      if (!item.link || !item.title) continue;
      let title = item.title.trim();
      let source = feed.name;
      // Google News 제목은 "제목 - 언론사" 형식
      if (/news\.google\./.test(feed.url)) {
        const m = title.match(/^(.*) - ([^-]+)$/);
        if (m) { title = m[1].trim(); source = m[2].trim(); }
      }
      let snippet = (item.contentSnippet || item.content || "").replace(/\s+/g, " ").trim();
      // Google News 요약 끝에 붙는 언론사 이름 제거
      if (snippet.endsWith(source)) snippet = snippet.slice(0, -source.length).trim();
      const categories = (item.categories || []).map((c) => (typeof c === "string" ? c : c?._ || "")).join(" ");
      if (!isEducationArticle(title, `${snippet} ${categories}`)) continue;
      const published = item.isoDate || (item.pubDate ? new Date(item.pubDate).toISOString() : null);
      if (published && Date.parse(published) < cutoff) continue;
      if (seenUrls.has(item.link) || seenTitles.has(normTitle(title))) continue;
      matched++;
      candidates.push({ priority, feed, title, source, url: item.link, published, snippet });
    }
    console.log(`[feed] ${feed.name}: ${parsed.items?.length || 0} items, ${matched} education matches`);
  }

  candidates.sort((a, b) => a.priority - b.priority || Date.parse(b.published || 0) - Date.parse(a.published || 0));
  return candidates;
}

// 기사 페이지에서 본문 문단 추출
async function extractBody(url) {
  const { text, finalUrl } = await fetchText(url);
  const dom = new JSDOM(text, { url: finalUrl, virtualConsole: new VirtualConsole() });
  const article = new Readability(dom.window.document).parse();
  if (!article?.content) return [];
  const doc = new JSDOM(article.content).window.document;
  const paragraphs = [...doc.querySelectorAll("p, h2, h3, li")]
    .filter((el) => !el.querySelector("p, li"))
    .map((el) => el.textContent.replace(/\s+/g, " ").trim())
    .filter((t) => t.length > 30);
  const seen = new Set([normTitle(article.title || "")]);
  const unique = paragraphs.filter((p) => (seen.has(normTitle(p)) ? false : (seen.add(normTitle(p)), true)));
  return unique.join(" ").length >= MIN_BODY_CHARS ? unique : [];
}

// Google News RSS 링크(news.google.com/rss/articles/…)를 실제 언론사 기사 주소로 바꿉니다.
// 기사 페이지에 들어 있는 서명(data-n-a-sg)과 시각(data-n-a-ts)으로 Google 내부 API 를 호출합니다.
// 실패하면 null 을 돌려주고, 그 기사는 본문 없이 요약만 저장됩니다.
const GNEWS_BASE = process.env.GNEWS_BASE || "https://news.google.com";
async function resolveGoogleNewsUrl(url) {
  const m = url.match(/news\.google\.com\/(?:rss\/)?articles\/([^?/#]+)/);
  if (!m) return null;
  const id = m[1];
  try {
    const { text } = await fetchText(`${GNEWS_BASE}/articles/${id}`);
    const sig = text.match(/data-n-a-sg="([^"]+)"/)?.[1];
    const ts = text.match(/data-n-a-ts="([^"]+)"/)?.[1];
    if (!sig || !ts) throw new Error("signature not found");
    const inner = JSON.stringify([
      "garturlreq",
      [["X", "X", ["X", "X"], null, null, 1, 1, "US:en", null, 1, null, null, null, null, null, 0, 1], "X", "X", 1, [1, 1, 1], 1, 1, null, 0, 0, null, 0],
      id,
      Number(ts),
      sig,
    ]);
    const res = await fetch(`${GNEWS_BASE}/_/DotsSplashUi/data/batchexecute`, {
      method: "POST",
      headers: { "User-Agent": USER_AGENT, "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: new URLSearchParams({ "f.req": JSON.stringify([[["Fbv4je", inner, null, "generic"]]]) }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(`batchexecute HTTP ${res.status}`);
    const raw = await res.text();
    const payload = JSON.parse(raw.slice(raw.indexOf("\n\n") + 2));
    const decoded = JSON.parse(payload[0][2])[1];
    if (typeof decoded !== "string" || !/^https?:\/\//.test(decoded)) throw new Error("no url in response");
    return decoded;
  } catch (e) {
    console.warn(`[gnews] could not resolve ${id.slice(0, 20)}…: ${e.message}`);
    return null;
  }
}

function englishSummary(body, snippet) {
  // 소제목·캡션처럼 문장으로 끝나지 않는 문단은 요약에서 뺍니다.
  const sentencesOnly = body.filter((p) => /[.!?]["'”’)]?$/.test(p));
  const text = sentencesOnly.length ? sentencesOnly.slice(0, 4).join(" ") : snippet;
  const sentences = text.match(/[^.!?]+[.!?]+(\s|$)/g) || (text ? [text] : []);
  return sentences.slice(0, 3).map((s) => s.trim());
}

// Claude 로 한국어 제목·요약·핵심 단어 만들기
const enrichSchema = {
  type: "object",
  properties: {
    titleKo: { type: "string", description: "기사 제목의 자연스러운 한국어 번역" },
    tag: { type: "string", description: "2~5글자 한국어 분류 (예: 교사, 학교생활, 교육 정책, 대학, 유아교육)" },
    summaryKo: { type: "array", items: { type: "string" }, description: "한국어 요약 3~4문장, 해요체" },
    words: {
      type: "array",
      description: "기사에 나온 중상급 영어 단어·표현 5개",
      items: {
        type: "object",
        properties: { en: { type: "string" }, ko: { type: "string" } },
        required: ["en", "ko"],
        additionalProperties: false,
      },
    },
  },
  required: ["titleKo", "tag", "summaryKo", "words"],
  additionalProperties: false,
};

async function enrichWithClaude(item) {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const client = new Anthropic();
  const articleText = item.body.length ? item.body.join("\n\n") : item.snippet;
  const response = await client.beta.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema: enrichSchema },
    },
    system:
      "당신은 핀란드 연수를 준비하는 20대 후반~30대 한국 교사들을 위해 영어 교육 뉴스를 정리합니다. " +
      "요약은 기사에 있는 사실만 담아 한국어 해요체로 3~4문장을 씁니다. " +
      "words 에는 기사 본문에 실제로 나온 표현 중 교사들이 회화에 쓸 만한 중상급 단어·구동사·연어 5개를 고르고 한국어 뜻을 붙입니다.",
    messages: [
      {
        role: "user",
        content: `Title: ${item.title}\nSource: ${item.source}\n\n<article>\n${articleText}\n</article>`,
      },
    ],
  });
  if (response.stop_reason === "refusal") {
    console.warn("[claude] request declined; keeping English summary only");
    return null;
  }
  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock) return null;
  return JSON.parse(textBlock.text);
}

// ---------- 무료 자동 번역 (영어 → 한국어) ----------
const TRANSLATE_URL = process.env.TRANSLATE_URL || "https://translate.googleapis.com/translate_a/single";
const MYMEMORY_URL = process.env.MYMEMORY_URL || "https://api.mymemory.translated.net/get";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function googleTranslate(text) {
  const params = new URLSearchParams({ client: "gtx", sl: "en", tl: "ko", dt: "t" });
  const res = await fetch(`${TRANSLATE_URL}?${params}`, {
    method: "POST",
    headers: { "User-Agent": USER_AGENT, "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: new URLSearchParams({ q: text }),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`google HTTP ${res.status}`);
  const data = await res.json();
  const out = (data[0] || []).map((seg) => seg[0] || "").join("").trim();
  if (!out) throw new Error("google: empty result");
  return out;
}

// MyMemory 는 한 번에 500자까지라 문장 단위로 나눠 번역합니다.
async function myMemoryTranslate(text) {
  const sentences = text.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) || [text];
  const chunks = [];
  let cur = "";
  for (const sen of sentences) {
    if ((cur + sen).length > 450 && cur) { chunks.push(cur); cur = ""; }
    cur += sen;
  }
  if (cur) chunks.push(cur);
  const out = [];
  for (const chunk of chunks) {
    const params = new URLSearchParams({ q: chunk.trim(), langpair: "en|ko" });
    if (process.env.MYMEMORY_EMAIL) params.set("de", process.env.MYMEMORY_EMAIL);
    const res = await fetch(`${MYMEMORY_URL}?${params}`, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`mymemory HTTP ${res.status}`);
    const data = await res.json();
    if (data.responseStatus !== 200 && data.responseStatus !== "200") throw new Error(`mymemory: ${data.responseDetails || data.responseStatus}`);
    out.push(String(data.responseData?.translatedText || "").trim());
    await sleep(300);
  }
  return out.join(" ").trim();
}

let translatorDown = false;
async function translateText(text) {
  if (!text || !text.trim() || translatorDown) return "";
  for (const fn of [googleTranslate, myMemoryTranslate]) {
    try {
      const out = await fn(text);
      await sleep(200);
      if (out) return out;
    } catch (e) {
      console.warn(`[translate] ${e.message}`);
    }
  }
  translatorDown = true; // 두 서비스 모두 실패하면 이번 실행에서는 더 시도하지 않습니다.
  return "";
}

async function translateAll(list) {
  const out = [];
  for (const t of list) out.push(await translateText(t));
  return out;
}

// 번역이 비어 있는 항목만 채웁니다. 무엇인가 바뀌면 true.
async function addTranslations(item) {
  let changed = false;
  if (!item.titleKo) {
    item.titleKo = await translateText(item.title);
    changed ||= !!item.titleKo;
  }
  if (!item.summaryKo?.length && item.summaryEn?.length) {
    const ko = await translateAll(item.summaryEn);
    if (ko.every(Boolean)) { item.summaryKo = ko; item.summaryMachine = true; changed = true; }
  }
  if (item.body?.length && !(item.bodyKo?.length === item.body.length)) {
    const ko = await translateAll(item.body);
    if (ko.every(Boolean)) { item.bodyKo = ko; changed = true; }
  }
  return changed;
}

async function buildItem(c, fromFallback) {
  let body = [];
  const wantBody = STORE_FULL_TEXT && c.feed.fullText;
  if (/news\.google\./.test(c.url)) {
    // 원문 링크를 실제 언론사 주소로 바꿉니다. 본문은 설정이 켜져 있을 때만 가져와요.
    const real = await resolveGoogleNewsUrl(c.url);
    if (real) c.url = real;
    if (real && wantBody) {
      try {
        body = await extractBody(real);
      } catch (e) {
        console.warn(`[body] ${real}: ${e.message}`);
      }
    }
  } else if (wantBody) {
    try {
      body = await extractBody(c.url);
    } catch (e) {
      console.warn(`[body] ${c.url}: ${e.message}`);
    }
  }
  if (wantBody && !body.length && !c.snippet) return null;

  const item = {
    id: idFor(c.url),
    addedDate: seoulDate(),
    archived: fromFallback,
    published: c.published,
    source: c.source,
    url: c.url,
    title: c.title,
    titleKo: "",
    tag: "교육 뉴스",
    summaryKo: [],
    summaryEn: englishSummary(body, c.snippet),
    body,
    words: [],
  };

  try {
    const extra = await enrichWithClaude({ ...item, snippet: c.snippet });
    if (extra) {
      item.titleKo = extra.titleKo || "";
      item.tag = extra.tag || item.tag;
      item.summaryKo = Array.isArray(extra.summaryKo) ? extra.summaryKo : [];
      item.words = (extra.words || []).filter((w) => w.en && w.ko).map((w) => [w.en, w.ko]);
    }
  } catch (e) {
    if (e instanceof Anthropic.APIError) console.warn(`[claude] ${e.status ?? ""} ${e.message}`);
    else console.warn(`[claude] ${e.message}`);
  }
  await addTranslations(item);
  return item;
}

async function main() {
  const existing = readExisting();
  // 본문 저장이 꺼져 있으면, 이미 저장된 본문과 본문 번역도 지웁니다.
  let removedBodies = 0;
  if (!STORE_FULL_TEXT) {
    for (const item of existing) {
      if (item.body?.length || item.bodyKo?.length) {
        item.body = [];
        delete item.bodyKo;
        removedBodies++;
      }
    }
    if (removedBodies) console.log(`[info] removed stored full text from ${removedBodies} items (storeFullText: false)`);
  }
  const perRun = Number(process.env.NEWS_PER_RUN) || (existing.length ? 1 : 3);
  const added = [];
  const primary = config.feeds.filter((f) => !f.fallback);
  const fallback = config.feeds.filter((f) => f.fallback);

  // 1) 최근 기사  2) 없으면 fallback 소스에서 지난 기사
  for (const [label, feeds] of [["recent", primary], ["fallback", fallback]]) {
    if (added.length >= perRun || !feeds.length) continue;
    if (label === "fallback") console.log("[info] no recent article found; searching older articles");
    const candidates = await collectCandidates([...added, ...existing], feeds);
    console.log(`[info] ${label}: ${candidates.length} new candidates, adding up to ${perRun - added.length}`);
    for (const c of candidates) {
      if (added.length >= perRun) break;
      const item = await buildItem(c, label === "fallback");
      if (!item) continue;
      added.push(item);
      console.log(`[add] ${item.source}: ${item.title} (본문 ${item.body.length}문단, 한국어 요약 ${item.summaryKo.length ? "O" : "X"})`);
    }
  }

  // 이미 저장된 기사 중 본문이나 번역이 없는 것 채우기 (한 번에 최대 5개)
  let backfilled = 0;
  for (const item of existing) {
    if (backfilled >= 5) break;
    if (!item.body?.length && /news\.google\./.test(item.url)) {
      const real = await resolveGoogleNewsUrl(item.url);
      if (real && !STORE_FULL_TEXT) {
        item.url = real;
        backfilled++;
        console.log(`[gnews] resolved link: ${real}`);
      } else if (real) {
        item.url = real;
        try {
          item.body = await extractBody(real);
        } catch (e) {
          console.warn(`[body] ${real}: ${e.message}`);
        }
        if (item.body.length) {
          item.summaryEn = englishSummary(item.body, "");
          if (item.summaryMachine) item.summaryKo = [];
        }
        backfilled++;
        console.log(`[gnews] resolved: ${real} (본문 ${item.body.length}문단)`);
      }
    }
  }
  for (const item of existing) {
    if (backfilled >= 5 || translatorDown) break;
    const needs = !item.titleKo || !item.summaryKo?.length || (item.body?.length && item.bodyKo?.length !== item.body.length);
    if (!needs) continue;
    if (await addTranslations(item)) {
      backfilled++;
      console.log(`[translate] filled translations for: ${item.title}`);
    }
  }

  if (!added.length && !backfilled && !removedBodies) {
    // 앱이 저장된 지난 기사를 날마다 돌아가며 보여 줍니다.
    console.log("[info] no new article today; the app will show a past article");
    return;
  }

  const items = [...added, ...existing].slice(0, config.keepItems || 30);
  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify({ updated: new Date().toISOString(), items }, null, 2) + "\n");
  console.log(`[done] saved ${items.length} items to ${path.relative(root, OUTPUT_FILE)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

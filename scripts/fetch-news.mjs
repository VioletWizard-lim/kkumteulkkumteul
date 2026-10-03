// 핀란드 교육 뉴스를 RSS에서 찾아 data/live-news.json 에 저장합니다.
// GitHub Actions 에서 매일 실행됩니다 (.github/workflows/news.yml).
//
// - news-sources.json 의 RSS 에서 교육 관련 키워드가 들어간 새 기사를 고릅니다.
// - 최근 기사가 없으면 fallback 소스(더 오래된 기사까지 검색)에서 아직 저장하지 않은 기사를 찾습니다.
// - fullText 가 켜진 소스는 기사 페이지에서 본문을 추출합니다 (Mozilla Readability).
// - ANTHROPIC_API_KEY 가 있으면 Claude 로 한국어 제목·요약·핵심 단어를 만듭니다.
//   없으면 영어 요약(본문 앞부분)만 저장합니다.
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
      const snippet = (item.contentSnippet || item.content || "").replace(/\s+/g, " ").trim();
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

function englishSummary(body, snippet) {
  const text = body.length ? body.slice(0, 4).join(" ") : snippet;
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

async function buildItem(c, fromFallback) {
  let body = [];
  if (c.feed.fullText) {
    try {
      body = await extractBody(c.url);
    } catch (e) {
      console.warn(`[body] ${c.url}: ${e.message}`);
    }
  }
  if (c.feed.fullText && !body.length && !c.snippet) return null;

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
  return item;
}

async function main() {
  const existing = readExisting();
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

  if (!added.length) {
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

/* 꿈틀꿈틀 핀란드 준비 앱 */
(function () {
  "use strict";

  const APP_VERSION = "2026.10.04-3";

  // ---------- 저장소 ----------
  const STORE_KEY = "kkumteul.v1";
  const defaults = { progress: {}, favorites: [], settings: { accent: "en-US", rate: 0.9, voiceURI: "", departure: "2027-01-08" } };
  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return structuredClone(defaults);
      const data = JSON.parse(raw);
      return { progress: data.progress || {}, settings: Object.assign({}, defaults.settings, data.settings), favorites: data.favorites || [] };
    } catch (e) {
      return structuredClone(defaults);
    }
  }
  const state = load();
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* 저장 불가 환경 */ }
  }

  // ---------- 날짜 ----------
  function dateKey(d) {
    d = d || new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function dayNumber(d) {
    d = d || new Date();
    return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  }
  function todayProgress() {
    const k = dateKey();
    if (!state.progress[k]) state.progress[k] = { words: {}, travel: [], news: false };
    return state.progress[k];
  }
  function dayDone(p) {
    return p && ["morning", "lunch", "evening"].some((s) => p.words && p.words[s]);
  }
  function streak() {
    let count = 0;
    const d = new Date();
    if (!dayDone(state.progress[dateKey(d)])) d.setDate(d.getDate() - 1);
    while (dayDone(state.progress[dateKey(d)])) {
      count++;
      d.setDate(d.getDate() - 1);
    }
    return count;
  }
  function totalWordsLearned() {
    let n = 0;
    Object.values(state.progress).forEach((p) => {
      n += Object.values(p.words || {}).filter(Boolean).length * 10;
    });
    return n;
  }

  // ---------- 오늘의 단어 (날짜 기반, 10일 주기로 섞어서 반복) ----------
  function seededShuffle(arr, seed) {
    const a = arr.slice();
    let s = seed >>> 0;
    const rand = () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  const SESSION_KEYS = ["morning", "lunch", "evening"];
  // 앱을 처음 연 날이 1일차입니다. 단어장(각 약 1,000개)을 다 쓸 때까지 같은 단어가 다시 나오지 않아요.
  if (!state.settings.startDay) {
    state.settings.startDay = dayNumber();
    save();
  }
  function studyDay() {
    return Math.max(0, dayNumber() - state.settings.startDay) + 1;
  }
  function wordCycleLength() {
    return Math.min.apply(null, SESSION_KEYS.map((k) => Math.floor(window.WORD_BANKS[k].words.length / 10)));
  }
  function todaysWords(session) {
    const bank = window.WORD_BANKS[session].words;
    const perDay = 10;
    const cycleLen = Math.floor(bank.length / perDay);
    const day = studyDay() - 1;
    const cycle = Math.floor(day / cycleLen);
    const pos = day % cycleLen;
    const salt = SESSION_KEYS.indexOf(session) * 7919;
    return seededShuffle(bank, cycle * 31 + salt).slice(pos * perDay, pos * perDay + perDay);
  }
  function suggestedSession() {
    const h = new Date().getHours();
    if (h < 11) return "morning";
    if (h < 17) return "lunch";
    return "evening";
  }

  // ---------- 출발 D-day ----------
  function daysUntilDeparture() {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(state.settings.departure || "");
    if (!m) return null;
    return dayNumber(new Date(+m[1], +m[2] - 1, +m[3])) - dayNumber();
  }
  function departureLabel() {
    const n = daysUntilDeparture();
    if (n === null) return "";
    if (n > 0) return "✈️ 핀란드 출발 D-" + n;
    if (n === 0) return "✈️ 오늘 핀란드로 출발! D-DAY";
    return "🇫🇮 핀란드 " + (1 - n) + "일째";
  }

  // ---------- 교육 뉴스 ----------
  // 실시간 뉴스(data/live-news.json, GitHub Actions 가 매일 갱신)와
  // 앱에 들어 있는 핀란드 교육 이야기(js/data/news.js)를 같은 모양으로 맞춰 씁니다.
  let liveNews = [];
  function loadLiveNews() {
    return fetch("data/live-news.json", { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        liveNews = data && Array.isArray(data.items) ? data.items.map(normLive) : [];
      })
      .catch(() => { liveNews = []; });
  }
  function shortDate(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
    return m ? m[1] + "." + (+m[2]) + "." + (+m[3]) : "";
  }
  function normLive(i) {
    const hasKo = Array.isArray(i.summaryKo) && i.summaryKo.length > 0;
    const published = i.published ? dateKey(new Date(i.published)) : i.addedDate;
    return {
      id: i.id,
      live: true,
      addedDate: i.addedDate,
      dateLabel: shortDate(published),
      tag: i.tag || "교육 뉴스",
      title: i.title,
      titleKo: i.titleKo || "",
      summary: hasKo ? i.summaryKo : i.summaryEn || [],
      summaryLang: hasKo ? "ko" : "en",
      summaryMachine: !!i.summaryMachine,
      body: i.body || [],
      bodyKo: Array.isArray(i.bodyKo) && i.bodyKo.length === (i.body || []).length ? i.bodyKo : [],
      words: i.words || [],
      source: { name: i.source, url: i.url },
    };
  }
  function normStory(a) {
    return {
      id: a.id,
      live: false,
      dateLabel: "",
      tag: a.tag,
      title: a.title,
      titleKo: a.titleKo,
      summary: a.summary,
      summaryLang: "ko",
      summaryMachine: false,
      body: a.body,
      bodyKo: [],
      words: a.words,
      source: a.source,
    };
  }
  function storyForDay(offset) {
    const list = window.NEWS_ARTICLES;
    const idx = (((dayNumber() - offset) % list.length) + list.length) % list.length;
    return normStory(list[idx]);
  }
  // 오늘 보여 줄 기사: 오늘 들어온 실시간 뉴스 → 없으면 지난 실시간 뉴스를 날마다 돌아가며 → 그것도 없으면 교육 이야기
  function todaysNews() {
    if (liveNews.length) {
      const fresh = liveNews.find((x) => x.addedDate === dateKey());
      if (fresh) return { article: fresh, label: "오늘의 뉴스" };
      const past = liveNews[dayNumber() % liveNews.length];
      return { article: past, label: "지난 뉴스 다시 보기" };
    }
    return { article: storyForDay(0), label: "오늘의 핀란드 교육 이야기" };
  }
  function findArticle(id) {
    const live = liveNews.find((x) => x.id === id);
    if (live) return live;
    const story = window.NEWS_ARTICLES.find((x) => x.id === id);
    return story ? normStory(story) : null;
  }
  function newsCard(a, label) {
    return (
      '<a class="card card-link news-today" href="#/news/' + esc(a.id) + '">' +
        '<span class="badge">' + esc(label) + "</span> " +
        '<span class="badge">' + esc(a.tag) + "</span>" +
        '<div class="headline">' + esc(a.title) + "</div>" +
        (a.titleKo ? '<div class="muted">' + esc(a.titleKo) + "</div>" : "") +
        '<div class="small muted" style="margin-top:8px">' +
          (a.live ? esc(a.source.name) + (a.dateLabel ? " · " + a.dateLabel : "") + " · " : "") +
          "누르면 요약 또는 전문을 볼 수 있어요 →</div>" +
      "</a>"
    );
  }
  function newsRow(a) {
    return (
      '<a class="card card-link" href="#/news/' + esc(a.id) + '">' +
        '<div class="small muted">' + (a.live ? esc(a.source.name) + (a.dateLabel ? " · " + a.dateLabel : "") + " · " : "") + esc(a.tag) + "</div>" +
        '<div class="headline-sm">' + esc(a.title) + "</div>" +
        (a.titleKo ? '<div class="small muted">' + esc(a.titleKo) + "</div>" : "") +
      "</a>"
    );
  }

  // ---------- 음성 (발음 듣기 / 읽어 주기) ----------
  const synth = window.speechSynthesis;
  let voices = [];
  function loadVoices() {
    if (!synth) return;
    voices = synth.getVoices().filter((v) => /^en[-_]/i.test(v.lang));
  }
  if (synth) {
    loadVoices();
    if (typeof synth.addEventListener === "function") synth.addEventListener("voiceschanged", loadVoices);
    else synth.onvoiceschanged = loadVoices;
  }
  function pickVoice() {
    if (!voices.length) loadVoices();
    if (state.settings.voiceURI) {
      const v = voices.find((x) => x.voiceURI === state.settings.voiceURI);
      if (v) return v;
    }
    const want = state.settings.accent.toLowerCase().replace("_", "-");
    const same = voices.filter((v) => v.lang.toLowerCase().replace("_", "-") === want);
    const pool = same.length ? same : voices;
    return pool.find((v) => /natural|enhanced|premium|google/i.test(v.name)) || pool[0] || null;
  }
  let speakToken = 0;
  function stopSpeaking() {
    speakToken++;
    if (synth) synth.cancel();
    document.querySelectorAll(".playing").forEach((el) => el.classList.remove("playing"));
    document.querySelectorAll(".reading").forEach((el) => el.classList.remove("reading"));
  }
  // 텍스트를 읽고, 끝나면 resolve 합니다.
  function speak(text, opts) {
    opts = opts || {};
    return new Promise((resolve) => {
      if (!synth) {
        toast("이 기기에서는 음성 읽기를 지원하지 않아요.");
        resolve(false);
        return;
      }
      const u = new SpeechSynthesisUtterance(text);
      const v = pickVoice();
      if (v) u.voice = v;
      u.lang = v ? v.lang : state.settings.accent;
      u.rate = (opts.rate || 1) * state.settings.rate;
      u.pitch = opts.pitch || 1;
      let finished = false;
      const done = (ok) => {
        if (finished) return;
        finished = true;
        clearInterval(keepAlive);
        resolve(ok);
      };
      u.onend = () => done(true);
      u.onerror = () => done(false);
      // 일부 크롬 버전에서 긴 문장이 중간에 멈추는 문제 방지
      const keepAlive = setInterval(() => {
        if (!synth.speaking) return;
        synth.pause();
        synth.resume();
      }, 10000);
      synth.speak(u);
    });
  }
  function speakButton(btn, text, opts) {
    const token = ++speakToken;
    if (synth) synth.cancel();
    document.querySelectorAll(".playing").forEach((el) => el.classList.remove("playing"));
    btn.classList.add("playing");
    speak(text, opts).then(() => {
      if (token === speakToken) btn.classList.remove("playing");
    });
  }

  // ---------- 음성 인식 (따라 말하기) ----------
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  function normalize(s) {
    return s.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();
  }
  function similarity(a, b) {
    a = normalize(a);
    b = normalize(b);
    if (!a.length && !b.length) return 1;
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, (_, i) => [i]);
    for (let j = 1; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
    }
    return 1 - dp[m][n] / Math.max(m, n);
  }
  function listenAndCheck(target, btn, resultEl) {
    if (!Recognition) {
      resultEl.className = "mic-result";
      resultEl.textContent = "이 브라우저는 음성 인식을 지원하지 않아요. (안드로이드 크롬, 아이폰 사파리 권장)";
      return;
    }
    stopSpeaking();
    const rec = new Recognition();
    rec.lang = state.settings.accent;
    rec.interimResults = false;
    rec.maxAlternatives = 3;
    btn.classList.add("playing");
    btn.textContent = "🎙️ 듣는 중…";
    resultEl.className = "mic-result";
    resultEl.textContent = "지금 말해 보세요!";
    let got = false;
    rec.onresult = (e) => {
      got = true;
      const alts = Array.from(e.results[0]).map((r) => r.transcript);
      let best = alts[0], score = 0;
      alts.forEach((t) => {
        const s = similarity(t, target);
        if (s > score) { score = s; best = t; }
      });
      const pct = Math.round(score * 100);
      if (pct >= 85) {
        resultEl.className = "mic-result good";
        resultEl.textContent = "👏 아주 좋아요! (" + pct + "%) 들린 말: “" + best + "”";
      } else if (pct >= 60) {
        resultEl.className = "mic-result try";
        resultEl.textContent = "👍 거의 다 왔어요! (" + pct + "%) 들린 말: “" + best + "”";
      } else {
        resultEl.className = "mic-result try";
        resultEl.textContent = "💪 한 번 더! (" + pct + "%) 들린 말: “" + best + "”";
      }
    };
    rec.onerror = (e) => {
      resultEl.className = "mic-result try";
      resultEl.textContent = e.error === "not-allowed" ? "마이크 권한을 허용해 주세요." : "잘 들리지 않았어요. 다시 해 볼까요?";
      got = true;
    };
    rec.onend = () => {
      btn.classList.remove("playing");
      btn.textContent = "🎤 따라 말하기";
      if (!got) {
        resultEl.className = "mic-result try";
        resultEl.textContent = "소리가 들리지 않았어요. 다시 해 볼까요?";
      }
    };
    try { rec.start(); } catch (e) { rec.onend(); }
  }

  // ---------- 화면 유틸 ----------
  const view = document.getElementById("view");
  const overlay = document.getElementById("overlay");
  const titleEl = document.getElementById("pageTitle");
  const backBtn = document.getElementById("backBtn");
  const APP_TITLE = "꿈틀꿈틀 핀란드 준비 앱";

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function h(html) {
    const t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content;
  }
  let toastTimer;
  function toast(msg) {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (el.hidden = true), 2600);
  }
  function setHeader(title, back) {
    titleEl.textContent = title || APP_TITLE;
    document.title = title ? title + " · " + APP_TITLE : APP_TITLE;
    backBtn.hidden = !back;
    backBtn.onclick = back ? () => goBack(back) : null;
  }
  // 하단 탭: 홈 · 영어 공부 · 여행 · 설정. 영어 공부와 여행은 위쪽 작은 메뉴(서브 탭)로 다시 나뉘어요.
  const TAB_GROUPS = {
    study: [["words", "📚 오늘 단어"], ["travel", "🗣️ 여행회화"], ["news", "📰 교육뉴스"]],
    trip: [["schedule", "📅 일정"], ["places", "🗺️ 관광지"], ["info", "💱 환율·날씨"]]
  };
  function groupOf(section) {
    if (TAB_GROUPS.study.some((x) => x[0] === section)) return "study";
    if (TAB_GROUPS.trip.some((x) => x[0] === section)) return "trip";
    return section;
  }
  const subnav = document.getElementById("subnav");
  function setTab(section) {
    const group = groupOf(section);
    document.querySelectorAll(".tabbar a").forEach((a) => a.classList.toggle("active", a.dataset.tab === group));
    // 마지막으로 본 서브 탭을 기억해 두었다가 하단 탭을 누르면 그리로 가요.
    if (TAB_GROUPS[group]) {
      state.settings["lastTab_" + group] = section;
      save();
      updateTabLinks();
    }
    const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
    const isRootPage = parts.length <= 1;
    if (TAB_GROUPS[group] && isRootPage) {
      subnav.innerHTML = TAB_GROUPS[group].map((x) => '<a href="#/' + x[0] + '" class="' + (x[0] === section ? "on" : "") + '">' + x[1] + "</a>").join("");
      subnav.hidden = false;
    } else {
      subnav.hidden = true;
      subnav.innerHTML = "";
    }
  }
  function updateTabLinks() {
    document.querySelectorAll(".tabbar a[data-tab]").forEach((a) => {
      const g = a.dataset.tab;
      if (TAB_GROUPS[g]) a.setAttribute("href", "#/" + (state.settings["lastTab_" + g] || TAB_GROUPS[g][0][0]));
    });
  }
  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  // ---------- 응원 / 수고 메시지 ----------
  function showCheer(subtitle, onStart) {
    const m = pick(window.CHEER_MESSAGES);
    openModal(
      '<div class="modal">' +
        '<div class="big">🐛💪</div>' +
        "<h3>" + esc(subtitle) + "</h3>" +
        '<p class="msg">' + esc(m.ko) + "</p>" +
        '<p class="msg-en">' + esc(m.en) + "</p>" +
        '<button class="btn block" data-act="start">시작하기!</button>' +
      "</div>",
      (root) => {
        root.querySelector("[data-act=start]").onclick = () => {
          closeModal();
          onStart();
        };
      },
      { dismissable: false }
    );
  }
  function showPraise(subtitle, onClose) {
    const m = pick(window.PRAISE_MESSAGES);
    confetti();
    openModal(
      '<div class="modal">' +
        '<div class="big">🎉</div>' +
        "<h3>" + esc(subtitle) + "</h3>" +
        '<p class="msg">' + esc(m.ko) + "</p>" +
        '<p class="msg-en">' + esc(m.en) + "</p>" +
        '<button class="btn block" data-act="ok">고마워요!</button>' +
      "</div>",
      (root) => {
        root.querySelector("[data-act=ok]").onclick = () => {
          closeModal();
          if (onClose) onClose();
        };
      },
      { dismissable: false }
    );
  }
  function confetti() {
    const items = ["🎉", "⭐", "💙", "🇫🇮", "✨", "🌟"];
    for (let i = 0; i < 18; i++) {
      const s = document.createElement("span");
      s.className = "confetti";
      s.textContent = pick(items);
      s.style.left = Math.random() * 100 + "vw";
      s.style.animationDuration = 1.8 + Math.random() * 1.6 + "s";
      s.style.animationDelay = Math.random() * 0.5 + "s";
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 4200);
    }
  }
  function openModal(html, bind, opts) {
    opts = opts || {};
    overlay.innerHTML = "";
    overlay.appendChild(h(html));
    overlay.hidden = false;
    overlay.onclick = (e) => {
      if (e.target === overlay && opts.dismissable !== false) closeModal();
    };
    bind(overlay);
  }
  function closeModal() {
    overlay.hidden = true;
    overlay.innerHTML = "";
  }

  // ---------- 환율 (달러 · 유로 · 체코 코루나 → 원) ----------
  // 유럽중앙은행 기준환율(Frankfurter API, 영업일마다 갱신)을 쓰고, 안 되면 open.er-api.com 을 씁니다.
  // 마지막으로 받은 값은 기기에 저장해 두어 인터넷이 없어도 보여 줍니다.
  const RATES_KEY = "kkumteul.rates";
  const CURRENCIES = [
    { code: "usd", label: "미국 달러", unit: "1달러", emoji: "💵" },
    { code: "eur", label: "유로", unit: "1유로", emoji: "💶" },
    { code: "czk", label: "체코 코루나", unit: "1코루나", emoji: "🇨🇿" }
  ];
  function readRates() {
    try { return JSON.parse(localStorage.getItem(RATES_KEY) || "null"); } catch (e) { return null; }
  }
  function writeRates(r) {
    try { localStorage.setItem(RATES_KEY, JSON.stringify(r)); } catch (e) { /* 저장 불가 */ }
  }
  function isoDaysAgo(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return dateKey(d);
  }
  function toKrw(r) {
    return { usd: r.KRW / r.USD, eur: r.KRW, czk: r.KRW / r.CZK };
  }
  // 유럽중앙은행 기준환율(하루 한 번 발표): 전날 대비 등락의 기준으로 씁니다.
  function fetchEcbRates() {
    const url = "https://api.frankfurter.app/" + isoDaysAgo(10) + "..?from=EUR&to=KRW,USD,CZK";
    return fetch(url)
      .then((res) => { if (!res.ok) throw new Error("HTTP " + res.status); return res.json(); })
      .then((data) => {
        const dates = Object.keys(data.rates || {}).sort();
        if (!dates.length) throw new Error("no data");
        const last = dates[dates.length - 1];
        const prev = dates.length > 1 ? dates[dates.length - 2] : null;
        return { date: last, prevDate: prev, now: toKrw(data.rates[last]), prev: prev ? toKrw(data.rates[prev]) : null };
      });
  }
  // 실시간 환율(Coinbase 공개 API, 키 필요 없음): 시세가 수시로 바뀌어 1시간마다 새로 받아 옵니다.
  function fetchLiveRates() {
    return fetch("https://api.coinbase.com/v2/exchange-rates?currency=USD")
      .then((res) => { if (!res.ok) throw new Error("HTTP " + res.status); return res.json(); })
      .then((data) => {
        const r = (data.data && data.data.rates) || {};
        const krw = parseFloat(r.KRW), eur = parseFloat(r.EUR), czk = parseFloat(r.CZK);
        if (!(krw > 0 && eur > 0 && czk > 0)) throw new Error("missing rates");
        return { usd: krw, eur: krw / eur, czk: krw / czk };
      });
  }
  function fetchRates() {
    const settle = (p) => p.then((v) => ({ ok: true, v: v }), () => ({ ok: false }));
    return Promise.all([settle(fetchLiveRates()), settle(fetchEcbRates())])
      .then(([live, ecb]) => {
        if (live.ok) {
          return {
            live: true,
            date: dateKey(),
            now: live.v,
            // 실시간 값은 가장 최근 유럽중앙은행 기준환율과 비교해 등락을 보여 줍니다.
            prev: ecb.ok ? ecb.v.now : null,
            prevDate: ecb.ok ? ecb.v.date : null,
            source: "실시간 환율(Coinbase)",
            fetchedAt: Date.now()
          };
        }
        if (ecb.ok) return Object.assign({ live: false, source: "유럽중앙은행 기준환율", fetchedAt: Date.now() }, ecb.v);
        return fetch("https://open.er-api.com/v6/latest/EUR")
          .then((res) => res.json())
          .then((data) => {
            if (data.result !== "success") throw new Error("fallback failed");
            const date = data.time_last_update_unix ? dateKey(new Date(data.time_last_update_unix * 1000)) : dateKey();
            const old = readRates();
            const prev = old && old.date !== date ? old : null;
            return { live: false, date: date, prevDate: prev ? prev.date : null, now: toKrw(data.rates), prev: prev ? prev.now : null, source: "ExchangeRate-API", fetchedAt: Date.now() };
          });
      })
      .then((r) => { writeRates(r); return r; });
  }
  function won(n) {
    return n.toLocaleString("ko-KR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function ratesCardHtml(r) {
    const targets = state.settings.targets || {};
    if (!r) {
      return '<div class="small muted">환율을 불러오는 중이에요…</div>';
    }
    const rows = CURRENCIES.map((c) => {
      const now = r.now[c.code];
      const prev = r.prev ? r.prev[c.code] : null;
      let diff = "";
      if (prev) {
        const d = now - prev;
        const cls = d > 0.004 ? "up" : d < -0.004 ? "down" : "flat";
        const sign = cls === "up" ? "▲" : cls === "down" ? "▼" : "-";
        diff = '<span class="rate-diff ' + cls + '">' + sign + (cls === "flat" ? "" : " " + won(Math.abs(d))) + "</span>";
      }
      const target = targets[c.code];
      const hit = target && now <= target;
      return (
        '<div class="rate-row' + (hit ? " hit" : "") + '">' +
          '<span class="rate-emoji">' + c.emoji + "</span>" +
          '<div class="grow"><div class="rate-unit">' + c.unit + "</div>" +
          (target ? '<div class="small ' + (hit ? "rate-hit" : "muted") + '">🎯 목표 ' + won(target) + "원" + (hit ? " · 지금이 기회!" : "") + "</div>" : "") +
          "</div>" +
          '<div class="rate-value"><b>' + won(now) + "</b>원 " + diff + "</div>" +
          '<button class="icon-btn small-btn" data-target="' + c.code + '" aria-label="' + c.label + ' 목표 환율 설정">🎯</button>' +
        "</div>"
      );
    }).join("");
    return rows +
      '<div class="rate-note">💳 맘에 드는 가격이 나오면 <b>트래블로그 카드</b>에 넣어 놓기!</div>' +
      '<div class="small muted" style="margin-top:6px">' +
      (r.live
        ? esc(r.source) + " · " + new Date(r.fetchedAt).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" }) + " 업데이트 (1시간마다 갱신)" +
          (r.prevDate ? "<br>▲▼는 " + esc(r.prevDate) + " 유럽중앙은행 기준환율 대비" : "")
        : esc(r.source) + " · " + esc(r.date) + " 기준" + (r.prevDate ? " (▲▼는 " + esc(r.prevDate) + " 대비)" : "")) +
      "<br>실제 충전·환전 환율과는 조금 다를 수 있어요. 🎯를 누르면 목표 환율을 정할 수 있어요.</div>";
  }
  function bindRatesCard(root) {
    root.querySelectorAll("[data-target]").forEach((btn) => {
      btn.onclick = () => {
        const c = CURRENCIES.find((x) => x.code === btn.dataset.target);
        const targets = state.settings.targets || (state.settings.targets = {});
        const cur = targets[c.code] ? String(targets[c.code]) : "";
        const v = prompt("🎯 " + c.label + " 목표 환율\n" + c.unit + "가 몇 원 이하로 내려가면 표시해 드릴까요?\n(목표를 지우려면 비워 두세요)", cur);
        if (v === null) return;
        const n = parseFloat(v.replace(/[^0-9.]/g, ""));
        if (n > 0) targets[c.code] = n;
        else delete targets[c.code];
        save();
        updateRatesCard(readRates());
      };
    });
  }
  function updateRatesCard(r) {
    const el = document.getElementById("ratesCard");
    if (!el) return;
    el.innerHTML = ratesCardHtml(r);
    bindRatesCard(el);
  }
  let ratesRequested = 0;
  function refreshRates() {
    const cached = readRates();
    // 1시간 안에 받은 값이 있으면 다시 요청하지 않아요.
    if (cached && Date.now() - cached.fetchedAt < 3600000) return;
    if (Date.now() - ratesRequested < 60000) return;
    ratesRequested = Date.now();
    fetchRates().then(updateRatesCard).catch(() => {
      const el = document.getElementById("ratesCard");
      if (el && !cached) el.innerHTML = '<div class="small muted">지금은 환율을 불러올 수 없어요. 인터넷 연결을 확인해 주세요.</div>';
    });
  }

  // ---------- 날씨 (헬싱키 · 프라하 · 서울) ----------
  // Open-Meteo 무료 API(키 필요 없음). 1시간마다 새로 받아 오고, 마지막 값은 기기에 저장해 둡니다.
  const WEATHER_KEY = "kkumteul.weather";
  const WEATHER_CITIES = [
    { id: "helsinki", flag: "🇫🇮", name: "헬싱키", lat: 60.17, lon: 24.94, tip: true },
    { id: "prague", flag: "🇨🇿", name: "프라하", lat: 50.08, lon: 14.44, tip: true },
    { id: "seoul", flag: "🇰🇷", name: "서울", lat: 37.57, lon: 126.98, tip: false }
  ];
  // WMO 날씨 코드 → [아이콘, 설명]
  function weatherInfo(code) {
    if (code === 0) return ["☀️", "맑음"];
    if (code === 1) return ["🌤️", "대체로 맑음"];
    if (code === 2) return ["⛅", "구름 조금"];
    if (code === 3) return ["☁️", "흐림"];
    if (code === 45 || code === 48) return ["🌫️", "안개"];
    if (code >= 51 && code <= 57) return ["🌦️", "이슬비"];
    if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return ["🌧️", "비"];
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return ["🌨️", "눈"];
    if (code >= 95) return ["⛈️", "뇌우"];
    return ["🌡️", "-"];
  }
  function clothingTip(t) {
    if (t <= -15) return "🧥 혹한! 내복·패딩·방한화·모자·장갑 모두 필수";
    if (t <= -5) return "🧣 내복과 두꺼운 패딩, 목도리·장갑을 챙기세요";
    if (t <= 3) return "🧤 패딩이나 두꺼운 코트, 미끄럼 방지 신발 추천";
    if (t <= 10) return "🧥 코트나 경량 패딩이면 좋아요";
    if (t <= 18) return "👕 가벼운 겉옷 하나 챙기세요";
    return "😎 가볍게 입어도 괜찮아요";
  }
  function readWeather() {
    try { return JSON.parse(localStorage.getItem(WEATHER_KEY) || "null"); } catch (e) { return null; }
  }
  function fetchWeather() {
    const q = new URLSearchParams({
      latitude: WEATHER_CITIES.map((c) => c.lat).join(","),
      longitude: WEATHER_CITIES.map((c) => c.lon).join(","),
      current: "temperature_2m,apparent_temperature,weather_code",
      daily: "temperature_2m_max,temperature_2m_min,sunrise,sunset,daylight_duration",
      timezone: "auto",
      forecast_days: "1"
    });
    return fetch("https://api.open-meteo.com/v1/forecast?" + q)
      .then((res) => { if (!res.ok) throw new Error("HTTP " + res.status); return res.json(); })
      .then((data) => {
        const list = Array.isArray(data) ? data : [data];
        if (list.length !== WEATHER_CITIES.length) throw new Error("unexpected response");
        const w = {
          fetchedAt: Date.now(),
          cities: list.map((d, i) => ({
            id: WEATHER_CITIES[i].id,
            offset: d.utc_offset_seconds,
            temp: d.current.temperature_2m,
            feels: d.current.apparent_temperature,
            code: d.current.weather_code,
            max: d.daily.temperature_2m_max[0],
            min: d.daily.temperature_2m_min[0],
            sunrise: d.daily.sunrise[0],
            sunset: d.daily.sunset[0],
            daylight: d.daily.daylight_duration ? d.daily.daylight_duration[0] : null
          }))
        };
        try { localStorage.setItem(WEATHER_KEY, JSON.stringify(w)); } catch (e) { /* 저장 불가 */ }
        return w;
      });
  }
  function cityLocalTime(offsetSec) {
    const d = new Date(Date.now() + offsetSec * 1000);
    const h = d.getUTCHours(), m = d.getUTCMinutes();
    return (h < 12 ? "오전 " : "오후 ") + (h % 12 || 12) + ":" + String(m).padStart(2, "0");
  }
  function hhmm(iso) {
    return (iso || "").slice(11, 16);
  }
  function weatherCardHtml(w) {
    if (!w) return '<div class="small muted">날씨를 불러오는 중이에요…</div>';
    return w.cities.map((c) => {
      const city = WEATHER_CITIES.find((x) => x.id === c.id);
      const info = weatherInfo(c.code);
      const dl = c.daylight != null ? Math.floor(c.daylight / 3600) + "시간 " + Math.round((c.daylight % 3600) / 60) + "분" : "";
      return (
        '<div class="wx-row">' +
          '<div class="wx-main">' +
            '<div class="wx-city">' + city.flag + " " + esc(city.name) + ' <span class="small muted">' + cityLocalTime(c.offset) + "</span></div>" +
            '<div class="wx-icon" title="' + esc(info[1]) + '">' + info[0] + "</div>" +
            '<div class="wx-temp">' + Math.round(c.temp) + "°</div>" +
          "</div>" +
          '<div class="small muted">' + esc(info[1]) + " · 체감 " + Math.round(c.feels) + "° · 최고 " + Math.round(c.max) + "° / 최저 " + Math.round(c.min) + "°</div>" +
          '<div class="small muted">🌅 ' + hhmm(c.sunrise) + " · 🌇 " + hhmm(c.sunset) + (dl ? " · 낮 " + dl : "") + "</div>" +
          (city.tip ? '<div class="small wx-tip">' + clothingTip(c.feels) + "</div>" : "") +
        "</div>"
      );
    }).join("") +
      '<div class="small muted" style="margin-top:6px">Open-Meteo · ' +
      new Date(w.fetchedAt).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" }) + " 업데이트 (1시간마다 갱신)</div>";
  }
  function updateWeatherCard(w) {
    const el = document.getElementById("weatherCard");
    if (el) el.innerHTML = weatherCardHtml(w);
  }
  let weatherRequested = 0;
  function refreshWeather() {
    const cached = readWeather();
    if (cached && Date.now() - cached.fetchedAt < 3600000) {
      updateWeatherCard(cached); // 현지 시각만 새로 고침
      return;
    }
    if (Date.now() - weatherRequested < 60000) return;
    weatherRequested = Date.now();
    fetchWeather().then(updateWeatherCard).catch(() => {
      const el = document.getElementById("weatherCard");
      if (el && !cached) el.innerHTML = '<div class="small muted">지금은 날씨를 불러올 수 없어요. 인터넷 연결을 확인해 주세요.</div>';
    });
  }

  // 홈 화면을 켜 둔 채로 있어도 1시간마다 환율·날씨를 새로 받아 옵니다.
  function refreshHomeData() {
    if (document.hidden) return;
    if (document.getElementById("ratesCard")) refreshRates();
    if (document.getElementById("weatherCard")) refreshWeather();
    if (document.getElementById("scheduleCard")) refreshSchedule().catch(() => {});
  }
  setInterval(refreshHomeData, 5 * 60000);
  document.addEventListener("visibilitychange", refreshHomeData);

  // ---------- 화면: 홈 ----------
  function renderHome() {
    setHeader(null, null);
    setTab("home");
    const p = todayProgress();
    const doneSessions = SESSION_KEYS.filter((s) => p.words[s]).length;
    const tasks = doneSessions + (p.travel.length ? 1 : 0) + (p.news ? 1 : 0);
    const pct = Math.round((tasks / 5) * 100);
    const d = new Date();
    const days = ["일", "월", "화", "수", "목", "금", "토"];
    const news = todaysNews();
    const dday = departureLabel();
    const suggest = suggestedSession();

    const sessionRows = SESSION_KEYS.map((s) => {
      const b = window.WORD_BANKS[s];
      const done = !!p.words[s];
      return (
        '<a class="card card-link row" href="#/words/' + s + '">' +
          '<span class="emoji-lg">' + b.emoji + "</span>" +
          '<div class="grow"><div class="headline-sm">' + b.label + " 표현 10개" +
          (s === suggest && !done ? ' <span class="badge">지금 추천</span>' : "") +
          '</div><div class="small muted">' + esc(b.theme) + "</div></div>" +
          '<span class="check ' + (done ? "on" : "") + '">✓</span>' +
        "</a>"
      );
    }).join("");

    view.innerHTML = "";
    view.appendChild(h(
      '<section class="hero">' +
        '<div class="date">' + (d.getMonth() + 1) + "월 " + d.getDate() + "일 " + days[d.getDay()] + "요일</div>" +
        (dday ? '<div class="dday">' + esc(dday) + "</div>" : "") +
        "<h2>" + (pct === 100 ? "오늘 목표 완료! 최고예요 🎉" : "오늘도 꿈틀꿈틀, 핀란드에 한 걸음!") + "</h2>" +
        '<div class="stats">' +
          '<div class="stat"><b>' + streak() + "일</b>연속 학습</div>" +
          '<div class="stat"><b>' + totalWordsLearned() + "개</b>배운 표현</div>" +
          '<div class="stat"><b>' + tasks + "/5</b>오늘 할 일</div>" +
        "</div>" +
        '<div class="progress"><i style="width:' + pct + '%"></i></div>' +
      "</section>" +
      '<div class="section-title">📅 오늘 일정</div>' +
      '<div class="card" id="scheduleCard">' + scheduleCardHtml() + "</div>" +
      '<div class="section-title">🌤️ 지금 날씨</div>' +
      '<div class="card weather" id="weatherCard">' + weatherCardHtml(readWeather()) + "</div>" +
      '<div class="section-title">💱 오늘의 환율</div>' +
      '<div class="card rates" id="ratesCard">' + ratesCardHtml(readRates()) + "</div>" +
      '<div class="section-title">📚 오늘의 영어 표현 30개</div>' +
      sessionRows +
      '<div class="section-title">🧳 여행 영어 회화</div>' +
      '<a class="card card-link row" href="#/travel">' +
        '<span class="emoji-lg">🗣️</span>' +
        '<div class="grow"><div class="headline-sm">상황별 대화 듣고 따라 하기</div>' +
        '<div class="small muted">공항 · 호텔 · 식당 · 학교 방문 등 ' + window.TRAVEL_TOPICS.length + "가지 상황</div></div>" +
        '<span class="check ' + (p.travel.length ? "on" : "") + '">✓</span>' +
      "</a>" +
      '<div class="section-title">📰 오늘의 핀란드 교육 뉴스 ' + (p.news ? '<span class="badge done">읽음</span>' : "") + "</div>" +
      newsCard(news.article, news.label) +
      '<div class="section-title">🗺️ 핀란드 · 체코 추천 관광지</div>' +
      '<a class="card card-link row" href="#/places">' +
        '<span class="emoji-lg">🏰</span>' +
        '<div class="grow"><div class="headline-sm">가고 싶은 곳 골라 두기</div>' +
        '<div class="small muted">헬싱키 · 라플란드 · 프라하 · 체스키 크룸로프 …' + (state.favorites.length ? " · ♥ " + state.favorites.length + "곳" : "") + "</div></div>" +
        '<span class="muted">›</span>' +
      "</a>"
    ));
    bindRatesCard(view);
    bindScheduleCard(view);
    refreshRates();
    refreshWeather();
    refreshSchedule().catch(() => {});
  }

  // ---------- 화면: 단어 목록 ----------
  function renderWordsHome() {
    setHeader("오늘의 영어 표현", null);
    setTab("words");
    const p = todayProgress();
    const suggest = suggestedSession();
    const dayN = studyDay();
    const cycleDay = ((dayN - 1) % wordCycleLength()) + 1;
    let html = '<p class="muted small" style="margin:6px 2px 14px"><b>📅 단어 ' + dayN + "일차</b>" +
      (dayN > cycleDay ? " (" + cycleDay + "/" + wordCycleLength() + "일 복습 주기)" : " / " + wordCycleLength() + "일 동안 매일 새 표현") +
      "<br>아침·점심·저녁 10개씩, 하루 30개! 🔊 버튼으로 원어민 발음을 듣고, 🎤로 따라 말해 보세요.</p>";
    SESSION_KEYS.forEach((s) => {
      const b = window.WORD_BANKS[s];
      const words = todaysWords(s);
      const done = !!p.words[s];
      html +=
        '<div class="card">' +
          '<div class="row between">' +
            '<div class="row"><span class="emoji-lg">' + b.emoji + "</span>" +
            '<div><div class="headline-sm">' + b.label + " 표현 10개</div>" +
            '<div class="small muted">' + esc(b.theme) + "</div></div></div>" +
            (done ? '<span class="badge done">완료</span>' : s === suggest ? '<span class="badge">지금 추천</span>' : "") +
          "</div>" +
          '<p class="small muted" style="margin:10px 0">' + words.slice(0, 4).map((w) => esc(w[0])).join(" · ") + " …</p>" +
          '<div class="btn-row">' +
            '<a class="btn" href="#/words/' + s + '" style="text-align:center;text-decoration:none">' + (done ? "다시 연습하기" : "연습 시작") + "</a>" +
            '<a class="btn ghost" href="#/words/' + s + '/list" style="text-align:center;text-decoration:none">목록 보기</a>' +
          "</div>" +
        "</div>";
    });
    view.innerHTML = html;
  }

  // ---------- 화면: 단어 목록(한눈에 보기) ----------
  function renderWordList(session) {
    const b = window.WORD_BANKS[session];
    if (!b) return renderWordsHome();
    setHeader(b.emoji + " " + b.label + " 표현 목록", "#/words");
    setTab("words");
    const words = todaysWords(session);
    view.innerHTML =
      '<div class="card word-list">' +
      words.map((w, i) =>
        '<div class="item">' +
          '<div class="grow"><div class="en">' + esc(w[0]) + '</div><div class="small muted">' + esc(w[1]) + "</div>" +
          '<div class="small">' + esc(w[2]) + "</div></div>" +
          '<button class="speak-btn round" data-say="' + i + '" aria-label="발음 듣기">🔊</button>' +
        "</div>"
      ).join("") +
      "</div>" +
      '<a class="btn block" href="#/words/' + session + '" style="display:block;text-align:center;text-decoration:none">카드로 연습하기</a>';
    view.querySelectorAll("[data-say]").forEach((btn) => {
      btn.onclick = () => speakButton(btn, words[+btn.dataset.say][0]);
    });
  }

  // ---------- 화면: 단어 카드 연습 ----------
  function renderWordStudy(session) {
    const b = window.WORD_BANKS[session];
    if (!b) return renderWordsHome();
    setHeader(b.emoji + " " + b.label + " 표현", "#/words");
    setTab("words");
    const words = todaysWords(session);
    let i = 0;
    let revealed = false;

    function draw() {
      const w = words[i];
      const last = i === words.length - 1;
      view.innerHTML =
        '<div class="study-top"><span class="small muted">' + (i + 1) + " / " + words.length + '</span><div class="progress"><i style="width:' + ((i + 1) / words.length) * 100 + '%"></i></div></div>' +
        '<div class="card flash">' +
          '<p class="word">' + esc(w[0]) + "</p>" +
          '<div class="speak-group">' +
            '<button class="speak-btn" data-act="say">🔊 발음 듣기</button>' +
            '<button class="speak-btn" data-act="slow">🐢 천천히</button>' +
            '<button class="speak-btn" data-act="mic">🎤 따라 말하기</button>' +
          "</div>" +
          '<div class="meaning">' + (revealed ? esc(w[1]) : '<button class="reveal" data-act="reveal">뜻 보기 👀</button>') + "</div>" +
          '<div class="example"><div class="row"><div class="grow" style="text-align:left">' + esc(w[2]) + "</div>" +
          '<button class="speak-btn round" data-act="ex" aria-label="예문 듣기">🔊</button></div></div>' +
          '<div class="mic-result" id="micResult"></div>' +
        "</div>" +
        '<div class="btn-row">' +
          '<button class="btn ghost" data-act="prev"' + (i === 0 ? " disabled" : "") + ">← 이전</button>" +
          '<button class="btn" data-act="next">' + (last ? "연습 마치기 ✓" : "다음 →") + "</button>" +
        "</div>";

      const $ = (a) => view.querySelector('[data-act="' + a + '"]');
      $("say").onclick = (e) => speakButton(e.currentTarget, w[0]);
      $("slow").onclick = (e) => speakButton(e.currentTarget, w[0], { rate: 0.6 });
      $("ex").onclick = (e) => speakButton(e.currentTarget, w[2]);
      $("mic").onclick = (e) => listenAndCheck(w[0], e.currentTarget, view.querySelector("#micResult"));
      const rv = $("reveal");
      if (rv) rv.onclick = () => { revealed = true; draw(); };
      $("prev").onclick = () => { if (i > 0) { i--; revealed = false; stopSpeaking(); draw(); } };
      $("next").onclick = () => {
        stopSpeaking();
        if (!last) { i++; revealed = false; draw(); return; }
        todayProgress().words[session] = true;
        save();
        showPraise(b.label + " 표현 10개 완료!", () => goBack("#/words"));
      };
    }

    showCheer(b.label + " 연습을 시작해요", draw);
    view.innerHTML = "";
  }

  // ---------- 화면: 여행 회화 ----------
  function renderTravelHome() {
    setHeader("여행 영어 회화", null);
    setTab("travel");
    const p = todayProgress();
    view.innerHTML =
      '<p class="muted small" style="margin:6px 2px 14px">상황을 고르면 대화를 읽어 드려요. 한 문장씩 듣거나 전체 대화를 이어서 들을 수 있어요.</p>' +
      '<div class="topic-grid">' +
      window.TRAVEL_TOPICS.map((t) =>
        '<a class="card card-link" href="#/travel/' + t.id + '">' +
          (p.travel.indexOf(t.id) >= 0 ? '<span class="badge done">오늘 완료</span>' : "") +
          '<div class="emoji-lg">' + t.emoji + '</div><div class="title">' + esc(t.title) + "</div>" +
          '<div class="small muted">대화 ' + t.dialogue.length + "줄 · 표현 " + t.phrases.length + "개</div>" +
        "</a>"
      ).join("") +
      "</div>";
  }

  function renderTravelTopic(id) {
    const t = window.TRAVEL_TOPICS.find((x) => x.id === id);
    if (!t) return renderTravelHome();
    setHeader(t.emoji + " " + t.title, "#/travel");
    setTab("travel");
    let showKo = true;
    let playingAll = false;

    function draw() {
      view.innerHTML =
        '<div class="toolbar">' +
          '<button class="btn" data-act="all" style="padding:8px 14px">' + (playingAll ? "⏹ 멈추기" : "▶️ 전체 대화 듣기") + "</button>" +
          '<button class="chip ' + (showKo ? "on" : "") + '" data-act="ko">한국어 해석 ' + (showKo ? "ON" : "OFF") + "</button>" +
        "</div>" +
        '<div class="section-title" style="margin-top:4px">💬 대화</div>' +
        '<div class="bubble-wrap ' + (showKo ? "" : "hide-ko") + '">' +
        t.dialogue.map((line, i) =>
          '<div class="bubble ' + line[0] + '" data-line="' + i + '">' +
            '<div class="grow"><div class="who">' + (line[0] === "me" ? "나" : "상대방") + "</div>" +
            '<div class="en">' + esc(line[1]) + '</div><div class="ko">' + esc(line[2]) + "</div></div>" +
            '<button class="speak-btn round" data-say="' + i + '" aria-label="듣기">🔊</button>' +
          "</div>"
        ).join("") +
        "</div>" +
        '<div class="section-title">⭐ 꼭 필요한 표현</div>' +
        '<div class="card">' +
        t.phrases.map((ph, i) =>
          '<div class="phrase"><div class="grow"><div style="font-weight:600">' + esc(ph[0]) + '</div><div class="small muted">' + esc(ph[1]) + "</div></div>" +
          '<button class="speak-btn round" data-phrase="' + i + '" aria-label="듣기">🔊</button></div>'
        ).join("") +
        "</div>" +
        '<button class="btn block" data-act="done" style="margin-top:8px">연습 마치기 ✓</button>';

      view.querySelectorAll("[data-say]").forEach((btn) => {
        btn.onclick = () => {
          playingAll = false;
          const line = t.dialogue[+btn.dataset.say];
          speakButton(btn, line[1], { pitch: line[0] === "me" ? 1.1 : 0.9 });
        };
      });
      view.querySelectorAll("[data-phrase]").forEach((btn) => {
        btn.onclick = () => speakButton(btn, t.phrases[+btn.dataset.phrase][0]);
      });
      view.querySelector('[data-act="ko"]').onclick = () => { showKo = !showKo; draw(); };
      view.querySelector('[data-act="all"]').onclick = () => {
        if (playingAll) { playingAll = false; stopSpeaking(); draw(); return; }
        playAll();
      };
      view.querySelector('[data-act="done"]').onclick = () => {
        playingAll = false;
        stopSpeaking();
        const p = todayProgress();
        if (p.travel.indexOf(t.id) < 0) p.travel.push(t.id);
        save();
        showPraise("'" + t.title + "' 회화 연습 완료!", () => goBack("#/travel"));
      };
    }

    async function playAll() {
      stopSpeaking();
      playingAll = true;
      draw();
      const token = speakToken;
      for (let i = 0; i < t.dialogue.length; i++) {
        if (!playingAll || token !== speakToken) return;
        const el = view.querySelector('[data-line="' + i + '"]');
        view.querySelectorAll(".bubble.active").forEach((x) => x.classList.remove("active"));
        if (el) {
          el.classList.add("active");
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        const line = t.dialogue[i];
        const ok = await speak(line[1], { pitch: line[0] === "me" ? 1.1 : 0.9 });
        if (!ok) break;
        await new Promise((r) => setTimeout(r, 450));
      }
      if (token !== speakToken) return;
      playingAll = false;
      draw();
    }

    showCheer("'" + t.title + "' 회화를 연습해요", draw);
    view.innerHTML = "";
  }

  // ---------- 화면: 교육 뉴스 ----------
  function renderNewsHome() {
    setHeader("핀란드 교육 뉴스", null);
    setTab("news");
    const today = todaysNews();
    const p = todayProgress();
    const pastLive = liveNews.filter((x) => x.id !== today.article.id).slice(0, 10);
    const stories = [];
    for (let k = 0; k < Math.min(6, window.NEWS_ARTICLES.length); k++) {
      const st = storyForDay(k);
      if (st.id !== today.article.id) stories.push(st);
    }
    view.innerHTML =
      '<div class="section-title" style="margin-top:6px">오늘의 기사 ' + (p.news ? '<span class="badge done">읽음</span>' : "") + "</div>" +
      newsCard(today.article, today.label) +
      (pastLive.length ? '<div class="section-title">📰 지난 뉴스</div>' + pastLive.map(newsRow).join("") : "") +
      '<div class="section-title">📘 핀란드 교육 이야기</div>' + stories.map(newsRow).join("") +
      '<div class="section-title">더 많은 최신 소식</div>' +
      '<div class="card">' +
        window.NEWS_LINKS.map((l) => '<div style="padding:6px 0"><a href="' + esc(l.url) + '" target="_blank" rel="noopener">' + esc(l.name) + " ↗</a></div>").join("") +
      "</div>";
  }

  function renderArticle(id) {
    const a = findArticle(id);
    if (!a) return renderNewsHome();
    setHeader("교육 뉴스", "#/news");
    setTab("news");
    let mode = "summary";
    let showKo = false;
    if (a.id === todaysNews().article.id) {
      todayProgress().news = true;
      save();
    }

    function draw() {
      const original = a.live ? '<a class="btn secondary block" href="' + esc(a.source.url) + '" target="_blank" rel="noopener" style="display:block;text-align:center;text-decoration:none;margin-bottom:12px">원문 기사 보기 ↗</a>' : "";
      let body;
      if (mode === "summary") {
        body = '<div class="card summary"><ul style="padding-left:20px;margin:0">' + a.summary.map((s) => "<li>" + esc(s) + "</li>").join("") + "</ul>" +
          (a.summaryMachine ? '<p class="small muted" style="margin:10px 0 0">※ 기사 앞부분을 자동 번역한 요약이에요.</p>' : "") + "</div>";
      } else if (a.body.length) {
        body = '<div class="toolbar"><button class="btn" data-act="read" style="padding:8px 14px">🔊 전문 읽어 주기</button>' +
          (a.bodyKo.length ? '<button class="chip ' + (showKo ? "on" : "") + '" data-act="ko">한국어 번역 ' + (showKo ? "ON" : "OFF") + "</button>" : "") +
          "</div>" +
          '<div class="card body">' + a.body.map((pp, i) =>
            '<p data-p="' + i + '">' + esc(pp) + "</p>" +
            (showKo && a.bodyKo[i] ? '<p class="ko-trans">' + esc(a.bodyKo[i]) + "</p>" : "")
          ).join("") +
          (showKo ? '<p class="small muted" style="margin:0">※ 자동 번역이라 어색한 표현이 있을 수 있어요.</p>' : "") +
          "</div>";
      } else {
        body = '<div class="card"><p style="margin:0">저작권 보호를 위해 앱에는 기사 본문을 저장하지 않아요. 아래 버튼을 누르면 언론사 사이트에서 전문을 읽을 수 있어요.</p>' +
          '<p class="small muted" style="margin:8px 0 0">💡 휴대폰 브라우저의 "번역" 기능을 켜면 원문도 한국어로 볼 수 있어요.</p></div>' + original;
      }
      view.innerHTML =
        '<article class="article">' +
          '<span class="badge">' + esc(a.tag) + "</span>" +
          "<h2>" + esc(a.title) + "</h2>" +
          (a.titleKo ? '<div class="muted">' + esc(a.titleKo) + "</div>" : "") +
          (a.live ? '<div class="small muted" style="margin-top:4px">' + esc(a.source.name) + (a.dateLabel ? " · " + a.dateLabel : "") + "</div>" : "") +
          '<div class="seg" role="tablist">' +
            '<button class="' + (mode === "summary" ? "on" : "") + '" data-mode="summary">📝 요약 (' + (a.summaryLang === "ko" ? "한국어" : "영어") + ")</button>" +
            '<button class="' + (mode === "full" ? "on" : "") + '" data-mode="full">📄 전문 (' + (a.live && !a.body.length ? "원문 링크" : "영어") + ")</button>" +
          "</div>" +
          body +
          (a.words.length
            ? '<div class="section-title">🔑 기사 속 핵심 단어</div>' +
              '<div class="kw">' + a.words.map((w, i) => '<button data-kw="' + i + '"><b>' + esc(w[0]) + " 🔊</b>" + esc(w[1]) + "</button>").join("") + "</div>"
            : "") +
          '<p class="small muted" style="margin-top:18px">' + (a.live ? "출처" : "참고") + ': <a href="' + esc(a.source.url) + '" target="_blank" rel="noopener">' + esc(a.source.name) + " ↗</a></p>" +
        "</article>";

      view.querySelectorAll("[data-mode]").forEach((btn) => {
        btn.onclick = () => { stopSpeaking(); mode = btn.dataset.mode; draw(); };
      });
      view.querySelectorAll("[data-kw]").forEach((btn) => {
        btn.onclick = () => speakButton(btn, a.words[+btn.dataset.kw][0]);
      });
      const koBtn = view.querySelector('[data-act="ko"]');
      if (koBtn) koBtn.onclick = () => { stopSpeaking(); showKo = !showKo; draw(); };
      const read = view.querySelector('[data-act="read"]');
      if (read) read.onclick = () => readAll(read);
    }

    async function readAll(btn) {
      if (btn.classList.contains("playing")) { stopSpeaking(); btn.textContent = "🔊 전문 읽어 주기"; return; }
      stopSpeaking();
      const token = speakToken;
      btn.classList.add("playing");
      btn.textContent = "⏹ 멈추기";
      const titleOk = await speak(a.title);
      for (let i = 0; titleOk && i < a.body.length; i++) {
        if (token !== speakToken) return;
        view.querySelectorAll(".reading").forEach((x) => x.classList.remove("reading"));
        const p = view.querySelector('[data-p="' + i + '"]');
        if (p) { p.classList.add("reading"); p.scrollIntoView({ behavior: "smooth", block: "center" }); }
        if (!(await speak(a.body[i]))) break;
      }
      if (token !== speakToken) return;
      stopSpeaking();
      btn.textContent = "🔊 전문 읽어 주기";
    }

    draw();
  }

  // ---------- 화면: 추천 관광지 ----------
  function mapUrl(p, country) {
    return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(p.name + ", " + (country.id === "czech" ? "Czechia" : "Finland"));
  }
  function renderPlaces(countryId, onlyFav) {
    const countries = window.PLACE_COUNTRIES;
    const country = countries.find((c) => c.id === countryId) || countries[0];
    setHeader("추천 관광지", null);
    setTab("places");
    const favs = state.favorites;
    let html =
      '<div class="seg" role="tablist" style="margin-top:6px">' +
      countries.map((c) => '<button class="' + (c.id === country.id ? "on" : "") + '" data-country="' + c.id + '">' + c.flag + " " + esc(c.name) + "</button>").join("") +
      "</div>" +
      '<div class="toolbar"><button class="chip ' + (onlyFav ? "on" : "") + '" data-act="fav">♥ 가고 싶은 곳만 (' +
        country.regions.reduce((n, r) => n + r.places.filter((p) => favs.indexOf(p.id) >= 0).length, 0) + ")</button></div>" +
      '<details class="card info-card"><summary><b>' + country.flag + " " + esc(country.name) + " 여행 기본 정보</b></summary>" +
        '<div class="info-grid">' + country.info.map((i) => "<div>" + esc(i[0]) + '</div><div class="muted">' + esc(i[1]) + "</div>").join("") + "</div>" +
      "</details>";
    let shown = 0;
    country.regions.forEach((r) => {
      const places = r.places.filter((p) => !onlyFav || favs.indexOf(p.id) >= 0);
      if (!places.length) return;
      shown += places.length;
      html += '<div class="section-title">📍 ' + esc(r.name) + "</div>";
      places.forEach((p) => {
        const fav = favs.indexOf(p.id) >= 0;
        html +=
          '<div class="card place">' +
            '<div class="row between" style="align-items:flex-start">' +
              '<div class="grow"><div class="headline-sm">' + esc(p.ko) + '</div><div class="small muted">' + esc(p.name) + "</div></div>" +
              '<button class="fav-btn' + (fav ? " on" : "") + '" data-fav="' + p.id + '" aria-label="가고 싶은 곳">' + (fav ? "♥" : "♡") + "</button>" +
            "</div>" +
            '<div class="tags">' + p.tags.map((t) => '<span class="badge">' + esc(t) + "</span>").join(" ") + "</div>" +
            '<p class="place-desc">' + esc(p.desc) + "</p>" +
            '<p class="small place-winter">❄️ ' + esc(p.winter) + "</p>" +
            '<div class="place-phrase"><div class="grow"><div class="small muted">🗣️ 여기서 써먹는 영어</div><div style="font-weight:600">' + esc(p.phrase[0]) + '</div><div class="small muted">' + esc(p.phrase[1]) + "</div></div>" +
              '<button class="speak-btn round" data-say="' + p.id + '" aria-label="듣기">🔊</button></div>' +
            '<a class="btn ghost block" href="' + mapUrl(p, country) + '" target="_blank" rel="noopener" style="display:block;text-align:center;text-decoration:none;margin-top:10px">📍 지도에서 보기</a>' +
          "</div>";
      });
    });
    if (!shown) html += '<div class="card muted">아직 고른 곳이 없어요. ♡를 눌러 가고 싶은 곳을 담아 보세요.</div>';
    html += '<p class="small muted">※ 운영 시간과 요금은 계절마다 바뀌어요. 방문 전에 공식 홈페이지에서 꼭 확인하세요.</p>';
    view.innerHTML = html;

    const all = country.regions.flatMap((r) => r.places);
    view.querySelectorAll("[data-country]").forEach((b) => {
      b.onclick = () => navigate("#/places/" + b.dataset.country);
    });
    view.querySelector('[data-act="fav"]').onclick = () => renderPlaces(country.id, !onlyFav);
    view.querySelectorAll("[data-fav]").forEach((b) => {
      b.onclick = () => {
        const id = b.dataset.fav;
        const i = state.favorites.indexOf(id);
        if (i >= 0) state.favorites.splice(i, 1);
        else { state.favorites.push(id); toast("♥ 가고 싶은 곳에 담았어요"); }
        save();
        const y = window.scrollY;
        renderPlaces(country.id, onlyFav);
        window.scrollTo(0, y);
      };
    });
    view.querySelectorAll("[data-say]").forEach((b) => {
      b.onclick = () => speakButton(b, all.find((p) => p.id === b.dataset.say).phrase[0]);
    });
  }

  // ---------- 오늘 일정 (구글 시트 연동) ----------
  // 시트 형식(첫 줄 제목): 날짜 | 시작 | 끝 | 일정 | 장소 | 주소 | 메모  (위도·경도 열은 선택)
  // 시트는 "링크가 있는 모든 사용자 - 뷰어"로 공유하고, 그 링크를 ⚙︎ 설정 또는 js/config.js 에 넣어요.
  const SCHEDULE_KEY = "kkumteul.schedule";
  const GEO_KEY = "kkumteul.geo";
  const LEG_KEY = "kkumteul.legs";
  function scheduleSheetUrl() {
    return (state.settings.scheduleUrl || (window.APP_CONFIG && window.APP_CONFIG.scheduleSheetUrl) || "").trim();
  }
  // 공유 링크 → CSV 주소
  function sheetCsvUrls(link) {
    const urls = [];
    if (/\/spreadsheets\/d\/e\//.test(link) || /output=csv/.test(link)) {
      urls.push(link.replace(/\/pubhtml.*$/, "/pub?output=csv").replace(/\/pub\?(?!.*output=csv).*$/, "/pub?output=csv"));
    }
    const m = link.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]{20,})/);
    if (m && m[1] !== "e") {
      const gid = (link.match(/[#&?]gid=(\d+)/) || [])[1];
      urls.push("https://docs.google.com/spreadsheets/d/" + m[1] + "/gviz/tq?tqx=out:csv" + (gid ? "&gid=" + gid : ""));
      urls.push("https://docs.google.com/spreadsheets/d/" + m[1] + "/export?format=csv" + (gid ? "&gid=" + gid : ""));
    }
    return urls;
  }
  function parseCsv(text) {
    const rows = [];
    let row = [], cell = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) {
        if (ch === '"') {
          if (text[i + 1] === '"') { cell += '"'; i++; } else q = false;
        } else cell += ch;
      } else if (ch === '"') q = true;
      else if (ch === ",") { row.push(cell); cell = ""; }
      else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        row.push(cell); rows.push(row); row = []; cell = "";
      } else cell += ch;
    }
    if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
    return rows.filter((r) => r.some((c) => c.trim() !== ""));
  }
  const COLS = {
    date: /^(날짜|date|일자)/i, start: /^(시작|start|시간|time)/i, end: /^(끝|종료|end)/i,
    title: /^(일정|제목|title|event|내용)/i, place: /^(장소|place|location)/i, address: /^(주소|address)/i,
    memo: /^(메모|비고|note|memo)/i, lat: /^(위도|lat)/i, lon: /^(경도|lon|lng)/i
  };
  // 날짜 글자 → YYYY-MM-DD (연도가 없으면 출발일에 가까운 해로)
  function parseSheetDate(v) {
    v = (v || "").trim();
    let y, mo, d, m;
    if ((m = v.match(/^(\d{4})[-./년\s]+(\d{1,2})[-./월\s]+(\d{1,2})/))) { y = +m[1]; mo = +m[2]; d = +m[3]; }
    else if ((m = v.match(/^(\d{1,2})[-./월\s]+(\d{1,2})/))) { mo = +m[1]; d = +m[2]; }
    else if ((m = v.match(/^Date\((\d{4}),(\d{1,2}),(\d{1,2})\)/))) { y = +m[1]; mo = +m[2] + 1; d = +m[3]; }
    else return "";
    if (!y) {
      const dep = (state.settings.departure || "2027-01-08").slice(0, 4);
      const base = +dep;
      const cand = [base - 1, base, base + 1].map((yy) => ({ yy: yy, diff: Math.abs(Date.UTC(yy, mo - 1, d) - Date.parse(state.settings.departure || "2027-01-08")) }));
      y = cand.sort((a, b) => a.diff - b.diff)[0].yy;
    }
    return y + "-" + String(mo).padStart(2, "0") + "-" + String(d).padStart(2, "0");
  }
  function parseSheetTime(v) {
    const m = (v || "").match(/(오전|오후|AM|PM)?\s*(\d{1,2})(?::|시\s*)?(\d{2})?\s*(분)?\s*(AM|PM)?/i);
    if (!m) return "";
    let h = +m[2];
    const ap = (m[1] || m[5] || "").toUpperCase();
    if ((ap === "오후" || ap === "PM") && h < 12) h += 12;
    if ((ap === "오전" || ap === "AM") && h === 12) h = 0;
    return String(h).padStart(2, "0") + ":" + (m[3] || "00");
  }
  function rowsToSchedule(rows) {
    if (!rows.length) return [];
    const head = rows[0].map((h) => h.trim());
    const idx = {};
    Object.keys(COLS).forEach((k) => { idx[k] = head.findIndex((h) => COLS[k].test(h)); });
    if (idx.date < 0 || idx.title < 0) throw new Error("시트 첫 줄에 '날짜'와 '일정' 제목이 있어야 해요.");
    const get = (r, k) => (idx[k] >= 0 ? (r[idx[k]] || "").trim() : "");
    let lastDate = "";
    return rows.slice(1).map((r) => {
      const date = parseSheetDate(get(r, "date")) || lastDate;
      lastDate = date;
      const lat = parseFloat(get(r, "lat")), lon = parseFloat(get(r, "lon"));
      return {
        date: date, start: parseSheetTime(get(r, "start")), end: parseSheetTime(get(r, "end")),
        title: get(r, "title"), place: get(r, "place"), address: get(r, "address"), memo: get(r, "memo"),
        lat: isFinite(lat) ? lat : null, lon: isFinite(lon) ? lon : null
      };
    }).filter((e) => e.date && e.title).sort((a, b) => (a.date + (a.start || "99")).localeCompare(b.date + (b.start || "99")));
  }
  function readSchedule() {
    try { return JSON.parse(localStorage.getItem(SCHEDULE_KEY) || "null"); } catch (e) { return null; }
  }
  function fetchSchedule() {
    const link = scheduleSheetUrl();
    const urls = sheetCsvUrls(link);
    if (!urls.length) return Promise.reject(new Error("구글 시트 링크를 확인해 주세요."));
    const tryUrl = (i) => fetch(urls[i], { cache: "no-store" })
      .then((res) => { if (!res.ok) throw new Error("HTTP " + res.status); return res.text(); })
      .then((text) => {
        if (/^\s*</.test(text)) throw new Error("시트를 읽을 수 없어요. 공유 설정을 '링크가 있는 모든 사용자'로 바꿔 주세요.");
        return text;
      })
      .catch((e) => (i + 1 < urls.length ? tryUrl(i + 1) : Promise.reject(e)));
    return tryUrl(0).then((text) => {
      const events = rowsToSchedule(parseCsv(text));
      const data = { link: link, fetchedAt: Date.now(), events: events };
      try { localStorage.setItem(SCHEDULE_KEY, JSON.stringify(data)); } catch (e) { /* 저장 불가 */ }
      return data;
    });
  }
  // 오늘 일정, 없으면 다가오는 첫 날 일정
  function scheduleDayToShow(events) {
    const today = dateKey();
    const todays = events.filter((e) => e.date === today);
    if (todays.length) return { date: today, label: "오늘", events: todays };
    const next = events.find((e) => e.date > today);
    if (next) return { date: next.date, label: "다가오는 일정", events: events.filter((e) => e.date === next.date) };
    return null;
  }
  function koDate(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    const dd = new Date(y, m - 1, d);
    return m + "월 " + d + "일 (" + ["일", "월", "화", "수", "목", "금", "토"][dd.getDay()] + ")";
  }
  function timeRange(e) {
    return e.start ? e.start + (e.end ? "~" + e.end : "") : "시간 미정";
  }
  function scheduleCardHtml() {
    if (!scheduleSheetUrl()) {
      return '<div class="small muted">구글 시트에 적은 여행 일정을 여기에 보여 줄 수 있어요.</div>' +
        '<button class="btn secondary block" data-act="schedule-setup" style="margin-top:10px">📅 구글 시트 연결하기</button>';
    }
    const data = readSchedule();
    if (!data || data.link !== scheduleSheetUrl()) return '<div class="small muted">일정을 불러오는 중이에요…</div>';
    const day = scheduleDayToShow(data.events);
    if (!day) return '<div class="small muted">남은 일정이 없어요. 시트에 일정을 추가해 보세요.</div>' +
      '<a class="btn ghost block" href="#/schedule" style="display:block;text-align:center;text-decoration:none;margin-top:10px">전체 일정 보기</a>';
    const dday = day.label === "오늘" ? "" : ' <span class="badge">D-' + (dayNumber(new Date(day.date + "T00:00")) - dayNumber()) + "</span>";
    return '<div class="small muted" style="margin-bottom:4px">' + esc(day.label) + " · " + koDate(day.date) + dday + "</div>" +
      day.events.slice(0, 5).map((e) =>
        '<div class="sch-mini"><span class="sch-time">' + esc(e.start || "--:--") + '</span><div class="grow"><b>' + esc(e.title) + "</b>" +
        (e.place ? '<div class="small muted">📍 ' + esc(e.place) + "</div>" : "") + "</div></div>"
      ).join("") +
      (day.events.length > 5 ? '<div class="small muted">외 ' + (day.events.length - 5) + "개</div>" : "") +
      '<a class="btn ghost block" href="#/schedule/' + day.date + '" style="display:block;text-align:center;text-decoration:none;margin-top:10px">🗺️ 지도와 이동 시간 보기</a>';
  }
  function bindScheduleCard(root) {
    const b = root.querySelector('[data-act="schedule-setup"]');
    if (b) b.onclick = openScheduleSetup;
  }
  function updateScheduleCard() {
    const el = document.getElementById("scheduleCard");
    if (!el) return;
    el.innerHTML = scheduleCardHtml();
    bindScheduleCard(el);
  }
  let scheduleRequested = 0;
  function refreshSchedule(force) {
    if (!scheduleSheetUrl()) return Promise.resolve(null);
    const cached = readSchedule();
    if (!force && cached && cached.link === scheduleSheetUrl() && Date.now() - cached.fetchedAt < 10 * 60000) return Promise.resolve(cached);
    if (!force && Date.now() - scheduleRequested < 30000) return Promise.resolve(cached);
    scheduleRequested = Date.now();
    return fetchSchedule().then((d) => { updateScheduleCard(); return d; }).catch((e) => {
      const el = document.getElementById("scheduleCard");
      if (el && !(cached && cached.link === scheduleSheetUrl())) el.innerHTML = '<div class="small muted">일정을 불러오지 못했어요. ' + esc(e.message) + "</div>";
      throw e;
    });
  }
  function openScheduleSetup() {
    openModal(
      '<div class="modal left">' +
        "<h3>📅 구글 시트 일정 연결</h3>" +
        '<ol class="small" style="padding-left:18px;margin:0 0 12px">' +
          "<li>구글 시트 첫 줄에 <b>날짜 · 시작 · 끝 · 일정 · 장소 · 주소 · 메모</b> 제목을 적어요. (날짜와 일정은 꼭 필요해요)</li>" +
          "<li>날짜는 <b>2027-01-09</b> 또는 <b>1/9</b>, 시간은 <b>09:30</b>처럼 적어요.</li>" +
          "<li>오른쪽 위 <b>공유</b> → 일반 액세스를 <b>링크가 있는 모든 사용자(뷰어)</b>로 바꿔요.</li>" +
          "<li><b>링크 복사</b> 후 아래에 붙여 넣어요.</li>" +
        "</ol>" +
        '<div class="field"><label>구글 시트 링크</label><input type="url" id="sheetUrl" placeholder="https://docs.google.com/spreadsheets/d/..." value="' + esc(state.settings.scheduleUrl || "") + '"></div>' +
        '<p class="small muted" id="sheetMsg" style="min-height:20px;margin:0 0 10px"></p>' +
        '<div class="btn-row"><button class="btn ghost" id="sheetCancel">닫기</button><button class="btn" id="sheetSave">연결하기</button></div>' +
        '<p class="small muted" style="margin-top:12px">💡 일정이 바뀌면 시트만 고치면 돼요. 앱이 열릴 때 새로 불러와요.<br>💡 예시 파일: 저장소의 docs/schedule-template.csv 를 시트로 가져오면 바로 쓸 수 있어요.</p>' +
      "</div>",
      (root) => {
        root.querySelector("#sheetCancel").onclick = closeModal;
        root.querySelector("#sheetSave").onclick = () => {
          const v = root.querySelector("#sheetUrl").value.trim();
          const msg = root.querySelector("#sheetMsg");
          state.settings.scheduleUrl = v;
          save();
          if (!v) { msg.textContent = "연결을 해제했어요."; updateScheduleCard(); return; }
          msg.textContent = "불러오는 중…";
          refreshSchedule(true).then((d) => {
            msg.textContent = "✅ 일정 " + d.events.length + "개를 불러왔어요!";
            setTimeout(() => { closeModal(); route(); }, 900);
          }).catch((e) => { msg.textContent = "⚠️ " + e.message; });
        };
      }
    );
  }

  // ---------- 위치 찾기 · 이동 시간 ----------
  // 주소 → 좌표: OpenStreetMap Nominatim (1초에 1번, 결과는 기기에 저장)
  // 이동 시간: OpenStreetMap 경로 서버(도보·자동차). 대중교통은 구글 지도 길찾기로 연결.
  function readJson(key) { try { return JSON.parse(localStorage.getItem(key) || "{}"); } catch (e) { return {}; } }
  function writeJson(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* 저장 불가 */ } }
  function placeQuery(e) {
    return (e.address || e.place || "").trim();
  }
  let geoChain = Promise.resolve();
  function geocode(e) {
    if (e.lat != null && e.lon != null) return Promise.resolve({ lat: e.lat, lon: e.lon });
    const q = placeQuery(e);
    if (!q) return Promise.resolve(null);
    const cache = readJson(GEO_KEY);
    if (cache[q] !== undefined) return Promise.resolve(cache[q]);
    const job = geoChain.then(() => new Promise((r) => setTimeout(r, 1100))).then(() =>
      fetch("https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=en&q=" + encodeURIComponent(q))
        .then((res) => res.json())
        .then((list) => {
          const hit = list && list[0] ? { lat: +list[0].lat, lon: +list[0].lon } : null;
          const c = readJson(GEO_KEY); c[q] = hit; writeJson(GEO_KEY, c);
          return hit;
        })
        .catch(() => null)
    );
    geoChain = job.catch(() => null);
    return job;
  }
  function haversineKm(a, b) {
    const R = 6371, rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
  }
  function osrm(profile, a, b) {
    const url = "https://routing.openstreetmap.de/" + profile + "/route/v1/driving/" + a.lon + "," + a.lat + ";" + b.lon + "," + b.lat + "?overview=full&geometries=geojson";
    return fetch(url).then((res) => res.json()).then((d) => {
      if (!d.routes || !d.routes[0]) throw new Error("no route");
      return { sec: d.routes[0].duration, m: d.routes[0].distance, line: d.routes[0].geometry.coordinates };
    });
  }
  function routeLeg(a, b) {
    const key = [a.lat, a.lon, b.lat, b.lon].map((n) => n.toFixed(5)).join(",");
    const cache = readJson(LEG_KEY);
    if (cache[key]) return Promise.resolve(cache[key]);
    const km = haversineKm(a, b);
    const settle = (p) => p.then((v) => v, () => null);
    return Promise.all([settle(osrm("routed-foot", a, b)), settle(osrm("routed-car", a, b))]).then(([foot, car]) => {
      const leg = {
        km: foot ? foot.m / 1000 : car ? car.m / 1000 : km * 1.3,
        walkMin: foot ? Math.round(foot.sec / 60) : Math.round((km * 1.3) / 4.5 * 60),
        carMin: car ? Math.round(car.sec / 60) : Math.round((km * 1.4) / 30 * 60),
        estimated: !(foot && car),
        line: foot ? foot.line : car ? car.line : null
      };
      if (foot || car) { const c = readJson(LEG_KEY); c[key] = leg; writeJson(LEG_KEY, c); }
      return leg;
    });
  }
  function fmtMin(min) {
    if (min < 60) return min + "분";
    return Math.floor(min / 60) + "시간" + (min % 60 ? " " + (min % 60) + "분" : "");
  }
  function gmapsDir(from, to, mode) {
    const p = (e) => (e.lat != null && e.lon != null ? e.lat + "," + e.lon : placeQuery(e));
    return "https://www.google.com/maps/dir/?api=1" + (from ? "&origin=" + encodeURIComponent(p(from)) : "") +
      "&destination=" + encodeURIComponent(p(to)) + "&travelmode=" + mode;
  }

  // ---------- 화면: 일정 (지도 · 이동 시간) ----------
  let leafletLoading = null;
  function loadLeaflet() {
    if (window.L) return Promise.resolve(window.L);
    if (leafletLoading) return leafletLoading;
    leafletLoading = new Promise((resolve, reject) => {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(css);
      const js = document.createElement("script");
      js.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      js.onload = () => resolve(window.L);
      js.onerror = () => { leafletLoading = null; reject(new Error("지도를 불러오지 못했어요")); };
      document.head.appendChild(js);
    });
    return leafletLoading;
  }
  function renderSchedule(dateArg) {
    setHeader("여행 일정", dateArg ? "#/schedule" : null);
    setTab("schedule");
    if (!scheduleSheetUrl()) {
      view.innerHTML = '<div class="card" style="margin-top:6px" id="scheduleCard">' + scheduleCardHtml() + "</div>";
      bindScheduleCard(view);
      return;
    }
    const data = readSchedule();
    if (!data || data.link !== scheduleSheetUrl()) {
      view.innerHTML = '<div class="card muted" style="margin-top:6px">일정을 불러오는 중이에요…</div>';
      refreshSchedule(true).then(() => renderSchedule(dateArg)).catch((e) => {
        view.innerHTML = '<div class="card" style="margin-top:6px">⚠️ ' + esc(e.message) + '<br><button class="btn secondary" data-act="schedule-setup" style="margin-top:10px">시트 연결 다시 하기</button></div>';
        bindScheduleCard(view);
      });
      return;
    }
    const dates = Array.from(new Set(data.events.map((e) => e.date)));
    if (!dates.length) { view.innerHTML = '<div class="card muted" style="margin-top:6px">시트에 일정이 없어요.</div>'; return; }
    const show = scheduleDayToShow(data.events);
    const date = dates.indexOf(dateArg) >= 0 ? dateArg : show ? show.date : dates[dates.length - 1];
    const events = data.events.filter((e) => e.date === date);

    let html =
      '<div class="date-chips">' + dates.map((d) => '<button class="chip ' + (d === date ? "on" : "") + '" data-date="' + d + '">' + koDate(d) + "</button>").join("") + "</div>" +
      '<div id="tripMap" class="trip-map"><div class="small muted" style="padding:12px">지도를 불러오는 중이에요…</div></div>' +
      '<div class="timeline">';
    events.forEach((e, i) => {
      if (i > 0) html += '<div class="leg" id="leg-' + i + '"><div class="small muted">🧭 이동 시간 계산 중…</div></div>';
      html +=
        '<div class="card sch-item">' +
          '<div class="row"><span class="sch-num">' + (i + 1) + '</span><div class="grow"><div class="small muted">' + esc(timeRange(e)) + "</div>" +
          '<div class="headline-sm">' + esc(e.title) + "</div></div></div>" +
          (e.place || e.address ? '<div class="small" style="margin-top:6px">📍 ' + esc(e.place || "") + (e.address && e.address !== e.place ? ' <span class="muted">' + esc(e.address) + "</span>" : "") + "</div>" : "") +
          (e.memo ? '<div class="small sch-memo">📝 ' + esc(e.memo) + "</div>" : "") +
          (placeQuery(e) || e.lat != null ? '<div class="btn-row" style="margin-top:10px">' +
            '<a class="btn ghost" target="_blank" rel="noopener" style="text-align:center;text-decoration:none;font-size:14px" href="' + gmapsDir(null, e, "transit") + '">📍 지금 위치에서 가는 길</a>' +
          "</div>" : "") +
        "</div>";
    });
    html += "</div>" +
      '<p class="small muted">🚶 도보 · 🚗 차 시간은 OpenStreetMap 경로 기준 예상 시간이에요. 버스·트램·지하철은 🚇 버튼을 누르면 구글 지도에서 실시간 노선과 시간을 볼 수 있어요.</p>' +
      '<div class="btn-row"><button class="btn ghost" data-act="reload">🔄 시트에서 다시 불러오기</button></div>' +
      '<p class="small muted">' + new Date(data.fetchedAt).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" }) + " 시트에서 불러옴</p>";
    view.innerHTML = html;
    view.querySelectorAll("[data-date]").forEach((b) => { b.onclick = () => (dateArg ? navigate("#/schedule/" + b.dataset.date) : renderSchedule(b.dataset.date)); });
    view.querySelector('[data-act="reload"]').onclick = () => {
      refreshSchedule(true).then(() => { toast("일정을 새로 불러왔어요"); renderSchedule(date); }).catch((e) => toast("⚠️ " + e.message));
    };
    const token = ++scheduleToken;
    // 좌표 찾기 → 이동 시간 → 지도
    Promise.all(events.map(geocode)).then((points) => {
      if (token !== scheduleToken) return;
      const legs = [];
      events.forEach((e, i) => {
        if (i === 0) return;
        const el = document.getElementById("leg-" + i);
        const a = points[i - 1], b = points[i];
        if (!a || !b) {
          if (el) el.innerHTML = '<div class="small muted">위치를 찾지 못해 이동 시간을 계산할 수 없어요. 시트에 주소를 적어 주세요.</div>' +
            (placeQuery(events[i]) ? '<a class="leg-btn" target="_blank" rel="noopener" href="' + gmapsDir(events[i - 1], events[i], "transit") + '">🚇 대중교통 길찾기</a>' : "");
          return;
        }
        const from = Object.assign({}, events[i - 1], a), to = Object.assign({}, events[i], b);
        // 비행기·장거리 기차처럼 먼 이동은 도보·차 시간을 계산하지 않아요.
        const far = haversineKm(a, b);
        if (far > 150) {
          if (el) el.innerHTML = '<div class="leg-times">✈️ 장거리 이동 · 직선거리 약 ' + Math.round(far).toLocaleString("ko-KR") + "km</div>" +
            '<div class="small muted">비행기·기차 시간은 예약 내역을 확인하세요.</div>';
          return;
        }
        legs.push(routeLeg(a, b).then((leg) => {
          if (token !== scheduleToken) return leg;
          if (el) el.innerHTML =
            '<div class="leg-times">' + (leg.estimated ? "약 " : "") + "🚶 도보 <b>" + fmtMin(leg.walkMin) + "</b> · 🚗 차 <b>" + fmtMin(leg.carMin) + "</b> · " + leg.km.toFixed(1) + "km</div>" +
            '<div class="leg-btns">' +
              '<a class="leg-btn" target="_blank" rel="noopener" href="' + gmapsDir(from, to, "transit") + '">🚇 대중교통</a>' +
              '<a class="leg-btn" target="_blank" rel="noopener" href="' + gmapsDir(from, to, "walking") + '">🚶 도보</a>' +
              '<a class="leg-btn" target="_blank" rel="noopener" href="' + gmapsDir(from, to, "driving") + '">🚕 택시</a>' +
            "</div>";
          return leg;
        }));
      });
      return Promise.all(legs).then((legResults) => drawTripMap(token, points, events, legResults));
    });
  }
  let scheduleToken = 0;
  function drawTripMap(token, points, events, legs) {
    const box = document.getElementById("tripMap");
    if (!box || token !== scheduleToken) return;
    const pts = points.map((p, i) => (p ? { p: p, i: i } : null)).filter(Boolean);
    if (!pts.length) { box.innerHTML = '<div class="small muted" style="padding:12px">지도에 표시할 위치가 없어요. 시트에 장소나 주소를 적어 주세요.</div>'; return; }
    loadLeaflet().then((L) => {
      if (token !== scheduleToken || !document.getElementById("tripMap")) return;
      box.innerHTML = "";
      const map = L.map(box, { zoomControl: true, attributionControl: true });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(map);
      const bounds = [];
      pts.forEach(({ p, i }) => {
        const icon = L.divIcon({ className: "map-num", html: "<span>" + (i + 1) + "</span>", iconSize: [28, 28], iconAnchor: [14, 14] });
        L.marker([p.lat, p.lon], { icon: icon }).addTo(map).bindPopup("<b>" + esc(events[i].title) + "</b><br>" + esc(timeRange(events[i])));
        bounds.push([p.lat, p.lon]);
      });
      (legs || []).forEach((leg) => {
        if (leg && leg.line) L.polyline(leg.line.map((c) => [c[1], c[0]]), { color: "#2f6fdf", weight: 4, opacity: 0.75 }).addTo(map);
      });
      if (bounds.length === 1) map.setView(bounds[0], 15);
      else map.fitBounds(bounds, { padding: [30, 30] });
    }).catch(() => {
      box.innerHTML = '<div class="small muted" style="padding:12px">지도를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.</div>';
    });
  }

  // ---------- 화면: 환율 · 날씨 ----------
  function renderInfo() {
    setHeader("환율 · 날씨", null);
    setTab("info");
    view.innerHTML =
      '<div class="section-title" style="margin-top:6px">🌤️ 지금 날씨</div>' +
      '<div class="card weather" id="weatherCard">' + weatherCardHtml(readWeather()) + "</div>" +
      '<div class="section-title">💱 오늘의 환율</div>' +
      '<div class="card rates" id="ratesCard">' + ratesCardHtml(readRates()) + "</div>";
    bindRatesCard(view);
    refreshRates();
    refreshWeather();
  }

  // ---------- 설정 ----------
  function settingsHtml() {
    loadVoices();
    const s = state.settings;
    const voiceOpts =
      '<option value="">자동 선택</option>' +
      voices.map((v) => '<option value="' + esc(v.voiceURI) + '"' + (v.voiceURI === s.voiceURI ? " selected" : "") + ">" + esc(v.name + " (" + v.lang + ")") + "</option>").join("");
    return (
      '<div class="section-title" style="margin-top:6px">✈️ 여행</div>' +
      '<div class="card">' +
        '<div class="field"><label>📅 일정 구글 시트</label><button class="btn ghost block" id="openSheet">' + (scheduleSheetUrl() ? "✅ 연결됨 · 바꾸기" : "연결하기") + "</button></div>" +
        '<div class="field" style="margin-bottom:0"><label>✈️ 핀란드 출발일</label><input type="date" id="setDeparture" value="' + esc(s.departure || "") + '"></div>' +
      "</div>" +
      '<div class="section-title">🔊 발음</div>' +
      '<div class="card">' +
        '<div class="field"><label>발음 (억양)</label><select id="setAccent">' +
          '<option value="en-US"' + (s.accent === "en-US" ? " selected" : "") + ">🇺🇸 미국식</option>" +
          '<option value="en-GB"' + (s.accent === "en-GB" ? " selected" : "") + ">🇬🇧 영국식</option>" +
          '<option value="en-AU"' + (s.accent === "en-AU" ? " selected" : "") + ">🇦🇺 호주식</option>" +
        "</select></div>" +
        '<div class="field"><label>목소리</label><select id="setVoice">' + voiceOpts + "</select></div>" +
        '<div class="field"><label>말하기 속도: <span id="rateVal">' + s.rate.toFixed(1) + '</span>x</label><input type="range" id="setRate" min="0.5" max="1.3" step="0.1" value="' + s.rate + '"></div>' +
        '<button class="btn secondary block" id="testVoice">🔊 들어 보기</button>' +
      "</div>" +
      '<div class="section-title">🛠️ 앱</div>' +
      '<div class="card">' +
        '<button class="btn ghost block" id="forceUpdate">🔄 최신 버전으로 새로고침</button>' +
        '<button class="btn ghost block" id="resetProgress" style="margin-top:8px">학습 기록 초기화</button>' +
        '<p class="small muted" style="margin:12px 0 0">앱 버전 ' + APP_VERSION + " · " +
          (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches ? "홈 화면 앱으로 실행 중" : "브라우저에서 실행 중") + "</p>" +
        '<p class="small muted" style="margin:10px 0 0">💡 홈 화면에 추가하면 앱처럼 쓸 수 있어요.<br>아이폰: 사파리 공유 버튼 → "홈 화면에 추가"<br>안드로이드: 크롬 메뉴 → "홈 화면에 추가"</p>' +
      "</div>"
    );
  }
  function bindSettings(root) {
    const s = state.settings;
    root.querySelector("#setAccent").onchange = (e) => { s.accent = e.target.value; s.voiceURI = ""; save(); renderSettings(); };
    root.querySelector("#setDeparture").onchange = (e) => { s.departure = e.target.value; save(); toast(departureLabel() || "출발일을 지웠어요."); };
    root.querySelector("#setVoice").onchange = (e) => { s.voiceURI = e.target.value; save(); };
    root.querySelector("#setRate").oninput = (e) => { s.rate = parseFloat(e.target.value); root.querySelector("#rateVal").textContent = s.rate.toFixed(1); save(); };
    root.querySelector("#testVoice").onclick = (e) => speakButton(e.currentTarget, "Hello! Welcome to Finland. Let's practice English together.");
    root.querySelector("#resetProgress").onclick = () => {
      if (confirm("모든 학습 기록을 지울까요?")) { state.progress = {}; save(); toast("기록을 초기화했어요."); }
    };
    root.querySelector("#openSheet").onclick = openScheduleSetup;
    root.querySelector("#forceUpdate").onclick = () => {
      // 저장해 둔 앱 파일을 지우고 서버에서 새로 받아요. (학습 기록은 그대로)
      const jobs = [];
      if (window.caches) jobs.push(caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))));
      if (navigator.serviceWorker) jobs.push(navigator.serviceWorker.getRegistrations().then((rs) => Promise.all(rs.map((r) => r.unregister()))));
      Promise.all(jobs).catch(() => {}).then(() => location.replace(location.pathname + "?v=" + Date.now() + "#/"));
    };
  }
  function renderSettings() {
    setHeader("설정", null);
    setTab("settings");
    view.innerHTML = settingsHtml();
    bindSettings(view);
  }
  updateTabLinks();

  // ---------- 라우터 ----------
  function route() {
    scheduleToken++;
    stopSpeaking();
    document.querySelectorAll(".confetti").forEach((el) => el.remove());
    closeModal();
    const parts = (location.hash.replace(/^#\/?/, "") || "").split("/").filter(Boolean);
    const [a, b, c] = parts;
    if (a === "words" && b && c === "list") renderWordList(b);
    else if (a === "words" && b) renderWordStudy(b);
    else if (a === "words") renderWordsHome();
    else if (a === "travel" && b) renderTravelTopic(b);
    else if (a === "travel") renderTravelHome();
    else if (a === "news" && b) renderArticle(b);
    else if (a === "news") renderNewsHome();
    else if (a === "places") renderPlaces(b);
    else if (a === "schedule") renderSchedule(b);
    else if (a === "info") renderInfo();
    else if (a === "settings") renderSettings();
    else renderHome();
    window.scrollTo(0, 0);
  }
  // ---------- 화면 이동과 뒤로 가기 ----------
  // 방문 기록을 '홈 → 탭 → 상세' 최대 3단계로만 쌓습니다.
  // 그래서 어디서든 뒤로 가기를 누르면 한 단계씩 올라가고, 홈에서 누르면 앱이 바로 종료돼요.
  function normHash(h) {
    const parts = (h || "").replace(/^#\/?/, "").split("/").filter(Boolean);
    return parts.length ? "#/" + parts.join("/") : "#/";
  }
  function levelOf(h) {
    return Math.min(normHash(h).replace(/^#\/?/, "").split("/").filter(Boolean).length, 2);
  }
  function currentDepth() {
    return (history.state && history.state.depth) || 1;
  }
  function navigate(target) {
    target = normHash(target);
    const cur = normHash(location.hash);
    if (target === cur) { route(); return; }
    const depth = currentDepth();
    const level = levelOf(target);
    if (level === 0) {
      // 홈으로: 쌓인 기록을 되돌려 홈 하나만 남깁니다.
      if (depth > 1) history.go(-(depth - 1));
      else { history.replaceState({ depth: 1 }, "", target); route(); }
      return;
    }
    const isChild = target.indexOf(cur + "/") === 0 && cur !== "#/";
    if (cur === "#/" || (isChild && depth < 3)) {
      history.pushState({ depth: depth + 1 }, "", target);
    } else if (level === 2 && depth === 2 && levelOf(cur) === 1) {
      history.pushState({ depth: 3 }, "", target);
    } else {
      history.replaceState({ depth: depth }, "", target);
    }
    route();
  }
  // 화면 위 '‹' 버튼이나 연습 완료 후 돌아가기: 바로 아래 기록이 그 화면이면 뒤로, 아니면 이동
  function goBack(fallback) {
    const depth = currentDepth();
    const level = levelOf(fallback);
    if (level === 0 && depth > 1) { history.go(-(depth - 1)); return; }
    // 홈 → 탭 → 상세로 들어온 경우, 바로 아래 기록이 그 탭이에요.
    if (level === 1 && depth === 3) { history.back(); return; }
    navigate(fallback);
  }
  // 앱 안의 모든 '#/…' 링크를 가로채서 위 규칙대로 이동합니다.
  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    navigate(a.getAttribute("href"));
  });
  window.addEventListener("popstate", route);
  window.addEventListener("hashchange", () => {
    // 주소창에서 직접 바꾼 경우
    if (!history.state) history.replaceState({ depth: levelOf(location.hash) ? 2 : 1 }, "", normHash(location.hash));
    route();
  });
  // 첫 실행: 홈이 아닌 주소로 열렸으면 아래에 홈을 깔아 두어 뒤로 가기가 홈으로 가게 합니다.
  (function initHistory() {
    const start = normHash(location.hash);
    if (history.state && history.state.depth) return;
    if (start === "#/") {
      history.replaceState({ depth: 1 }, "", "#/");
    } else {
      history.replaceState({ depth: 1 }, "", "#/");
      history.pushState({ depth: 2 }, "", start);
    }
  })();
  route();
  // 실시간 뉴스를 불러오면 홈/뉴스 화면을 다시 그립니다.
  loadLiveNews().then(() => {
    if (!liveNews.length || !overlay.hidden) return;
    const tab = location.hash.replace(/^#\/?/, "").split("/")[0] || "";
    if (tab === "" || tab === "news") route();
  });

  // ---------- 오프라인 지원 ----------
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then((reg) => {
      // 앱으로 돌아올 때마다 새 버전이 있는지 확인
      document.addEventListener("visibilitychange", () => { if (!document.hidden) reg.update().catch(() => {}); });
    }).catch(() => {});
  }
})();

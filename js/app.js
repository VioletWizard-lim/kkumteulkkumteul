/* 꿈틀꿈틀 핀란드 준비 앱 */
(function () {
  "use strict";

  // ---------- 저장소 ----------
  const STORE_KEY = "kkumteul.v1";
  const defaults = { progress: {}, settings: { accent: "en-US", rate: 0.9, voiceURI: "", departure: "2027-01-08" } };
  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return structuredClone(defaults);
      const data = JSON.parse(raw);
      return { progress: data.progress || {}, settings: Object.assign({}, defaults.settings, data.settings) };
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
    backBtn.onclick = back ? () => (location.hash = back) : null;
  }
  function setTab(tab) {
    document.querySelectorAll(".tabbar a").forEach((a) => a.classList.toggle("active", a.dataset.tab === tab));
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
      newsCard(news.article, news.label)
    ));
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
        showPraise(b.label + " 표현 10개 완료!", () => (location.hash = "#/words"));
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
        showPraise("'" + t.title + "' 회화 연습 완료!", () => (location.hash = "#/travel"));
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

  // ---------- 설정 ----------
  function openSettings() {
    loadVoices();
    const s = state.settings;
    const voiceOpts =
      '<option value="">자동 선택</option>' +
      voices.map((v) => '<option value="' + esc(v.voiceURI) + '"' + (v.voiceURI === s.voiceURI ? " selected" : "") + ">" + esc(v.name + " (" + v.lang + ")") + "</option>").join("");
    openModal(
      '<div class="modal left">' +
        '<h3>⚙︎ 설정</h3>' +
        '<div class="field"><label>✈️ 핀란드 출발일</label><input type="date" id="setDeparture" value="' + esc(s.departure || "") + '"></div>' +
        '<div class="field"><label>발음 (억양)</label><select id="setAccent">' +
          '<option value="en-US"' + (s.accent === "en-US" ? " selected" : "") + ">🇺🇸 미국식</option>" +
          '<option value="en-GB"' + (s.accent === "en-GB" ? " selected" : "") + ">🇬🇧 영국식</option>" +
          '<option value="en-AU"' + (s.accent === "en-AU" ? " selected" : "") + ">🇦🇺 호주식</option>" +
        "</select></div>" +
        '<div class="field"><label>목소리</label><select id="setVoice">' + voiceOpts + "</select></div>" +
        '<div class="field"><label>말하기 속도: <span id="rateVal">' + s.rate.toFixed(1) + '</span>x</label><input type="range" id="setRate" min="0.5" max="1.3" step="0.1" value="' + s.rate + '"></div>' +
        '<div class="btn-row" style="margin-bottom:10px"><button class="btn secondary" id="testVoice">🔊 들어 보기</button></div>' +
        '<div class="btn-row"><button class="btn ghost" id="resetProgress">기록 초기화</button><button class="btn" id="closeSettings">닫기</button></div>' +
        '<p class="small muted" style="margin-top:14px">💡 홈 화면에 추가하면 앱처럼 쓸 수 있어요.<br>아이폰: 사파리 공유 버튼 → "홈 화면에 추가"<br>안드로이드: 크롬 메뉴 → "홈 화면에 추가"</p>' +
      "</div>",
      (root) => {
        root.querySelector("#setAccent").onchange = (e) => { s.accent = e.target.value; s.voiceURI = ""; save(); openSettings(); };
        root.querySelector("#setDeparture").onchange = (e) => { s.departure = e.target.value; save(); route(); toast(departureLabel() || "출발일을 지웠어요."); };
        root.querySelector("#setVoice").onchange = (e) => { s.voiceURI = e.target.value; save(); };
        root.querySelector("#setRate").oninput = (e) => { s.rate = parseFloat(e.target.value); root.querySelector("#rateVal").textContent = s.rate.toFixed(1); save(); };
        root.querySelector("#testVoice").onclick = (e) => speakButton(e.currentTarget, "Hello! Welcome to Finland. Let's practice English together.");
        root.querySelector("#resetProgress").onclick = () => {
          if (confirm("모든 학습 기록을 지울까요?")) { state.progress = {}; save(); closeModal(); route(); toast("기록을 초기화했어요."); }
        };
        root.querySelector("#closeSettings").onclick = closeModal;
      }
    );
  }
  document.getElementById("settingsBtn").onclick = openSettings;

  // ---------- 라우터 ----------
  function route() {
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
    else renderHome();
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", route);
  route();
  // 실시간 뉴스를 불러오면 홈/뉴스 화면을 다시 그립니다.
  loadLiveNews().then(() => {
    if (!liveNews.length || !overlay.hidden) return;
    const tab = location.hash.replace(/^#\/?/, "").split("/")[0] || "";
    if (tab === "" || tab === "news") route();
  });

  // ---------- 오프라인 지원 ----------
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();

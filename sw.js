// 오프라인에서도 앱을 열 수 있도록 파일을 캐시합니다.
// CACHE 이름은 배포할 때마다 GitHub Actions 가 새 버전으로 바꿔 넣어요 (.github/workflows/pages.yml).
// 이 파일 내용이 바뀌면 휴대폰이 새 버전을 설치하고, 앱이 한 번 새로고침돼요.
const CACHE = "kkumteul-__APP_VERSION__";
const FILES = [
  "./",
  "index.html",
  "css/style.css",
  "js/app.js",
  "js/config.js",
  "js/data/words.js",
  "js/data/words-morning-2.js",
  "js/data/words-morning-3.js",
  "js/data/words-morning-4.js",
  "js/data/words-lunch-2.js",
  "js/data/words-lunch-3.js",
  "js/data/words-lunch-4.js",
  "js/data/words-evening-2.js",
  "js/data/words-evening-3.js",
  "js/data/words-evening-4.js",
  "js/data/words-evening-5.js",
  "js/data/examples-ko.js",
  "js/data/travel.js",
  "js/data/news.js",
  "js/data/messages.js",
  "js/data/places.js",
  "manifest.webmanifest",
  "icons/icon.svg",
  "icons/icon-192.png",
  "icons/icon-512.png"
];

self.addEventListener("install", (e) => {
  // cache: "reload" → 휴대폰에 남아 있는 예전 파일이 아니라 서버의 최신 파일로 저장해요.
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: "reload" }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 네트워크 우선, 실패하면 캐시 사용
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  // cache: "no-cache" → 매번 서버에 바뀐 파일이 있는지 확인해요(안 바뀌었으면 짧은 응답만 받아요).
  // 그래서 새 버전을 배포하면 다음에 앱을 열 때 바로 반영돼요.
  e.respondWith(
    fetch(e.request, { cache: "no-cache" })
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match("index.html")))
  );
});

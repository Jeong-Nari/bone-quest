/* Bone Quest 2.0 — 서비스워커 (오프라인)
   이 파일은 tools/build.mjs가 만든다. 직접 고치지 말고 tools/sw.template.js를 고친 뒤 빌드할 것.
   - 설치 시 앱 파일 전체를 저장해 두어, 인터넷이 없어도 열린다.
   - 화면·코드(html/js/css/manifest)는 인터넷이 되면 새 것을 받고, 안 되면 저장본을 쓴다.
   - 이미지·폰트는 저장본을 바로 쓴다 (바뀌면 VERSION이 바뀌어 새로 받는다). */
const VERSION = "__VERSION__";
const CACHE = `bonequest-v2-${VERSION}`;
const FILES = __FILES__;

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: "reload" }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("bonequest-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const isCode = (url) => url.pathname.endsWith("/") || /\.(html|js|css|webmanifest)$/.test(url.pathname);

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  if (req.mode === "navigate" || isCode(url)) {
    // 새 것 먼저, 실패하면 저장본
    e.respondWith(
      fetch(new Request(req, { cache: "no-cache" })).then((res) => {   // HTTP 캐시(깃허브 페이지 10분)를 건너뛰고 확인
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      }).catch(() => caches.match(req, { ignoreSearch: true })
        .then((hit) => hit || (req.mode === "navigate" ? caches.match("./index.html") : undefined))
        .then((hit) => hit || Response.error()))
    );
    return;
  }
  // 이미지·폰트: 저장본 먼저
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }))
  );
});

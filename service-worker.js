self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // 활성화 시
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});

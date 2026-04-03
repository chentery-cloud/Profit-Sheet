const CACHE_NAME = 'phumans-cache-v1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  'https://raw.githubusercontent.com/chentery-cloud/Profit-Sheet/main/icons/icon-192.png',
  'https://raw.githubusercontent.com/chentery-cloud/Profit-Sheet/main/icons/icon-512.png'
];

// 1. 서비스 워커 설치 및 파일 캐싱
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// 2. 네트워크 요청 가로채기 (캐시된 데이터가 있으면 먼저 보여줌 -> 로딩 속도 극대화)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response; // 캐시에서 반환
        }
        return fetch(event.request); // 네트워크에서 가져옴
      })
  );
});

// 3. 구버전 캐시 삭제
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

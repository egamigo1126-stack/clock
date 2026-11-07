// Service Worker: ページの裏で動き、ファイルをスマホの中（キャッシュ）に保存しておくプログラム。
//
// 方針:
//   - 自分のファイル（index.html など）: まずネットから最新を取りに行く。取れなければ保存してある版を出す。
//     → 電波があるときは常に最新版、電波がないときも開ける。
//   - Google Fonts のフォント: 一度取ったら保存してある版を使う（フォントは変わらないので）。
//
// 中身を大きく変えたときは CACHE の番号を上げる。古い保存は自動で消える。
const CACHE = "clock-v5";

// 最初に保存しておくファイルの一覧
const FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
];

// インストールされたとき: ファイルをまとめて保存する
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)));
  self.skipWaiting();   // 新しい版をすぐ使い始める
});

// 有効になったとき: 番号の違う古い保存を消す
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ページがファイルを読み込もうとしたとき
self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Google Fonts: 保存してあればそれを使う。なければ取りに行って保存する
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(cache => cache.put(req, copy));
        return res;
      }))
    );
    return;
  }

  // 自分のファイル: ネットを先に試し、だめなら保存してある版
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(cache => cache.put(req, copy));
        return res;
      }).catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || caches.match("./index.html")))
    );
  }
});

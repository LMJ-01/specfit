// IndexNow ping — 배포 뒤에 바뀐 페이지를 검색엔진에 알립니다.
//
// 왜 있나: 새 글을 낼 때마다 네이버 서치어드바이저에 수동으로 수집 요청을
// 넣는 일을 없애기 위해서입니다. IndexNow 는 빙·네이버가 공식 참여하는
// 프로토콜이라, api.indexnow.org 한 곳에 보내면 참여사 전체에 전달됩니다.
// (구글은 참여하지 않습니다 — 구글은 기존대로 Search Console 색인 요청.)
//
// 쓰는 법 (배포 = main 푸시 후):
//   npm run ping                      ← 마지막 커밋에서 바뀐 페이지를 자동 감지
//   npm run ping -- HEAD~3            ← 최근 3커밋 범위로 감지
//   npm run ping -- /posts/foo.html   ← URL 경로를 직접 지정 (여러 개 가능)
//
// 응답 200/202 = 접수. 202 는 "받았고 키는 나중에 검증" 이라는 뜻으로 정상.
// ⚠️ ping 은 "알림"이지 색인 보장이 아닙니다. 남용(같은 URL 반복)은
//    무시당할 수 있으니 실제로 바뀐 페이지만 보냅니다.

import { execSync } from 'node:child_process';
import { request } from 'node:https';
import { config } from './config.js';

const host = new URL(config.siteUrl).host;
const key = config.indexNowKey;
if (!key) {
  console.error('config.indexNowKey 가 비어 있습니다.');
  process.exit(1);
}

// 인자: 경로(/...)면 그대로 URL 로, 아니면 git 범위로 해석합니다.
const args = process.argv.slice(2);
const explicit = args.filter((a) => a.startsWith('/'));
const range = args.find((a) => !a.startsWith('/')) || 'HEAD~1';

let paths;
if (explicit.length) {
  paths = explicit;
} else {
  // 마지막 커밋(또는 지정 범위)에서 바뀐 공개 HTML 만 추립니다.
  // 소스(src/)나 자산은 알릴 대상이 아닙니다.
  const diff = execSync(`git diff --name-only ${range} HEAD`, { encoding: 'utf8' });
  paths = diff
    .split('\n')
    .filter((f) => f.endsWith('.html') && !f.startsWith('src/'))
    .map((f) => (f === 'index.html' ? '/' : `/${f}`));
}

if (!paths.length) {
  console.log('알릴 페이지가 없습니다 (바뀐 공개 HTML 없음).');
  process.exit(0);
}

const body = JSON.stringify({
  host,
  key,
  keyLocation: `${config.siteUrl}/${key}.txt`,
  urlList: paths.map((p) => `${config.siteUrl}${p}`),
});

console.log(`IndexNow → ${paths.length}개 URL 전송:`);
for (const p of paths) console.log('  ' + p);

const req = request(
  {
    hostname: 'api.indexnow.org',
    path: '/indexnow',
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  },
  (res) => {
    console.log(`응답: ${res.statusCode} (200/202 = 접수)`);
    res.resume();
  }
);
req.on('error', (e) => {
  console.error('전송 실패:', e.message);
  process.exit(1);
});
req.end(body);

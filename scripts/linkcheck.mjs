// 내부 링크 검사기 — 배포 전 QA 도구 (사이트 출력물 아님).
//
// 왜 리포 안에 있나: 원래 세션 스크래치패드에 있었는데 컨테이너
// 리셋으로 사라져 linkcheck 없이 푸시된 사고(2026-09-19)가 있었음.
// 도구는 리포에 두어야 환경이 리셋돼도 살아남습니다.
//
// 검사 항목:
//  1) 글(src/content/posts/*.md) 본문의 /posts/*.html 링크가
//     실제 존재하는 글을 가리키는가 (깨진 링크)
//  2) 어떤 글에서도 링크받지 못하는 글이 있는가 (고아)
//
// 사용: node scripts/linkcheck.mjs  (리포 루트 기준 상대 경로 자동 해석)
// 출력: "글 N · 글→글 링크 N · 깨진 링크 N · 고아 N" — 깨짐/고아 0이 통과.

import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const postsDir = join(root, 'src', 'content', 'posts');

const files = readdirSync(postsDir).filter((f) => f.endsWith('.md'));
const slugs = new Set(files.map((f) => f.replace(/\.md$/, '')));

const inbound = new Map([...slugs].map((s) => [s, 0]));
let totalLinks = 0;
const broken = [];

for (const f of files) {
  const src = f.replace(/\.md$/, '');
  const body = readFileSync(join(postsDir, f), 'utf8');
  for (const m of body.matchAll(/\]\(\/posts\/([a-z0-9-]+)\.html[)#]/g)) {
    const target = m[1];
    totalLinks++;
    if (!slugs.has(target)) broken.push(`${src} → ${target}`);
    else if (target !== src) inbound.set(target, inbound.get(target) + 1);
  }
}

const orphans = [...inbound.entries()].filter(([, n]) => n === 0).map(([s]) => s);

for (const b of broken) console.error('깨진 링크: ' + b);
for (const o of orphans) console.error('고아 글: ' + o);
console.log(
  `글 ${slugs.size} · 글→글 링크 ${totalLinks} · 깨진 링크 ${broken.length} · 고아 ${orphans.length}`
);
if (broken.length || orphans.length) process.exit(1);

// 정적 사이트 생성기. 의존성 0 — `node src/build.js` 만 하면 됩니다.
//
// 왜 정적 HTML 로 뽑는가:
//   글을 JS 로 렌더링하면 색인이 느리고 불확실합니다.
//   6개월 안에 검색 유입을 만들어야 하는 프로젝트에서는 감수할 수 없는 리스크입니다.
//   그렇다고 글 150개를 손으로 관리할 수도 없으므로 이 스크립트가 중간을 맡습니다.

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { config } from './config.js';
import { markdownToHtml, parseFrontmatter } from './markdown.js';
import { postPage, listPage, staticPage, toolPage } from './templates.js';
import { gpus, models, quants, contexts, useCases, lengths } from './gpu-data.js';

const toolData = { gpus, models, quants, contexts, useCases, lengths };

// 계산기에 쿠팡 링크가 하나라도 있으면, 계산기를 실은 페이지는 '제휴 페이지'입니다.
// 공정위 고지가 자동으로 붙어야 합니다 — 하단 표기나 누락은 수익 전액 몰수 사유입니다.
const toolHasAffiliate = gpus.some((g) => g.buy);

// 글 본문에 {{VRAM_TOOL}} 을 쓰면 그 자리에 계산기가 들어갑니다.
const TOOL_MARK = '{{VRAM_TOOL}}';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const contentDir = join(here, 'content');

const write = async (relPath, contents) => {
  const full = join(root, relPath);
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, contents, 'utf8');
  return relPath;
};

const readMarkdownDir = async (dir) => {
  if (!existsSync(dir)) return [];
  const names = (await readdir(dir)).filter((n) => n.endsWith('.md'));
  return Promise.all(
    names.map(async (name) => {
      const raw = await readFile(join(dir, name), 'utf8');
      const { data, body } = parseFrontmatter(raw);
      return { name, slug: data.slug || name.replace(/\.md$/, ''), data, body };
    })
  );
};

/**
 * 본문의 "자주 묻는 질문" 절을 뽑아 FAQPage 구조화 데이터로 만듭니다.
 * 글을 두 번 쓰지 않아도 리치 결과가 붙습니다.
 */
function extractFaq(markdown) {
  const lines = markdown.split('\n');
  const start = lines.findIndex((l) => /^##\s+.*(자주 묻는 질문|FAQ)/i.test(l));
  if (start === -1) return [];

  const faq = [];
  let current = null;

  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^##\s/.test(line)) break;

    const q = /^###\s+(.*)$/.exec(line);
    if (q) {
      if (current && current.a) faq.push(current);
      current = { q: q[1].trim(), a: '' };
      continue;
    }
    if (current && line.trim() && !/^[#>`|-]/.test(line)) {
      current.a += (current.a ? ' ' : '') + line.trim();
    }
  }
  if (current && current.a) faq.push(current);

  return faq;
}

async function build() {
  const written = [];
  const warnings = [];

  // ---- 글 ----
  const rawPosts = await readMarkdownDir(join(contentDir, 'posts'));

  const posts = rawPosts
    .filter((p) => p.data.draft !== true)
    .map((p) => {
      const faq = extractFaq(p.body);
      const usesTool = p.body.includes(TOOL_MARK);
      return {
        toolData: usesTool ? toolData : null,
        slug: p.slug,
        url: `/posts/${p.slug}.html`,
        title: p.data.title || p.slug,
        description: p.data.description || '',
        date: p.data.date || '1970-01-01',
        updated: p.data.updated || '',
        category: p.data.category || '',
        tags: Array.isArray(p.data.tags) ? p.data.tags : [],
        // 계산기를 실은 글은 계산기 안의 제휴 링크 때문에 자동으로 제휴 페이지가 됩니다.
        affiliate: p.data.affiliate === true || (usesTool && toolHasAffiliate),
        image: p.data.image || '',
        faq,
        html: markdownToHtml(p.body).replace(
          new RegExp(TOOL_MARK.replace(/[{}]/g, '\\$&'), 'g'),
          '<div data-vram-tool></div>'
        ),
        text: p.body.replace(/[#>*`|_-]/g, ' ').replace(/\s+/g, ' ').trim(),
      };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  // 품질 점검 — seo-checklist.md 항목을 빌드 때 강제합니다.
  for (const p of posts) {
    if (!p.description) warnings.push(`${p.slug}: description 없음 (검색 스니펫에 불리)`);
    if (p.description.length > 160)
      warnings.push(`${p.slug}: description 이 ${p.description.length}자 (160자 이하 권장)`);
    if (!p.category) warnings.push(`${p.slug}: category 없음 (목록에서 누락됨)`);
    if (p.title.length > 60)
      warnings.push(`${p.slug}: 제목이 ${p.title.length}자 (검색결과에서 잘림)`);
    // 제휴 링크가 있는데 affiliate 플래그가 없으면 고지가 안 붙습니다 → 수익 몰수 위험
    if (!p.affiliate && /coupang\.|coupa\.ng/.test(p.html))
      warnings.push(`${p.slug}: 제휴 링크가 있는데 affiliate: true 가 없습니다 ⚠️`);
  }

  for (const post of posts) {
    const related = posts
      .filter((o) => o.slug !== post.slug && o.category === post.category)
      .slice(0, 3);
    written.push(await write(post.url.slice(1), postPage(post, related)));
  }

  // ---- 홈 ----
  written.push(
    await write(
      'index.html',
      listPage({
        posts,
        title: config.siteName,
        description: config.description,
        path: '/',
        heading: `${config.siteName} — ${config.tagline}`,
        intro: config.description,
        searchable: true,
      })
    )
  );

  // ---- 카테고리 ----
  for (const cat of config.categories) {
    const inCat = posts.filter((p) => p.category === cat.slug);
    written.push(
      await write(
        `${cat.slug}.html`,
        listPage({
          posts: inCat,
          title: cat.label,
          description: `${cat.description} — ${config.siteName}`,
          path: `/${cat.slug}.html`,
          heading: cat.label,
          intro: cat.description,
          searchable: false,
        })
      )
    );
  }

  // ---- 고정 페이지 ----
  const rawPages = await readMarkdownDir(join(contentDir, 'pages'));
  for (const page of rawPages) {
    written.push(
      await write(
        `${page.slug}.html`,
        staticPage({
          slug: page.slug,
          url: `/${page.slug}.html`,
          title: page.data.title || page.slug,
          description: page.data.description || '',
          html: markdownToHtml(page.body),
        })
      )
    );
  }

  // ---- 계산기 페이지 ----
  written.push(
    await write(
      'tools/vram.html',
      toolPage({
        title: 'VRAM 계산기 — 내 그래픽카드로 돌아가는 로컬 LLM',
        description:
          '그래픽카드를 고르면 어떤 크기의 로컬 LLM이 돌아가는지 바로 확인합니다. VRAM, 양자화, 컨텍스트 길이를 함께 계산합니다.',
        path: '/tools/vram.html',
        intro:
          '그래픽카드와 설정을 고르면 어떤 크기의 모델이 여유 있게 돌아가는지 표로 보여줍니다.',
        data: toolData,
        affiliate: toolHasAffiliate,
        body: markdownToHtml(`
## 내 그래픽카드 확인하는 법

모델명을 모르셔도 1분이면 확인됩니다.

**윈도우**

1. \`Ctrl\` + \`Shift\` + \`Esc\` 를 눌러 작업 관리자를 엽니다
2. **성능** 탭 → 왼쪽 목록에서 **GPU** 클릭
3. 오른쪽 위에 카드 이름이 나옵니다 (예: NVIDIA GeForce RTX 4060 Ti)
4. 오른쪽 아래 **전용 GPU 메모리**가 이 계산기에서 말하는 메모리입니다

**맥**

화면 왼쪽 위 사과 아이콘 → **이 Mac에 관하여**.
메모리 항목에 적힌 숫자를 그대로 고르시면 됩니다.

## 이 계산기가 실제로 계산하는 것

그래픽카드 메모리를 얼마나 쓰는지는 세 가지가 정합니다.

- **모델 자체의 크기** — 똑똑할수록 큽니다
- **한 번에 다루는 내용의 길이** — 길수록 메모리를 더 씁니다
- **여유 공간** — 프로그램이 돌아가는 데 필요한 몫

두 번째가 자주 놓치는 부분입니다.
**"처음엔 빨랐는데 대화가 길어지니 느려진다"**는 대부분 여기서 옵니다.
같은 모델이라도 긴 문서를 넣으면 메모리를 훨씬 많이 씁니다.

## 메모리가 모자라면 어떻게 되나요

**에러가 나지 않습니다. 그냥 느려집니다.** 이게 헷갈리는 지점입니다.

그래픽카드에 다 안 들어가면 프로그램이 나머지를 컴퓨터의 일반 메모리로 넘깁니다.
동작은 하지만 속도가 몇 배에서 수십 배까지 떨어집니다.

| 표시 | 뜻 |
|------|-----|
| 여유 | 쾌적하게 씁니다 |
| 빠듯 | 짧은 내용만 다루면 됩니다 |
| 느림 | 답답할 정도로 느려집니다 |
| 불가 | 사실상 못 씁니다 |

**"돌아간다"와 "쓸 만하다"는 다릅니다.**

## 이 결과를 얼마나 믿어야 하나요

**근사치입니다.** 실제로 쓰는 프로그램과 모델 종류에 따라 조금씩 달라집니다.

그래서 **경계선에 있다면 한 단계 위를 택하는 편이 안전합니다.**
메모리가 남는 것은 손해가 아니지만, 모자라면 아예 못 씁니다.

더 자세한 내용은 [Ollama 최소 사양 정리](/posts/ollama-minimum-spec.html)에 있습니다.
`),
      })
    )
  );

  // ---- 검색 인덱스 ----
  written.push(
    await write(
      'assets/search-index.json',
      JSON.stringify(
        posts.map((p) => ({
          u: p.url,
          t: p.title,
          d: p.description,
          c: p.category,
          k: `${p.title} ${p.description} ${p.tags.join(' ')} ${p.text.slice(0, 600)}`.toLowerCase(),
        }))
      )
    )
  );

  // ---- sitemap ----
  const urls = [
    { loc: '/', priority: '1.0' },
    { loc: '/tools/vram.html', priority: '0.9' },
    ...config.categories.map((c) => ({ loc: `/${c.slug}.html`, priority: '0.7' })),
    ...rawPages.map((p) => ({ loc: `/${p.slug}.html`, priority: '0.3' })),
    ...posts.map((p) => ({ loc: p.url, priority: '0.8', lastmod: p.updated || p.date })),
  ];

  const base = config.siteUrl.replace(/\/$/, '');
  written.push(
    await write(
      'sitemap.xml',
      `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url><loc>${base}${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}<priority>${u.priority}</priority></url>`
  )
  .join('\n')}
</urlset>`
    )
  );

  // ---- robots.txt ----
  // robots.txt 는 '크롤링' 제어입니다. 색인을 막으려면 noindex 를 써야 합니다.
  written.push(
    await write(
      'robots.txt',
      `User-agent: *
Allow: /

Sitemap: ${base}/sitemap.xml
`
    )
  );

  console.log(`\n생성 완료: ${written.length}개 파일`);
  console.log(`  글 ${posts.length} · 카테고리 ${config.categories.length} · 페이지 ${rawPages.length}`);

  if (warnings.length) {
    console.log(`\n⚠️  점검 필요 ${warnings.length}건`);
    for (const w of warnings) console.log(`  - ${w}`);
  }

  if (!config.siteUrl.startsWith('https://specfit')) {
    console.log(`\n💡 도메인 구매 후 src/config.js 의 siteUrl 을 바꾸세요.`);
  }
  console.log('');
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});

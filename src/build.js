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
import { postPage, listPage, staticPage, toolPage, fmtShort } from './templates.js';
import { gpus, models, quants, contexts, useCases, lengths } from './gpu-data.js';
import { figures } from './figures.js';
import { buyBox } from './products.js';

const toolData = { gpus, models, quants, contexts, useCases, lengths };

// 계산기에 쿠팡 링크가 하나라도 있으면, 계산기를 실은 페이지는 '제휴 페이지'입니다.
// 공정위 고지가 자동으로 붙어야 합니다 — 하단 표기나 누락은 수익 전액 몰수 사유입니다.
const toolHasAffiliate = gpus.some((g) => g.buy);

// 글 본문에 {{VRAM_TOOL}} 을 쓰면 그 자리에 계산기가 들어갑니다.
const TOOL_MARK = '{{VRAM_TOOL}}';

// {{COUPANG:rtx4070}} → 해당 카드의 쿠팡 상품 위젯.
// id 패턴을 좁히면 오타가 매칭되지 않아 자리표시자가 페이지에 그대로 노출됩니다.
// 무엇이든 잡아서 경고하고 제거합니다.
const WIDGET_RE = /\{\{COUPANG:([^}]*)\}\}/gi;

// {{FIG:vram-overflow}} → 본문 도해.
// 위젯과 같은 이유로 패턴을 넓게 잡습니다 — 오타가 매칭되지 않으면
// 자리표시자가 페이지에 그대로 노출됩니다.
const FIG_RE = /\{\{FIG:([^}]*)\}\}/gi;

/** 도해 자리표시자를 인라인 SVG 로 바꿉니다. */
function renderFigures(html, warn) {
  return html.replace(FIG_RE, (full, name) => {
    const make = figures[name.trim().toLowerCase()];
    if (!make) {
      warn(`알 수 없는 도해 이름: ${name} — figures.js 에 없는 항목입니다`);
      return '';
    }
    return make();
  });
}

// {{BUY:ram}} → GPU 가 아닌 제품의 구매 링크 박스.
const BUY_RE = /\{\{BUY:([^}]*)\}\}/gi;

function renderBuyLinks(html, warn) {
  return html.replace(BUY_RE, (full, id) => {
    const box = buyBox(id.trim().toLowerCase());
    if (!box) {
      warn(`알 수 없는 제품 id: ${id} — products.js 에 없는 항목입니다`);
      return '';
    }
    return box;
  });
}

/**
 * 위젯 자리표시자를 실제 iframe 으로 바꿉니다.
 *
 * iframe 은 늦게 로드되면서 아래 콘텐츠를 밀어냅니다(CLS).
 * 쿠팡 위젯 코드에 width/height 가 박혀 있으므로 그 값으로 자리를 미리 잡아둡니다.
 */
function renderWidgets(html, warn) {
  return html.replace(WIDGET_RE, (full, id) => {
    const gpu = gpus.find((g) => g.id === id.toLowerCase());
    if (!gpu) {
      warn(`알 수 없는 위젯 id: ${id} — gpu-data.js 에 없는 항목입니다`);
      return '';
    }
    if (!gpu.widget) {
      warn(`${gpu.name}: widget 코드가 비어 있어 ${full} 이 무시됨`);
      return '';
    }
    const h = /height="?(\d+)/.exec(gpu.widget);
    const reserve = h ? ` style="min-height:${h[1]}px"` : '';
    return `<div class="coupang-widget"${reserve}>${gpu.widget}</div>`;
  });
}

// 자리표시자만 홀로 있는 문단.
//
// 마크다운 변환기는 `{{FIG:x}}` 한 줄을 평범한 문단으로 봅니다. 그래서 치환하면
// <p><figure>…</figure></p> 가 되는데, figure·div 는 p 안에 올 수 없습니다.
// 브라우저가 알아서 p 를 닫아주기 때문에 화면은 멀쩡했고, 그래서 오래 안 보였습니다.
// 남는 것은 빈 </p> 하나와 유효하지 않은 HTML 입니다.
//
// 치환 전에 껍데기를 벗깁니다. 문단 안에 자리표시자 하나만 있을 때로 한정하므로
// 문장 중간에 쓴 경우는 그대로 둡니다.
const LONE_PLACEHOLDER_RE = /<p>(\{\{[^}]*\}\})<\/p>/g;

/**
 * 마크다운 → HTML 로 바꾼 뒤 자리표시자를 순서대로 채웁니다.
 *
 * 계산기 → 위젯 → 도해 → 구매 링크 순입니다.
 * 순서가 중요한 이유는 하나뿐입니다 — 마크다운 변환이 가장 먼저여야
 * 자리표시자 안의 내용이 마크다운으로 해석되지 않습니다.
 * 나머지는 서로 겹치지 않아 순서가 자유롭습니다.
 */
function renderShortcodes(body, warn) {
  const withTool = markdownToHtml(body)
    .replace(LONE_PLACEHOLDER_RE, '$1')
    .replace(new RegExp(TOOL_MARK.replace(/[{}]/g, '\\$&'), 'g'), '<div data-vram-tool></div>');
  return renderBuyLinks(renderFigures(renderWidgets(withTool, warn), warn), warn);
}

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
      // 위젯을 쓰면 그 자체가 제휴 링크이므로 공정위 고지가 붙어야 합니다.
      const usesWidget = WIDGET_RE.test(p.body);
      WIDGET_RE.lastIndex = 0; // 전역 정규식 상태 초기화
      return {
        toolData: usesTool ? toolData : null,
        usesWidget,
        slug: p.slug,
        url: `/posts/${p.slug}.html`,
        title: p.data.title || p.slug,
        description: p.data.description || '',
        date: p.data.date || '1970-01-01',
        updated: p.data.updated || '',
        category: p.data.category || '',
        tags: Array.isArray(p.data.tags) ? p.data.tags : [],
        // 계산기나 위젯을 실으면 그 안에 제휴 링크가 있으므로 자동으로 제휴 페이지가 됩니다.
        affiliate:
          p.data.affiliate === true || (usesTool && toolHasAffiliate) || usesWidget,
        image: p.data.image || '',
        faq,
        html: renderShortcodes(p.body, (msg) => warnings.push(`${p.slug}: ${msg}`)),
        text: p.body.replace(/[#>*`|_-]/g, ' ').replace(/\s+/g, ' ').trim(),
      };
    })
    // 최신순. 날짜가 같으면 slug 로 가릅니다.
    //
    // 0 을 반환하지 않는 비교 함수를 쓰면 같은 날짜끼리 순서가 뒤집힙니다.
    // 이 사이트는 하루에 여러 편을 올리는 일이 잦아서 실제로 그랬습니다.
    .sort((a, b) => (a.date === b.date ? a.slug.localeCompare(b.slug) : a.date < b.date ? 1 : -1));

  // ---- 메뉴 조립 ----
  // 카테고리를 손으로 적어두면 글이 쌓여도 메뉴에 안 나옵니다. 실제로 그랬습니다.
  // 글이 있는 카테고리만 자동으로 붙입니다 — 빈 카테고리로 보내면 헛걸음입니다.
  const activeCategories = config.categories.filter((c) =>
    posts.some((p) => p.category === c.slug)
  );
  config.nav = [
    ...config.nav,
    ...activeCategories.map((c) => ({ href: `/${c.slug}.html`, label: c.label })),
  ];
  for (const cat of config.categories) {
    if (!activeCategories.includes(cat)) {
      warnings.push(`카테고리 '${cat.slug}' 에 글이 없어 메뉴에서 빠집니다`);
    }
  }

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
  //
  // 홈은 목록이 아니라 안내판입니다.
  // 글을 전부 쏟으면 처음 온 사람은 제목만 훑다 나가고, 150편이 되면 더 심해집니다.
  //   진입 카드 → 카테고리 → 골라 읽기 좋은 글 → 새로 쓴 글 순으로 좁혀 갑니다.

  // 글이 있는 카테고리만. 빈 칸을 보여주면 헛걸음입니다.
  const catCards = config.categories
    .map((c) => ({ ...c, count: posts.filter((p) => p.category === c.slug).length }))
    .filter((c) => c.count > 0);

  const featured = config.featured
    .map((slug) => {
      const post = posts.find((p) => p.slug === slug);
      // 글을 지우거나 파일명을 바꾸면 여기가 조용히 비어버립니다. 경고로 잡습니다.
      if (!post) warnings.push(`config.featured 에 없는 글: ${slug} — 이름이 바뀌었거나 지워졌습니다`);
      return post;
    })
    .filter(Boolean);

  written.push(
    await write(
      'index.html',
      listPage({
        posts: posts.slice(0, config.postsPerPage),
        title: config.siteName,
        description: config.description,
        path: '/',
        heading: `${config.siteName} — ${config.tagline}`,
        intro: config.description,
        searchable: true,
        hero: true,
        catCards,
        featured,
        totalPosts: posts.length,
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

  // 개인정보처리방침과 실제 설정이 어긋나는지 점검합니다.
  // 쿠키를 쓰면서 안 쓴다고 적어두는 것도 부정확한 고지입니다.
  // 사람이 기억해서 맞추면 언젠가 빠뜨리므로 여기서 잡습니다.
  const privacy = rawPages.find((p) => p.slug === 'privacy');
  if (privacy) {
    const saysUnused = /구글 애널리틱스[^\n]*\n?[^\n]*사용하지 않습니다|애널리틱스\*\* — 사용하지 않습니다/.test(
      privacy.body
    );
    if (config.analytics.ga4 && saysUnused) {
      warnings.push(
        'privacy.md: 애널리틱스를 켰는데 "사용하지 않습니다" 로 적혀 있습니다 ⚠️ ' +
          '— 해당 절과 시행일을 고치세요'
      );
    }
    if (!config.analytics.ga4 && !saysUnused && /애널리틱스/.test(privacy.body)) {
      warnings.push(
        'privacy.md: 애널리틱스가 꺼져 있는데 쓴다고 적혀 있을 수 있습니다 — 확인하세요'
      );
    }
  }
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
      // 검색 결과는 홈의 '새로 쓴 글' 과 같은 모양으로 그려집니다.
      // 그래서 화면에 필요한 것(분류 이름·짧은 날짜)을 여기서 미리 만들어 둡니다.
      // slug 를 그대로 내보내면 결과에 'gpu' 같은 영문이 노출됩니다.
      JSON.stringify(
        posts.map((p) => {
          const cat = config.categories.find((c) => c.slug === p.category);
          return {
            u: p.url,
            t: p.title,
            d: p.description,
            c: cat ? cat.label : '',
            dt: fmtShort(p.date),
            k: `${p.title} ${p.description} ${p.tags.join(' ')} ${p.text.slice(0, 600)}`.toLowerCase(),
          };
        })
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

  // ---- ads.txt ----
  // 애드센스가 "이 사이트의 광고를 누가 팔 권한이 있는가" 를 확인하는 파일입니다.
  // 없으면 승인 후에도 "수익 손실 위험" 경고가 뜨고 광고 단가가 떨어질 수 있습니다.
  //
  // config.adsense.client 를 채우면 자동으로 생성됩니다.
  // 승인 전에는 만들지 않습니다 — 잘못된 게시자 ID 가 적힌 ads.txt 는 없느니만 못합니다.
  if (config.adsense.client) {
    // 'ca-pub-0000...' 에서 'ca-' 를 뗀 형태가 ads.txt 규격입니다.
    const pub = config.adsense.client.replace(/^ca-/, '');
    written.push(
      await write('ads.txt', `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`)
    );
  } else {
    console.log('\n💡 애드센스 승인 후 config.js 의 adsense.client 를 채우면');
    console.log('   광고 슬롯과 ads.txt 가 자동으로 생성됩니다.');
  }

  // ---- 남은 생성물 점검 ----
  // 카테고리를 지우거나 글을 삭제해도 예전 생성물이 그대로 남습니다.
  // 실제로 테스트용 카테고리를 지웠는데 cpu.html 이 배포까지 간 적이 있습니다.
  // 지우지는 않습니다 — 사람이 손으로 만든 파일을 지울 위험이 있기 때문입니다. 경고만 합니다.
  const expected = new Set(written.map((p) => p.replace(/\\/g, '/')));
  const scan = async (dir, prefix = '') => {
    for (const name of await readdir(join(root, dir || '.'))) {
      const rel = prefix ? `${prefix}/${name}` : name;
      if (['src', 'assets', 'node_modules', '.git', 'tools'].includes(rel)) continue;
      const full = join(root, rel);
      const stat = await import('node:fs/promises').then((m) => m.stat(full));
      if (stat.isDirectory()) await scan(rel, rel);
      else if (name.endsWith('.html') && !expected.has(rel))
        warnings.push(`생성물에 없는 HTML 이 남아 있습니다: ${rel} — 지워야 할 수 있습니다`);
    }
  };
  await scan('');

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

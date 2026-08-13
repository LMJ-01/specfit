import { config } from './config.js';
import { escapeHtml } from './markdown.js';

const abs = (path) =>
  `${config.siteUrl.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;

const fmtDate = (iso) => {
  const d = new Date(iso);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
};

// 테마 깜빡임 방지. 페인트 전에 실행되어야 하므로 인라인입니다.
const themeBoot = `(function(){try{var t=localStorage.getItem('theme');if(t)document.documentElement.setAttribute('data-theme',t)}catch(e){}})()`;

/**
 * 공통 레이아웃.
 * seo-checklist.md 의 테크니컬 항목을 여기서 한 번에 충족시킵니다.
 */
export function layout({
  title,
  description,
  path,
  body,
  jsonLd = [],
  ogImage,
  ogType = 'website',
  bodyClass = '',
  scripts = '',
}) {
  const canonical = abs(path);
  // og:image 는 PNG/JPG 여야 합니다. WebP 를 쓰면 카카오톡 공유 카드가 빕니다.
  const image = abs(ogImage || '/assets/og-default.png');
  const fullTitle =
    path === '/' ? `${config.siteName} — ${config.tagline}` : `${title} | ${config.siteName}`;

  const ld = jsonLd
    .filter(Boolean)
    .map(
      (obj) =>
        `<script type="application/ld+json">${JSON.stringify(obj, null, 0)}</script>`
    )
    .join('\n');

  return `<!doctype html>
<html lang="${config.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(fullTitle)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${canonical}">

<meta property="og:type" content="${ogType}">
<meta property="og:site_name" content="${escapeHtml(config.siteName)}">
<meta property="og:locale" content="${config.locale}">
<meta property="og:title" content="${escapeHtml(fullTitle)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${image}">
<meta name="twitter:card" content="summary_large_image">

<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/style.css">
<script>${themeBoot}</script>
${ld}
</head>
<body class="${bodyClass}">
<a class="skip-link" href="#main">본문으로 건너뛰기</a>

<header class="site-header">
  <div class="wrap header-inner">
    <a class="brand" href="/">
      <span class="brand-name">${escapeHtml(config.siteName)}</span>
      <span class="brand-tag">${escapeHtml(config.tagline)}</span>
    </a>
    <nav class="site-nav" aria-label="주요 메뉴">
      ${config.nav
        .map(
          (n) =>
            `<a href="${n.href}"${n.href === path ? ' aria-current="page"' : ''}>${escapeHtml(n.label)}</a>`
        )
        .join('\n      ')}
    </nav>
    <button class="theme-toggle" type="button" aria-label="밝기 전환" data-theme-toggle>
      <span aria-hidden="true">◐</span>
    </button>
  </div>
</header>

<main id="main" class="wrap">
${body}
</main>

<footer class="site-footer">
  <div class="wrap">
    <p class="footer-links">
      <a href="/about.html">소개</a>
      <a href="/contact.html">문의</a>
      <a href="/privacy.html">개인정보처리방침</a>
      <a href="/disclosure.html">제휴 고지</a>
    </p>
    <p class="footer-note">
      ${escapeHtml(config.methodNotice)}
    </p>
    <p class="footer-copy">© ${new Date().getFullYear()} ${escapeHtml(config.siteName)}</p>
  </div>
</footer>

<script>
document.querySelector('[data-theme-toggle]').addEventListener('click',function(){
  var el=document.documentElement;
  var cur=el.getAttribute('data-theme');
  if(!cur){cur=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}
  var next=cur==='dark'?'light':'dark';
  el.setAttribute('data-theme',next);
  try{localStorage.setItem('theme',next)}catch(e){}
});
</script>
${scripts}
</body>
</html>`;
}

/** 광고 슬롯. 승인 전에도 자리를 잡아둡니다 — 나중에 넣으면 CLS 가 발생합니다. */
function adSlot() {
  const { client, slotInArticle } = config.adsense;
  if (!client || !slotInArticle) {
    return `<div class="ad-slot" aria-hidden="true" data-ad-placeholder></div>`;
  }
  return `<div class="ad-slot">
  <ins class="adsbygoogle" style="display:block" data-ad-client="${client}" data-ad-slot="${slotInArticle}" data-ad-format="auto" data-full-width-responsive="true"></ins>
  <script>(adsbygoogle=window.adsbygoogle||[]).push({});</script>
</div>`;
}

export function postPage(post, related = []) {
  const cat = config.categories.find((c) => c.slug === post.category);

  // 제휴 고지는 '본문 첫 부분'이어야 합니다. 하단 표기는 수익 몰수 사유입니다.
  // 사람이 매번 붙이면 반드시 빠뜨리므로 여기서 자동 삽입합니다.
  const affiliateBox = post.affiliate
    ? `<aside class="notice notice-affiliate" role="note">
  <strong>${escapeHtml(config.affiliateNotice)}</strong>
  <span>${escapeHtml(config.methodNotice)}</span>
</aside>`
    : '';

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: post.title,
      description: post.description,
      datePublished: post.date,
      dateModified: post.updated || post.date,
      author: { '@type': 'Organization', name: config.author.name },
      publisher: { '@type': 'Organization', name: config.siteName },
      mainEntityOfPage: abs(post.url),
      image: abs(post.image || '/assets/og-default.png'),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: '홈', item: abs('/') },
        cat && {
          '@type': 'ListItem',
          position: 2,
          name: cat.label,
          item: abs(`/${cat.slug}.html`),
        },
        { '@type': 'ListItem', position: 3, name: post.title, item: abs(post.url) },
      ].filter(Boolean),
    },
    post.faq &&
      post.faq.length && {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: post.faq.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
  ];

  const body = `
<article class="post">
  <nav class="breadcrumb" aria-label="현재 위치">
    <a href="/">홈</a>
    ${cat ? `<span aria-hidden="true">›</span><a href="/${cat.slug}.html">${escapeHtml(cat.label)}</a>` : ''}
  </nav>

  <header class="post-head">
    <h1>${escapeHtml(post.title)}</h1>
    <p class="post-meta">
      <time datetime="${post.date}">${fmtDate(post.date)}</time>
      ${post.updated ? `<span class="updated">· ${fmtDate(post.updated)} 갱신</span>` : ''}
    </p>
  </header>

  ${affiliateBox}

  <div class="post-body">
${post.html}
  </div>

  ${adSlot()}

  ${
    post.tags && post.tags.length
      ? `<p class="tags">${post.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join(' ')}</p>`
      : ''
  }
</article>

${
  related.length
    ? `<section class="related" aria-labelledby="related-h">
  <h2 id="related-h">같이 보면 좋은 글</h2>
  <ul class="card-list">
    ${related.map(cardItem).join('\n    ')}
  </ul>
</section>`
    : ''
}`;

  return layout({
    title: post.title,
    description: post.description,
    path: post.url,
    body,
    jsonLd,
    ogImage: post.image,
    ogType: 'article',
    bodyClass: 'is-post',
    // 본문에 계산기를 심은 글에만 스크립트를 붙입니다 (불필요한 JS 로딩 방지 — INP)
    scripts: post.toolData
      ? `<script>window.SPECFIT_DATA=${JSON.stringify(post.toolData)}</script>
<script src="/assets/vram.js" defer></script>`
      : '',
  });
}

function cardItem(post) {
  const cat = config.categories.find((c) => c.slug === post.category);
  return `<li class="card">
      <a href="${post.url}">
        <span class="card-cat">${cat ? escapeHtml(cat.label) : ''}</span>
        <span class="card-title">${escapeHtml(post.title)}</span>
        <span class="card-desc">${escapeHtml(post.description)}</span>
      </a>
    </li>`;
}

export function listPage({ posts, title, description, path, heading, intro, searchable }) {
  const body = `
<section class="list-head">
  <h1>${escapeHtml(heading)}</h1>
  ${intro ? `<p class="lead">${escapeHtml(intro)}</p>` : ''}
  ${
    searchable
      ? `<div class="search">
    <label for="q" class="visually-hidden">글 검색</label>
    <input id="q" type="search" placeholder="예: Ollama, VRAM, 도커" autocomplete="off" data-search>
    <p class="search-status" role="status" data-search-status></p>
  </div>`
      : ''
  }
</section>

<ul class="card-list" data-list>
  ${posts.map(cardItem).join('\n  ')}
</ul>
${posts.length === 0 ? '<p class="empty">아직 글이 없습니다.</p>' : ''}`;

  return layout({
    title,
    description,
    path,
    body,
    bodyClass: 'is-list',
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: title,
        description,
        url: abs(path),
      },
    ],
    scripts: searchable ? '<script src="/assets/search.js" defer></script>' : '',
  });
}

/**
 * 계산기 페이지.
 * 도구는 SoftwareApplication 으로 표시해 검색 결과에서 글과 구분되게 합니다.
 */
export function toolPage({ title, description, path, intro, data, body = '' }) {
  return layout({
    title,
    description,
    path,
    bodyClass: 'is-tool',
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: title,
        description,
        url: abs(path),
        applicationCategory: 'UtilitiesApplication',
        operatingSystem: 'Web',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
      },
    ],
    body: `<article class="post">
  <h1>${escapeHtml(title)}</h1>
  <p class="lead">${escapeHtml(intro)}</p>
  <div data-vram-tool></div>
  <div class="post-body">
${body}
  </div>
</article>`,
    scripts: `<script>window.SPECFIT_DATA=${JSON.stringify(data)}</script>
<script src="/assets/vram.js" defer></script>`,
  });
}

export function staticPage(page) {
  return layout({
    title: page.title,
    description: page.description,
    path: page.url,
    body: `<article class="post page">
  <h1>${escapeHtml(page.title)}</h1>
  <div class="post-body">
${page.html}
  </div>
</article>`,
    bodyClass: 'is-page',
  });
}

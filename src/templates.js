import { config } from './config.js';
import { escapeHtml } from './markdown.js';
import { toolMountHtml } from '../assets/vram-render.js';

const abs = (path) =>
  `${config.siteUrl.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;

const fmtDate = (iso) => {
  const d = new Date(iso);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
};

// 목록용 짧은 날짜. 줄 끝에 붙으므로 연도까지 적으면 제목 자리를 먹습니다.
export const fmtShort = (iso) => {
  const d = new Date(iso);
  return `${d.getMonth() + 1}.${d.getDate()}`;
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

${config.verification.naver ? `<meta name="naver-site-verification" content="${config.verification.naver}">` : ''}
${config.verification.google ? `<meta name="google-site-verification" content="${config.verification.google}">` : ''}
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="alternate" type="application/rss+xml" title="${escapeHtml(config.siteName)}" href="/feed.xml">
<link rel="stylesheet" href="/assets/style.css">
<script>${themeBoot}</script>
${
  // 애드센스 로더. 심사 단계에서는 이게 곧 소유권 확인 수단이고,
  // 승인 후에는 자동 광고가 여기서 동작합니다.
  // async 라 렌더링을 막지 않습니다.
  config.adsense.client
    ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${config.adsense.client}" crossorigin="anonymous"></script>`
    : ''
}
${
  // 애널리틱스. 비어 있으면 스크립트 자체가 안 들어갑니다.
  // async 라 렌더링을 막지 않습니다 (INP 보호).
  config.analytics.ga4
    ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${config.analytics.ga4}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${config.analytics.ga4}')</script>`
    : ''
}
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
${
  // 제휴 링크 클릭 추적.
  //
  // 문서에 한 번만 걸고 위임으로 처리합니다. 계산기 버튼은 JS 가 나중에 그리므로
  // 개별 요소에 걸면 안 잡힙니다. 여기서 잡아야 계산기 전환이 측정됩니다.
  //
  // rel="sponsored" 하나로 세 경로가 모두 걸립니다 —
  // 본문 링크(markdown.js), 구매 박스(products.js), 계산기 버튼(vram.js).
  config.analytics.ga4
    ? `<script>
document.addEventListener('click',function(e){
  var a=e.target&&e.target.closest?e.target.closest('a[rel~="sponsored"]'):null;
  if(!a||typeof gtag!=='function')return;
  gtag('event','affiliate_click',{
    link_url:a.href,
    link_text:(a.textContent||'').trim().slice(0,80),
    page_path:location.pathname
  });
},true);
</script>`
    : ''
}
${scripts}
</body>
</html>`;
}

/**
 * 광고 슬롯.
 * 애드센스 미설정 시에는 아무것도 렌더링하지 않습니다.
 * 자리표시자를 두면 방문자에게 빈 박스가 보이고, 심사에도 불리합니다.
 * 광고가 없으면 밀릴 것도 없으므로 CLS 문제는 발생하지 않습니다.
 * 승인 후 config 를 채우면 min-height 가 잡힌 슬롯이 들어갑니다.
 */
function adSlot() {
  const { client, slotInArticle } = config.adsense;
  if (!client || !slotInArticle) return '';
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
<script type="module" src="/assets/vram.js"></script>`
      : '',
  });
}

/**
 * 목록 한 줄. 홈의 '새로 쓴 글' 에 씁니다.
 *
 * ⚠️ search.js 가 검색 결과를 같은 모양으로 그립니다.
 *    여기를 고치면 그쪽도 맞춰야 목록과 결과가 따로 놀지 않습니다.
 */
function postRow(post) {
  const cat = config.categories.find((c) => c.slug === post.category);
  return `<li>
      <a href="${post.url}">
        <span class="row-cat">${cat ? escapeHtml(cat.label) : ''}</span>
        <span class="row-title">${escapeHtml(post.title)}</span>
        <time class="row-date" datetime="${post.date}">${fmtShort(post.date)}</time>
      </a>
    </li>`;
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

export function listPage({
  posts,
  title,
  description,
  path,
  heading,
  intro,
  searchable,
  hero = false,
  catCards = [],
  featured = [],
  totalPosts = 0,
  toolData = null,
  affiliate = false,
}) {
  // 계산기에 제휴 링크가 있으면 고지가 '첫 부분'에 있어야 합니다.
  // 하단 표기나 누락은 수익 전액 몰수 사유입니다. 사람이 기억할 일이 아니라
  // 도구를 싣는 순간 자동으로 따라붙어야 합니다.
  const noticeBox = affiliate
    ? `<aside class="notice notice-affiliate" role="note">
    <strong>${escapeHtml(config.affiliateNotice)}</strong>
    <span>${escapeHtml(config.methodNotice)}</span>
  </aside>`
    : '';
  // 홈 상단. 홈에만 붙입니다 — 카테고리 목록에 붙이면
  // 이미 무엇을 찾는지 아는 사람에게 같은 말을 반복하는 셈입니다.
  //
  // 카드가 아니라 한 덩어리입니다. 아래가 전부 카드라서, 여기까지 카드면
  // 홈이 똑같이 생긴 상자 벽이 되고 눈이 어디에도 멈추지 않습니다.
  const h = config.hero;
  const heroBox =
    hero && h
      ? // 제목이 없으므로 section 이 아니라 div 입니다.
        // 제목 없는 section 은 문서 구조상 빈 칸이 되어 스크린리더에서 어색합니다.
        //
        // 배경도 테두리도 없습니다. 안에 들어가는 계산기가 이미 테두리를 갖고 있어서
        // 여기까지 상자로 만들면 상자 안의 상자가 됩니다.
        `<div class="hero">
    <p class="hero-lead">${escapeHtml(h.lead)}</p>
    ${toolData ? toolMountHtml(toolData) : ''}
    <p class="hero-actions">
      <a class="hero-link" href="${h.secondary.href}">${escapeHtml(h.secondary.label)}</a>
    </p>
  </div>`
      : '';

  // 카테고리. 카드가 아니라 칩 한 줄입니다.
  // 이 사이트가 무엇을 다루는지 한 줄로 보여주면 충분하고,
  // 카드로 만들면 상자만 네 개 더 늘어납니다. 글 수는 빈 껍데기가 아님을 보여줍니다.
  const catBox = catCards.length
    ? `<nav class="cats" aria-label="분류" data-search-hide>
    ${catCards
      .map(
        (c) =>
          `<a href="/${c.slug}.html">${escapeHtml(c.label)}<span class="cats-n">${c.count}</span></a>`
      )
      .join('\n    ')}
  </nav>`
    : '';

  // 손으로 고른 목록. 날짜순만으로는 먼저 읽어야 할 글이 아래로 밀립니다.
  const featuredBox = featured.length
    ? `<section class="home-sec" data-search-hide>
  <h2>골라 읽기 좋은 글</h2>
  <ul class="card-list">
    ${featured.map(cardItem).join('\n    ')}
  </ul>
</section>`
    : '';

  // data-search-hide 가 붙은 것은 검색 중에 숨습니다.
  // 안 숨기면 검색 결과 위아래로 상관없는 카드가 남아 결과가 묻힙니다.
  const more =
    hero && totalPosts > posts.length
      ? `<p class="see-more" data-search-hide>전체 ${totalPosts}편은 위 카테고리에서 볼 수 있습니다. 찾는 것이 있으면 검색을 쓰세요.</p>`
      : '';

  // 쿠팡 검색 위젯 — 홈 맨 아래에만.
  //
  // 맨 아래인 이유: 이 사이트에 온 사람은 "내 카드로 뭐가 되나" 를 알러 온 것이지
  // 쿠팡에서 뭘 검색하러 온 게 아닙니다. 위로 올리면 광고판으로 보입니다.
  // 읽을 것을 다 보여준 다음에 두는 자리가 맞습니다.
  //
  // 검색 중에는 접힙니다(data-search-hide). 사이트 안 검색을 쓰는 사람에게
  // 쿠팡 검색창을 같이 보여주면 어느 쪽에 입력해야 하는지 헷갈립니다.
  const searchWidget =
    hero && config.coupangSearch
      ? (() => {
          // iframe 은 늦게 로드되며 아래를 밀어냅니다. 높이를 미리 잡아둡니다(CLS).
          const h = /height="?(\d+)/.exec(config.coupangSearch);
          const reserve = h ? ` style="min-height:${h[1]}px"` : '';
          return `<section class="home-sec" data-search-hide>
  <h2>쿠팡에서 바로 찾기</h2>
  <p class="lead">여기서 검색하면 쿠팡으로 넘어갑니다. 이 사이트가 고른 제품이 아니라 쿠팡 검색 결과입니다.</p>
  <div class="coupang-widget"${reserve}>${config.coupangSearch}</div>
</section>`;
        })()
      : '';

  const body = `
<section class="list-head">
  <h1>${escapeHtml(heading)}</h1>
  ${noticeBox}
  ${intro ? `<p class="lead">${escapeHtml(intro)}</p>` : ''}
  ${heroBox}
  ${catBox}
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
${featuredBox}
<section${hero ? ' class="home-sec"' : ''}>
  ${hero ? '<h2 data-search-hide>새로 쓴 글</h2>' : ''}
  ${
    // 홈의 최신 목록은 카드가 아니라 줄입니다.
    // 위에 추천 카드 6장이 이미 있어서, 여기까지 카드면 같은 것이 18장 이어집니다.
    // 줄로 하면 훑기 쉽고 150편이 되어도 형태가 안 무너집니다.
    hero
      ? `<ul class="post-list" data-list>
    ${posts.map(postRow).join('\n    ')}
  </ul>`
      : `<ul class="card-list" data-list>
    ${posts.map(cardItem).join('\n    ')}
  </ul>`
  }
  ${more}
  ${posts.length === 0 ? '<p class="empty">아직 글이 없습니다.</p>' : ''}
</section>${searchWidget ? `\n${searchWidget}` : ''}`;

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
    // 계산기를 실은 페이지에만 그 데이터와 스크립트를 붙입니다.
    scripts: [
      toolData
        ? `<script>window.SPECFIT_DATA=${JSON.stringify(toolData)}</script>
<script type="module" src="/assets/vram.js"></script>`
        : '',
      searchable ? '<script src="/assets/search.js" defer></script>' : '',
    ]
      .filter(Boolean)
      .join('\n'),
  });
}

/**
 * 계산기 페이지.
 * 도구는 SoftwareApplication 으로 표시해 검색 결과에서 글과 구분되게 합니다.
 */
export function toolPage({ title, description, path, intro, data, body = '', affiliate = false }) {
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
  ${
    affiliate
      ? `<aside class="notice notice-affiliate" role="note">
  <strong>${escapeHtml(config.affiliateNotice)}</strong>
  <span>${escapeHtml(config.methodNotice)}</span>
</aside>`
      : ''
  }
  ${toolMountHtml(data)}
  <div class="post-body">
${body}
  </div>
</article>`,
    scripts: `<script>window.SPECFIT_DATA=${JSON.stringify(data)}</script>
<script type="module" src="/assets/vram.js"></script>`,
  });
}

/**
 * 404. GitHub Pages 가 없는 주소에 자동으로 내보내는 파일입니다.
 *
 * 이 사이트는 URL 을 바꾸지 않으므로(색인 보호), 여기 도착한 사람은
 * 오타이거나 바깥의 잘못된 링크를 타고 온 것입니다. 사과문을 길게 쓰는 대신
 * 갈 만한 곳을 바로 보여줍니다. 검색은 홈에 있으므로 홈으로 보냅니다.
 */
export function notFoundPage() {
  return layout({
    title: '페이지를 찾을 수 없습니다',
    description: '주소에 해당하는 페이지가 없습니다.',
    path: '/404.html',
    body: `<article class="post page">
  <h1>이 주소에는 페이지가 없습니다</h1>
  <div class="post-body">
    <p>주소를 다시 확인해 보세요. 이 사이트는 글 주소를 바꾸지 않으므로,
    예전에 있던 글이 사라진 것은 아닙니다.</p>
    <ul>
      <li><a href="/">홈으로 — 전체 글 검색이 있습니다</a></li>
      <li><a href="/tools/vram.html">VRAM 계산기</a></li>
      <li><a href="/posts/local-llm-start-guide.html">로컬 LLM 시작 가이드</a></li>
    </ul>
  </div>
</article>`,
    bodyClass: 'is-page',
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

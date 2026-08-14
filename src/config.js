// 사이트 전역 설정. 도메인 구매 후 SITE_URL만 바꾸면 됩니다.

export const config = {
  // 도메인 구매 전에는 GitHub Pages 주소를 씁니다.
  // 구매 후 'https://specfit.kr' 로 교체 → canonical/OG/sitemap이 전부 따라갑니다.
  siteUrl: 'https://specfit.kr',

  siteName: '스펙핏',
  tagline: '내 조건에 맞는 스펙',
  description:
    'AI·개발 작업용 하드웨어를 스펙 기준으로 골라드립니다. GPU, 노트북, 모니터를 용도와 예산에 맞춰 비교합니다.',

  locale: 'ko_KR',
  lang: 'ko',

  author: {
    name: '스펙핏',
    email: 'lmj010903@naver.com',
  },

  // 목록 페이지당 글 수
  postsPerPage: 12,

  // 공정거래위원회 대가성 고지 문구.
  // frontmatter 에 affiliate: true 인 글이면 본문 '맨 위'에 자동 삽입됩니다.
  // 위치가 법적으로 중요합니다 — 하단 표기는 수익 몰수 사유입니다.
  affiliateNotice:
    '이 글은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.',

  // 제품을 직접 사용하지 않고 스펙으로 선별한다는 고지.
  // 허위 후기 방지 + 신뢰 확보 양쪽 목적입니다.
  methodNotice:
    '직접 사용해 본 제품이 아니라, 공개된 스펙과 벤치마크를 기준으로 선별했습니다.',

  // 검색엔진 소유확인 메타 태그.
  // 구글은 DNS TXT 로 인증했으므로 별도 태그가 필요 없습니다.
  verification: {
    naver: '1b06651a0659fc53f8131d626ea5cd2323c0a9ca',
    google: '', // DNS TXT 방식 사용 중 — 비워둡니다
  },

  // 애드센스 승인 후 채웁니다. 비어 있으면 광고 슬롯이 렌더링되지 않습니다.
  // (승인 전에도 min-height 자리는 잡아둡니다 — CLS 방지)
  // client 를 채우면 세 가지가 한 번에 켜집니다.
  //   1) 모든 페이지 <head> 에 애드센스 로더 스크립트  ← 소유권 확인 + 자동 광고
  //   2) 루트에 ads.txt 자동 생성
  //   3) slotInArticle 까지 채우면 본문 수동 광고 슬롯
  //
  // slotInArticle 은 승인 후 '광고 단위' 를 만들어야 나옵니다.
  // 비워두면 자동 광고만 동작합니다 — 승인 전에는 이 상태가 맞습니다.
  adsense: {
    client: 'ca-pub-9784398608515061',
    slotInArticle: '',
  },

  // 카테고리 앞에 붙는 고정 메뉴.
  //
  // ⚠️ 카테고리는 여기 적지 마세요. 빌드가 categories 에서 자동으로 붙입니다.
  //    손으로 관리하니 모니터·메모리 카테고리에 글이 쌓인 뒤에도
  //    메뉴에 안 나오는 일이 있었습니다.
  //
  // 홈은 왼쪽 사이트명이, 소개는 푸터가 맡습니다. 메뉴가 길어지면
  // 모바일에서 두 줄로 접혀 오히려 안 보입니다.
  //
  // 처음 온 사람이 곧바로 VRAM·양자화 이야기에 부딪히면 나가므로
  // 시작 가이드를 맨 앞에 둡니다.
  nav: [
    { href: '/posts/local-llm-start-guide.html', label: '처음이신가요' },
    { href: '/tools/vram.html', label: 'VRAM 계산기' },
  ],

  // 카테고리 정의. slug 는 frontmatter 의 category 와 매칭됩니다.
  categories: [
    { slug: 'gpu', label: 'GPU', description: '로컬 LLM·딥러닝용 그래픽카드' },
    { slug: 'laptop', label: '노트북', description: '개발·AI 작업용 노트북' },
    { slug: 'monitor', label: '모니터', description: '코딩용 모니터' },
    { slug: 'memory', label: '메모리·스토리지', description: '램과 SSD' },
  ],
};

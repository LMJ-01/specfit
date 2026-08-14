// GPU 가 아닌 제품의 쿠팡 링크.
//
// gpu-data.js 는 계산기용 GPU 전용 구조라 램·모니터·노트북이 들어갈 자리가 없습니다.
// 이 파일은 글 본문에 {{BUY:id}} 로 불러 쓰는 단순 링크 목록입니다.
//
// ── 왜 GPU 가 아닌 품목이 필요한가 ──
// 2026-08-15 조사에서 PC 부품 커뮤니티가 쿠팡 그래픽카드 구매를
// 기피한다는 것이 확인됐습니다(반품·리퍼 재판매, 상자 바꿔치기 사례).
// GPU 는 유입구로 두고 전환은 이쪽으로 옮깁니다.
// 배경: side-income-plan/docs/goals.md
//
// ⚠️ note 는 "왜 이 스펙인가" 입니다. 제품 후기가 아닙니다.
//    직접 써보지 않은 제품을 써본 것처럼 쓰면 허위 광고입니다.
//
// 링크 만드는 법:
//   partners.coupang.com → 상품 링크 → 상품명 검색 → 링크 생성 → 짧은 링크 복사

export const products = {
  laptop: {
    label: '개발용 노트북 보기',
    note: '램 32GB · 슬롯 유무 · 세로 해상도를 먼저 확인하세요',
    buy: 'https://link.coupang.com/a/gdsmkd62Ls',
  },
  monitor: {
    label: '27인치 QHD 모니터 보기',
    note: '배율을 안 건드리고 쓸 수 있는 조합입니다',
    buy: 'https://link.coupang.com/a/gdsnkTpck0',
  },
  ram: {
    label: 'DDR5 32GB 보기',
    note: '같은 32GB 라면 16GB 두 장(듀얼 채널)이 빠릅니다',
    buy: 'https://link.coupang.com/a/gdsop7IrsG',
  },
  ssd: {
    label: 'NVMe SSD 1TB 보기',
    note: '모델 파일이 하나에 5~20GB 라 금방 찹니다',
    buy: 'https://link.coupang.com/a/gdspuKuC8O',
  },
};

/**
 * 구매 링크 박스.
 *
 * rel="sponsored nofollow noopener" 가 필수입니다.
 * 없으면 구글이 링크 스팸으로 봅니다.
 */
export function buyBox(id) {
  const p = products[id];
  if (!p) return null;
  return `<aside class="buy-box">
  <a class="buy-btn" href="${p.buy}" target="_blank" rel="sponsored nofollow noopener">${p.label}</a>
  <span class="buy-note">${p.note}</span>
</aside>`;
}

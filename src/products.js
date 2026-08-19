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
//
// ── widget: 상품 위젯 (2026-08-20 추가) ─────────────────────────
//
// 파트너스 '상품 위젯' iframe 코드 전체를 그대로 붙여넣습니다.
// 글 본문에서 {{COUPANG:laptop}} 처럼 불러 씁니다.
// 상품 이미지와 실시간 가격이 나와 텍스트 링크보다 클릭률이 높습니다.
//
// **API 키가 필요 없습니다.** 파트너스 UI 에서 코드를 받아 붙이면 끝입니다.
//   partners.coupang.com → 배너/위젯 → 상품 위젯 → 상품 검색 → 크기 선택 → 코드 복사
//
// ⚠️ 왜 여기에 생겼나 — 위젯 지원이 gpu-data.js 에만 있었습니다.
//    그런데 goals.md 가 2026-08-15 에 **전환 품목을 GPU → 노트북·주변기기로**
//    옮기기로 결정했습니다. 결정은 바뀌었는데 코드가 안 따라가서,
//    정작 전환이 걸린 품목에는 위젯을 못 붙이는 상태였습니다.
//
// ⚠️ 가로 500px 이하를 권합니다. iframe 은 내용이 축소되지 않아 모바일에서 잘립니다.
// ⚠️ 비어 있으면 그 자리표시자는 경고 후 제거됩니다. 페이지에는 안 나옵니다.
//
// 붙일 자리 (코드를 받으면 해당 글 그 절에 한 줄 넣으면 됩니다)
//   laptop  → dev-laptop-spec '1. 램' · gaming-laptop-for-dev '6. 판단'
//   monitor → coding-monitor-resolution '27" QHD' · dual-monitor-vs-single '4. 같은 모델'
//   ram     → ram-16gb-vs-32gb '1. 듀얼 채널' · laptop-ram-upgrade '3. 장수'
//   ssd     → dev-ssd-choose '용량' · laptop-ssd-upgrade '3. 슬롯 2개'

// ⚠️ 2026-08-20 — 링크를 전부 재발급했습니다.
//
//    이전 링크는 네 개를 "순서대로 매핑" 한 것이라 어느 링크가 어느 상품인지
//    확인이 안 된 상태였습니다(next-steps.md 3-A 에 미해결로 적혀 있던 항목).
//    이번에는 **검색어별로 따로 만들어서** 그 불확실성이 없습니다.
//
//    발급에 쓴 검색어를 각 항목에 적어둡니다. 나중에 링크가 죽으면
//    같은 검색어로 다시 만들면 됩니다.
//
// ⚠️ 링크가 맞는 상품으로 가는지는 **파트너스 → 링크 관리에서 대조**하세요.
//    눌러서 확인하면 자가 클릭으로 쌓입니다 — 계정 정지 사유입니다.

export const products = {
  laptop: {
    // 검색어: 개발용 노트북 32GB
    label: '개발용 노트북 보기',
    note: '램 32GB · 슬롯 유무 · 세로 해상도를 먼저 확인하세요',
    buy: 'https://link.coupang.com/a/glIS3zCz48',
    widget:
      '<iframe src="https://coupa.ng/coSWrB" width="120" height="240" frameborder="0" scrolling="no" referrerpolicy="unsafe-url"></iframe>',
  },
  // 램 32GB + SSD 1TB 구성. 안드로이드·도커 글이 SSD 1TB 를 명시적으로 권하는데
  // 512GB 짜리를 걸면 글과 어긋나서 자리를 나눴습니다.
  'laptop-1tb': {
    // 검색어: 노트북 램32GB 1TB
    label: '램 32GB + SSD 1TB 노트북 보기',
    note: 'SDK·에뮬레이터·도커 이미지가 쌓이면 512GB 는 금방 찹니다',
    buy: 'https://link.coupang.com/a/glIWpwe4xU',
    widget:
      '<iframe src="https://coupa.ng/coSWr6" width="120" height="240" frameborder="0" scrolling="no" referrerpolicy="unsafe-url"></iframe>',
  },
  monitor: {
    // 검색어: 27인치 QHD 모니터 피벗
    label: '27인치 QHD 모니터 보기',
    note: '배율을 안 건드리고 쓸 수 있는 조합입니다',
    buy: 'https://link.coupang.com/a/glIYW4EKjY',
    widget:
      '<iframe src="https://coupa.ng/coSWsD" width="120" height="240" frameborder="0" scrolling="no" referrerpolicy="unsafe-url"></iframe>',
  },
  ram: {
    // 검색어: DDR5 32GB 16Gx2 — 데스크톱 DIMM 입니다
    // ⚠️ 노트북은 SO-DIMM 이라 안 들어갑니다. laptop-ram-upgrade 글에
    //    램 박스를 안 붙인 이유가 이것입니다.
    label: 'DDR5 32GB 보기',
    note: '같은 32GB 라면 16GB 두 장(듀얼 채널)이 빠릅니다',
    buy: 'https://link.coupang.com/a/glI1o1vUiW',
    widget:
      '<iframe src="https://coupa.ng/coSWs1" width="120" height="240" frameborder="0" scrolling="no" referrerpolicy="unsafe-url"></iframe>',
  },
  ssd: {
    // 2026-08-20 — 검색 결과 링크에서 **특정 제품**으로 바꿨습니다.
    //   SK하이닉스 GOLD P31 NVMe SSD 1TB (HFS001TDE9X0733)
    //
    // 이 글의 기준(dev-ssd-choose)에 맞춰 고른 제품입니다.
    //   DRAM 캐시 ✅  ·  TLC ✅  ·  1TB ✅
    //   ⚠️ PCIe 3.0(Gen3) 입니다. 글은 Gen4 를 적어뒀지만, 같은 글이
    //      "Gen5 는 체감이 거의 없다 · DRAM 유무가 순차 속도보다 중요하다" 고
    //      말하고 있으므로 논지와는 맞습니다. 세대를 올리고 싶으면
    //      Gen4 + DRAM + TLC 제품으로 바꾸고 이 주석도 고치세요.
    label: 'NVMe SSD 1TB 보기',
    note: '모델 파일이 하나에 5~20GB 라 금방 찹니다',
    buy: 'https://link.coupang.com/a/glIkoDX5zg',
    widget:
      '<iframe src="https://coupa.ng/coSWlG" width="120" height="240" frameborder="0" scrolling="no" referrerpolicy="unsafe-url"></iframe>',
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

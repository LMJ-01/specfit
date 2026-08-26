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
  // 세로(피벗) 전용 자리. 세로 모니터 글의 결론이 "27은 높다, 24를 사라" 인데
  // 링크는 27인치뿐이었습니다 (next-steps.md 3-A 에 미해결로 있던 항목).
  'monitor-24': {
    // 검색어: 델 P2423D — 24인치 QHD IPS 피벗·높낮이 (2026-08-20 발급)
    label: '24인치 QHD 피벗 모니터 보기',
    note: '스탠드가 피벗을 지원해 모니터암 없이 세로로 세울 수 있습니다',
    buy: 'https://link.coupang.com/a/gmzPp1spzw',
    widget:
      '<iframe src="https://coupa.ng/coTABC" width="120" height="240" frameborder="0" scrolling="no" referrerpolicy="unsafe-url"></iframe>',
  },
  // 노트북용 램. 위 ram(데스크톱 DIMM)과 물리적으로 호환되지 않아 자리를 나눕니다 —
  // 잘못 걸면 반품 사유라 laptop-ram-upgrade 글이 일부러 램 박스 없이 나갔던 자리입니다.
  'ram-sodimm': {
    // 검색어: 삼성전자 노트북 DDR5 5600 16GB — SO-DIMM, 모델명 M425 계열 (2026-08-20 발급)
    label: '노트북용 DDR5 16GB 보기 (SO-DIMM)',
    note: '기존 램이 DDR5 인지 먼저 확인하세요 — DDR4 슬롯에는 안 들어갑니다',
    buy: 'https://link.coupang.com/a/gmz6VbGkSa',
    widget:
      '<iframe src="https://coupa.ng/coTAZ2" width="120" height="240" frameborder="0" scrolling="no" referrerpolicy="unsafe-url"></iframe>',
  },
  ram: {
    // 검색어: DDR5 32GB 16Gx2 — 데스크톱 DIMM 입니다
    // ⚠️ 노트북은 SO-DIMM 이라 안 들어갑니다 → 노트북용은 위 ram-sodimm 으로.
    label: 'DDR5 32GB 보기',
    note: '같은 32GB 라면 16GB 두 장(듀얼 채널)이 빠릅니다',
    buy: 'https://link.coupang.com/a/glI1o1vUiW',
    widget:
      '<iframe src="https://coupa.ng/coSWs1" width="120" height="240" frameborder="0" scrolling="no" referrerpolicy="unsafe-url"></iframe>',
  },
  // 모니터암 글에 구매 박스가 아예 없던 자리 (next-steps.md 3-A 미해결 항목).
  // 암은 하중·고정 방식으로 갈려서 아무 제품이나 걸면 안 맞습니다 — 그 글의 주제.
  'monitor-arm': {
    // 검색어: NB F80 모니터암 — 노스바유 F80, 가스 스프링 클램프형 (2026-08-20 발급)
    label: '모니터암 보기',
    note: '가스 스프링식은 하중에 하한도 있습니다 — 내 모니터 무게(스탠드 제외)가 범위 안인지 확인하세요',
    buy: 'https://link.coupang.com/a/gmzWIW15sO',
    widget:
      '<iframe src="https://coupa.ng/coTALq" width="120" height="240" frameborder="0" scrolling="no" referrerpolicy="unsafe-url"></iframe>',
  },
  // 맥북 글 2편에 제품 링크가 없던 자리. 윈도우 노트북 링크(laptop)를 걸 수 없는 곳입니다.
  mac: {
    // 검색어: 맥북 프로 14 M5 (2026-08-20 발급)
    label: '맥북 프로 14 보기',
    note: '같은 프로 14 안에서 칩(M5·M5 Pro·M5 Max)과 메모리가 갈립니다 — 구성을 확인하고 고르세요',
    buy: 'https://link.coupang.com/a/gmzZZYg2QS',
    widget:
      '<iframe src="https://coupa.ng/coTAP6" width="120" height="240" frameborder="0" scrolling="no" referrerpolicy="unsafe-url"></iframe>',
  },
  // 충전기 글(laptop-charger-watt-pd)용. 글의 기준(20V 프로필 + KC 인증)에
  // 맞는 65W GaN 충전기입니다.
  'charger-65w': {
    // 검색어: 앤커 나노 II 65W — 65W PD, GaN (2026-08-26 발급)
    label: '65W PD 충전기 보기',
    note: '출력표에 20V 단계(20V×3.25A)와 KC 인증이 있는지 확인하세요',
    buy: 'https://link.coupang.com/a/gxeF524WHc',
    widget:
      '<iframe src="https://coupa.ng/co2KpA" width="120" height="240" frameborder="0" scrolling="no" referrerpolicy="unsafe-url"></iframe>',
  },
  // 방열판 글(nvme-heatsink)용. 2280 규격 방열판입니다.
  'm2-heatsink': {
    // 검색어: 써멀라이트 HR-09 2280 (2026-08-26 발급)
    label: 'M.2 방열판 보기 (2280)',
    note: '보드 기본 방열판이 있으면 그걸 먼저 쓰세요 — 이중 장착은 안 됩니다',
    buy: 'https://link.coupang.com/a/gxeJBKC2wu',
    widget:
      '<iframe src="https://coupa.ng/co2Krr" width="120" height="240" frameborder="0" scrolling="no" referrerpolicy="unsafe-url"></iframe>',
  },
  // 지지대 글(gpu-sag-support)용. 기둥(잭)형입니다.
  'gpu-support': {
    // 검색어: 그래픽카드 지지대 (2026-08-26 발급)
    label: '그래픽카드 지지대 보기',
    note: '높이 조절 범위가 케이스 바닥과 카드 사이 간격에 맞는지 확인하세요',
    buy: 'https://link.coupang.com/a/gxeNBCU3b2',
    widget:
      '<iframe src="https://coupa.ng/co2Kti" width="120" height="240" frameborder="0" scrolling="no" referrerpolicy="unsafe-url"></iframe>',
  },
  // KVM 글(monitor-kvm)용. 보유한 다른 모니터 링크(monitor·monitor-24)는
  // KVM 지원이 확인되지 않아 이 자리를 따로 만들었습니다.
  'monitor-kvm': {
    // 검색어: 델 U2723QE — 27" 4K, KVM·업스트림 USB-C+USB-B·PD 90W
    // 사양표에서 셋 다 확인하고 골랐습니다 (2026-08-26 발급)
    label: 'KVM 지원 모니터 보기',
    note: '글의 스펙 셋(KVM 표기 · 업스트림 2개 · USB-C PD)을 사양표에서 확인하세요',
    buy: 'https://link.coupang.com/a/gxeUTipMwS',
    widget:
      '<iframe src="https://coupa.ng/co2Kwb" width="120" height="240" frameborder="0" scrolling="no" referrerpolicy="unsafe-url"></iframe>',
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

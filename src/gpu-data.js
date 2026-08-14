// VRAM 계산기 데이터.
//
// ⚠️ 수치는 근사입니다. 실제 모델 파일 크기는 배포판·양자화 방식마다 다릅니다.
//    공개 전에 ollama.com 에서 대표 모델 몇 개의 실제 용량을 확인하고 보정하세요.
//    보정한 수치가 곧 이 사이트의 차별점입니다 — 남들은 계산식만 적습니다.

// buy: 쿠팡 파트너스 짧은 링크. 계산기 결과의 텍스트 버튼에 쓰입니다.
//      계산기는 입력에 따라 추천 카드가 바뀌므로 가벼운 텍스트 링크가 맞습니다.
//
// widget: 쿠팡 파트너스 '상품 위젯' iframe 코드 전체를 그대로 붙여넣습니다.
//      글 본문에서 {{COUPANG:rtx4070}} 으로 불러 씁니다.
//      상품 이미지와 실시간 가격이 나와 텍스트 링크보다 클릭률이 높습니다.
//
//      만드는 법: partners.coupang.com → 배너/위젯 → 상품 위젯 →
//                 상품 검색 → 크기 선택 → 생성된 <iframe ...> 코드 복사
//
//      ⚠️ 위젯 크기는 가로 500px 이하를 권합니다.
//         iframe 은 내용이 축소되지 않아 모바일에서 잘립니다.
//
// new: 신품으로 살 수 있는가.
//   false 인 카드는 **추천 대상에서 제외**됩니다. 단종된 카드를 "이걸 사세요"라고
//   권하는 것은 제휴와 무관하게 나쁜 조언입니다.
//   다만 이미 그 카드를 쓰는 사람이 진단은 받아야 하므로 목록에는 남겨둡니다.
//
// 링크 만드는 법:
//   partners.coupang.com → 상품 링크 → 상품명 검색 → 링크 생성 → 짧은 링크 복사
//   형태: https://link.coupang.com/a/XXXXXX

// ── 현행 세대: RTX 50 (Blackwell) ─────────────────────────────────
// 스펙 출처: nvidia.com 공식 사양 비교 페이지, 2026-08-15 확인.
// GDDR7 로 바뀌면서 같은 128비트 버스에서도 대역폭이 크게 올랐습니다.
// 예: 5060 Ti 16GB 448GB/s vs 4060 Ti 16GB 288GB/s (1.56배)
// 로컬 LLM 생성 속도는 대역폭에 묶이므로 이 차이가 그대로 체감됩니다.
export const gpus = [
  { id: 'rtx5090', name: 'RTX 5090', vram: 32, bw: 1792, tdp: 575, tier: 'flagship', new: true, buy: 'https://link.coupang.com/a/gbIXLiOL36', widget: '' },
  { id: 'rtx5080', name: 'RTX 5080', vram: 16, bw: 960, tdp: 360, tier: 'high', new: true, buy: '', widget: '' },
  { id: 'rtx5070ti', name: 'RTX 5070 Ti', vram: 16, bw: 896, tdp: 300, tier: 'high', new: true, buy: '', widget: '' },
  { id: 'rtx5070', name: 'RTX 5070', vram: 12, bw: 672, tdp: 250, tier: 'mid', new: true, buy: 'https://link.coupang.com/a/gdoNP0RuHQ', widget: '' },
  { id: 'rtx5060ti16', name: 'RTX 5060 Ti 16GB', vram: 16, bw: 448, tdp: 180, tier: 'mid', new: true, buy: 'https://link.coupang.com/a/gdoQpS5jIi', widget: '' },
  { id: 'rtx5060ti8', name: 'RTX 5060 Ti 8GB', vram: 8, bw: 448, tdp: 180, tier: 'entry', new: true, buy: '', widget: '' },
  { id: 'rtx5060', name: 'RTX 5060', vram: 8, bw: 448, tdp: 145, tier: 'entry', new: true, buy: 'https://link.coupang.com/a/gdoLFZl6Xc', widget: '' },
  { id: 'rtx5050', name: 'RTX 5050', vram: 8, bw: 320, tdp: 130, tier: 'entry', new: true, buy: '', widget: '' },

  // ── RTX 40 (Ada): 생산 종료 ────────────────────────────────────
  // NVIDIA 가 AD102/103/104/106 생산을 끝냈습니다 (4090·4080·4070 계열 단종).
  // 4060 계열만 일부 남아 있으나 재고 소진 단계입니다.
  //
  // ⚠️ new: false 로 두면 추천에서 빠집니다. 쿠팡 링크도 함께 무력화됩니다.
  //    국내 유통 재고가 아직 충분하다면 개별적으로 true 로 되돌려도 됩니다.
  //    판단 기준은 "지금 신품을 살 수 있는가" 입니다.
  { id: 'rtx4090', name: 'RTX 4090 (단종)', vram: 24, bw: 1008, tdp: 450, tier: 'flagship', new: false, buy: 'https://link.coupang.com/a/gbIVZFcbWC', widget: '' },
  { id: 'rtx4080s', name: 'RTX 4080 Super (단종)', vram: 16, bw: 736, tdp: 320, tier: 'high', new: false, buy: '', widget: '' },
  { id: 'rtx4070tis', name: 'RTX 4070 Ti Super (단종)', vram: 16, bw: 672, tdp: 285, tier: 'high', new: false, buy: '', widget: '' },
  { id: 'rtx4070s', name: 'RTX 4070 Super (단종)', vram: 12, bw: 504, tdp: 220, tier: 'mid', new: false, buy: '', widget: '' },
  { id: 'rtx4070', name: 'RTX 4070 (단종)', vram: 12, bw: 504, tdp: 200, tier: 'mid', new: false, buy: 'https://link.coupang.com/a/gbIQDWmjn2', widget: '' },
  { id: 'rtx4060ti16', name: 'RTX 4060 Ti 16GB (단종)', vram: 16, bw: 288, tdp: 165, tier: 'mid', new: false, buy: '', widget: '' },
  { id: 'rtx4060ti8', name: 'RTX 4060 Ti 8GB (단종)', vram: 8, bw: 288, tdp: 160, tier: 'entry', new: false, buy: '', widget: '' },
  { id: 'rtx4060', name: 'RTX 4060 (단종)', vram: 8, bw: 272, tdp: 115, tier: 'entry', new: false, buy: 'https://link.coupang.com/a/gbITRwz3ts', widget: '' },

  // ── RTX 30 (Ampere): 단종. 진단용으로만 목록에 둡니다 ──────────
  { id: 'rtx3090', name: 'RTX 3090 (중고)', vram: 24, bw: 936, tdp: 350, tier: 'high', new: false, buy: '', widget: '' },
  { id: 'rtx3080', name: 'RTX 3080 10GB', vram: 10, bw: 760, tdp: 320, tier: 'mid', new: false, buy: '', widget: '' },
  { id: 'rtx3070', name: 'RTX 3070', vram: 8, bw: 448, tdp: 220, tier: 'entry', new: false, buy: '', widget: '' },
  { id: 'rtx3060', name: 'RTX 3060 12GB', vram: 12, bw: 360, tdp: 170, tier: 'entry', new: false, buy: '', widget: '' },
  { id: 'mac16', name: 'Mac 통합메모리 16GB', vram: 10, bw: 100, tdp: 0, mac: true, tier: 'mac' },
  { id: 'mac24', name: 'Mac 통합메모리 24GB', vram: 16, bw: 150, tdp: 0, mac: true, tier: 'mac' },
  { id: 'mac32', name: 'Mac 통합메모리 32GB', vram: 22, bw: 200, tdp: 0, mac: true, tier: 'mac' },
  { id: 'mac64', name: 'Mac 통합메모리 64GB', vram: 46, bw: 300, tdp: 0, mac: true, tier: 'mac' },
  { id: 'mac128', name: 'Mac 통합메모리 128GB', vram: 96, bw: 400, tdp: 0, mac: true, tier: 'mac' },
];

// params: 파라미터 수(B). 대표 모델명은 예시입니다.
export const models = [
  { id: '3b', params: 3, label: '3B', examples: 'Llama 3.2 3B, Qwen 3B' },
  { id: '8b', params: 8, label: '7~8B', examples: 'Llama 3.1 8B, Qwen 7B' },
  { id: '14b', params: 14, label: '12~14B', examples: 'Qwen 14B, Gemma 12B' },
  { id: '22b', params: 22, label: '20~22B', examples: 'Mistral Small' },
  { id: '32b', params: 32, label: '32B', examples: 'Qwen 32B, QwQ 32B' },
  { id: '70b', params: 70, label: '70B', examples: 'Llama 3.3 70B' },
  { id: '120b', params: 120, label: '120B+', examples: 'Mixtral 8x22B급' },
];

// 파라미터당 GB. Q4 가 사실상 표준입니다.
//
// ── 실측 보정 (2026-08-15) ─────────────────────────────────────────
// ollama.com/library/*/tags 의 실제 배포 파일 크기에서 뽑았습니다.
// 계산기의 params 는 명목값(3/8/14/...)이므로 같은 기준으로 나눴습니다.
//
//   모델                params   Q4      Q5      Q8
//   llama3.2:3b              3   0.667   0.767   1.133
//   qwen2.5:3b               3   0.633   0.733   1.100
//   llama3.1:8b              8   0.613   0.713   1.063
//   qwen2.5:7b               8   0.588   0.675   1.012
//   qwen2.5:14b             14   0.643   0.786   1.143
//   mistral-small:22b       22   0.591   0.727   1.091
//   qwen2.5:32b             32   0.625   0.719   1.094
//   llama3.1:70b            70   0.614     -       -
//   qwen2.5:72b             70   0.671   0.771   1.100
//   ─────────────────────────────────────────────────
//   평균                         0.627   0.736   1.092
//
// 이전 값(0.55 / 0.68 / 1.05)은 Q4 를 15% 낮게 잡고 있었습니다.
// 낮게 잡으면 "돌아간다"고 해놓고 실제로는 안 도는 조합이 생깁니다.
// 재측정할 때는 위 표를 갱신하고 날짜를 바꾸세요 — 모델 배포판은 계속 바뀝니다.
export const quants = [
  { id: 'q4', label: 'Q4 (표준)', perB: 0.63 },
  { id: 'q5', label: 'Q5 (품질↑)', perB: 0.74 },
  { id: 'q8', label: 'Q8 (고품질)', perB: 1.09 },
];

// ── 사람 말 입력 ──────────────────────────────────────────
// 이 사이트의 핵심은 "요구사항 → 스펙 번역"입니다.
// 사용자는 "32B 모델"을 모릅니다. "코딩 도우미로 쓰고 싶다"를 압니다.

export const useCases = [
  {
    id: 'chat',
    label: '간단한 질문·번역',
    desc: '궁금한 것 물어보기, 번역, 짧은 글 다듬기',
    params: 8,
    why: '가벼운 모델로도 충분합니다.',
  },
  {
    id: 'coding',
    label: '코딩 도우미',
    desc: '코드 작성, 오류 찾기, 설명 듣기',
    params: 14,
    why: '코드를 이해하려면 중간 크기 이상이 필요합니다.',
  },
  {
    id: 'docs',
    label: '긴 문서 읽고 요약',
    desc: '보고서·논문·매뉴얼 정리',
    params: 14,
    why: '문서가 길수록 메모리를 많이 씁니다.',
  },
  {
    id: 'quality',
    label: '전문적인 작업',
    desc: '복잡한 추론, 품질이 중요한 글',
    params: 32,
    why: '큰 모델일수록 좋지만 그만큼 비싼 카드가 필요합니다.',
  },
];

export const lengths = [
  { id: 'short', label: '짧은 대화', desc: '몇 마디 주고받는 정도', tokens: 2048 },
  { id: 'medium', label: 'A4 두세 장', desc: '짧은 문서 한 편', tokens: 4096 },
  { id: 'long', label: 'A4 열 장', desc: '보고서나 논문 한 편', tokens: 16384 },
  { id: 'huge', label: '아주 긴 내용', desc: '코드 파일 여러 개를 한 번에', tokens: 32768 },
];

export const contexts = [
  { id: '2k', label: '2K (짧은 대화)', tokens: 2048 },
  { id: '4k', label: '4K (일반)', tokens: 4096 },
  { id: '8k', label: '8K (긴 대화)', tokens: 8192 },
  { id: '16k', label: '16K (문서 처리)', tokens: 16384 },
  { id: '32k', label: '32K (코드베이스)', tokens: 32768 },
];

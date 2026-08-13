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

export const gpus = [
  { id: 'rtx5090', name: 'RTX 5090', vram: 32, bw: 1792, tdp: 575, tier: 'flagship', new: true, buy: 'https://link.coupang.com/a/gbIXLiOL36', widget: '' },
  { id: 'rtx5080', name: 'RTX 5080', vram: 16, bw: 960, tdp: 360, tier: 'high', new: true, buy: '', widget: '' },
  { id: 'rtx4090', name: 'RTX 4090', vram: 24, bw: 1008, tdp: 450, tier: 'flagship', new: true, buy: 'https://link.coupang.com/a/gbIVZFcbWC', widget: '' },
  { id: 'rtx4080s', name: 'RTX 4080 Super', vram: 16, bw: 736, tdp: 320, tier: 'high', new: true, buy: '', widget: '' },
  { id: 'rtx4070tis', name: 'RTX 4070 Ti Super', vram: 16, bw: 672, tdp: 285, tier: 'high', new: true, buy: '', widget: '' },
  { id: 'rtx4070s', name: 'RTX 4070 Super', vram: 12, bw: 504, tdp: 220, tier: 'mid', new: true, buy: '', widget: '' },
  { id: 'rtx4070', name: 'RTX 4070', vram: 12, bw: 504, tdp: 200, tier: 'mid', new: true, buy: 'https://link.coupang.com/a/gbIQDWmjn2', widget: '' },
  { id: 'rtx4060ti16', name: 'RTX 4060 Ti 16GB', vram: 16, bw: 288, tdp: 165, tier: 'mid', new: true, buy: '', widget: '' },
  { id: 'rtx4060ti8', name: 'RTX 4060 Ti 8GB', vram: 8, bw: 288, tdp: 160, tier: 'entry', new: true, buy: '', widget: '' },
  { id: 'rtx4060', name: 'RTX 4060', vram: 8, bw: 272, tdp: 115, tier: 'entry', new: true, buy: 'https://link.coupang.com/a/gbITRwz3ts', widget: '' },
  // ── 아래는 단종. 진단용으로만 목록에 둡니다 (추천 대상 아님) ──
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

// 파라미터당 바이트(GB/B 파라미터). Q4 가 사실상 표준입니다.
export const quants = [
  { id: 'q4', label: 'Q4 (표준)', perB: 0.55 },
  { id: 'q5', label: 'Q5 (품질↑)', perB: 0.68 },
  { id: 'q8', label: 'Q8 (고품질)', perB: 1.05 },
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

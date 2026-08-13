// VRAM 계산기 데이터.
//
// ⚠️ 수치는 근사입니다. 실제 모델 파일 크기는 배포판·양자화 방식마다 다릅니다.
//    공개 전에 ollama.com 에서 대표 모델 몇 개의 실제 용량을 확인하고 보정하세요.
//    보정한 수치가 곧 이 사이트의 차별점입니다 — 남들은 계산식만 적습니다.

export const gpus = [
  { id: 'rtx5090', name: 'RTX 5090', vram: 32, bw: 1792, tdp: 575, tier: 'flagship' },
  { id: 'rtx5080', name: 'RTX 5080', vram: 16, bw: 960, tdp: 360, tier: 'high' },
  { id: 'rtx4090', name: 'RTX 4090', vram: 24, bw: 1008, tdp: 450, tier: 'flagship' },
  { id: 'rtx4080s', name: 'RTX 4080 Super', vram: 16, bw: 736, tdp: 320, tier: 'high' },
  { id: 'rtx4070tis', name: 'RTX 4070 Ti Super', vram: 16, bw: 672, tdp: 285, tier: 'high' },
  { id: 'rtx4070s', name: 'RTX 4070 Super', vram: 12, bw: 504, tdp: 220, tier: 'mid' },
  { id: 'rtx4070', name: 'RTX 4070', vram: 12, bw: 504, tdp: 200, tier: 'mid' },
  { id: 'rtx4060ti16', name: 'RTX 4060 Ti 16GB', vram: 16, bw: 288, tdp: 165, tier: 'mid' },
  { id: 'rtx4060ti8', name: 'RTX 4060 Ti 8GB', vram: 8, bw: 288, tdp: 160, tier: 'entry' },
  { id: 'rtx4060', name: 'RTX 4060', vram: 8, bw: 272, tdp: 115, tier: 'entry' },
  { id: 'rtx3090', name: 'RTX 3090 (중고)', vram: 24, bw: 936, tdp: 350, tier: 'high' },
  { id: 'rtx3080', name: 'RTX 3080 10GB', vram: 10, bw: 760, tdp: 320, tier: 'mid' },
  { id: 'rtx3070', name: 'RTX 3070', vram: 8, bw: 448, tdp: 220, tier: 'entry' },
  { id: 'rtx3060', name: 'RTX 3060 12GB', vram: 12, bw: 360, tdp: 170, tier: 'entry' },
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

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
  // ── 애플 실리콘 ────────────────────────────────────────────────
  // ⚠️ 맥은 대역폭이 '용량'이 아니라 '칩 등급'으로 정해집니다.
  //    이전 버전은 용량별로 100/150/200/300/400 을 매겨뒀는데 전부 틀린 값이었습니다.
  //    32GB 라도 M5 면 153GB/s, M5 Pro 면 307GB/s 입니다. 두 배 차이납니다.
  //    그래서 항목을 칩 기준으로 나눕니다 — 사는 사람도 칩부터 고릅니다.
  //
  // 대역폭 출처: apple.com/kr 맥북에어·맥북프로 제품 사양, 2026-08-15 확인.
  //   M5 153GB/s · M5 Pro 307GB/s · M5 Max 460GB/s(GPU 32코어)~614GB/s(GPU 40코어)
  //
  //   ⚠️ M5 Max 는 같은 이름 안에서 GPU 코어 수에 따라 대역폭이 갈립니다.
  //      메모리 용량이 아니라 GPU 구성이 정합니다. 여기서는 64GB 를 460,
  //      128GB 를 614 로 두었으나, 실제로는 구성별로 확인해야 합니다.
  //
  // vram 은 '모델에 실제로 쓸 수 있는 몫' 입니다.
  //   macOS 의 Metal 은 통합 메모리의 약 75% 까지만 GPU 작업에 내줍니다.
  //   거기서 시스템 몫을 더 빼 보수적으로 잡았습니다 — 모자라면 아예 못 쓰기 때문입니다.
  //
  // 참고: M5 세대부터 최소 구성이 16GB 입니다. 8GB 맥은 더 이상 팔지 않습니다.
  { id: 'm5-16', name: 'Mac M5 · 16GB', vram: 10, bw: 153, tdp: 0, mac: true, tier: 'mac' },
  { id: 'm5-24', name: 'Mac M5 · 24GB', vram: 16, bw: 153, tdp: 0, mac: true, tier: 'mac' },
  { id: 'm5-32', name: 'Mac M5 · 32GB', vram: 22, bw: 153, tdp: 0, mac: true, tier: 'mac' },
  { id: 'm5pro-24', name: 'Mac M5 Pro · 24GB', vram: 16, bw: 307, tdp: 0, mac: true, tier: 'mac' },
  { id: 'm5pro-48', name: 'Mac M5 Pro · 48GB', vram: 34, bw: 307, tdp: 0, mac: true, tier: 'mac' },
  { id: 'm5pro-64', name: 'Mac M5 Pro · 64GB', vram: 46, bw: 307, tdp: 0, mac: true, tier: 'mac' },
  { id: 'm5max-64', name: 'Mac M5 Max · 64GB', vram: 46, bw: 460, tdp: 0, mac: true, tier: 'mac' },
  { id: 'm5max-128', name: 'Mac M5 Max · 128GB', vram: 96, bw: 614, tdp: 0, mac: true, tier: 'mac' },
];

// params: 파라미터 수(B). 대표 모델명은 예시입니다.
//
// kvPerK: 컨텍스트 1,024 토큰당 KV 캐시 크기(GiB).
//
// ── 2026-08-18 정정 ─────────────────────────────────────────────
// 이전에는 KV 캐시를 `params × 0.012 × (tokens/4096)` 으로 파라미터 수에
// 비례시켰습니다. **틀렸습니다.** KV 캐시는 파라미터가 아니라 레이어 수를 따라갑니다.
//
//   KV = 2(K,V) × 레이어 수 × KV 헤드 수 × 헤드 차원 × 토큰 수 × 2바이트(f16)
//
// 요즘 모델은 전부 GQA 라 KV 헤드가 8 개로 고정입니다. 그래서 파라미터가
// 늘어도 KV 는 레이어 수만큼만 늘어납니다. 3B 와 8B 의 KV 가 비슷한 이유입니다.
//
// 이전 식은 실제보다 1.5~12 배 적게 잡고 있었고, 긴 컨텍스트에서 특히 심했습니다.
// 120 개 조합 중 16 개의 판정이 바뀌었으며 **전부 낙관 방향** 이었습니다.
//
//   모델                레이어  KV헤드  헤드차원  토큰당      1K당(GiB)
//   llama3.2:3b            28      8     128    112 KiB     0.109
//   llama3.1:8b            32      8     128    128 KiB     0.125
//   qwen2.5:14b            48      8     128    192 KiB     0.188
//   mistral-small:22b      56      8     128    224 KiB     0.219
//   qwen2.5:32b            64      8     128    256 KiB     0.250
//   llama3.1:70b           80      8     128    320 KiB     0.313
//
// ⚠️ f16 KV 기준입니다. 실행 프로그램에서 KV 를 양자화하면 이보다 작아집니다.
//    기본값이 f16 이므로 기본 기준으로 잡았습니다.
// ⚠️ 모델마다 레이어 수가 다릅니다. 위는 각 구간의 대표 모델이고,
//    같은 구간이라도 모델에 따라 ±30% 정도 차이날 수 있습니다.
// ⚠️ 새 모델 구간을 추가할 때는 그 모델의 config 에서 레이어 수와 KV 헤드 수를
//    확인해 직접 계산하세요. params 로 어림하면 다시 틀립니다.
// purpose: 그 크기가 실제로 쓸 만한 용도.
//
// ── 2026-08-18 개편 ─────────────────────────────────────────────
// 이전에는 '용도'(useCases)를 따로 물었습니다. 없앴습니다.
//   - 선택지 4 개 중 2 개('코딩 도우미'·'긴 문서 요약')가 똑같이 14B 로 가서
//     답이 안 달라지는 질문이었습니다
//   - '긴 문서 요약'을 골라도 길이 컨트롤은 그대로였습니다. 이름값을 못 했습니다
//   - 고른 것이 몇 B 인지 화면에 안 보였습니다. 결과에만 나왔습니다
// 용도를 모델 크기의 설명으로 합쳐서, 고르는 순간 크기가 보이게 했습니다.
export const models = [
  { id: '3b', params: 3, kvPerK: 0.109, label: '3B', purpose: '번역·맞춤법', examples: 'Llama 3.2 3B, Qwen 3B' },
  { id: '8b', params: 8, kvPerK: 0.125, label: '7~8B', purpose: '간단한 질문·짧은 글', examples: 'Llama 3.1 8B, Qwen 7B' },
  { id: '14b', params: 14, kvPerK: 0.188, label: '12~14B', purpose: '코딩 도우미·문서 요약', examples: 'Qwen 14B, Gemma 12B' },
  { id: '22b', params: 22, kvPerK: 0.219, label: '20~22B', purpose: '좀 더 정확한 작업', examples: 'Mistral Small' },
  { id: '32b', params: 32, kvPerK: 0.25, label: '32B', purpose: '복잡한 추론', examples: 'Qwen 32B, QwQ 32B' },
  { id: '70b', params: 70, kvPerK: 0.313, label: '70B', purpose: '개인 장비로는 어려움', examples: 'Llama 3.3 70B' },
  // MoE 라 가중치·KV 모두 어림값입니다. 어차피 개인용 카드에서는 전부 '불가' 입니다.
  { id: '120b', params: 120, kvPerK: 0.25, label: '120B+', purpose: '서버급', examples: 'Mixtral 8x22B급' },
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

// ── 한 번에 다루는 양 ────────────────────────────────────
//
// ⚠️ 라벨은 이 사이트 독자 기준으로 씁니다. 개발자는 A4 장수로 세지 않습니다.
//    이전 라벨('A4 두세 장' / 설명 '짧은 문서 한 편')은 같은 말의 반복이라
//    고르는 데 아무 도움이 안 됐습니다.
//
// desc 에는 라벨을 되풀이하지 말고 **다른 축의 정보**를 넣습니다.
// 여기서는 "대화가 길어지면 자연히 아래 칸으로 내려간다" 를 알려줍니다 —
// 처음엔 빠르다가 느려지는 현상의 정체가 이것이기 때문입니다.
export const lengths = [
  { id: 'short', label: '짧은 질문', desc: '몇 마디 주고받는 정도', tokens: 2048 },
  { id: 'medium', label: '파일 한 개 정도', desc: 'A4 두세 장 · 대화 몇 번이면 여기', tokens: 4096 },
  { id: 'long', label: '파일 여러 개', desc: '긴 문서 한 편 · 대화가 길어지면 여기까지 옵니다', tokens: 16384 },
  { id: 'huge', label: '코드베이스 일부', desc: '아주 긴 내용을 한 번에 넣을 때', tokens: 32768 },
];


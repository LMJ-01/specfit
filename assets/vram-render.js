// VRAM 계산기 — 계산과 화면 만들기.
//
// 이 파일은 브라우저와 빌드가 **함께** 씁니다.
//   브라우저: vram.js 가 불러다 선택이 바뀔 때마다 다시 그립니다.
//   빌드:     build.js 가 기본 상태로 한 번 그려 HTML 에 박아둡니다.
//
// 왜 나눴는가 — 예전에는 계산기가 브라우저에서만 그려졌습니다.
// 서버가 보내는 HTML 에는 빈 <div data-vram-tool></div> 하나뿐이라
//   ① JS 를 돌리지 않는 크롤러(네이버 Yeti 등)에게 이 사이트의 유일한 차별점이 안 보였고
//   ② 나중에 삽입되면서 아래 내용을 밀어냈습니다(CLS).
// 자리를 min-height 로 예약하는 방법도 있지만, 컨트롤이 화면 폭에 따라
// 1행~3행으로 접혀서 높이가 520~810px 로 벌어집니다. 한 숫자로 못 맞춥니다.
// **같은 함수로 미리 그려두는 것**이 유일하게 정확한 방법입니다.
//
// ⚠️ 그래서 이 파일은 브라우저 API 를 쓰면 안 됩니다.
//    document·location·window 를 건드리는 순간 빌드가 깨집니다.
//    그런 것들은 전부 vram.js 에 있습니다.

// 처음 들어온 사람이 보게 되는 상태.
// 흔한 조합이어야 합니다 — 첫 화면이 '불가' 로 시작하면 도구를 닫습니다.
export const DEFAULT_STATE = {
  model: '14b',
  len: 'medium',
  gpu: 'rtx5060ti16',
  quant: 'q4',
  advanced: false,
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

// 프로그램이 돌아가는 데 필요한 몫. 컨텍스트와 무관하게 항상 붙습니다.
const OVERHEAD = 1;

/**
 * 필요 VRAM = 가중치 + KV 캐시 + 여유
 *
 * ⚠️ KV 캐시를 파라미터 수에 비례시키면 안 됩니다.
 *    레이어 수 × KV 헤드 수 × 헤드 차원이 정합니다 — gpu-data.js 의 kvPerK 주석 참고.
 *    이전 판은 그걸 params 로 어림했고, 실제보다 최대 12 배 적게 잡고 있었습니다.
 *
 * 양자화는 가중치만 줄입니다. KV 캐시는 별도 자료형(기본 f16)이라
 * quant 를 곱하지 않습니다.
 */
export function parts(model, quant, tokens) {
  const weights = model.params * quant.perB;
  const kv = model.kvPerK * (tokens / 1024);
  return { weights, kv, overhead: OVERHEAD, total: weights + kv + OVERHEAD };
}

export function estimate(model, quant, tokens) {
  return parts(model, quant, tokens).total;
}

export function verdict(total, vram) {
  if (total <= vram * 0.9) return 'ok';
  if (total <= vram) return 'tight';
  if (total <= vram * 1.5) return 'slow';
  return 'no';
}

const VERDICT_TEXT = {
  ok: { badge: '여유', desc: '전부 그래픽카드 메모리에 올라감' },
  tight: { badge: '빠듯', desc: '짧은 내용만 다루면 가능' },
  slow: { badge: '느림', desc: '일부가 CPU로 넘어가 답답해짐' },
  no: { badge: '불가', desc: '실사용이 어려움' },
};

/**
 * 정렬: VRAM → 등급 → 대역폭 → 전력.
 *
 * 왜 이 순서인지가 중요합니다. 둘 다 틀리는 방식을 겪었습니다.
 *   전력만 보면  → 5050(GDDR6 320GB/s, 130W)이 5060(GDDR7 448GB/s, 145W)을 이깁니다.
 *                  15W 아끼자고 40% 느린 카드를 권하게 됩니다.
 *   대역폭만 보면 → 16GB 구간에서 5060 Ti(448)를 제치고 5080(960)이 뽑힙니다.
 *                  "가장 저렴한 선택지"라고 해놓고 최상급을 권하게 됩니다.
 *
 * 등급(tier)을 먼저 보면 둘 다 해결됩니다. 가격대를 대신하는 값이고,
 * 같은 등급 안에서만 대역폭으로 가리므로 체급을 넘어가지 않습니다.
 */
const TIER_RANK = { entry: 0, mid: 1, high: 2, flagship: 3 };

const byFit = (a, b) =>
  a.vram - b.vram ||
  (TIER_RANK[a.tier] ?? 9) - (TIER_RANK[b.tier] ?? 9) ||
  b.bw - a.bw ||
  a.tdp - b.tdp;

/**
 * 여유 있게 돌아가는 가장 작은 카드.
 * 단종된 카드(new: false)는 제외합니다 — 지금 살 사람에게 권할 수 없습니다.
 */
function recommend(gpus, needed) {
  return gpus.filter((g) => !g.mac && g.new && needed <= g.vram * 0.9).sort(byFit)[0];
}

/**
 * 빠듯하게라도 들어가는 가장 작은 카드.
 *
 * 여유 기준만 쓰면 가격대가 크게 건너뛰는 구간이 생깁니다.
 * 예를 들어 22B(약 15GB)는 16GB 의 90%(14.4GB)를 넘어서 16GB 카드가 탈락하고,
 * 곧바로 24GB 급이 추천됩니다 — 가격대가 완전히 다릅니다.
 *
 * 그 구간에서 "빠듯하지만 들어가는" 선택지를 함께 보여줍니다.
 * 감추면 더 정직한 게 아니라, 살 수 있었던 카드를 안 알려준 것이 됩니다.
 * 대신 빠듯하다는 사실과 그 대가를 반드시 같이 적습니다.
 */
function recommendTight(gpus, needed) {
  return gpus
    .filter((g) => !g.mac && g.new && needed > g.vram * 0.9 && needed <= g.vram)
    .sort(byFit)[0];
}

const opts = (list, sel, fmt) =>
  list
    .map((x) => `<option value="${x.id}"${x.id === sel ? ' selected' : ''}>${fmt(x)}</option>`)
    .join('');

// 2048 → '2K'. 라벨 옆에 붙여서 고른 값이 실제로 얼마인지 보이게 합니다.
const kTokens = (n) => `${Math.round(n / 1024)}K`;

/**
 * 계산기 한 판을 HTML 문자열로 만듭니다.
 *
 * ⚠️ 빌드와 브라우저가 같은 입력으로 **같은 문자열**을 내야 합니다.
 *    여기서 갈리면 첫 렌더에 화면이 튑니다 — 이 파일을 만든 이유가 사라집니다.
 *    난수·시각·환경에 따라 달라지는 값을 넣지 마세요.
 */
export function renderVram(data, state = DEFAULT_STATE) {
  const { gpus, models, quants, lengths } = data;

  const model = models.find((m) => m.id === state.model);
  const len = lengths.find((l) => l.id === state.len);
  const gpu = gpus.find((g) => g.id === state.gpu);
  const quant = quants.find((q) => q.id === state.quant);

  const p = parts(model, quant, len.tokens);
  const needed = p.total;
  const v = verdict(needed, gpu.vram);

  // ── 결론 문장 (전문 용어 없이) ──
  let headline;
  let advice;

  const buyBtn = (card, label) =>
    card && card.buy
      ? `<a class="vr-buy" href="${card.buy}" target="_blank"
             rel="sponsored nofollow noopener">${esc(label || card.name + ' 가격 보기')}</a>`
      : '';

  if (v === 'ok') {
    headline = `쓸 수 있습니다`;
    advice = `<strong>${esc(gpu.name)}</strong>로 <strong>${esc(model.label)}</strong> 모델은 무리 없습니다.
        지금 카드를 그대로 쓰시면 됩니다.`;

    // 지금 카드로 감당되는 가장 큰 모델의 '다음 단계'를 알려줍니다.
    // 결론(충분하다)은 그대로 두고, 더 하고 싶을 때 뭐가 필요한지만 덧붙입니다.
    const okModels = models.filter(
      (m) => verdict(estimate(m, quant, len.tokens), gpu.vram) === 'ok'
    );
    const largest = okModels[okModels.length - 1];
    const next = largest ? models[models.indexOf(largest) + 1] : models[0];
    if (next) {
      const up = recommend(gpus, estimate(next, quant, len.tokens));
      if (up && up.vram > gpu.vram) {
        advice += `<span class="vr-next">지금 카드로는 <strong>${esc(largest ? largest.label : '')}</strong>까지입니다.
            더 큰 <strong>${esc(next.label)}</strong> 모델까지 돌리려면
            <strong class="vr-hl">${esc(up.name)}</strong>(메모리 ${up.vram}GB) 이상이 필요합니다.</span>`;
        advice += buyBtn(up);
      }
    }
  } else if (v === 'tight') {
    headline = `아슬아슬합니다`;
    advice = `돌아가긴 하지만 여유가 없습니다.
        <strong>${esc(len.label)}</strong>보다 짧게 쓰면 됩니다.`;
    // 같은 용도를 여유 있게 쓰려면 어떤 카드가 필요한지
    const comfy = recommend(gpus, needed);
    if (comfy && comfy.vram > gpu.vram) {
      advice += `<span class="vr-next">여유 있게 쓰려면
          <strong class="vr-hl">${esc(comfy.name)}</strong>(메모리 ${comfy.vram}GB) 이상입니다.</span>`;
      advice += buyBtn(comfy);
    }
  } else {
    const rec = recommend(gpus, needed);
    const tight = recommendTight(gpus, needed);
    headline = v === 'slow' ? `느릴 겁니다` : `이 카드로는 어렵습니다`;
    if (rec) {
      advice = `<strong>${esc(model.label)}</strong> 모델이라면 메모리 <strong>${rec.vram}GB</strong> 이상이 필요합니다.
           여유 있게 쓰려면 <strong class="vr-hl">${esc(rec.name)}</strong>입니다.`;
      // 제휴 링크는 rel="sponsored" 가 필수입니다. 없으면 구글이 링크 스팸으로 봅니다.
      advice += buyBtn(rec);
      // 여유 기준만 보여주면 가격대가 건너뛰는 구간이 있습니다.
      // 더 작은 카드에 빠듯하게 들어간다면, 그 대가와 함께 알려줍니다.
      if (tight && tight.vram < rec.vram) {
        advice += `<span class="vr-next">예산을 줄이려면
            <strong class="vr-hl">${esc(tight.name)}</strong>(메모리 ${tight.vram}GB)에도 들어갑니다.
            다만 <strong>빠듯</strong>해서 긴 내용을 다루면 밀립니다.</span>`;
        advice += buyBtn(tight);
      }
    } else if (tight) {
      advice = `<strong>${esc(model.label)}</strong> 모델을 여유 있게 돌릴 카드는 없습니다.
           <strong class="vr-hl">${esc(tight.name)}</strong>(메모리 ${tight.vram}GB)에
           <strong>빠듯하게</strong> 들어가는 정도입니다.`;
      advice += buyBtn(tight);
    } else {
      advice = `<strong>${esc(model.label)}</strong> 모델은 개인용 그래픽카드로는 감당하기 어렵습니다.
           더 작은 모델을 골라보세요.`;
    }
  }

  // 길이를 줄이는 게 도움이 되는 상황인지 알려줍니다.
  // 이게 없으면 "짧게 물어보면 되지 않나" 를 매번 헛짚습니다 —
  // 가중치가 대부분인 구간에서는 길이를 줄여도 거의 안 줄어듭니다.
  const kvShare = Math.round((p.kv / p.total) * 100);
  const whyLine =
    kvShare >= 25
      ? `이 길이에서는 <strong>컨텍스트가 ${kvShare}%</strong> 를 차지합니다. 짧게 쓰면 그만큼 줄어듭니다.`
      : `이 길이에서는 대부분이 모델 가중치입니다. <strong>짧게 써도 크게 안 줄어듭니다.</strong>`;

  // ── 상세 표 (원하는 사람만) ──
  const rows = models
    .map((m) => {
      const mp = parts(m, quant, len.tokens);
      const t = mp.total;
      const mv = verdict(t, gpu.vram);
      return `<tr>
          <td><strong>${esc(m.label)}</strong><br><span class="vr-ex">${esc(m.examples)}</span></td>
          <td class="vr-num">${t.toFixed(1)}GB<br>
              <span class="vr-ex">가중치 ${mp.weights.toFixed(1)} · 컨텍스트 ${mp.kv.toFixed(1)}</span></td>
          <td><span class="vr-badge vr-badge-${mv}">${VERDICT_TEXT[mv].badge}</span><br>
              <span class="vr-ex">${VERDICT_TEXT[mv].desc}</span></td>
        </tr>`;
    })
    .join('');

  return `
<div class="vr">
  <div class="vr-controls">
    <label>쓰려는 모델
      <select data-k="model">${opts(models, state.model, (m) => `${m.label} · ${m.purpose}`)}</select>
      <span class="vr-hint">${esc(model.examples)} · 가중치 ${p.weights.toFixed(1)}GB</span>
    </label>
    <label>한 번에 다루는 양
      <select data-k="len">${opts(lengths, state.len, (l) => `${l.label} · ${kTokens(l.tokens)}`)}</select>
      <span class="vr-hint">${esc(len.desc)}</span>
    </label>
    <label>쓰고 계신 그래픽카드
      <select data-k="gpu">${opts(gpus, state.gpu, (g) => `${g.name} (메모리 ${g.vram}GB)`)}</select>
      <span class="vr-hint"><a href="/tools/vram.html#내-그래픽카드-확인하는-법">내 그래픽카드 확인하는 법</a></span>
    </label>
  </div>

  <div class="vr-result vr-result-${v}">
    <p class="vr-headline"><span class="vr-badge vr-badge-${v}">${VERDICT_TEXT[v].badge}</span> ${headline}</p>
    <p class="vr-advice">${advice}</p>
    <p class="vr-why">${whyLine}</p>
    <p class="vr-parts">
      필요 <strong>${needed.toFixed(1)}GB</strong>
      <span class="vr-parts-eq">= 가중치 ${p.weights.toFixed(1)} + 컨텍스트 ${p.kv.toFixed(1)} + 여유 ${p.overhead.toFixed(1)}</span>
      <span class="vr-parts-vs">내 카드 ${gpu.vram}GB</span>
    </p>
    <p class="vr-share">
      <button type="button" class="vr-share-btn" data-share>이 결과 링크 복사</button>
      <span class="vr-share-msg" role="status" data-share-msg></span>
    </p>
  </div>

  <details class="vr-details"${state.advanced ? ' open' : ''} data-adv>
    <summary>다른 크기도 함께 보기</summary>
    <div class="table-wrap">
      <table class="vr-table">
        <thead><tr><th>모델 크기</th><th>필요 메모리</th><th>내 카드에서</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <label class="vr-quant">품질 설정
      <select data-k="quant">${opts(quants, state.quant, (q) => q.label)}</select>
      <span class="vr-hint">기본값(Q4)이 대부분의 경우 가장 무난합니다.</span>
    </label>
  </details>

  <p class="vr-note">
    ${gpu.mac ? '맥은 시스템이 메모리 일부를 쓰므로 전체 용량을 다 쓰지는 못합니다. 위 수치는 실제 사용 가능분 기준입니다. ' : ''}
    <strong>근사치입니다.</strong> 실제로 쓸 모델의 파일 크기는 배포판마다 다릅니다.
    경계선에 있다면 한 단계 위 메모리를 택하는 편이 안전합니다.
  </p>
</div>`;
}

/**
 * 계산기가 들어갈 자리. 빌드가 기본 상태를 미리 채워 넣습니다.
 *
 * 빈 <div> 로 두면 JS 를 돌리지 않는 쪽에는 아무것도 안 보이고,
 * JS 가 나중에 채우면서 아래 내용을 밀어냅니다. 둘 다 여기서 없어집니다.
 */
export function toolMountHtml(data) {
  return `<div data-vram-tool>${renderVram(data, DEFAULT_STATE)}</div>`;
}

// VRAM 계산기.
//
// 설계 원칙: 사용자는 "32B 모델"이나 "Q4 양자화"를 모릅니다.
//   "코딩 도우미로 쓰고 싶다"를 압니다. 그 번역이 이 도구의 존재 이유입니다.
//   전문 용어는 기본 화면에서 전부 치우고, 원하는 사람만 고급 설정에서 봅니다.

(function () {
  const mount = document.querySelector('[data-vram-tool]');
  if (!mount || !window.SPECFIT_DATA) return;

  const { gpus, models, quants, lengths, useCases } = window.SPECFIT_DATA;

  const state = {
    use: 'coding',
    len: 'medium',
    gpu: 'rtx5060ti16',
    quant: 'q4',
    advanced: false,
  };

  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

  // ── 공유 가능한 링크 ──────────────────────────────────────────
  //
  // 도구가 퍼지려면 결과를 주고받을 수 있어야 합니다.
  // "제 카드로는 이렇게 나오네요" 하고 붙일 URL 이 없으면 공유가 안 되고,
  // 커뮤니티에 올려도 각자 다시 골라야 해서 대화가 이어지지 않습니다.
  //
  // 해시(#)가 아니라 쿼리(?)를 씁니다. 계산기 페이지에는 이미
  // #내-그래픽카드-확인하는-법 같은 본문 앵커가 있어서,
  // 해시를 상태에 쓰면 둘이 서로를 지웁니다.
  //
  // 색인 걱정은 없습니다. 모든 페이지에 canonical 이 박혀 있어서
  // ?gpu=... 가 붙은 주소는 원래 주소로 합쳐집니다.
  const PARAMS = [
    ['use', useCases],
    ['len', lengths],
    ['gpu', gpus],
    ['quant', quants],
  ];

  function readUrl() {
    const q = new URLSearchParams(location.search);
    for (const [key, list] of PARAMS) {
      const v = q.get(key);
      // 목록에 없는 값은 조용히 무시합니다.
      // 낡은 링크나 오타 때문에 화면이 비면 안 됩니다.
      if (v && list.some((x) => x.id === v)) state[key] = v;
    }
  }

  function writeUrl() {
    if (!window.history || !history.replaceState) return;
    const q = new URLSearchParams(location.search);
    for (const [key] of PARAMS) q.set(key, state[key]);
    // replaceState 라 뒤로가기 기록이 쌓이지 않습니다.
    // pushState 를 쓰면 드롭다운을 몇 번 만져본 사람이 뒤로가기로 못 나갑니다.
    history.replaceState(null, '', `${location.pathname}?${q}${location.hash}`);
  }

  // 프로그램이 돌아가는 데 필요한 몫. 컨텍스트와 무관하게 항상 붙습니다.
  const OVERHEAD = 1;

  // 용도(useCases)는 파라미터 수만 갖고 있습니다.
  // KV 캐시는 레이어 수를 따라가므로 같은 크기의 모델 항목에서 값을 가져옵니다.
  const modelFor = (params) =>
    models.find((m) => m.params === params) ||
    models.reduce((a, b) => (Math.abs(b.params - params) < Math.abs(a.params - params) ? b : a));

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
  function parts(params, quant, tokens) {
    const weights = params * quant.perB;
    const kv = modelFor(params).kvPerK * (tokens / 1024);
    return { weights, kv, overhead: OVERHEAD, total: weights + kv + OVERHEAD };
  }

  function estimate(params, quant, tokens) {
    return parts(params, quant, tokens).total;
  }

  function verdict(total, vram) {
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
   * 여유 있게 돌아가는 가장 작은 카드.
   * 단종된 카드(new: false)는 제외합니다 — 지금 살 사람에게 권할 수 없습니다.
   *
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

  function recommend(needed) {
    return gpus
      .filter((g) => !g.mac && g.new && needed <= g.vram * 0.9)
      .sort(byFit)[0];
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
  function recommendTight(needed) {
    return gpus
      .filter((g) => !g.mac && g.new && needed > g.vram * 0.9 && needed <= g.vram)
      .sort(byFit)[0];
  }

  const opts = (list, sel, fmt) =>
    list
      .map((x) => `<option value="${x.id}"${x.id === sel ? ' selected' : ''}>${fmt(x)}</option>`)
      .join('');

  function render() {
    const use = useCases.find((u) => u.id === state.use);
    const len = lengths.find((l) => l.id === state.len);
    const gpu = gpus.find((g) => g.id === state.gpu);
    const quant = quants.find((q) => q.id === state.quant);

    const p = parts(use.params, quant, len.tokens);
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
      advice = `<strong>${esc(gpu.name)}</strong>로 <strong>${esc(use.label)}</strong> 용도는 무리 없습니다.
        지금 카드를 그대로 쓰시면 됩니다.`;

      // 지금 카드로 감당되는 가장 큰 모델의 '다음 단계'를 알려줍니다.
      // 결론(충분하다)은 그대로 두고, 더 하고 싶을 때 뭐가 필요한지만 덧붙입니다.
      const okModels = models.filter(
        (m) => verdict(estimate(m.params, quant, len.tokens), gpu.vram) === 'ok'
      );
      const largest = okModels[okModels.length - 1];
      const next = largest ? models[models.indexOf(largest) + 1] : models[0];
      if (next) {
        const up = recommend(estimate(next.params, quant, len.tokens));
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
      const comfy = recommend(needed);
      if (comfy && comfy.vram > gpu.vram) {
        advice += `<span class="vr-next">여유 있게 쓰려면
          <strong class="vr-hl">${esc(comfy.name)}</strong>(메모리 ${comfy.vram}GB) 이상입니다.</span>`;
        advice += buyBtn(comfy);
      }
    } else {
      const rec = recommend(needed);
      const tight = recommendTight(needed);
      headline = v === 'slow' ? `느릴 겁니다` : `이 카드로는 어렵습니다`;
      if (rec) {
        advice = `<strong>${esc(use.label)}</strong> 용도라면 메모리 <strong>${rec.vram}GB</strong> 이상이 필요합니다.
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
        advice = `<strong>${esc(use.label)}</strong> 용도를 여유 있게 돌릴 카드는 없습니다.
           <strong class="vr-hl">${esc(tight.name)}</strong>(메모리 ${tight.vram}GB)에
           <strong>빠듯하게</strong> 들어가는 정도입니다.`;
        advice += buyBtn(tight);
      } else {
        advice = `이 용도는 개인용 그래픽카드로는 감당하기 어렵습니다. 더 가벼운 용도를 골라보세요.`;
      }
    }

    // ── 상세 표 (원하는 사람만) ──
    const rows = models
      .map((m) => {
        const mp = parts(m.params, quant, len.tokens);
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

    mount.innerHTML = `
<div class="vr">
  <div class="vr-controls">
    <label>어디에 쓰시나요?
      <select data-k="use">${opts(useCases, state.use, (u) => u.label)}</select>
      <span class="vr-hint">${esc(use.desc)}</span>
    </label>
    <label>얼마나 긴 내용을 다루나요?
      <select data-k="len">${opts(lengths, state.len, (l) => l.label)}</select>
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
    <p class="vr-why">${esc(use.why)}</p>
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
    <summary>다른 용도도 함께 보기</summary>
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

    mount.querySelectorAll('select').forEach((el) => {
      el.addEventListener('change', (e) => {
        state[e.target.dataset.k] = e.target.value;
        const d = mount.querySelector('[data-adv]');
        state.advanced = d ? d.open : false;
        writeUrl();
        render();
      });
    });

    const shareBtn = mount.querySelector('[data-share]');
    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        const msg = mount.querySelector('[data-share-msg]');
        const show = (text) => {
          if (msg) msg.textContent = text;
        };
        // 주소창은 이미 현재 선택을 담고 있습니다(writeUrl).
        // 다만 한 번도 안 바꾼 사람은 파라미터가 없으므로 여기서 한 번 씁니다.
        writeUrl();
        const url = location.href;
        // 클립보드는 https 에서만 동작합니다. 안 되면 주소를 그냥 보여줍니다 —
        // 복사가 안 됐는데 됐다고 하는 것보다 낫습니다.
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(
            () => show('링크를 복사했습니다'),
            () => show(url)
          );
        } else {
          show(url);
        }
      });
    }
  }

  readUrl();
  render();
})();

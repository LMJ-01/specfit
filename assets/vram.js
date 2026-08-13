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
    gpu: 'rtx4060ti16',
    quant: 'q4',
    advanced: false,
  };

  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

  // 필요 VRAM = 가중치 + KV 캐시 + 여유
  function estimate(params, quant, tokens) {
    return params * quant.perB + params * 0.012 * (tokens / 4096) + 1;
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

  // 조건을 만족하는 가장 작은 카드를 찾습니다.
  // 단종된 카드(new: false)는 제외합니다 — 지금 살 사람에게 권할 수 없습니다.
  function recommend(needed) {
    return gpus
      .filter((g) => !g.mac && g.new && needed <= g.vram * 0.9)
      .sort((a, b) => a.vram - b.vram || a.tdp - b.tdp)[0];
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

    const needed = estimate(use.params, quant, len.tokens);
    const v = verdict(needed, gpu.vram);

    // ── 결론 문장 (전문 용어 없이) ──
    let headline;
    let advice;

    if (v === 'ok') {
      headline = `쓸 수 있습니다`;
      advice = `<strong>${esc(gpu.name)}</strong>로 <strong>${esc(use.label)}</strong> 용도는 무리 없습니다.
        지금 카드를 그대로 쓰시면 됩니다.`;
    } else if (v === 'tight') {
      headline = `아슬아슬합니다`;
      advice = `돌아가긴 하지만 여유가 없습니다. <strong>${esc(len.label)}</strong>보다 짧게 쓰거나,
        한 단계 위 카드를 고려하세요.`;
    } else {
      const rec = recommend(needed);
      headline = v === 'slow' ? `느릴 겁니다` : `이 카드로는 어렵습니다`;
      if (rec) {
        advice = `<strong>${esc(use.label)}</strong> 용도라면 메모리 <strong>${rec.vram}GB</strong> 이상이 필요합니다.
           가장 저렴한 선택지는 <strong class="vr-hl">${esc(rec.name)}</strong>입니다.`;
        // 제휴 링크는 rel="sponsored" 가 필수입니다. 없으면 구글이 링크 스팸으로 봅니다.
        if (rec.buy) {
          advice += `<a class="vr-buy" href="${rec.buy}" target="_blank"
            rel="sponsored nofollow noopener">${esc(rec.name)} 가격 보기</a>`;
        }
      } else {
        advice = `이 용도는 개인용 그래픽카드로는 감당하기 어렵습니다. 더 가벼운 용도를 골라보세요.`;
      }
    }

    // ── 상세 표 (원하는 사람만) ──
    const rows = models
      .map((m) => {
        const t = estimate(m.params, quant, len.tokens);
        const mv = verdict(t, gpu.vram);
        return `<tr>
          <td><strong>${esc(m.label)}</strong><br><span class="vr-ex">${esc(m.examples)}</span></td>
          <td class="vr-num">${t.toFixed(1)}GB</td>
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
        render();
      });
    });
  }

  render();
})();

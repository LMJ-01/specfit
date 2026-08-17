// VRAM 계산기 — 브라우저 쪽.
//
// 계산과 화면 만들기는 vram-render.js 에 있습니다. **빌드도 같은 파일을 씁니다.**
// 그래서 서버가 보낸 HTML 과 여기서 처음 그리는 결과가 정확히 같습니다 —
// 화면이 튀지 않고, JS 를 돌리지 않는 쪽에도 계산기가 보입니다.
//
// 이 파일에는 브라우저에서만 되는 것만 둡니다: 마운트 찾기, 주소 읽고 쓰기,
// 선택 반응, 클립보드.
//
// 설계 원칙: 묻는 것마다 답이 달라져야 합니다.
//   이전 판은 '용도'와 '모델 크기'를 따로 다뤘는데, 용도 선택지 넷 중 둘이
//   같은 크기로 가서 만져도 결과가 안 바뀌었습니다. 물어놓고 안 쓰는 질문이었습니다.
//   지금은 셋 다 서로 다른 축입니다 — 무엇을 · 얼마나 길게 · 어떤 카드로.
//
//   전문 용어를 감추는 대신 **옆에 붙여서** 보여줍니다.
//   "12~14B · 코딩 도우미" 처럼 두면 모르는 사람은 뒤를 읽고,
//   아는 사람은 앞을 읽습니다. 감추면 아는 사람이 못 고릅니다.

import { DEFAULT_STATE, renderVram } from './vram-render.js';

const mount = document.querySelector('[data-vram-tool]');
if (mount && window.SPECFIT_DATA) {
  const data = window.SPECFIT_DATA;
  const { gpus, models, quants, lengths } = data;

  const state = { ...DEFAULT_STATE };

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
    ['model', models],
    ['len', lengths],
    ['gpu', gpus],
    ['quant', quants],
  ];

  // 이전 판은 '용도'(use)를 물었습니다. 그때 공유된 링크가 아직 돌아다니므로
  // 예전 값을 모델 크기로 옮겨 받습니다. 링크를 깨뜨리면 공유의 의미가 없습니다.
  const LEGACY_USE = { chat: '8b', coding: '14b', docs: '14b', quality: '32b' };

  function readUrl() {
    const q = new URLSearchParams(location.search);
    let changed = false;
    for (const [key, list] of PARAMS) {
      const v = q.get(key);
      // 목록에 없는 값은 조용히 무시합니다.
      // 낡은 링크나 오타 때문에 화면이 비면 안 됩니다.
      if (v && list.some((x) => x.id === v)) {
        if (state[key] !== v) changed = true;
        state[key] = v;
      }
    }
    const legacy = q.get('use');
    if (!q.get('model') && legacy && LEGACY_USE[legacy]) {
      if (state.model !== LEGACY_USE[legacy]) changed = true;
      state.model = LEGACY_USE[legacy];
    }
    return changed;
  }

  function writeUrl() {
    if (!window.history || !history.replaceState) return;
    const q = new URLSearchParams(location.search);
    for (const [key] of PARAMS) q.set(key, state[key]);
    // replaceState 라 뒤로가기 기록이 쌓이지 않습니다.
    // pushState 를 쓰면 드롭다운을 몇 번 만져본 사람이 뒤로가기로 못 나갑니다.
    history.replaceState(null, '', `${location.pathname}?${q}${location.hash}`);
  }

  function wire() {
    mount.querySelectorAll('select').forEach((el) => {
      el.addEventListener('change', (e) => {
        state[e.target.dataset.k] = e.target.value;
        const d = mount.querySelector('[data-adv]');
        state.advanced = d ? d.open : false;
        writeUrl();
        draw();
      });
    });

    const shareBtn = mount.querySelector('[data-share]');
    if (!shareBtn) return;
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

  function draw() {
    mount.innerHTML = renderVram(data, state);
    wire();
  }

  // 주소에 아무것도 없으면 빌드가 그려둔 것과 결과가 같습니다.
  // 그때는 다시 그리지 않고 이벤트만 붙입니다 — 멀쩡한 화면을 지웠다 그리면
  // 화면이 한 번 깜빡이고, 이 파일을 나눈 이유가 없어집니다.
  if (readUrl()) draw();
  else wire();
}

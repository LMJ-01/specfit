// 본문 도해. 글에서 {{FIG:이름}} 으로 불러 씁니다.
//
// 왜 인라인 SVG 인가:
//   - 외부 요청이 없어 로딩이 늦지 않습니다
//   - CSS 변수를 그대로 읽어 다크모드가 자동으로 따라옵니다 (이미지였다면 두 벌이 필요합니다)
//   - 확대해도 안 깨집니다
//   - viewBox + width/height 를 박아 CLS 가 생기지 않습니다
//
// 색은 style.css 의 토큰만 씁니다. 여기서 새 색을 만들면 다크모드에서 깨집니다.

const COLOR = {
  fit: 'var(--fig-fit)', // VRAM 안에 들어간 몫
  over: 'var(--fig-over)', // 넘쳐서 CPU 로 간 몫
  soft: 'var(--bg-soft)',
  line: 'var(--border)',
  text: 'var(--fg)',
  mute: 'var(--fg-muted)',
  accent: 'var(--accent)',
};

/** 공통 래퍼. 제목은 스크린리더용이자 캡션입니다. */
function figure(title, w, h, body, caption) {
  return `<figure class="fig">
<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${title}">
<title>${title}</title>
${body}
</svg>
${caption ? `<figcaption>${caption}</figcaption>` : ''}
</figure>`;
}

const t = (x, y, s, opt = {}) =>
  `<text x="${x}" y="${y}" fill="${opt.fill || COLOR.text}" font-size="${opt.size || 13}"${
    opt.weight ? ` font-weight="${opt.weight}"` : ''
  }${opt.anchor ? ` text-anchor="${opt.anchor}"` : ''}>${s}</text>`;

const rect = (x, y, w, h, fill, opt = {}) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" rx="${opt.r ?? 4}"${
    opt.stroke ? ` stroke="${opt.stroke}"` : ''
  }/>`;

/**
 * 모델이 VRAM 을 넘치면 나머지가 CPU 로 간다.
 * 이 사이트에서 가장 많이 반복하는 개념이라 그림 하나로 끝내는 편이 낫습니다.
 */
function vramOverflow() {
  const W = 640;
  const scale = 46; // 1GB 당 픽셀
  const vram = 8;
  const need = 10;
  const x0 = 16;

  const body = `
${t(x0, 22, '8GB 카드에 14B 모델을 올리면', { weight: 600, size: 14 })}

${rect(x0, 38, vram * scale, 40, COLOR.fit)}
${rect(x0 + vram * scale, 38, (need - vram) * scale, 40, COLOR.over)}
${t(x0 + (vram * scale) / 2, 63, 'VRAM 안 · 8GB', { anchor: 'middle', fill: '#fff', weight: 600 })}
${t(x0 + vram * scale + (need - vram) * scale / 2, 63, '+2GB', { anchor: 'middle', fill: '#fff', weight: 600, size: 12 })}

${t(x0 + (vram * scale) / 2, 98, '그래픽카드가 처리 — 빠름', { anchor: 'middle', fill: COLOR.mute, size: 12 })}
${t(x0 + vram * scale + (need - vram) * scale / 2, 98, 'CPU 로', { anchor: 'middle', fill: COLOR.mute, size: 12 })}

<line x1="${x0 + vram * scale}" y1="30" x2="${x0 + vram * scale}" y2="108" stroke="${COLOR.line}" stroke-dasharray="4 3"/>

${t(x0, 134, '이 2GB 때문에 전체가 느려집니다.', { weight: 600 })}
${t(x0, 154, '에러가 나는 게 아니라 속도만 떨어져서 원인을 알기 어렵습니다.', { fill: COLOR.mute, size: 12 })}`;

  return figure(
    '8GB 카드에 14B 모델을 올리면 2GB가 CPU로 넘어가 느려진다',
    W,
    168,
    body,
    '넘친 몫은 시스템 램과 CPU 가 떠맡습니다. 대역폭이 VRAM 의 10 분의 1 수준이라 그만큼 느려집니다.'
  );
}

/**
 * 필요 메모리의 구성. "컨텍스트만 줄이면 되지 않나" 를 막는 그림입니다.
 *
 * ⚠️ 2026-08-18 — kv 값을 0.2 → 0.75 로 고쳤습니다.
 *    계산기가 KV 캐시를 파라미터 수에 비례시키고 있었고 그 값을 그대로 썼습니다.
 *    실제로는 레이어 수를 따라갑니다 (gpu-data.js 의 kvPerK 주석 참고).
 *
 *    이 그림은 **A4 두세 장(4,096 토큰) 기준**입니다. 그 길이에서는 여전히
 *    가중치가 대부분이라 그림의 결론이 유지됩니다.
 *    다만 긴 컨텍스트에서는 KV 가 가중치에 육박하므로,
 *    이 그림을 "컨텍스트는 항상 작다" 로 읽히게 쓰면 안 됩니다.
 */
function memoryParts() {
  const W = 640;
  const scale = 52;
  const x0 = 16;
  const w = { weights: 8.8, kv: 0.75, over: 1 };

  const seg = (x, width, fill, label, sub) => `
${rect(x, 40, width, 38, fill)}
${t(x + width / 2, 64, label, { anchor: 'middle', fill: '#fff', weight: 600, size: 12 })}`;

  const x1 = x0;
  const x2 = x1 + w.weights * scale;
  const x3 = x2 + w.kv * scale;

  const body = `
${t(x0, 22, '14B 모델이 필요한 메모리 = 약 10.6GB  (A4 두세 장 기준)', { weight: 600, size: 14 })}

${seg(x1, w.weights * scale, COLOR.fit, '가중치 8.8GB')}
${seg(x2, w.kv * scale, COLOR.accent, '')}
${seg(x3, w.over * scale, COLOR.over, '여유 1GB')}

${t(x1, 98, '컨텍스트와 무관 — 항상 먼저 들어갑니다', { fill: COLOR.mute, size: 12 })}
${t(x3 + w.over * scale, 98, '↑ 컨텍스트 0.75GB', { anchor: 'end', fill: COLOR.mute, size: 12 })}

${t(x0, 128, '컨텍스트를 0 으로 해도 9.8GB 입니다.', { weight: 600 })}
${t(x0, 148, '8GB 카드에서 "짧게 물어보면 되지 않나" 가 통하지 않는 이유입니다.', { fill: COLOR.mute, size: 12 })}`;

  return figure(
    '짧은 길이에서는 가중치가 대부분이라 컨텍스트를 줄여도 소용이 없다',
    W,
    162,
    body,
    '가중치와 여유는 컨텍스트와 무관하게 먼저 들어갑니다. 그 합이 이미 VRAM 을 넘으면 컨텍스트를 줄여도 넘습니다. 반대로 아주 긴 내용을 다루면 컨텍스트 몫이 가중치에 육박하므로, 그때는 이야기가 달라집니다.'
  );
}

/** 램과 VRAM 의 역할 차이. */
function ramVsVram() {
  const W = 640;
  const box = (x, y, w, h, title, lines, accent) => `
${rect(x, y, w, h, COLOR.soft, { stroke: accent ? COLOR.accent : COLOR.line })}
${t(x + 14, y + 26, title, { weight: 700, size: 14, fill: accent ? COLOR.accent : COLOR.text })}
${lines.map((l, i) => t(x + 14, y + 50 + i * 20, l, { fill: COLOR.mute, size: 12 })).join('\n')}`;

  const body = `
${box(16, 16, 290, 116, 'VRAM (그래픽카드)', ['모델이 실제로 연산되는 곳', '빠릅니다 · 용량이 작습니다', '여기 다 올라가면 쾌적'], true)}
${box(334, 16, 290, 116, '시스템 램', ['모델을 읽어 올리는 통로', '느립니다 · 용량이 큽니다', 'VRAM 이 모자랄 때만 일합니다'])}

<path d="M306 74 L334 74" stroke="${COLOR.line}" stroke-width="2" marker-end="url(#fig-arrow)"/>
<defs><marker id="fig-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
<path d="M0 0 L8 4 L0 8 z" fill="${COLOR.line}"/></marker></defs>

${t(16, 160, '모델이 VRAM 에 다 들어가면 시스템 램은 거의 놀고 있습니다.', { weight: 600 })}
${t(16, 180, '그래서 램 16GB 로도 충분한 경우가 많습니다.', { fill: COLOR.mute, size: 12 })}`;

  return figure(
    'VRAM 은 연산하는 곳, 시스템 램은 모델을 읽어 올리는 통로',
    W,
    194,
    body,
    '둘은 대체재가 아닙니다. 램을 늘려도 VRAM 이 하는 일을 대신하지 못합니다.'
  );
}

/** 대역폭이 생성 속도를 정한다. */
function bandwidthLadder() {
  const W = 640;
  const rows = [
    ['RTX 5090', 1792],
    ['RTX 5070', 672],
    ['M5 Max (상위)', 614],
    ['RTX 5060 Ti', 448],
    ['M5 Pro', 307],
    ['M5', 153],
  ];
  const max = 1792;
  const barX = 150;
  const barW = 400;

  const body = `
${t(16, 22, '메모리 대역폭 — 모델이 다 올라간 뒤 속도를 정하는 값', { weight: 600, size: 14 })}
${rows
  .map(([name, bw], i) => {
    const y = 40 + i * 30;
    const w = Math.max(3, (bw / max) * barW);
    return `${t(16, y + 15, name, { size: 12 })}
${rect(barX, y + 3, w, 16, COLOR.accent, { r: 3 })}
${t(barX + w + 8, y + 15, bw + ' GB/s', { size: 11, fill: COLOR.mute })}`;
  })
  .join('\n')}

${t(16, 232, '용량이 "되느냐" 를 정하고, 대역폭이 "얼마나 빠르냐" 를 정합니다.', { weight: 600 })}`;

  return figure(
    '카드별 메모리 대역폭 비교',
    W,
    246,
    body,
    '같은 모델이 둘 다 VRAM 에 올라간다면, 그다음은 이 값이 체감을 가릅니다.'
  );
}

/**
 * 시스템 램과 GPU 의 대역폭 격차.
 * "CPU 로도 돌아간다는데 왜 이렇게 느리냐" 에 대한 답이 이 그림입니다.
 */
function cpuVsGpuBandwidth() {
  const W = 640;
  const rows = [
    ['RTX 5090', 1792, COLOR.accent],
    ['RTX 5070', 672, COLOR.accent],
    ['RTX 5060', 448, COLOR.accent],
    ['Mac M5', 153, COLOR.accent],
    ['DDR5-5600 듀얼', 89.6, COLOR.over],
    ['DDR4-3200 듀얼', 51.2, COLOR.over],
  ];
  const max = 1792;
  const barX = 160;
  const barW = 380;

  const body = `
${t(16, 22, '모델 가중치를 읽어오는 속도', { weight: 600, size: 14 })}
${rows
  .map(([name, bw, fill], i) => {
    const y = 40 + i * 30;
    const w = Math.max(3, (bw / max) * barW);
    return `${t(16, y + 15, name, { size: 12 })}
${rect(barX, y + 3, w, 16, fill, { r: 3 })}
${t(barX + w + 8, y + 15, bw + ' GB/s', { size: 11, fill: COLOR.mute })}`;
  })
  .join('\n')}

<line x1="${barX - 8}" y1="152" x2="${barX + barW}" y2="152" stroke="${COLOR.line}" stroke-dasharray="4 3"/>
${t(16, 148, '↑ 그래픽카드', { size: 11, fill: COLOR.mute })}
${t(16, 172, '↓ 시스템 램', { size: 11, fill: COLOR.mute })}

${t(16, 232, 'CPU 로 넘어간 몫은 이 아래쪽 속도로 처리됩니다.', { weight: 600 })}
${t(16, 252, '5060 과 DDR5 만 비교해도 5 배 차이입니다.', { fill: COLOR.mute, size: 12 })}`;

  return figure(
    '그래픽카드와 시스템 램의 메모리 대역폭 격차',
    W,
    266,
    body,
    'DDR5-5600 듀얼채널은 89.6GB/s 입니다. 5060(448) 의 5 분의 1, 5090(1792) 의 20 분의 1 입니다.'
  );
}

/** 해상도별 작업 영역. 모니터 글에서 "넓다" 를 숫자로 보여줍니다. */
function resolutionArea() {
  const W = 640;
  const s = 0.13; // 픽셀 → 도해 픽셀
  const boxes = [
    ['3840×2160 · 4K', 3840, 2160, COLOR.accent],
    ['2560×1440 · QHD', 2560, 1440, COLOR.fit],
    ['1920×1080 · FHD', 1920, 1080, COLOR.over],
  ];
  const x0 = 16;
  const y0 = 40;

  const body = `
${t(16, 22, '같은 화면에 들어가는 작업 영역', { weight: 600, size: 14 })}
${boxes
  .map(
    ([, w, h, fill]) =>
      `<rect x="${x0}" y="${y0}" width="${w * s}" height="${h * s}" fill="none" stroke="${fill}" stroke-width="2" rx="3"/>`
  )
  .join('\n')}
${boxes
  .map(([label, w, h, fill], i) => {
    const y = y0 + 24 + i * 22;
    return `${rect(x0 + 3840 * s + 24, y - 10, 12, 12, fill, { r: 2 })}
${t(x0 + 3840 * s + 44, y, label, { size: 12 })}`;
  })
  .join('\n')}
${t(x0 + 3840 * s + 44, y0 + 116, 'FHD 대비', { size: 11, fill: COLOR.mute, weight: 600 })}
${t(x0 + 3840 * s + 44, y0 + 136, '4K = 4.0배 · QHD = 1.8배', { size: 11, fill: COLOR.mute })}

${t(16, 336, '4K 는 FHD 네 장을 붙인 넓이입니다.', { weight: 600 })}
${t(16, 356, '다만 그대로 쓰면 글자가 작아서, 보통 배율을 올려 씁니다.', { fill: COLOR.mute, size: 12 })}`;

  return figure(
    'FHD·QHD·4K 의 작업 영역 넓이 비교',
    W,
    370,
    body,
    '넓이는 픽셀 수로 정해집니다. 4K 는 FHD 의 4 배, QHD 는 1.8 배입니다.'
  );
}

/** Ollama 첫 실행까지의 흐름. */
function ollamaFlow() {
  const W = 640;
  const step = (i, x, title, sub) => {
    const w = 176;
    return `${rect(x, 40, w, 76, COLOR.soft, { stroke: COLOR.line })}
${rect(x + 14, 54, 22, 22, COLOR.accent, { r: 11 })}
${t(x + 25, 70, String(i), { anchor: 'middle', fill: '#fff', weight: 700, size: 13 })}
${t(x + 46, 70, title, { weight: 600, size: 13 })}
${t(x + 14, 98, sub, { fill: COLOR.mute, size: 11 })}`;
  };
  const arrow = (x) =>
    `<path d="M${x} 78 L${x + 20} 78" stroke="${COLOR.line}" stroke-width="2" marker-end="url(#fig-arrow2)"/>`;

  const body = `
${t(16, 22, '설치부터 첫 답변까지', { weight: 600, size: 14 })}
<defs><marker id="fig-arrow2" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
<path d="M0 0 L8 4 L0 8 z" fill="${COLOR.line}"/></marker></defs>
${step(1, 16, '설치', '내려받아 실행')}
${arrow(192)}
${step(2, 232, '모델 받기', 'ollama pull')}
${arrow(408)}
${step(3, 448, '대화', 'ollama run')}

${t(16, 152, '명령어 두 줄이면 끝납니다.', { weight: 600 })}
${t(16, 172, '어려운 건 설치가 아니라 어떤 모델을 고르느냐입니다.', { fill: COLOR.mute, size: 12 })}`;

  return figure(
    'Ollama 설치, 모델 받기, 대화 세 단계',
    W,
    186,
    body,
    '설치 자체는 몇 분이면 됩니다. 판단이 필요한 지점은 모델 크기 선택입니다.'
  );
}

/**
 * 같은 모니터를 돌렸을 때 한 화면에 들어가는 코드 줄 수.
 *
 * "세로로 쓰면 더 보인다" 는 말은 많은데 얼마나 더 보이는지는 아무도 안 적습니다.
 * 픽셀 수는 그대로이고 배치만 바뀐다는 것을 그림 하나로 보여주는 편이 빠릅니다.
 */
function pivotLines() {
  const W = 640;
  const s = 0.075; // 화면 픽셀 → 도해 픽셀
  const LW = 2560 * s; // 가로 모드 너비 192
  const LH = 1440 * s; // 가로 모드 높이 108
  const PW = 1440 * s; // 세로 모드 너비 108
  const PH = 2560 * s; // 세로 모드 높이 192

  // 화면 안을 코드 줄로 채웁니다. 줄 간격을 두 화면에서 같게 두면
  // 들어가는 줄 수의 비가 그대로 눈에 보입니다 — 그게 이 그림의 전부입니다.
  const GAP = 7;
  const codeLines = (x, y, w, h) => {
    const out = [];
    let i = 0;
    for (let ly = y + 8; ly < y + h - 5; ly += GAP, i++) {
      // 줄마다 길이를 달리해 코드처럼 보이게 합니다
      const frac = 0.4 + ((i * 3) % 7) / 11;
      out.push(rect(x + 8, ly, (w - 16) * frac, 2, COLOR.mute, { r: 1 }));
    }
    return out.join('\n');
  };

  const top = 46;
  const lx = 16;
  const ly = top + (PH - LH) / 2; // 세로 화면과 가운데를 맞춥니다
  const px = 300;
  const labelA = top + PH + 24;
  const labelB = labelA + 18;

  const body = `
${t(16, 24, '같은 27인치 QHD 모니터를 돌리기만 했을 때', { weight: 600, size: 14 })}

${rect(lx, ly, LW, LH, COLOR.soft, { stroke: COLOR.line })}
${codeLines(lx, ly, LW, LH)}
${t(lx, labelA, '가로 · 2560×1440', { weight: 600, size: 12 })}
${t(lx, labelB, '약 75줄', { fill: COLOR.mute, size: 12 })}

${rect(px, top, PW, PH, COLOR.soft, { stroke: COLOR.accent })}
${codeLines(px, top, PW, PH)}
${t(px, labelA, '세로 · 1440×2560', { weight: 600, size: 12 })}
${t(px, labelB, '약 134줄', { fill: COLOR.accent, size: 12, weight: 600 })}

${t(452, top + 86, '1.8배', { size: 30, weight: 700, fill: COLOR.accent })}
${t(452, top + 110, '더 보입니다', { size: 12, fill: COLOR.mute })}
${t(452, top + 148, '픽셀 수는 그대로입니다.', { size: 12, fill: COLOR.mute })}
${t(452, top + 166, '배치만 바뀝니다.', { size: 12, fill: COLOR.mute })}`;

  return figure(
    '같은 모니터를 세로로 돌리면 코드가 약 1.8배 더 보인다',
    W,
    labelB + 14,
    body,
    '글꼴 14px · 줄 높이 19px 기준으로 계산했습니다. 실제로는 탭 막대와 상태 표시줄이 빠져 이보다 조금 적습니다.'
  );
}

/**
 * USB-C 케이블 안의 통로(레인) 4개를 어떻게 나누는가.
 *
 * "원케이블로 4K 되나요" 의 답이 조건부인 이유가 이 그림 하나입니다.
 * 말로 쓰면 길어지는데 그림으로는 두 줄이면 끝납니다.
 */
function usbcLanes() {
  const W = 640;
  const x0 = 16;
  const barX = 132;
  const lw = 84;
  const gap = 6;

  const lane = (i, y, fill, label) =>
    `${rect(barX + i * (lw + gap), y, lw, 28, fill, { r: 3 })}
${t(barX + i * (lw + gap) + lw / 2, y + 19, label, { anchor: 'middle', fill: '#fff', weight: 600, size: 11 })}`;

  const noteX = 500;

  const body = `
${t(x0, 22, 'USB-C 케이블 안의 통로 4개를 어떻게 나누느냐', { weight: 600, size: 14 })}

${t(x0, 63, '화면만', { weight: 600, size: 12 })}
${[0, 1, 2, 3].map((i) => lane(i, 44, COLOR.fit, '화면')).join('\n')}
${t(noteX, 58, '최대 해상도', { size: 11, fill: COLOR.mute })}
${t(noteX, 74, 'USB 는 느린 속도로', { size: 11, fill: COLOR.mute })}

${t(x0, 123, '화면 + USB', { weight: 600, size: 12 })}
${[0, 1].map((i) => lane(i, 104, COLOR.fit, '화면')).join('\n')}
${[2, 3].map((i) => lane(i, 104, COLOR.accent, 'USB')).join('\n')}
${t(noteX, 118, '화면 몫이 절반', { size: 11, fill: COLOR.mute })}
${t(noteX, 134, '허브가 제 속도로', { size: 11, fill: COLOR.mute })}

${t(x0, 176, '통로 수는 정해져 있고, 나눠 쓰면 화면 몫이 줄어듭니다.', { weight: 600 })}
${t(x0, 196, '"허브를 꽂으니 주사율이 떨어졌다" 는 고장이 아니라 이 구조입니다.', { fill: COLOR.mute, size: 12 })}`;

  return figure(
    'USB-C 레인 4개를 화면에만 쓸 때와 USB 와 나눠 쓸 때의 차이',
    W,
    210,
    body,
    '화면 신호와 USB 데이터가 같은 케이블을 나눠 씁니다. 압축(DSC)이 이 제약을 상당히 덜어주지만, 없애지는 못합니다.'
  );
}

/**
 * 정수 배율과 분수 배율의 차이.
 *
 * "5K 가 왜 더 선명한가" 를 PPI 로만 설명하면 반쪽입니다.
 * 논리 픽셀 하나가 물리 픽셀에 정확히 떨어지느냐가 실제 이유이고,
 * 그건 격자 두 개를 나란히 놓으면 설명이 끝납니다.
 */
function pixelScaling() {
  const W = 640;
  const cell = 15;
  const n = 8;
  const size = cell * n;
  const top = 56;

  const grid = (gx) => {
    const out = [rect(gx, top, size, size, COLOR.soft, { r: 2, stroke: COLOR.line })];
    for (let i = 1; i < n; i++) {
      out.push(
        `<line x1="${gx + i * cell}" y1="${top}" x2="${gx + i * cell}" y2="${top + size}" stroke="${COLOR.line}"/>`
      );
      out.push(
        `<line x1="${gx}" y1="${top + i * cell}" x2="${gx + size}" y2="${top + i * cell}" stroke="${COLOR.line}"/>`
      );
    }
    return out.join('\n');
  };

  // 논리 픽셀 경계. 정수 배율이면 물리 격자선 위에 정확히 얹히고,
  // 분수 배율이면 칸 한가운데를 지나갑니다.
  const overlay = (gx, step, color) => {
    const out = [];
    for (let v = step; v < size - 0.5; v += step) {
      out.push(
        `<line x1="${gx + v}" y1="${top}" x2="${gx + v}" y2="${top + size}" stroke="${color}" stroke-width="2.5"/>`
      );
      out.push(
        `<line x1="${gx}" y1="${top + v}" x2="${gx + size}" y2="${top + v}" stroke="${color}" stroke-width="2.5"/>`
      );
    }
    return out.join('\n');
  };

  const ax = 60;
  const bx = 380;

  const body = `
${t(16, 22, '가는 선이 실제 픽셀, 굵은 선이 화면에 그려질 경계', { weight: 600, size: 14 })}

${grid(ax)}
${overlay(ax, cell * 2, COLOR.fit)}
${t(ax, top + size + 26, '배율 200% — 정수', { weight: 600, size: 12 })}
${t(ax, top + size + 44, '경계가 픽셀 선에 딱 얹힘', { fill: COLOR.mute, size: 11 })}

${grid(bx)}
${overlay(bx, cell * 1.5, COLOR.over)}
${t(bx, top + size + 26, '배율 150% — 분수', { weight: 600, size: 12 })}
${t(bx, top + size + 44, '경계가 픽셀 한가운데를 지남', { fill: COLOR.mute, size: 11 })}

${t(16, top + size + 84, '오른쪽은 반 픽셀을 켤 수 없어 옆 픽셀에 흐리게 나눠 칠합니다.', { weight: 600 })}
${t(16, top + size + 104, '글자 테두리가 미세하게 뭉개지는 이유이고, PPI 와는 별개의 문제입니다.', { fill: COLOR.mute, size: 12 })}`;

  return figure(
    '정수 배율은 픽셀 경계가 맞고 분수 배율은 픽셀 한가운데를 지난다',
    W,
    top + size + 120,
    body,
    '논리 픽셀 하나가 물리 픽셀 정수 개에 떨어지면 어긋남이 없습니다. 27인치 5K 의 200% 가 그 경우입니다.'
  );
}

/**
 * 듀얼 채널 — 어느 슬롯에 꽂느냐로 갈린다.
 * "두 장 = 듀얼" 이 아니라는 것을 슬롯 그림으로 보여줍니다.
 * ⚠️ 슬롯-채널 배치는 통상 관례(A1 A2 B1 B2)입니다. 캡션에서 설명서 기준을 밝힙니다.
 */
function dualChannelSlots() {
  const W = 640;
  const slotW = 26;
  const slotH = 64;
  const gap = 14;
  const x0 = 150;

  // 한 줄: 슬롯 4개 중 filled 배열이 참인 자리에 램을 칠합니다.
  const row = (y, label, filled, color, verdict, verdictColor) => {
    let s = t(16, y + slotH / 2 + 5, label, { weight: 600 });
    for (let i = 0; i < 4; i++) {
      const x = x0 + i * (slotW + gap);
      s += rect(x, y, slotW, slotH, filled[i] ? color : COLOR.soft, {
        r: 3,
        stroke: COLOR.line,
      });
      s += t(x + slotW / 2, y + slotH + 16, String(i + 1), {
        anchor: 'middle',
        fill: COLOR.mute,
        size: 11,
      });
    }
    s += t(x0 + 4 * (slotW + gap) + 12, y + slotH / 2 + 5, verdict, {
      weight: 600,
      fill: verdictColor,
    });
    return s;
  };

  const chY = 24;
  const chW = 2 * slotW + gap;
  const body = `
${t(x0, chY - 8, '채널 A', { anchor: 'start', fill: COLOR.mute, size: 11 })}
${t(x0 + 2 * (slotW + gap), chY - 8, '채널 B', { anchor: 'start', fill: COLOR.mute, size: 11 })}
<line x1="${x0}" y1="${chY}" x2="${x0 + chW}" y2="${chY}" stroke="${COLOR.line}"/>
<line x1="${x0 + 2 * (slotW + gap)}" y1="${chY}" x2="${x0 + 2 * (slotW + gap) + chW}" y2="${chY}" stroke="${COLOR.line}"/>

${row(38, '1·2번에 두 장', [true, true, false, false], COLOR.over, '싱글로 돕니다', COLOR.over)}
${row(140, '2·4번에 두 장', [false, true, false, true], COLOR.fit, '듀얼 채널', COLOR.fit)}

${t(16, 248, '같은 두 장인데 꽂은 자리로 대역폭이 두 배 갈립니다.', { weight: 600 })}`;

  return figure(
    '같은 램 두 장이라도 한 채널에 몰아 꽂으면 싱글, 채널마다 하나씩이면 듀얼로 동작한다',
    W,
    262,
    body,
    '슬롯 번호는 통상 관례입니다. 내 보드의 지정 슬롯은 메인보드 설명서의 메모리 구성표가 기준입니다.'
  );
}

/**
 * Ollama 기본 컨텍스트를 넘긴 입력은 오류 없이 앞부분이 잘린다.
 * "앞부분을 까먹는" 증상의 정체를 한 그림으로 보여줍니다.
 */
function ctxTruncate() {
  const W = 640;
  const x0 = 16;
  const barW = 560;
  const barH = 40;
  const keep = 0.35; // 창에 남는 뒷부분 비율

  const cutX = x0 + barW * (1 - keep);
  const body = `
${t(x0, 22, '긴 문서를 넣으면 (기본 컨텍스트보다 큰 입력)', { weight: 600, size: 14 })}

${rect(x0, 38, barW * (1 - keep), barH, COLOR.soft, { stroke: COLOR.line })}
${rect(cutX, 38, barW * keep, barH, COLOR.fit)}
${t(x0 + (barW * (1 - keep)) / 2, 63, '앞부분 — 버려짐', { anchor: 'middle', fill: COLOR.mute, weight: 600 })}
${t(cutX + (barW * keep) / 2, 63, '모델이 보는 범위', { anchor: 'middle', fill: '#fff', weight: 600, size: 12 })}

<line x1="${cutX}" y1="30" x2="${cutX}" y2="100" stroke="${COLOR.line}" stroke-dasharray="4 3"/>
${t(cutX, 116, '← 여기 앞은 모델에게 전달되지 않습니다', { anchor: 'middle', fill: COLOR.mute, size: 12 })}

${t(x0, 148, '오류도, 화면 표시도 없습니다. 서버 로그에만 남습니다.', { weight: 600 })}
${t(x0, 168, '그래서 "모델이 앞부분을 까먹는" 증상으로 보입니다.', { fill: COLOR.mute, size: 12 })}`;

  return figure(
    '기본 컨텍스트를 넘긴 입력은 앞부분이 잘린 채 모델에 전달된다',
    W,
    182,
    body,
    '뒤쪽(질문에 가까운 쪽)이 남고 앞쪽이 버려집니다. num_ctx 를 늘리면 창이 넓어지는 대신 VRAM 이 듭니다.'
  );
}

/**
 * 해상도 다른 두 모니터 — 픽셀 좌표로 이어 붙여서 커서가 걸리는 구간이 생긴다.
 * monitor-mixed-resolution 의 핵심 개념. 물리 배치가 아니라 픽셀 기준이라는
 * 것을 두 사각형의 높이 차로 보여줍니다.
 */
function mixedResCursor() {
  const W = 640;
  const scale = 0.115; // 픽셀 → 화면 좌표
  const qhdH = 1440 * scale; // 165.6
  const fhdH = 1080 * scale; // 124.2
  const qhdW = 200;
  const fhdW = 150;
  const x0 = 60;
  const top = 40;
  const gapY = top + fhdH; // FHD 아래 = 벽 시작

  const body = `
${t(x0, 24, '윈도우가 보는 두 화면 (픽셀 기준, 상단 정렬)', { weight: 600, size: 14 })}

${rect(x0, top, qhdW, qhdH, COLOR.soft, { stroke: COLOR.line })}
${rect(x0 + qhdW + 4, top, fhdW, fhdH, COLOR.soft, { stroke: COLOR.line })}
${t(x0 + qhdW / 2, top + qhdH / 2, 'QHD', { anchor: 'middle', weight: 600 })}
${t(x0 + qhdW / 2, top + qhdH / 2 + 18, '세로 1440', { anchor: 'middle', fill: COLOR.mute, size: 11 })}
${t(x0 + qhdW + 4 + fhdW / 2, top + fhdH / 2, 'FHD', { anchor: 'middle', weight: 600 })}
${t(x0 + qhdW + 4 + fhdW / 2, top + fhdH / 2 + 18, '세로 1080', { anchor: 'middle', fill: COLOR.mute, size: 11 })}

<line x1="${x0 + qhdW - 30}" y1="${top + 40}" x2="${x0 + qhdW + 30}" y2="${top + 40}" stroke="${COLOR.fit}" stroke-width="2"/>
${t(x0 + qhdW + 36, top + 44, '← 여기는 통과', { fill: COLOR.fit, size: 12, weight: 600 })}

${rect(x0 + qhdW, gapY, 4, qhdH - fhdH, COLOR.over, { r: 0 })}
<line x1="${x0 + qhdW - 30}" y1="${gapY + (qhdH - fhdH) / 2}" x2="${x0 + qhdW - 6}" y2="${gapY + (qhdH - fhdH) / 2}" stroke="${COLOR.over}" stroke-width="2"/>
${t(x0 + qhdW + 12, gapY + (qhdH - fhdH) / 2 + 4, '← 이 구간은 벽 — 옆이 "없는 공간"입니다', { fill: COLOR.over, size: 12, weight: 600 })}

${t(x0, top + qhdH + 28, '아래쪽 360픽셀 구간에서는 커서가 오른쪽으로 못 넘어갑니다.', { weight: 600 })}
${t(x0, top + qhdH + 48, '배치를 가운데 정렬로 바꾸면 벽이 위아래로 나뉘어 체감이 줄어듭니다.', { fill: COLOR.mute, size: 12 })}`;

  return figure(
    '세로 픽셀이 다른 두 화면을 상단 정렬로 붙이면 아래쪽 차이 구간에서 커서가 막힌다',
    W,
    top + qhdH + 62,
    body,
    '윈도우는 물리 크기가 아니라 픽셀 수로 화면을 이어 붙입니다. 겹치지 않는 구간이 곧 벽입니다.'
  );
}

/**
 * 미니PC 세 급의 메모리 대역폭.
 * 같은 "미니PC" 이름 아래 급이 얼마나 벌어지는지 막대 길이로 보여줍니다.
 * 수치는 mini-pc-local-llm 본문의 계산값과 동일해야 합니다.
 */
function minipcBandwidth() {
  const W = 640;
  const rows = [
    // [이름, GB/s, 미니PC 급인가(참고 축이면 false)]
    ['RTX 5060 (VRAM · 참고)', 448, false],
    ['통합메모리 급 미니PC', 256, true],
    ['맥 M5 (참고)', 153, false],
    ['일반 미니PC (듀얼 채널)', 89.6, true],
    ['저가형 미니PC (싱글 채널)', 38.4, true],
  ];
  const max = 448;
  const barX = 216;
  const barW = 340;

  const body = `
${t(16, 22, '같은 "미니PC" 인데 대역폭은 급마다 이렇게 다릅니다', { weight: 600, size: 14 })}
${rows
  .map(([name, bw, isMinipc], i) => {
    const y = 40 + i * 30;
    const w = Math.max(3, (bw / max) * barW);
    return `${t(16, y + 15, name, { size: 12, fill: isMinipc ? COLOR.text : COLOR.mute })}
${
  isMinipc
    ? rect(barX, y + 3, w, 16, COLOR.accent, { r: 3 })
    : rect(barX, y + 3, w, 16, COLOR.soft, { r: 3, stroke: COLOR.line })
}
${t(barX + w + 8, y + 15, bw + ' GB/s', { size: 11, fill: COLOR.mute })}`;
  })
  .join('\n')}

${t(16, 202, '색칠된 막대가 미니PC 세 급 — 사양표의 램 규격에서 계산되는 값입니다.', { weight: 600 })}`;

  return figure(
    '미니PC 세 급의 메모리 대역폭 비교',
    W,
    216,
    body,
    '로컬 LLM 생성 속도는 이 막대 길이에 비례합니다. 급을 확인하고 사는 이유입니다.'
  );
}

/**
 * 순수 사인파 vs 유사(계단형) 사인파.
 * UPS 글의 ③ "요즘 파워에는 이게 걸립니다"를 그림 하나로 보여줍니다.
 * 파형은 개형(모양)만 정확하면 됩니다 — 축·수치를 넣지 않습니다.
 */
function upsSinewave() {
  const W = 640;
  const H = 190;
  const panelW = 280;
  const midY = 108;
  const amp = 40;

  // 사인 곡선을 점으로 찍어 폴리라인으로 그립니다.
  const sinePts = [];
  for (let i = 0; i <= 48; i++) {
    const x = 24 + (i / 48) * (panelW - 48);
    const y = midY - amp * Math.sin((i / 48) * Math.PI * 2);
    sinePts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }

  // 계단형: 같은 한 주기를 수평 구간 + 수직 점프로 흉내 냅니다.
  const sx = 336;
  const stepLevels = [0, -1, -1, 0, 1, 1, 0]; // -1 = 위(마이너스 y), 1 = 아래
  const stepW = (panelW - 48) / stepLevels.length;
  let stepPath = `M ${sx + 24} ${midY}`;
  stepLevels.forEach((lv, i) => {
    const y = midY + lv * amp;
    const x0 = sx + 24 + i * stepW;
    stepPath += ` L ${x0.toFixed(1)} ${y} L ${(x0 + stepW).toFixed(1)} ${y}`;
  });
  stepPath += ` L ${(sx + 24 + stepLevels.length * stepW).toFixed(1)} ${midY}`;

  const body = `
${t(16, 22, '배터리 모드에서 UPS 가 내보내는 전기의 모양', { weight: 600, size: 14 })}
${rect(16, 34, panelW, 128, COLOR.soft, { r: 6, stroke: COLOR.line })}
${rect(sx, 34, panelW, 128, COLOR.soft, { r: 6, stroke: COLOR.line })}
<line x1="24" y1="${midY}" x2="${16 + panelW - 8}" y2="${midY}" stroke="${COLOR.line}" stroke-dasharray="3 3"/>
<line x1="${sx + 8}" y1="${midY}" x2="${sx + panelW - 8}" y2="${midY}" stroke="${COLOR.line}" stroke-dasharray="3 3"/>
<polyline points="${sinePts.join(' ')}" fill="none" stroke="${COLOR.fit}" stroke-width="2.5"/>
<path d="${stepPath}" fill="none" stroke="${COLOR.over}" stroke-width="2.5"/>
${t(16 + panelW / 2, 52, '순수 사인파', { weight: 600, anchor: 'middle' })}
${t(sx + panelW / 2, 52, '유사(계단형) 사인파', { weight: 600, anchor: 'middle' })}
${t(16 + panelW / 2, 180, '가정용 전기와 같은 모양', { size: 11, fill: COLOR.mute, anchor: 'middle' })}
${t(sx + panelW / 2, 180, '저가형 — 액티브 PFC 파워와 궁합 문제 보고', { size: 11, fill: COLOR.mute, anchor: 'middle' })}`;

  return figure(
    '순수 사인파와 유사 사인파 비교',
    W,
    H,
    body,
    '컴퓨터용이라면 "순수 사인파" 표기를 확인하세요. 요즘 파워(액티브 PFC)는 계단형 전기에서 꺼지거나 소음이 나는 사례가 보고됩니다.'
  );
}

/**
 * 모니터 KVM — 허브의 주인이 화면 입력과 함께 바뀌는 구조.
 * 실선 = 지금 연결된 쪽, 점선 = 대기 쪽.
 */
function kvmSwitch() {
  const W = 640;
  const H = 210;

  const box = (x, y, w, h, label, sub, active) => `
${rect(x, y, w, h, active ? COLOR.soft : 'none', { r: 6, stroke: active ? COLOR.accent : COLOR.line })}
${t(x + w / 2, y + 22, label, { weight: 600, anchor: 'middle', fill: active ? COLOR.text : COLOR.mute })}
${sub ? t(x + w / 2, y + 40, sub, { size: 11, fill: COLOR.mute, anchor: 'middle' }) : ''}`;

  const body = `
${t(16, 22, 'KVM — 허브의 주인을 화면 입력과 함께 바꿉니다', { weight: 600, size: 14 })}
${box(16, 76, 150, 52, '키보드 · 마우스', '한 세트뿐', true)}
${box(236, 64, 168, 76, '모니터', '화면 + USB 허브', true)}
${box(470, 44, 154, 52, '① 데스크톱', 'DP + USB-B', true)}
${box(470, 128, 154, 52, '② 회사 노트북', 'USB-C 하나', false)}
<path d="M166 102 L236 102" stroke="${COLOR.accent}" stroke-width="2.5"/>
<path d="M404 88 L470 74" stroke="${COLOR.accent}" stroke-width="2.5"/>
<path d="M404 118 L470 150" stroke="${COLOR.line}" stroke-width="2" stroke-dasharray="5 4"/>
${t(320, 168, '입력을 ②로 바꾸면 키보드·마우스도 ②로 따라갑니다', { size: 12, fill: COLOR.mute, anchor: 'middle' })}
${t(320, 196, '실선 = 지금 연결 · 점선 = 대기', { size: 11, fill: COLOR.mute, anchor: 'middle' })}`;

  return figure(
    'KVM 전환 구조',
    W,
    H,
    body,
    '컴퓨터에는 아무것도 설치하지 않습니다 — 모니터가 장치를 바꿔 꽂아주는 것과 같습니다.'
  );
}

/**
 * 크로마 서브샘플링 — 4:4:4 는 픽셀마다 색 정보, 4:2:0 은 2×2 가 나눠 씀.
 * 체커 무늬(선명)와 2×2 덩어리(뭉개짐)의 대비가 그림의 전부입니다.
 */
function chromaSubsampling() {
  const W = 640;
  const H = 236;
  const cell = 30;
  const n = 4; // 4×4 픽셀
  const grid = (gx, gy, blockSize) => {
    const out = [];
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++) {
        // blockSize=1 이면 픽셀마다, 2면 2×2 덩어리로 색을 정합니다
        const br = Math.floor(r / blockSize);
        const bc = Math.floor(c / blockSize);
        const fill = (br + bc) % 2 ? COLOR.accent : COLOR.soft;
        out.push(rect(gx + c * cell, gy + r * cell, cell - 2, cell - 2, fill, { r: 2, stroke: COLOR.line }));
      }
    return out.join('\n');
  };

  const body = `
${t(16, 22, '색 정보를 픽셀마다 갖느냐, 2×2 가 나눠 쓰느냐', { weight: 600, size: 14 })}
${t(90, 52, '4:4:4 — 모니터 방식', { weight: 600 })}
${grid(60, 64, 1)}
${t(90, 212, '색 경계가 픽셀 단위로 섭니다', { size: 11, fill: COLOR.mute })}
${t(390, 52, '4:2:0 — TV 기본값', { weight: 600 })}
${grid(380, 64, 2)}
${t(390, 212, '경계가 2×2 로 뭉개집니다 — 색 글자가 번지는 이유', { size: 11, fill: COLOR.mute })}`;

  return figure(
    '크로마 서브샘플링 4:4:4 와 4:2:0 비교',
    W,
    H,
    body,
    '영상에서는 눈치채기 어렵지만, 구문 강조로 색 글자가 가득한 코딩 화면에서는 그대로 보입니다.'
  );
}

export const figures = {
  'vram-overflow': vramOverflow,
  'memory-parts': memoryParts,
  'ram-vs-vram': ramVsVram,
  'bandwidth': bandwidthLadder,
  'cpu-vs-gpu-bandwidth': cpuVsGpuBandwidth,
  'resolution-area': resolutionArea,
  'ollama-flow': ollamaFlow,
  'pivot-lines': pivotLines,
  'usb-c-lanes': usbcLanes,
  'pixel-scaling': pixelScaling,
  'dual-channel-slots': dualChannelSlots,
  'ctx-truncate': ctxTruncate,
  'mixed-res-cursor': mixedResCursor,
  'minipc-bandwidth': minipcBandwidth,
  'ups-sinewave': upsSinewave,
  'kvm-switch': kvmSwitch,
  'chroma-subsampling': chromaSubsampling,
  'weak-link-chain': weakLinkChain,
  'mesh-backhaul': meshBackhaul,
  'lan-panel-layout': lanPanelLayout,
  'wifi-gates': wifiGates,
  'nas-share': nasShare,
  'cooler-fan-noise': coolerFanNoise,
  'ssd-cache-shrink': ssdCacheShrink,
  'ram-flex-mode': ramFlexMode,
  'psu-modular-types': psuModularTypes,
  'wifi-jitter': wifiJitter,
  'cpu-gpu-relay': cpuGpuRelay,
  'tablet-os-wall': tabletOsWall,
  'noise-vs-load': noiseVsLoad,
  'partition-one-disk': partitionOneDisk,
  'blur-vs-lag': blurVsLag,
  'ram-pressure': ramPressure,
  'temp-behavior': tempBehavior,
  'frame-pacing': framePacing,
  'swap-diagnosis': swapDiagnosis,
  'spill-first-aid': spillFirstAid,
  'retention-timeline': retentionTimeline,
  'shutdown-shape': shutdownShape,
  'boot-relay': bootRelay,
  'mouse-capture': mouseCapture,
};

/**
 * 화면 모드별 마우스 캡처 — 독점 전체화면은 벽, 테두리 없는 창은 개방.
 * dual-monitor-mouse-escape 의 "반대 고민 둘이 같은 스위치" 구조 고정.
 */
function mouseCapture() {
  const W = 640;
  const py = 56;
  const mh = 84;
  const m1w = 128;
  const m2w = 96;

  const monitors = (x0, lockWall) => {
    let s = '';
    s += rect(x0, py, m1w, mh, 'none', { stroke: COLOR.text });
    s += t(x0 + m1w / 2, py + mh + 16, '게임 화면', { anchor: 'middle', size: 11, fill: COLOR.mute });
    s += rect(x0 + m1w + 14, py + 10, m2w, mh - 20, 'none', { stroke: COLOR.line });
    s += t(x0 + m1w + 14 + m2w / 2, py + mh + 16, '보조 모니터', { anchor: 'middle', size: 11, fill: COLOR.mute });
    // 커서 경로
    const cy = py + mh / 2;
    s += `<line x1="${x0 + 22}" y1="${cy}" x2="${x0 + m1w - 12}" y2="${cy}" stroke="${COLOR.accent}" stroke-width="2.5" stroke-dasharray="6 4"/>`;
    if (lockWall) {
      // 오른쪽 끝 벽
      s += `<line x1="${x0 + m1w - 4}" y1="${py + 6}" x2="${x0 + m1w - 4}" y2="${py + mh - 6}" stroke="${COLOR.over}" stroke-width="4"/>`;
      s += t(x0 + m1w - 12, cy - 12, '⟲', { size: 14, fill: COLOR.over });
    } else {
      // 국경 통과 화살표
      s += `<line x1="${x0 + m1w - 12}" y1="${cy}" x2="${x0 + m1w + 14 + 24}" y2="${cy}" stroke="${COLOR.fit}" stroke-width="2.5"/>`;
      s += `<polygon points="${x0 + m1w + 38},${cy - 5} ${x0 + m1w + 46},${cy} ${x0 + m1w + 38},${cy + 5}" fill="${COLOR.fit}"/>`;
    }
    return s;
  };

  let body = '';
  body += t(16, 22, '같은 듀얼 모니터 — 화면 모드가 커서의 국경을 정합니다', { weight: 600, size: 14 });

  const x1 = 16;
  body += t(x1 + (m1w + 14 + m2w) / 2, 44, '① 전체화면 (독점)', { anchor: 'middle', size: 12, weight: 600, fill: COLOR.over });
  body += monitors(x1, true);
  body += t(x1 + (m1w + 14 + m2w) / 2, py + mh + 36, '게임이 커서를 가둡니다 — 이탈 사고 없음', { anchor: 'middle', size: 11, fill: COLOR.mute });

  const x2 = 344;
  body += t(x2 + (m1w + 14 + m2w) / 2, 44, '② 테두리 없는 창 / 창 모드', { anchor: 'middle', size: 12, weight: 600, fill: COLOR.fit });
  body += monitors(x2, false);
  body += t(x2 + (m1w + 14 + m2w) / 2, py + mh + 36, '바탕화면의 일부 — 커서가 자유롭게 넘어갑니다', { anchor: 'middle', size: 11, fill: COLOR.mute });

  return figure(
    '화면 모드별 마우스 캡처 — 독점 전체화면은 커서를 가두고, 테두리 없는 창은 옆 모니터로 열려 있습니다',
    W,
    206,
    body,
    '"나가서 문제"면 ①로, "안 나가서 문제"면 ②로 — 반대 고민 둘의 스위치가 같은 이유입니다.'
  );
}

/**
 * "켜짐 ≠ 부팅" — 전원부터 모니터까지의 릴레이.
 * pc-boot-no-display 의 진단 프레임 고정: 팬 회전은 첫 주자일 뿐.
 */
function bootRelay() {
  const W = 640;
  const y0 = 64;
  const h = 44;
  const stops = ['전원', 'CPU', '램', '그래픽', '케이블', '모니터'];
  const bw = 78;
  const gap = 26;
  const x0 = 16;

  let body = '';
  body += t(16, 22, '화면이 나오기까지의 릴레이 — 팬 회전은 첫 주자가 뛰었다는 뜻일 뿐입니다', { weight: 600, size: 14 });

  stops.forEach((name, i) => {
    const x = x0 + i * (bw + gap);
    const isFirst = i === 0;
    body += rect(x, y0, bw, h, isFirst ? COLOR.soft : 'none', { stroke: isFirst ? COLOR.fit : COLOR.line });
    body += t(x + bw / 2, y0 + h / 2 + 5, name, { anchor: 'middle', size: 13, weight: 600, fill: isFirst ? COLOR.fit : COLOR.text });
    if (i < stops.length - 1) {
      const ax = x + bw + 4;
      body += `<line x1="${ax}" y1="${y0 + h / 2}" x2="${ax + gap - 8}" y2="${y0 + h / 2}" stroke="${COLOR.mute}" stroke-width="2"/>`;
      body += `<polygon points="${ax + gap - 8},${y0 + h / 2 - 4} ${ax + gap - 1},${y0 + h / 2} ${ax + gap - 8},${y0 + h / 2 + 4}" fill="${COLOR.mute}"/>`;
    }
  });

  // 첫 구간 주석: 팬이 도는 지점
  body += t(x0 + bw / 2, y0 + h + 20, '팬이 도는 건', { anchor: 'middle', size: 11, fill: COLOR.fit });
  body += t(x0 + bw / 2, y0 + h + 34, '여기까지의 증거', { anchor: 'middle', size: 11, fill: COLOR.fit });

  // 안쪽 구간 (CPU·램·그래픽): 비프음·LED가 알려주는 구간
  const innerX = x0 + (bw + gap) * 1 - 8;
  const innerW = bw * 3 + gap * 2 + 16;
  body += `<line x1="${innerX}" y1="${y0 - 14}" x2="${innerX + innerW}" y2="${y0 - 14}" stroke="${COLOR.over}" stroke-dasharray="5 4" stroke-width="2"/>`;
  body += t(innerX + innerW / 2, y0 - 22, '멈추면 비프음·디버그 LED가 가리키는 구간 (안쪽 격리: 재장착)', { anchor: 'middle', size: 11, fill: COLOR.over });

  // 바깥 구간 (케이블·모니터): 공짜 격리
  const outX = x0 + (bw + gap) * 4 - 8;
  const outW = bw * 2 + gap + 16;
  body += `<line x1="${outX}" y1="${y0 + h + 14}" x2="${outX + outW}" y2="${y0 + h + 14}" stroke="${COLOR.accent}" stroke-width="2"/>`;
  body += t(outX + outW / 2, y0 + h + 30, '바깥 격리부터 (공짜) —', { anchor: 'middle', size: 11, fill: COLOR.accent });
  body += t(outX + outW / 2, y0 + h + 44, '메뉴·소스·케이블·포트', { anchor: 'middle', size: 11, fill: COLOR.accent });

  return figure(
    '부팅 릴레이 — 전원·CPU·램·그래픽·케이블·모니터 중 어디서 바통이 떨어졌는지 찾는 진단',
    W,
    174,
    body,
    '진단 순서는 거꾸로가 쌉니다 — 바깥(케이블·모니터)을 공짜로 먼저 자르고, 안쪽(램·그래픽 재장착)으로 들어갑니다.'
  );
}

/**
 * 게임 중 꺼짐 — 꺼진 모양 세 갈래.
 * pc-shutdown-during-game 의 "꺼진 모양이 단서" 판정 고정.
 */
function shutdownShape() {
  const W = 640;
  const panelW = 188;
  const gap = 20;
  const boxY = 56;
  const boxH = 64;

  const panel = (px0, label, labelColor, desc1, desc2) => {
    let s = '';
    s += t(px0 + panelW / 2, 44, label, { anchor: 'middle', size: 12, weight: 600, fill: labelColor });
    s += t(px0 + panelW / 2, 158, desc1, { anchor: 'middle', size: 11, fill: COLOR.mute });
    s += t(px0 + panelW / 2, 174, desc2, { anchor: 'middle', size: 11, fill: COLOR.mute });
    return s;
  };

  let body = '';
  body += t(16, 22, '게임 중 꺼짐 — 꺼진 모양이 갈래를 알려줍니다', { weight: 600, size: 14 });

  // ① 무징후 컷: 화면이 즉시 검게 — 실선이 뚝 끊김
  const x1 = 16;
  body += rect(x1, boxY, panelW, boxH, 'none', { stroke: COLOR.line });
  body += `<line x1="${x1 + 12}" y1="${boxY + 32}" x2="${x1 + 96}" y2="${boxY + 32}" stroke="${COLOR.over}" stroke-width="4"/>`;
  body += t(x1 + 104, boxY + 37, '✕', { size: 15, weight: 700, fill: COLOR.over });
  body += panel(x1, '① 아무 징후 없이 툭', COLOR.over, '전원 계열 유력', '콘센트 직결 → 커넥터 → 용량·나이');

  // ② 재부팅: 끊겼다 다시 시작 — 선이 끊긴 뒤 재개
  const x2 = 16 + panelW + gap;
  body += rect(x2, boxY, panelW, boxH, 'none', { stroke: COLOR.line });
  body += `<line x1="${x2 + 12}" y1="${boxY + 32}" x2="${x2 + 76}" y2="${boxY + 32}" stroke="${COLOR.accent}" stroke-width="4"/>`;
  body += `<path d="M ${x2 + 84} ${boxY + 32} a 10 10 0 1 1 -4 -18" fill="none" stroke="${COLOR.accent}" stroke-width="2.5"/>`;
  body += `<line x1="${x2 + 108}" y1="${boxY + 32}" x2="${x2 + 172}" y2="${boxY + 32}" stroke="${COLOR.accent}" stroke-width="4"/>`;
  body += panel(x2, '② 혼자 꺼졌다 켜짐', COLOR.accent, '가려진 오류 화면일 수 있음', '자동 재시작 해제가 1단계');

  // ③ 부하 시간·계절 비례: 서서히 차오르다 컷 — 상승 곡선 끝 절단
  const x3 = 16 + (panelW + gap) * 2;
  body += rect(x3, boxY, panelW, boxH, 'none', { stroke: COLOR.line });
  {
    const pts = [];
    for (let i = 0; i <= 20; i++) {
      const x = i / 20;
      pts.push(`${(x3 + 12 + x * 130).toFixed(1)},${(boxY + 52 - 40 * x * x).toFixed(1)}`);
    }
    body += `<polyline points="${pts.join(' ')}" fill="none" stroke="${COLOR.over}" stroke-width="3" stroke-linejoin="round"/>`;
    body += `<line x1="${x3 + 142}" y1="${boxY + 8}" x2="${x3 + 142}" y2="${boxY + 56}" stroke="${COLOR.over}" stroke-width="2" stroke-dasharray="4 3"/>`;
  }
  body += panel(x3, '③ 한참 하다·여름에', COLOR.over, '온도 보호 유력', '온도 그래프 거동으로 판정');

  return figure(
    '게임 중 꺼짐의 세 가지 모양 — 무징후 컷은 전원, 재부팅은 가려진 오류 가능, 부하 시간 비례는 온도',
    W,
    190,
    body,
    '모양으로 갈래를 좁힌 뒤의 순서는 본문대로 — 자동 재시작 해제가 공짜 1단계입니다.'
  );
}

/**
 * 속도는 제일 약한 고리가 정한다 — 랜 연결 경로의 사슬.
 * lan-cable-cat 본문의 구조 서술과 같은 예시(CAT.5 케이블이 고리)입니다.
 */
function weakLinkChain() {
  const W = 640;
  const boxes = [
    ['요금제', '1G', false],
    ['벽 배선', '1G', false],
    ['랜선', 'CAT.5', true], // 여기가 고리
    ['공유기 포트', '1G', false],
    ['컴퓨터', '1G', false],
  ];
  const bw = 100;
  const gap = 24;
  const x0 = 16;
  const y0 = 44;

  const body = `
${t(16, 24, '속도는 경로에서 제일 낮은 것에 맞춰집니다', { weight: 600, size: 14 })}
${boxes
  .map(([name, spec, isWeak], i) => {
    const x = x0 + i * (bw + gap);
    return `${rect(x, y0, bw, 44, isWeak ? 'var(--fig-over)' : COLOR.soft, { r: 6, stroke: isWeak ? '' : COLOR.line })}
${t(x + bw / 2, y0 + 19, name, { size: 12, anchor: 'middle', fill: isWeak ? COLOR.text : COLOR.text })}
${t(x + bw / 2, y0 + 36, spec, { size: 11, anchor: 'middle', weight: isWeak ? 700 : 400, fill: isWeak ? COLOR.text : COLOR.mute })}
${i < boxes.length - 1 ? `<line x1="${x + bw}" y1="${y0 + 22}" x2="${x + bw + gap}" y2="${y0 + 22}" stroke="${COLOR.line}" stroke-width="2"/>` : ''}`;
  })
  .join('\n')}
${t(x0 + 2 * (bw + gap) + bw / 2, y0 + 66, '↑ 전체가 100Mbps 로 떨어집니다', { size: 12, anchor: 'middle', weight: 600 })}`;

  return figure(
    '랜 연결 경로의 약한 고리',
    W,
    124,
    body,
    '넷이 기가급이어도 하나가 CAT.5 면 전체가 100Mbps 입니다. 케이블만 바꿔서 안 빨라지는 이유이기도 합니다.'
  );
}

/**
 * 메시의 두 가지 백홀 — 무선(대역을 나눠 씀) vs 유선(손실 없음).
 * mesh-wifi-backhaul 본문의 구조 서술을 그림으로.
 */
function meshBackhaul() {
  const W = 640;
  const box = (x, y, w, label, sub) =>
    `${rect(x, y, w, 40, COLOR.soft, { r: 6, stroke: COLOR.line })}
${t(x + w / 2, y + 17, label, { size: 12, anchor: 'middle' })}
${sub ? t(x + w / 2, y + 32, sub, { size: 10, anchor: 'middle', fill: COLOR.mute }) : ''}`;

  const body = `
${t(16, 22, '같은 메시라도 백홀이 다르면 성능이 다릅니다', { weight: 600, size: 14 })}

${t(16, 52, '무선 백홀', { size: 12, weight: 600, fill: COLOR.mute })}
${box(90, 36, 110, '본체')}
${box(330, 36, 110, '위성', '오가는 몫만큼 깎임')}
<line x1="200" y1="56" x2="330" y2="56" stroke="${COLOR.line}" stroke-width="2" stroke-dasharray="6 5"/>
${t(265, 48, '전파', { size: 10, anchor: 'middle', fill: COLOR.mute })}
<line x1="440" y1="56" x2="500" y2="56" stroke="${COLOR.line}" stroke-dasharray="2 3"/>
${t(535, 60, '안방의 폰', { size: 11, fill: COLOR.mute })}

${t(16, 122, '유선 백홀', { size: 12, weight: 600 })}
${box(90, 106, 110, '본체')}
${box(240, 106, 90, '단자함', '벽 속 배선')}
${box(330 + 40, 106, 110, '위성', '깎임 없음')}
<line x1="200" y1="126" x2="240" y2="126" stroke="${COLOR.accent}" stroke-width="3"/>
<line x1="330" y1="126" x2="370" y2="126" stroke="${COLOR.accent}" stroke-width="3"/>
<line x1="480" y1="126" x2="520" y2="126" stroke="${COLOR.line}" stroke-dasharray="2 3"/>
${t(555, 130, '안방의 폰', { size: 11, fill: COLOR.mute })}

${t(16, 178, '유선(색선)은 위성까지의 뒷길에서 무선 손실이 통째로 사라집니다.', { weight: 600, size: 12 })}`;

  return figure(
    '메시 무선 백홀과 유선 백홀 비교',
    W,
    192,
    body,
    '점선 = 전파, 색선 = 랜선. 위성 성능의 바닥은 뒷길(백홀)이 정합니다.'
  );
}

/**
 * 단자함 배치 두 가지 — 공유기가 배선의 위에 있느냐가 갈림길.
 * apartment-lan-panel 본문의 ❌/✅ 구조 서술을 그림으로.
 */
function lanPanelLayout() {
  const W = 640;
  const box = (x, y, w, label, sub, warn) =>
    `${rect(x, y, w, 40, warn ? 'var(--fig-over)' : COLOR.soft, { r: 6, stroke: warn ? '' : COLOR.line })}
${t(x + w / 2, y + 17, label, { size: 12, anchor: 'middle' })}
${sub ? t(x + w / 2, y + 32, sub, { size: 10, anchor: 'middle', fill: warn ? COLOR.text : COLOR.mute }) : ''}`;
  const wire = (x1, y1, x2, y2, good) =>
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${good ? COLOR.accent : COLOR.line}" stroke-width="${good ? 3 : 2}"/>`;

  const body = `
${t(16, 22, '공유기가 배선의 위(인입 쪽)에 있느냐가 절반입니다', { weight: 600, size: 14 })}

${t(16, 52, '❌ 흔한 문제 구조', { size: 12, weight: 600, fill: COLOR.mute })}
${box(30, 62, 70, '인입')}
${box(160, 62, 110, '단자함 허브')}
${box(340, 62, 120, '거실 + 공유기')}
${box(340, 112, 120, '다른 방들', '공유기를 안 거침', true)}
${wire(100, 82, 160, 82)}
${wire(270, 82, 340, 82)}
${wire(270, 82, 305, 82)}<line x1="305" y1="82" x2="305" y2="132" stroke="${COLOR.line}" stroke-width="2"/>${wire(305, 132, 340, 132)}
${t(475, 128, '← 서로 다른 식구', { size: 11, fill: COLOR.mute })}

${t(16, 192, '✅ 정석 구조', { size: 12, weight: 600 })}
${box(30, 202, 70, '인입')}
${box(140, 202, 90, '공유기')}
${box(270, 202, 110, '단자함 허브')}
${box(420, 202, 120, '모든 방', '한 네트워크')}
${wire(100, 222, 140, 222, true)}
${wire(230, 222, 270, 222, true)}
${wire(380, 222, 420, 222, true)}

${t(16, 272, '공유기를 단자함 안에 넣거나, 거실에서 되돌림 배선으로 같은 순서를 만듭니다.', { weight: 600, size: 12 })}`;

  return figure(
    '단자함 배치 비교 — 공유기 위치에 따른 구조 차이',
    W,
    288,
    body,
    '허브가 공유기보다 앞(인입 쪽)에 있으면 방 포트들이 공유기 밖에 놓입니다. 색선 = 공유기 아래로 정리된 경로.'
  );
}

/**
 * 무선 속도의 세 관문 — 요금제·공유기·기기 중 최저를 따라감.
 * wifi7-router-upgrade 본문의 관문 구조를 그림으로.
 */
function wifiGates() {
  const W = 640;
  const gates = [
    ['① 인터넷 요금제', '500M', false],
    ['② 공유기', 'WiFi 7', false],
    ['③ 내 기기', 'WiFi 5', true],
  ];
  const bw = 170;
  const gap = 40;
  const x0 = 30;
  const y0 = 46;

  const body = `
${t(16, 24, '무선 속도는 세 관문 중 제일 낮은 것을 따라갑니다', { weight: 600, size: 14 })}
${gates
  .map(([name, spec, isLow], i) => {
    const x = x0 + i * (bw + gap);
    return `${rect(x, y0, bw, 52, isLow ? 'var(--fig-over)' : COLOR.soft, { r: 6, stroke: isLow ? '' : COLOR.line })}
${t(x + bw / 2, y0 + 21, name, { size: 12, anchor: 'middle' })}
${t(x + bw / 2, y0 + 40, spec, { size: 12, anchor: 'middle', weight: isLow ? 700 : 400, fill: isLow ? COLOR.text : COLOR.mute })}
${i < gates.length - 1 ? `<line x1="${x + bw}" y1="${y0 + 26}" x2="${x + bw + gap}" y2="${y0 + 26}" stroke="${COLOR.line}" stroke-width="2"/>` : ''}`;
  })
  .join('\n')}
${t(x0 + 2 * (bw + gap) + bw / 2, y0 + 76, '↑ 이 연결은 WiFi 5 로 성립합니다', { size: 12, anchor: 'middle', weight: 600 })}
${t(16, y0 + 104, '공유기만 7로 올려도, 옛 기기는 옛 세대로 붙습니다 — 기기 세대부터 세어보는 이유입니다.', { size: 12, fill: COLOR.mute })}`;

  return figure(
    '무선 속도의 세 관문 — 요금제·공유기·기기',
    W,
    172,
    body,
    '접속은 양쪽이 공통으로 지원하는 세대로 이루어집니다. 제일 낮은 관문이 전체를 정합니다.'
  );
}

/**
 * 외장하드와 NAS 의 구조 차이 — 한 대의 것 vs 네트워크의 모두.
 * nas-vs-external-hdd 의 판정 기준(공유 대수)을 그림으로.
 */
function nasShare() {
  const W = 640;
  const box = (x, y, w, label, sub, accent) =>
    `${rect(x, y, w, 40, COLOR.soft, { r: 6, stroke: accent ? COLOR.accent : COLOR.line })}
${t(x + w / 2, y + 17, label, { size: 12, anchor: 'middle' })}
${sub ? t(x + w / 2, y + 32, sub, { size: 10, anchor: 'middle', fill: COLOR.mute }) : ''}`;

  const body = `
${t(16, 22, '외장하드는 꽂은 한 대의 것, NAS 는 네트워크의 모두의 것', { weight: 600, size: 14 })}

${t(16, 52, '외장하드', { size: 12, weight: 600, fill: COLOR.mute })}
${box(30, 62, 110, '컴퓨터 A', '지금 꽂힌 곳')}
${box(180, 62, 100, '외장하드')}
<line x1="140" y1="82" x2="180" y2="82" stroke="${COLOR.line}" stroke-width="3"/>
${box(330, 62, 100, '노트북 B', '안 보임')}
${box(460, 62, 100, '폰', '안 보임')}

${t(16, 142, 'NAS', { size: 12, weight: 600 })}
${box(30, 152, 110, '컴퓨터 A')}
${box(180, 152, 100, '노트북 B')}
${box(310, 152, 80, '폰')}
${box(430, 152, 130, 'NAS', '공유기 아래 · 항상 켜짐', true)}
<line x1="85" y1="192" x2="85" y2="212" stroke="${COLOR.accent}" stroke-width="2"/>
<line x1="230" y1="192" x2="230" y2="212" stroke="${COLOR.accent}" stroke-width="2"/>
<line x1="350" y1="192" x2="350" y2="212" stroke="${COLOR.accent}" stroke-width="2"/>
<line x1="495" y1="192" x2="495" y2="212" stroke="${COLOR.accent}" stroke-width="2"/>
<line x1="85" y1="212" x2="495" y2="212" stroke="${COLOR.accent}" stroke-width="2"/>
${t(290, 232, '집 안 네트워크 — 전부 동시에 같은 저장소를 봅니다', { size: 11, anchor: 'middle', fill: COLOR.mute })}

${t(16, 262, '그래서 판정 기준은 용량이 아니라 "몇 대가 같이 쓰느냐"입니다.', { weight: 600, size: 12 })}`;

  return figure(
    '외장하드와 NAS 의 구조 차이',
    W,
    276,
    body,
    '외장하드는 꽂은 컴퓨터에서만 보입니다. NAS 는 네트워크에 붙어 모든 기기에서 동시에 보이고, 그게 값의 이유입니다.'
  );
}

/**
 * 기본 쿨러와 타워형 쿨러의 소음 구조 — 작은 팬 고회전 vs 큰 팬 저회전.
 * cpu-stock-cooler 의 소음 기준 서술을 그림으로.
 */
function coolerFanNoise() {
  const W = 640;
  const body = `
${t(16, 22, '같은 열을 빼는 두 가지 방법', { weight: 600, size: 14 })}

${t(16, 52, '기본 쿨러', { size: 12, weight: 600, fill: COLOR.mute })}
<circle cx="90" cy="100" r="28" fill="${COLOR.soft}" stroke="${COLOR.line}"/>
${t(90, 104, '작은 팬', { size: 10, anchor: 'middle', fill: COLOR.mute })}
${t(150, 92, '빠르게 돌아야 합니다', { size: 12 })}
${t(150, 110, '→ 부하 때 소음이 가파르게 올라감', { size: 11, fill: 'var(--fig-over)', weight: 600 })}

${t(16, 162, '타워형 사제 쿨러', { size: 12, weight: 600 })}
${rect(60, 176, 24, 56, COLOR.soft, { r: 3, stroke: COLOR.line })}
<circle cx="130" cy="204" r="42" fill="${COLOR.soft}" stroke="${COLOR.accent}"/>
${t(130, 208, '큰 팬', { size: 11, anchor: 'middle' })}
${t(196, 196, '천천히 돌아도 같은 열을 뺍니다', { size: 12 })}
${t(196, 214, '→ 같은 부하에서 조용함', { size: 11, fill: COLOR.accent, weight: 600 })}
${t(46, 246, '↑ 큰 방열판', { size: 10, fill: COLOR.mute })}

${t(16, 276, '온도가 아니라 소음 때문에 바꾸는 경우가 많은 이유입니다.', { weight: 600, size: 12 })}`;

  return figure(
    '기본 쿨러와 타워형 쿨러의 소음 구조 차이',
    W,
    292,
    body,
    '팬 소음은 회전수를 따라 가파르게 올라갑니다. 큰 방열판 + 큰 팬은 같은 열을 낮은 회전수로 빼서 조용합니다.'
  );
}

/**
 * SSD 빈 공간 = 쓰기 캐시 — 차 있을수록 캐시가 줄어드는 구조.
 * ssd-full-slowdown 의 ② 절을 그림으로.
 */
function ssdCacheShrink() {
  const W = 640;
  const scale = 5.6; // % 당 픽셀
  const bar = (y, used, label) => {
    const x0 = 130;
    const cacheW = (100 - used) * scale * 0.5; // 빈 공간의 절반을 캐시로 표시
    return `${t(16, y + 16, label, { size: 12 })}
${rect(x0, y, used * scale, 24, COLOR.soft, { r: 3, stroke: COLOR.line })}
${rect(x0 + used * scale, y, cacheW, 24, COLOR.accent, { r: 3 })}
${rect(x0 + used * scale + cacheW, y, (100 - used) * scale - cacheW, 24, 'none', { r: 3, stroke: COLOR.line })}
${t(x0 + used * scale / 2, y + 16, '데이터', { size: 10, anchor: 'middle', fill: COLOR.mute })}
${t(x0 + used * scale + cacheW / 2, y + 16, cacheW > 40 ? '빠른 쓰기 캐시' : '캐시', { size: 10, anchor: 'middle', fill: '#fff' })}`;
  };

  const body = `
${t(16, 22, '빈 공간의 일부가 빠른 쓰기 캐시로 쓰입니다', { weight: 600, size: 14 })}
${bar(40, 30, '30% 사용')}
${bar(84, 60, '60% 사용')}
${bar(128, 90, '90% 사용')}
${t(130, 176, '차 있을수록 캐시로 쓸 빈 공간 자체가 줄어듭니다 — 지속 쓰기가 먼저 무너지는 이유입니다.', { size: 12, fill: COLOR.mute })}`;

  return figure(
    'SSD 사용량에 따라 쓰기 캐시가 줄어드는 구조',
    W,
    192,
    body,
    '요즘 SSD 는 빈 공간 일부를 SLC 방식 캐시로 씁니다. 90% 사용 시점에는 캐시가 몇 % 몫만 남습니다. 정도는 제품마다 다릅니다.'
  );
}

/**
 * 용량 다른 램의 유연(Flex) 모드 — 겹치는 구간만 듀얼.
 * mixed-ram-capacity 의 ASCII 도식을 SVG 로.
 */
function ramFlexMode() {
  const W = 640;
  const scale = 22; // GB 당 픽셀
  const x0 = 150;
  const body = `
${t(16, 22, '8GB + 16GB 를 꽂으면 — 겹치는 만큼만 듀얼', { weight: 600, size: 14 })}

${t(16, 56, '슬롯 A · 8GB', { size: 12 })}
${rect(x0, 42, 8 * scale, 22, COLOR.accent, { r: 3 })}

${t(16, 92, '슬롯 B · 16GB', { size: 12 })}
${rect(x0, 78, 8 * scale, 22, COLOR.accent, { r: 3 })}
${rect(x0 + 8 * scale, 78, 8 * scale, 22, COLOR.soft, { r: 3, stroke: COLOR.line })}

<line x1="${x0 + 8 * scale}" y1="34" x2="${x0 + 8 * scale}" y2="110" stroke="${COLOR.line}" stroke-dasharray="4 3"/>

${t(x0 + 4 * scale, 130, '8+8 = 듀얼 채널', { size: 12, anchor: 'middle', weight: 600, fill: COLOR.accent })}
${t(x0 + 4 * scale, 148, '대역폭 2배 구간', { size: 11, anchor: 'middle', fill: COLOR.mute })}
${t(x0 + 12 * scale, 130, '나머지 8 = 싱글', { size: 12, anchor: 'middle', weight: 600 })}
${t(x0 + 12 * scale, 148, '절반 대역폭 구간', { size: 11, anchor: 'middle', fill: COLOR.mute })}

${t(16, 180, '전부 싱글이 되는 게 아니라, 손해가 생각보다 작은 이유입니다.', { weight: 600, size: 12 })}`;

  return figure(
    '용량 다른 램의 유연 모드 동작 — 겹치는 구간만 듀얼 채널',
    W,
    196,
    body,
    '지원 방식은 보드·컨트롤러에 따라 다르지만, 요즘 시스템 대부분이 이 유연한 방식으로 돕니다.'
  );
}

/**
 * 논/세미/풀 모듈러 — 케이블이 어디까지 탈착되는지의 차이.
 * modular-psu 본문의 "성능이 아니라 구성의 차이" 서술을 그림으로 고정합니다.
 */
function psuModularTypes() {
  const W = 640;
  const cols = [
    {
      x: 16,
      name: '논 모듈러',
      note: '안 쓰는 선까지 전부 달려 나옵니다',
      slots: ['fixed-used', 'fixed-used', 'fixed-used', 'fixed-idle', 'fixed-idle', 'fixed-idle'],
    },
    {
      x: 226,
      name: '세미 모듈러',
      note: '24핀·CPU 선만 고정, 나머지는 탈착',
      slots: ['fixed-used', 'fixed-used', 'plug-used', 'socket', 'socket', 'socket'],
    },
    {
      x: 436,
      name: '풀 모듈러',
      note: '필요한 선만 골라 꽂습니다',
      slots: ['plug-used', 'plug-used', 'plug-used', 'socket', 'socket', 'socket'],
    },
  ];
  const colW = 188;
  const boxY = 36;
  const boxH = 42;
  const cableTop = boxY + boxH;

  let body = '';
  for (const c of cols) {
    body += t(c.x, 24, c.name, { weight: 600, size: 14 });
    body += rect(c.x, boxY, colW, boxH, COLOR.soft, { stroke: COLOR.line });
    body += t(c.x + colW / 2, boxY + 26, '파워', { anchor: 'middle', fill: COLOR.mute, size: 12 });

    c.slots.forEach((kind, i) => {
      const sx = c.x + 22 + i * 29;
      if (kind === 'fixed-used' || kind === 'fixed-idle') {
        // 본체에 박혀 나오는 선 — 쓰는 선은 진하게, 안 쓰는 선은 흐리고 짧게
        const used = kind === 'fixed-used';
        body += `<line x1="${sx}" y1="${cableTop}" x2="${sx}" y2="${used ? 152 : 138}" stroke="${
          used ? COLOR.fit : COLOR.mute
        }" stroke-width="${used ? 4 : 3}"${used ? '' : ' stroke-dasharray="5 4" opacity="0.65"'}/>`;
        if (!used) body += t(sx, 132, '×', { anchor: 'middle', fill: COLOR.mute, size: 11 });
      } else {
        // 탈착 소켓 — 꽂은 자리만 선이 내려갑니다
        body += `<rect x="${sx - 6}" y="${cableTop - 5}" width="12" height="10" rx="2" fill="${
          COLOR.soft
        }" stroke="${kind === 'plug-used' ? COLOR.fit : COLOR.line}" stroke-width="1.5"/>`;
        if (kind === 'plug-used') {
          body += `<line x1="${sx}" y1="${cableTop + 5}" x2="${sx}" y2="152" stroke="${COLOR.fit}" stroke-width="4"/>`;
        }
      }
    });

    body += t(c.x, 174, c.note, { fill: COLOR.mute, size: 12 });
  }

  body += t(16, 202, '전기 성능은 셋 다 같습니다 — 갈리는 것은 케이블 구성뿐입니다.', {
    weight: 600,
    size: 13,
  });

  return figure(
    '논 모듈러는 모든 케이블이 고정, 세미 모듈러는 필수선만 고정, 풀 모듈러는 전부 탈착',
    W,
    212,
    body,
    '점선(×)이 논 모듈러의 숙제 — 안 쓰는 선도 케이스 어딘가에 넣어야 합니다. 빈 소켓은 그냥 비워 두는 게 정상 사용입니다.'
  );
}

/**
 * 유선 vs 무선 — 평균 지연은 비슷해도 순간 변동(튐)이 다르다.
 * desktop-wifi-vs-lan 의 "평균의 세계 / 변동의 세계" 서술을 그림으로 고정합니다.
 */
function wifiJitter() {
  const W = 640;
  const rowH = 96;
  const x0 = 90;
  const plotW = 520;
  const n = 40;
  const step = plotW / (n - 1);

  // 지연 시계열 (픽셀 오프셋). 유선: 잔잔. 무선: 대체로 잔잔 + 가끔 튐.
  const wiredBase = 18;
  const wired = Array.from({ length: n }, (_, i) => wiredBase + ((i * 7) % 3));
  const wifi = Array.from({ length: n }, (_, i) => {
    const base = 22 + ((i * 5) % 4);
    if (i === 11) return base + 34;
    if (i === 12) return base + 18;
    if (i === 27) return base + 46;
    if (i === 28) return base + 12;
    return base;
  });

  const line = (data, yTop, color) => {
    const pts = data.map((v, i) => `${(x0 + i * step).toFixed(1)},${yTop + 70 - v}`).join(' ');
    return `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round"/>`;
  };

  let body = '';
  // 유선 행
  body += t(16, 46, '유선', { weight: 600, size: 14 });
  body += `<line x1="${x0}" y1="${rowH - 26}" x2="${x0 + plotW}" y2="${rowH - 26}" stroke="${COLOR.line}"/>`;
  body += line(wired, rowH - 96, COLOR.fit);
  body += t(x0 + plotW, 40, '변동 거의 없음', { anchor: 'end', fill: COLOR.mute, size: 12 });

  // 무선 행
  const y2 = rowH + 30;
  body += t(16, y2 + 46, '무선', { weight: 600, size: 14 });
  body += `<line x1="${x0}" y1="${y2 + rowH - 26}" x2="${x0 + plotW}" y2="${y2 + rowH - 26}" stroke="${COLOR.line}"/>`;
  body += line(wifi, y2 + rowH - 96, COLOR.over);
  body += t(x0 + 11 * step, y2 + 18, '↑ 이 순간이 게임에서는 렉', { fill: COLOR.mute, size: 12 });

  body += t(16, y2 + rowH + 22, '평균만 보면 둘은 비슷합니다 — 갈리는 것은 튀는 순간의 유무입니다.', {
    weight: 600,
    size: 13,
  });

  return figure(
    '유선은 지연이 잔잔하고, 무선은 평균은 비슷해도 가끔 크게 튄다',
    W,
    rowH * 2 + 66,
    body,
    '웹·영상은 버퍼가 저 튐을 숨겨 주지만, 실시간 게임은 튐이 그대로 렉으로 보입니다.'
  );
}

/**
 * 같은 조합이라도 해상도·설정에 따라 병목의 방향이 바뀐다.
 * cpu-gpu-bottleneck 의 "해상도가 저울을 움직인다" 서술을 프레임당 릴레이로 고정합니다.
 */
function cpuGpuRelay() {
  const W = 640;
  const x0 = 150;
  const scale = 30; // 임의 시간 단위당 픽셀

  const row = (y, label, cpu, gpu, boundLabel, boundCpu) => {
    let b = '';
    b += t(16, y + 19, label, { weight: 600, size: 13 });
    // CPU 구간 (준비)
    b += rect(x0, y, cpu * scale, 26, boundCpu ? COLOR.over : COLOR.soft, {
      stroke: boundCpu ? undefined : COLOR.line,
    });
    b += t(x0 + (cpu * scale) / 2, y + 17, 'CPU 준비', {
      anchor: 'middle',
      size: 12,
      fill: boundCpu ? '#fff' : COLOR.mute,
      weight: boundCpu ? 600 : undefined,
    });
    // GPU 구간 (그리기)
    b += rect(x0 + cpu * scale + 4, y, gpu * scale, 26, boundCpu ? COLOR.soft : COLOR.over, {
      stroke: boundCpu ? COLOR.line : undefined,
    });
    b += t(x0 + cpu * scale + 4 + (gpu * scale) / 2, y + 17, 'GPU 그리기', {
      anchor: 'middle',
      size: 12,
      fill: boundCpu ? COLOR.mute : '#fff',
      weight: boundCpu ? undefined : 600,
    });
    b += t(x0 + cpu * scale + 4 + gpu * scale + 10, y + 17, boundLabel, {
      size: 12,
      fill: COLOR.mute,
    });
    return b;
  };

  let body = '';
  body += t(16, 22, '한 프레임 = CPU가 준비하고 GPU가 그리는 릴레이', { weight: 600, size: 14 });
  body += row(40, '1080p 고주사율', 6, 3, '← CPU가 병목', true);
  body += row(82, '4K 고화질', 4, 9, '← GPU가 병목', false);

  body += t(16, 138, '부품은 그대로인데 해상도·설정이 저울을 움직입니다.', { weight: 600, size: 13 });
  body += t(16, 158, '그래서 조합만 보고 병목을 단정하는 계산기는 성립하지 않습니다.', {
    fill: COLOR.mute,
    size: 12,
  });

  return figure(
    '같은 조합이라도 1080p 고주사율에서는 CPU가, 4K에서는 GPU가 병목이 된다',
    W,
    170,
    body,
    '더 오래 걸리는 쪽(진한 칸)이 그 순간의 병목입니다 — 프레임마다 이 릴레이가 반복됩니다.'
  );
}

/**
 * 노트북 OS 는 한 마당, 모바일 OS 는 방마다 벽 — 개발 도구 체인이 막히는 이유.
 * ipad-coding-study 의 "성능이 아니라 구조" 서술을 그림으로 고정합니다.
 */
function tabletOsWall() {
  const W = 640;

  let body = '';
  // 왼쪽: 노트북 OS
  body += t(16, 22, '노트북 OS — 한 마당', { weight: 600, size: 14 });
  body += rect(16, 34, 290, 150, COLOR.soft, { stroke: COLOR.line });
  const tools = [
    ['에디터', 30, 52],
    ['터미널', 120, 52],
    ['로컬 서버', 205, 52],
    ['도커', 30, 106],
    ['런타임 설치', 120, 106],
  ];
  for (const [name, x, y] of tools) {
    body += rect(x, y, name.length * 13 + 22, 30, COLOR.soft, { stroke: COLOR.fit });
    body += t(x + 11, y + 20, name, { size: 12 });
  }
  body += t(30, 168, '서로 자유롭게 연결 — 개발 도구 체인이 성립', { fill: COLOR.mute, size: 12 });

  // 오른쪽: 모바일 OS
  body += t(334, 22, '모바일 OS — 방마다 벽(샌드박스)', { weight: 600, size: 14 });
  body += rect(334, 34, 290, 150, COLOR.soft, { stroke: COLOR.line });
  const cells = [
    ['강의 앱', 348],
    ['필기 앱', 441],
    ['학습 앱', 534],
  ];
  for (const [name, x] of cells) {
    body += rect(x, 52, 76, 54, COLOR.soft, { stroke: COLOR.line });
    body += t(x + 38, 84, name, { anchor: 'middle', size: 12 });
  }
  // 막힌 도구 체인
  body += `<line x1="348" y1="136" x2="610" y2="136" stroke="${COLOR.over}" stroke-width="2.5" stroke-dasharray="6 4"/>`;
  body += t(479, 128, '시스템 전체를 쓰는 개발 도구 체인', { anchor: 'middle', size: 12, fill: COLOR.over });
  body += t(479, 152, '✕ 벽을 넘지 못해 들어올 수 없음', { anchor: 'middle', size: 12, fill: COLOR.over, weight: 600 });
  body += t(348, 174, '각 앱은 자기 방 안에서만 — 칩 성능과 무관', { fill: COLOR.mute, size: 12 });

  body += t(16, 210, '그래서 상위 모델·키보드로도 이 경계는 움직이지 않습니다.', { weight: 600, size: 13 });

  return figure(
    '노트북 OS는 도구들이 자유롭게 연결되지만, 모바일 OS는 앱마다 벽이 있어 개발 도구 체인이 못 들어온다',
    W,
    222,
    body,
    '벽 안에서 되는 일(강의·필기·학습 앱)과 벽 때문에 안 되는 일(로컬 개발 환경)의 경계입니다.'
  );
}

/**
 * 같은 미니PC 의 두 얼굴 — 소음은 부하의 함수.
 * mini-pc-noise 의 "무소음/못쓰겠다 사용기가 공존하는 이유" 서술을 곡선으로 고정합니다.
 */
function noiseVsLoad() {
  const W = 640;
  const x0 = 56;
  const y0 = 150; // 바닥
  const plotW = 550;

  // 부하-소음 곡선: 저부하 평탄 → 임계 이후 가파름
  const pts = [];
  for (let i = 0; i <= 40; i++) {
    const x = i / 40;
    const noise = x < 0.45 ? 6 + x * 10 : 10.5 + Math.pow((x - 0.45) / 0.55, 1.6) * 95;
    pts.push(`${(x0 + x * plotW).toFixed(1)},${(y0 - noise).toFixed(1)}`);
  }

  let body = '';
  body += t(16, 22, '같은 미니PC, 소음은 부하가 정합니다', { weight: 600, size: 14 });

  // 축
  body += `<line x1="${x0}" y1="${y0}" x2="${x0 + plotW}" y2="${y0}" stroke="${COLOR.line}"/>`;
  body += `<line x1="${x0}" y1="${y0}" x2="${x0}" y2="40" stroke="${COLOR.line}"/>`;
  body += t(x0 - 8, 46, '소음', { anchor: 'end', size: 12, fill: COLOR.mute });
  body += t(x0 + plotW, y0 + 18, '부하 →', { anchor: 'end', size: 12, fill: COLOR.mute });

  // 구간 배경 라벨
  body += t(x0 + plotW * 0.22, y0 + 18, '웹 · 문서 · 영상', { anchor: 'middle', size: 12, fill: COLOR.mute });
  body += t(x0 + plotW * 0.8, y0 + 18, '게임 · 인코딩 · 지속 고부하', { anchor: 'middle', size: 12, fill: COLOR.mute });
  body += `<line x1="${x0 + plotW * 0.45}" y1="${y0}" x2="${x0 + plotW * 0.45}" y2="44" stroke="${COLOR.line}" stroke-dasharray="4 3"/>`;

  body += `<polyline points="${pts.join(' ')}" fill="none" stroke="${COLOR.over}" stroke-width="3" stroke-linejoin="round"/>`;

  body += t(x0 + plotW * 0.2, y0 - 26, '"무소음 수준" 사용기의 구간', { anchor: 'middle', size: 12, fill: COLOR.fit });
  body += t(x0 + plotW * 0.76, 60, '"못 쓰겠다" 사용기의 구간', { anchor: 'middle', size: 12, fill: COLOR.over });

  return figure(
    '미니PC 소음은 저부하에서 평탄하다가 지속 고부하에서 가파르게 올라간다',
    W,
    176,
    body,
    '두 사용기는 같은 제품의 다른 구간 이야기입니다 — 판정은 내 부하가 어느 구간이냐로 하면 됩니다.'
  );
}

/**
 * 파티션은 논리적 구획일 뿐 물리 디스크는 한 장 — 파티션 ≠ 백업.
 * ssd-partition 의 오해 교정 기둥을 그림으로 고정합니다.
 */
function partitionOneDisk() {
  const W = 640;

  let body = '';
  body += t(16, 22, '화면에는 두 개로 보여도', { weight: 600, size: 14 });
  // 탐색기 아이콘 두 개
  body += rect(16, 34, 120, 44, COLOR.soft, { stroke: COLOR.line });
  body += t(76, 54, 'C:', { anchor: 'middle', weight: 600, size: 14 });
  body += t(76, 70, '시스템', { anchor: 'middle', size: 11, fill: COLOR.mute });
  body += rect(150, 34, 120, 44, COLOR.soft, { stroke: COLOR.line });
  body += t(210, 54, 'D:', { anchor: 'middle', weight: 600, size: 14 });
  body += t(210, 70, '자료', { anchor: 'middle', size: 11, fill: COLOR.mute });

  body += t(360, 22, '실제 물건은 한 장입니다', { weight: 600, size: 14 });
  // SSD 한 장, 내부에 C/D 구획
  body += rect(360, 34, 260, 60, COLOR.soft, { stroke: COLOR.text });
  body += rect(368, 42, 118, 44, COLOR.fit);
  body += t(427, 68, 'C:', { anchor: 'middle', fill: '#fff', weight: 600, size: 13 });
  body += rect(492, 42, 118, 44, COLOR.fit);
  body += t(551, 68, 'D:', { anchor: 'middle', fill: '#fff', weight: 600, size: 13 });
  body += t(360, 110, 'SSD 한 장 위의 논리적 구획', { size: 12, fill: COLOR.mute });

  // 고장 균열 — 디스크 전체를 관통
  body += `<polyline points="358,30 420,58 395,80 470,64 450,98" fill="none" stroke="${COLOR.over}" stroke-width="3" stroke-linejoin="round"/>`;
  body += t(370, 130, '⚡ 물리 고장은 구획을 가리지 않습니다 — C도 D도 같이 갑니다', {
    size: 12,
    fill: COLOR.over,
    weight: 600,
  });

  body += t(16, 158, '그래서 파티션은 백업이 아닙니다 — 백업은 다른 매체에 둔 사본입니다.', {
    weight: 600,
    size: 13,
  });

  return figure(
    '파티션 C와 D는 한 장의 SSD 위 논리 구획이라, 물리 고장이면 둘 다 잃는다',
    W,
    170,
    body,
    '드라이브 문자가 달라 보여도 물리적으로는 한 장 — 재설치 편의는 주지만 데이터 안전은 못 줍니다.'
  );
}

/**
 * 응답속도(잔상)와 입력 지연(인풋랙)은 다른 축 — 혼동 교정.
 * monitor-response-time 의 "반응이 아니라 번짐" 서술을 그림으로 고정합니다.
 */
function blurVsLag() {
  const W = 640;

  let body = '';
  // 축 1: 입력 지연
  body += t(16, 24, '① 입력 지연(인풋랙) — 빨리 반영되는가', { weight: 600, size: 14 });
  body += rect(16, 38, 96, 34, COLOR.soft, { stroke: COLOR.line });
  body += t(64, 59, '클릭', { anchor: 'middle', size: 12 });
  body += `<line x1="118" y1="55" x2="330" y2="55" stroke="${COLOR.accent}" stroke-width="2.5"/>`;
  body += `<polygon points="330,55 320,50 320,60" fill="${COLOR.accent}"/>`;
  body += t(224, 48, '처리·전송 시간', { anchor: 'middle', size: 11, fill: COLOR.mute });
  body += rect(336, 38, 130, 34, COLOR.soft, { stroke: COLOR.line });
  body += t(401, 59, '화면에 반영', { anchor: 'middle', size: 12 });
  body += t(480, 59, '← 모니터 처리·네트워크의 축', { size: 11, fill: COLOR.mute });

  // 축 2: 응답속도
  body += t(16, 112, '② 응답속도 — 움직임이 깨끗하게 보이는가', { weight: 600, size: 14 });
  // 움직이는 사각형 + 잔상 꼬리
  body += rect(60, 126, 34, 34, COLOR.fit, { r: 6 });
  body += rect(104, 126, 34, 34, COLOR.fit, { r: 6 });
  body += t(79, 180, '빠른 픽셀 — 깨끗', { size: 11, fill: COLOR.mute });
  const ghost = (x, o) => `<rect x="${x}" y="126" width="34" height="34" rx="6" fill="${COLOR.over}" opacity="${o}"/>`;
  body += ghost(330, 0.2) + ghost(352, 0.4) + ghost(374, 0.7);
  body += rect(396, 126, 34, 34, COLOR.over, { r: 6 });
  body += t(378, 180, '느린 픽셀 — 뒤로 끌림(잔상)', { size: 11, fill: COLOR.mute });

  body += t(16, 210, '1ms 응답속도가 "반응 빠른 모니터"를 뜻하지 않습니다 — 두 축은 따로 잽니다.', {
    weight: 600,
    size: 13,
  });

  return figure(
    '입력 지연은 클릭이 화면에 반영되는 시간의 축, 응답속도는 움직임의 잔상 축 — 서로 다른 축이다',
    W,
    222,
    body,
    '게임의 "즉각 반응"은 ①의 축이고, 스펙표의 ms 숫자는 ②의 축입니다 — 리뷰에서 두 항목이 따로 실측되는 이유입니다.'
  );
}

/**
 * 램 사용률이 높아도 여유가 있으면 조용하고, 압박은 페이징(디스크 왕복)으로 드러난다.
 * ram-usage-normal 의 "숫자가 아니라 증상" 서술을 그림으로 고정합니다.
 */
function ramPressure() {
  const W = 640;
  const barW = 380;

  const bar = (y, fillRatio, label) => {
    let b = '';
    b += rect(16, y, barW, 30, COLOR.soft, { stroke: COLOR.line });
    b += rect(16, y, barW * fillRatio, 30, COLOR.fit);
    b += t(16 + (barW * fillRatio) / 2, y + 20, label, { anchor: 'middle', fill: '#fff', size: 12, weight: 600 });
    return b;
  };

  let body = '';
  // 상태 1
  body += t(16, 24, '사용률 90% — 그런데 증상 없음', { weight: 600, size: 14 });
  body += bar(34, 0.9, '프로그램들이 쓰는 중');
  body += t(412, 54, '= 산 램이 일하는 정상 상태', { size: 12, fill: COLOR.mute });

  // 상태 2
  body += t(16, 106, '사용률 95% + 쓰려는 양이 여유를 넘음', { weight: 600, size: 14 });
  body += bar(116, 0.97, '꽉 참');
  // 디스크 왕복 화살표
  body += rect(470, 108, 150, 46, COLOR.soft, { stroke: COLOR.over });
  body += t(545, 128, '디스크', { anchor: 'middle', size: 12, weight: 600 });
  body += t(545, 145, '(페이징)', { anchor: 'middle', size: 11, fill: COLOR.mute });
  body += `<line x1="400" y1="122" x2="466" y2="122" stroke="${COLOR.over}" stroke-width="2.5"/>`;
  body += `<polygon points="466,122 456,117 456,127" fill="${COLOR.over}"/>`;
  body += `<line x1="466" y1="140" x2="400" y2="140" stroke="${COLOR.over}" stroke-width="2.5"/>`;
  body += `<polygon points="400,140 410,135 410,145" fill="${COLOR.over}"/>`;
  body += t(16, 176, '↑ 이 왕복이 시작될 때 나오는 것이 증상입니다 — 멈칫 · 디스크 급증 · 앱 튕김', {
    size: 12,
    fill: COLOR.over,
    weight: 600,
  });

  body += t(16, 206, '그래서 판정 증거는 사용률 숫자가 아니라 증상의 유무입니다.', { weight: 600, size: 13 });

  return figure(
    '램 사용률이 높아도 증상이 없으면 정상이고, 부족은 디스크 왕복(페이징)이 시작될 때 증상으로 드러난다',
    W,
    218,
    body,
    '"몇 %면 위험"이라는 선은 없습니다 — 여유를 넘는 순간이 부하에 따라 달라서, 증상이 판정 기준입니다.'
  );
}

/**
 * 온도는 숫자 하나가 아니라 거동으로 판정 — 평형 / 계속 상승 / 추세 이동.
 * gpu-temp-normal 의 판정 3기준을 시간-온도 곡선으로 고정합니다.
 */
function tempBehavior() {
  const W = 640;
  const panelW = 188;
  const gap = 20;
  const py0 = 150; // 각 패널 바닥
  const pTop = 52;

  const curve = (px0, fn, color, dash) => {
    const pts = [];
    for (let i = 0; i <= 30; i++) {
      const x = i / 30;
      pts.push(`${(px0 + 10 + x * (panelW - 24)).toFixed(1)},${(py0 - fn(x)).toFixed(1)}`);
    }
    return `<polyline points="${pts.join(' ')}" fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
  };
  const axes = (px0) =>
    `<line x1="${px0 + 6}" y1="${py0}" x2="${px0 + panelW - 8}" y2="${py0}" stroke="${COLOR.line}"/>` +
    `<line x1="${px0 + 6}" y1="${py0}" x2="${px0 + 6}" y2="${pTop}" stroke="${COLOR.line}"/>`;

  let body = '';
  body += t(16, 22, '같은 부하를 걸고 몇 분 — 곡선의 모양이 판정입니다', { weight: 600, size: 14 });

  // ① 평형 도달 = 정상
  const x1 = 16;
  body += axes(x1);
  body += curve(x1, (x) => 20 + 62 * (1 - Math.exp(-x * 4)), COLOR.fit);
  body += t(x1 + panelW / 2, 44, '① 오르다 멈춤 (평형)', { anchor: 'middle', size: 12, weight: 600, fill: COLOR.fit });
  body += t(x1 + panelW / 2, py0 + 18, '✅ 정상 — 냉각이 이겼습니다', { anchor: 'middle', size: 11, fill: COLOR.mute });

  // ② 계속 상승 = 쿨링 부족
  const x2 = 16 + panelW + gap;
  body += axes(x2);
  body += curve(x2, (x) => 14 + 82 * x, COLOR.over);
  body += t(x2 + panelW / 2, 44, '② 계속 오르기만', { anchor: 'middle', size: 12, weight: 600, fill: COLOR.over });
  body += t(x2 + panelW / 2, py0 + 18, '⚠️ 쿨링이 지는 중 — 개선 순서로', { anchor: 'middle', size: 11, fill: COLOR.mute });

  // ③ 추세 이동 = 먼지·서멀
  const x3 = 16 + (panelW + gap) * 2;
  body += axes(x3);
  body += curve(x3, (x) => 16 + 52 * (1 - Math.exp(-x * 4)), COLOR.fit, '5 4');
  body += curve(x3, (x) => 16 + 74 * (1 - Math.exp(-x * 4)), COLOR.over);
  body += t(x3 + panelW / 2, 44, '③ 예전보다 위로', { anchor: 'middle', size: 12, weight: 600, fill: COLOR.over });
  body += t(x3 + 52, py0 - 44, '예전', { size: 11, fill: COLOR.fit });
  body += t(x3 + 52, py0 - 82, '지금', { size: 11, fill: COLOR.over });
  body += t(x3 + panelW / 2, py0 + 18, '⚠️ 먼지·서멀 신호 — 청소부터', { anchor: 'middle', size: 11, fill: COLOR.mute });

  return figure(
    'GPU 온도 판정 — 평형 도달은 정상, 계속 상승은 쿨링 부족, 추세 상승은 먼지·서멀 신호',
    W,
    186,
    body,
    '숫자(80도 등)는 제품마다 설계가 달라 판정이 안 됩니다 — 시간축의 모양 셋이 판정 도구입니다.'
  );
}

/**
 * 평균 프레임은 같아도 간격이 다르면 체감이 다르다 — 프레임 타임 비교.
 * game-stutter-fps 의 "평균이 아니라 간격" 기둥을 그림으로 고정합니다.
 */
function framePacing() {
  const W = 640;
  const x0 = 130;
  const laneW = 470;

  const ticks = (y, xs, color) =>
    xs.map((x) => `<line x1="${(x0 + x * laneW).toFixed(1)}" y1="${y - 14}" x2="${(x0 + x * laneW).toFixed(1)}" y2="${y}" stroke="${color}" stroke-width="3"/>`).join('');

  // 위: 고른 간격 12틱 / 아래: 같은 12틱인데 가운데 큰 공백
  const even = Array.from({ length: 12 }, (_, i) => i / 11);
  const uneven = [0, 0.05, 0.1, 0.14, 0.18, 0.22, 0.27, 0.62, 0.68, 0.78, 0.89, 1];

  let body = '';
  body += t(16, 22, '같은 1초, 같은 프레임 수 — 간격이 체감을 정합니다', { weight: 600, size: 14 });

  body += t(x0 - 10, 62, '간격이 고름', { anchor: 'end', size: 12, fill: COLOR.fit, weight: 600 });
  body += `<line x1="${x0}" y1="66" x2="${x0 + laneW}" y2="66" stroke="${COLOR.line}"/>`;
  body += ticks(64, even, COLOR.fit);
  body += t(x0 + laneW, 84, '눈에는 부드러움', { anchor: 'end', size: 11, fill: COLOR.mute });

  body += t(x0 - 10, 122, '평균은 같음', { anchor: 'end', size: 12, fill: COLOR.over, weight: 600 });
  body += `<line x1="${x0}" y1="126" x2="${x0 + laneW}" y2="126" stroke="${COLOR.line}"/>`;
  body += ticks(124, uneven, COLOR.over);
  // 큰 공백 구간 표시
  const gapA = x0 + 0.27 * laneW;
  const gapB = x0 + 0.62 * laneW;
  body += `<line x1="${gapA.toFixed(1)}" y1="136" x2="${gapB.toFixed(1)}" y2="136" stroke="${COLOR.over}" stroke-dasharray="4 3"/>`;
  body += t((gapA + gapB) / 2, 152, '이 한 번의 긴 간격이 "멈칫"으로 보입니다', { anchor: 'middle', size: 11, fill: COLOR.over });

  return figure(
    '같은 평균 프레임에서 고른 간격과 널뛰는 간격의 비교 — 긴 간격 하나가 끊김으로 체감된다',
    W,
    168,
    body,
    '프레임 표시기의 숫자(초당 평균)에는 이 차이가 거의 안 잡힙니다 — 그래서 판정 도구는 평균 fps 가 아니라 프레임 타임 그래프입니다.'
  );
}

/**
 * 맞바꾸기 한 번으로 범인의 절반이 갈린다 — 격리 진단의 두 갈래.
 * dual-monitor-one-blank 의 1단계 판정을 그림으로 고정합니다.
 */
function swapDiagnosis() {
  const W = 640;

  const monitor = (x, y, label, dark) => {
    let s = rect(x, y, 92, 58, dark ? COLOR.text : COLOR.soft, { stroke: COLOR.line });
    s += rect(x + 34, y + 58, 24, 8, COLOR.line);
    s += t(x + 46, y + 34, label, { anchor: 'middle', size: 12, weight: 600, fill: dark ? '#fff' : COLOR.text });
    return s;
  };

  let body = '';
  body += t(16, 22, '두 모니터의 연결(케이블째)을 서로 바꿔 꽂으면', { weight: 600, size: 14 });

  // 갈래 1: 증상이 자리를 따라감
  body += t(16, 56, '갈래 ①', { size: 12, weight: 600, fill: COLOR.over });
  body += monitor(80, 44, 'A', false);
  body += monitor(190, 44, 'B', true);
  body += t(236, 122, '아까 그 자리(케이블·포트)가 또 캄캄', { anchor: 'middle', size: 11, fill: COLOR.mute });
  body += t(320, 66, '→', { size: 16, fill: COLOR.mute });
  body += t(345, 60, '증상이 자리를 따라감', { size: 12, weight: 600, fill: COLOR.over });
  body += t(345, 78, '모니터 무죄 — 케이블·젠더·포트 중 범인', { size: 11, fill: COLOR.mute });

  // 갈래 2: 증상이 모니터를 따라감
  body += t(16, 168, '갈래 ②', { size: 12, weight: 600, fill: COLOR.accent });
  body += monitor(80, 156, 'B', true);
  body += monitor(190, 156, 'A', false);
  body += t(126, 234, '어디에 꽂아도 그 모니터만 캄캄', { anchor: 'middle', size: 11, fill: COLOR.mute });
  body += t(320, 178, '→', { size: 16, fill: COLOR.mute });
  body += t(345, 172, '증상이 모니터를 따라감', { size: 12, weight: 600, fill: COLOR.accent });
  body += t(345, 190, '모니터 쪽 — 입력 소스·절전·고장 순서로', { size: 11, fill: COLOR.mute });

  return figure(
    '맞바꾸기 격리 진단 — 증상이 자리를 따라가면 케이블·포트, 모니터를 따라가면 모니터가 범인',
    W,
    248,
    body,
    '한 번의 맞바꾸기로 용의자 목록이 절반으로 줄어듭니다 — 설정을 뒤지기 전에 이것부터입니다.'
  );
}

/**
 * 물 쏟은 직후 3단계 — 읽기 전에 행동이 먼저인 글이라 그림으로 고정.
 * laptop-water-spill 의 응급 순서.
 */
function spillFirstAid() {
  const W = 640;
  const py = 44;
  const ph = 130;

  const panel = (x, num, title, sub) => {
    let s = rect(x, py, 190, ph, COLOR.soft, { stroke: COLOR.line });
    s += t(x + 12, py + 24, num, { weight: 700, size: 16, fill: COLOR.accent });
    s += t(x + 95, py + 50, title, { anchor: 'middle', weight: 600, size: 13 });
    s += t(x + 95, py + ph - 14, sub, { anchor: 'middle', size: 11, fill: COLOR.mute });
    return s;
  };

  let body = '';
  body += t(16, 22, '읽기 전에 이 순서부터 — 전기를 끊고, 중력을 돌립니다', { weight: 600, size: 14 });

  // ① 강제 종료
  body += panel(16, '①', '전원 버튼 길게', '강제 종료 — 저장보다 기계');
  body += `<circle cx="111" cy="118" r="16" fill="none" stroke="${COLOR.over}" stroke-width="3"/>`;
  body += `<line x1="111" y1="96" x2="111" y2="112" stroke="${COLOR.over}" stroke-width="3"/>`;

  // ② 어댑터 분리
  body += panel(225, '②', '어댑터·주변기기 분리', '충전 중이면 전기가 살아 있음');
  body += rect(295, 104, 30, 20, COLOR.text);
  body += `<line x1="325" y1="114" x2="352" y2="114" stroke="${COLOR.text}" stroke-width="3"/>`;
  body += t(362, 120, '⌁', { size: 16, fill: COLOR.over });

  // ③ ㅅ자 뒤집기
  body += panel(434, '③', 'ㅅ자로 엎어 두기', '키보드 아래가 메인보드');
  body += `<polyline points="484,124 529,96 574,124" fill="none" stroke="${COLOR.fit}" stroke-width="4" stroke-linejoin="round"/>`;

  return figure(
    '물 쏟은 직후 응급 순서 — 전원 강제 종료, 어댑터 분리, ㅅ자로 뒤집기',
    W,
    190,
    body,
    '이 셋이 끝난 다음이 닦기와 말리기입니다 — 그리고 겉이 말라 보여도 켜 보지 않는 것이 네 번째 규칙입니다.'
  );
}

/**
 * 무전원 보존의 시간 축 — 걱정 구간과 안전 구간을 한 줄로.
 * ssd-cold-storage 의 "몇 달은 과장, 몇 년은 금지" 판정 고정.
 */
function retentionTimeline() {
  const W = 640;
  const x0 = 40;
  const lineY = 96;
  const lineW = 560;

  let body = '';
  body += t(16, 22, '전원 없이 둔 SSD — 시간 축의 세 구간', { weight: 600, size: 14 });

  // 축
  body += `<line x1="${x0}" y1="${lineY}" x2="${x0 + lineW}" y2="${lineY}" stroke="${COLOR.line}" stroke-width="2"/>`;

  // 구간 1: 몇 주~몇 달 (0~35%)
  body += `<line x1="${x0}" y1="${lineY}" x2="${x0 + lineW * 0.35}" y2="${lineY}" stroke="${COLOR.fit}" stroke-width="6"/>`;
  body += t(x0 + lineW * 0.175, 66, '몇 주 ~ 몇 달', { anchor: 'middle', size: 12, weight: 600, fill: COLOR.fit });
  body += t(x0 + lineW * 0.175, lineY + 24, '걱정 구간 아님 — 공포는 과장', { anchor: 'middle', size: 11, fill: COLOR.mute });

  // 하한 마커 (~50%)
  body += `<line x1="${x0 + lineW * 0.5}" y1="${lineY - 22}" x2="${x0 + lineW * 0.5}" y2="${lineY + 10}" stroke="${COLOR.text}" stroke-dasharray="4 3"/>`;
  body += t(x0 + lineW * 0.5, lineY - 30, '업계 설계 하한 (상온 1년 수준)', { anchor: 'middle', size: 11, fill: COLOR.text });

  // 구간 2: 1년~ (35~70%)
  body += `<line x1="${x0 + lineW * 0.35}" y1="${lineY}" x2="${x0 + lineW * 0.7}" y2="${lineY}" stroke="${COLOR.accent}" stroke-width="6" stroke-dasharray="8 5"/>`;
  body += t(x0 + lineW * 0.55, lineY + 24, '꽂아서 확인·사본 갱신할 때', { anchor: 'middle', size: 11, fill: COLOR.mute });

  // 구간 3: 몇 년 (70~100%)
  body += `<line x1="${x0 + lineW * 0.7}" y1="${lineY}" x2="${x0 + lineW}" y2="${lineY}" stroke="${COLOR.over}" stroke-width="6"/>`;
  body += t(x0 + lineW * 0.85, 66, '몇 년', { anchor: 'middle', size: 12, weight: 600, fill: COLOR.over });
  body += t(x0 + lineW * 0.85, lineY + 24, 'SSD의 자리 아님 — HDD·클라우드로', { anchor: 'middle', size: 11, fill: COLOR.mute });

  // 변수 각주
  body += t(x0, 150, '※ 온도가 높을수록, 마모(TBW 소진)가 클수록 전체 축이 왼쪽으로 당겨집니다', { size: 11, fill: COLOR.mute });

  return figure(
    'SSD 무전원 보존 시간 축 — 몇 달은 안전권, 1년 언저리부터 확인 구간, 몇 년 보관은 다른 매체로',
    W,
    164,
    body,
    '정확한 경계는 셀 방식·온도·마모에 따라 달라 선이 아니라 구간으로 보는 것이 맞습니다.'
  );
}

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
 */
function memoryParts() {
  const W = 640;
  const scale = 52;
  const x0 = 16;
  const w = { weights: 8.8, kv: 0.2, over: 1 };

  const seg = (x, width, fill, label, sub) => `
${rect(x, 40, width, 38, fill)}
${t(x + width / 2, 64, label, { anchor: 'middle', fill: '#fff', weight: 600, size: 12 })}`;

  const x1 = x0;
  const x2 = x1 + w.weights * scale;
  const x3 = x2 + w.kv * scale;

  const body = `
${t(x0, 22, '14B 모델이 필요한 메모리 = 약 10GB', { weight: 600, size: 14 })}

${seg(x1, w.weights * scale, COLOR.fit, '가중치 8.8GB')}
${seg(x2, w.kv * scale, COLOR.accent, '')}
${seg(x3, w.over * scale, COLOR.over, '여유 1GB')}

${t(x1, 98, '컨텍스트와 무관 — 항상 먼저 들어갑니다', { fill: COLOR.mute, size: 12 })}
${t(x3 + w.over * scale, 98, '↑ 컨텍스트', { anchor: 'end', fill: COLOR.mute, size: 12 })}

${t(x0, 128, '컨텍스트를 0 으로 해도 9.8GB 입니다.', { weight: 600 })}
${t(x0, 148, '8GB 카드에서 "짧게 물어보면 되지 않나" 가 통하지 않는 이유입니다.', { fill: COLOR.mute, size: 12 })}`;

  return figure(
    '필요 메모리는 가중치와 여유가 대부분이고 컨텍스트 몫은 작다',
    W,
    162,
    body,
    '가중치와 여유는 컨텍스트와 무관하게 먼저 들어갑니다. 그 합이 이미 VRAM 을 넘으면 컨텍스트를 줄여도 넘습니다.'
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

export const figures = {
  'vram-overflow': vramOverflow,
  'memory-parts': memoryParts,
  'ram-vs-vram': ramVsVram,
  'bandwidth': bandwidthLadder,
  'cpu-vs-gpu-bandwidth': cpuVsGpuBandwidth,
  'resolution-area': resolutionArea,
  'ollama-flow': ollamaFlow,
  'pivot-lines': pivotLines,
};

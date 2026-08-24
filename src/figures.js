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
};

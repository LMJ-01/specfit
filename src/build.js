// 정적 사이트 생성기. 의존성 0 — `node src/build.js` 만 하면 됩니다.
//
// 왜 정적 HTML 로 뽑는가:
//   글을 JS 로 렌더링하면 색인이 느리고 불확실합니다.
//   6개월 안에 검색 유입을 만들어야 하는 프로젝트에서는 감수할 수 없는 리스크입니다.
//   그렇다고 글 150개를 손으로 관리할 수도 없으므로 이 스크립트가 중간을 맡습니다.

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { config } from './config.js';
import { markdownToHtml, parseFrontmatter, inlineToText } from './markdown.js';
import { postPage, listPage, staticPage, toolPage, fmtShort } from './templates.js';
import { gpus, models, quants, lengths } from './gpu-data.js';
import { figures } from './figures.js';
import { buyBox, products } from './products.js';
import { toolMountHtml, parts, verdict } from '../assets/vram-render.js';

const toolData = { gpus, models, quants, lengths };

// 계산기를 기본 상태로 미리 그려둡니다. 브라우저와 같은 함수를 쓰므로
// JS 가 켜졌을 때 다시 그려도 결과가 같습니다 — 화면이 튀지 않습니다.
// 모든 페이지에서 같은 문자열이라 한 번만 만듭니다.
const toolMount = toolMountHtml(toolData);

// 계산기에 쿠팡 링크가 하나라도 있으면, 계산기를 실은 페이지는 '제휴 페이지'입니다.
// 공정위 고지가 자동으로 붙어야 합니다 — 하단 표기나 누락은 수익 전액 몰수 사유입니다.
const toolHasAffiliate = gpus.some((g) => g.buy);

// 글 본문에 {{VRAM_TOOL}} 을 쓰면 그 자리에 계산기가 들어갑니다.
const TOOL_MARK = '{{VRAM_TOOL}}';

// {{COUPANG:rtx4070}} → 해당 카드의 쿠팡 상품 위젯.
// id 패턴을 좁히면 오타가 매칭되지 않아 자리표시자가 페이지에 그대로 노출됩니다.
// 무엇이든 잡아서 경고하고 제거합니다.
const WIDGET_RE = /\{\{COUPANG:([^}]*)\}\}/gi;

// {{FIG:vram-overflow}} → 본문 도해.
// 위젯과 같은 이유로 패턴을 넓게 잡습니다 — 오타가 매칭되지 않으면
// 자리표시자가 페이지에 그대로 노출됩니다.
const FIG_RE = /\{\{FIG:([^}]*)\}\}/gi;

/** 도해 자리표시자를 인라인 SVG 로 바꿉니다. */
function renderFigures(html, warn) {
  return html.replace(FIG_RE, (full, name) => {
    const make = figures[name.trim().toLowerCase()];
    if (!make) {
      warn(`알 수 없는 도해 이름: ${name} — figures.js 에 없는 항목입니다`);
      return '';
    }
    return make();
  });
}

// {{BUY:ram}} → GPU 가 아닌 제품의 구매 링크 박스.
const BUY_RE = /\{\{BUY:([^}]*)\}\}/gi;

function renderBuyLinks(html, warn) {
  return html.replace(BUY_RE, (full, id) => {
    const box = buyBox(id.trim().toLowerCase());
    if (!box) {
      warn(`알 수 없는 제품 id: ${id} — products.js 에 없는 항목입니다`);
      return '';
    }
    return box;
  });
}

/**
 * 위젯 자리표시자를 실제 iframe 으로 바꿉니다.
 *
 * iframe 은 늦게 로드되면서 아래 콘텐츠를 밀어냅니다(CLS).
 * 쿠팡 위젯 코드에 width/height 가 박혀 있으므로 그 값으로 자리를 미리 잡아둡니다.
 *
 * ⚠️ 두 곳을 다 찾습니다 — GPU 는 gpu-data.js, 나머지 품목은 products.js 입니다.
 *    전에는 gpus 만 뒤졌습니다. 그런데 goals.md 가 2026-08-15 에 전환 품목을
 *    GPU → 노트북·주변기기로 옮기기로 했으므로, 정작 전환이 걸린 품목에
 *    위젯을 못 붙이는 상태였습니다. {{COUPANG:laptop}} 이 경고만 내고 사라졌습니다.
 */
function renderWidgets(html, warn) {
  return html.replace(WIDGET_RE, (full, raw) => {
    const id = raw.trim().toLowerCase();
    const gpu = gpus.find((g) => g.id === id);
    const item = gpu || products[id];
    if (!item) {
      warn(`알 수 없는 위젯 id: ${raw} — gpu-data.js 에도 products.js 에도 없습니다`);
      return '';
    }
    // GPU 는 name, 나머지 품목은 label 로 부릅니다. 경고에 무엇이 비었는지 보여야 합니다.
    const name = gpu ? gpu.name : item.label || id;
    if (!item.widget) {
      warn(
        `${name}: widget 코드가 비어 있어 ${full} 이 무시됨 ` +
          `— 파트너스 → 배너/위젯 → 상품 위젯 에서 받아 넣으세요`
      );
      return '';
    }
    const h = /height="?(\d+)/.exec(item.widget);
    const reserve = h ? ` style="min-height:${h[1]}px"` : '';
    return `<div class="coupang-widget"${reserve}>${item.widget}</div>`;
  });
}

// 자리표시자만 홀로 있는 문단.
//
// 마크다운 변환기는 `{{FIG:x}}` 한 줄을 평범한 문단으로 봅니다. 그래서 치환하면
// <p><figure>…</figure></p> 가 되는데, figure·div 는 p 안에 올 수 없습니다.
// 브라우저가 알아서 p 를 닫아주기 때문에 화면은 멀쩡했고, 그래서 오래 안 보였습니다.
// 남는 것은 빈 </p> 하나와 유효하지 않은 HTML 입니다.
//
// 치환 전에 껍데기를 벗깁니다. 문단 안에 자리표시자 하나만 있을 때로 한정하므로
// 문장 중간에 쓴 경우는 그대로 둡니다.
const LONE_PLACEHOLDER_RE = /<p>(\{\{[^}]*\}\})<\/p>/g;

/**
 * 마크다운 → HTML 로 바꾼 뒤 자리표시자를 순서대로 채웁니다.
 *
 * 계산기 → 위젯 → 도해 → 구매 링크 순입니다.
 * 순서가 중요한 이유는 하나뿐입니다 — 마크다운 변환이 가장 먼저여야
 * 자리표시자 안의 내용이 마크다운으로 해석되지 않습니다.
 * 나머지는 서로 겹치지 않아 순서가 자유롭습니다.
 */
function renderShortcodes(body, warn) {
  const withTool = markdownToHtml(body)
    .replace(LONE_PLACEHOLDER_RE, '$1')
    .replace(new RegExp(TOOL_MARK.replace(/[{}]/g, '\\$&'), 'g'), () => toolMount);
  return renderBuyLinks(renderFigures(renderWidgets(withTool, warn), warn), warn);
}

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const contentDir = join(here, 'content');

const write = async (relPath, contents) => {
  const full = join(root, relPath);
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, contents, 'utf8');
  return relPath;
};

const readMarkdownDir = async (dir) => {
  if (!existsSync(dir)) return [];
  const names = (await readdir(dir)).filter((n) => n.endsWith('.md'));
  return Promise.all(
    names.map(async (name) => {
      const raw = await readFile(join(dir, name), 'utf8');
      const { data, body } = parseFrontmatter(raw);
      return { name, slug: data.slug || name.replace(/\.md$/, ''), data, body };
    })
  );
};

/**
 * 본문의 "자주 묻는 질문" 절을 뽑아 FAQPage 구조화 데이터로 만듭니다.
 * 글을 두 번 쓰지 않아도 리치 결과가 붙습니다.
 */
function extractFaq(markdown) {
  const lines = markdown.split('\n');
  const start = lines.findIndex((l) => /^##\s+.*(자주 묻는 질문|FAQ)/i.test(l));
  if (start === -1) return [];

  const faq = [];
  let current = null;

  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^##\s/.test(line)) break;

    const q = /^###\s+(.*)$/.exec(line);
    if (q) {
      if (current && current.a) faq.push(current);
      current = { q: q[1].trim(), a: '' };
      continue;
    }
    if (!current || !line.trim()) continue;

    // 인용·표·코드펜스·구분선은 답변에서 뺍니다.
    if (/^\s*(>|\||```|---)/.test(line)) continue;

    // 목록 항목은 마커만 떼고 답변에 넣습니다.
    // 이걸 빼면 "세 가지를 확인하세요." 처럼 정작 내용이 없는 답변이
    // 리치 결과에 나갑니다 — 목록에 답이 들어 있는 글이 여러 편 있습니다.
    const text = line.trim().replace(/^([-*]|\d+\.)\s+/, '');
    current.a += (current.a ? ' ' : '') + text;
  }
  if (current && current.a) faq.push(current);

  // 마크다운 기호가 그대로 검색 결과에 나가지 않도록 평문으로 되돌립니다.
  return faq.map((f) => ({ q: inlineToText(f.q), a: inlineToText(f.a) }));
}

// ---- 글의 표가 계산기와 어긋나는지 검사 ----
//
// 이 사이트의 유일한 차별점은 수치가 맞는다는 것입니다. 그런데 글의 표는 손으로
// 적고 계산기는 코드로 냅니다. 한쪽만 고치면 둘이 다른 답을 하고, 그때
// 빌드는 아무 말도 하지 않았습니다.
//
// 실제로 겪은 일입니다 — KV 캐시를 파라미터 수에 비례시켜 놓은 것을 고쳤을 때
// 글 열 편의 표가 함께 틀린 상태가 됐습니다. `perB` 재측정은 반년마다 하기로
// 되어 있으므로(side-income-plan/docs/next-steps.md '정기 점검') 또 생깁니다.
//
// 표에 적힌 기준(양자화·길이)은 본문 산문에 있어서 기계가 읽기 어렵습니다.
// 그래서 **표 안에서 스스로 증명하게** 합니다 — 올바른 표라면 모든 행이
// 같은 기준 하나로 설명돼야 합니다. 행마다 가능한 기준을 구해 교집합을 내고,
// 비면 그 표는 낡았거나 서로 안 맞는 것입니다.
const MODEL_PATTERNS = [
  [/(^|[^\d])3B/, '3b'],
  [/(7~8B|(^|[^\d~])8B|(^|[^\d~])7B)/, '8b'],
  [/(12~14B|(^|[^\d~])14B|(^|[^\d~])12B)/, '14b'],
  [/(20~22B|(^|[^\d~])22B)/, '22b'],
  [/(^|[^\d~])32B/, '32b'],
  [/(^|[^\d~])70B/, '70b'],
  [/120B/, '120b'],
];

const VERDICT_WORD = { ok: '여유', tight: '빠듯', slow: '느림', no: '불가' };

const modelIdOf = (text) => {
  for (const [re, id] of MODEL_PATTERNS) if (re.test(text)) return id;
  return null;
};

const cellsOf = (row) =>
  row
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.replace(/\*\*/g, '').trim());

// 모든 (양자화 × 길이) 조합. 표의 기준을 여기서 좁혀 나갑니다.
const BASES = quants.flatMap((q) => lengths.map((l) => ({ q, l, key: `${q.id}/${l.id}` })));

/**
 * 판정 열 헤더에서 그 열이 가리키는 카드의 VRAM 을 알아냅니다.
 * 글마다 표기가 다릅니다 — '16GB 에서', '3060 12GB에서', '5060 Ti 16GB', '5070 Ti', '5080'.
 *
 * 용량이 적혀 있으면 그걸 쓰고, 이름만 적혀 있으면 gpu-data.js 에서 찾습니다.
 * **여러 카드에 걸리면 포기합니다** — '5060 Ti' 는 16GB 와 8GB 두 종류가 있어서
 * 어느 쪽인지 알 수 없습니다. 찍어서 경고를 내면 오탐이 됩니다.
 */
const normName = (s) => s.replace(/RTX|GeForce|\(.*?\)|[\s·]/gi, '').toLowerCase();

function cardVramOf(headerCell) {
  // '8GB × 2' 는 두 장 이야기라 8GB 카드 하나로 볼 수 없습니다.
  if (/[×x]\s*\d/.test(headerCell)) return null;

  const gb = /(\d+)\s*GB/.exec(headerCell);
  if (gb) return Number(gb[1]);

  const key = normName(headerCell);
  if (!key || key.length < 4) return null;
  const hit = gpus.filter((g) => normName(g.name).startsWith(key));
  return hit.length === 1 ? hit[0].vram : null;
}

function checkToolTables(body, warn) {
  const lines = body.split('\n');

  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].trim().startsWith('|')) continue;
    if (!/^\s*\|[\s:|-]+\|/.test(lines[i + 1] || '')) continue;

    const head = cellsOf(lines[i]);

    // 첫 열이 '무엇을 돌리나' 축인 표만 봅니다.
    //
    // '필요 메모리' 라는 말이 이 사이트에서 두 뜻으로 쓰입니다 —
    //   ① 모델이 쓰는 양   (| 모델 크기 | 필요 메모리 | …)  ← 계산기와 맞아야 하는 값
    //   ② 사야 할 용량     (| 작업 | 필요 메모리 | …)       ← 맥 통합메모리 권장치
    // 축을 안 보면 ②가 전부 경고로 뜹니다. 경고가 오탐으로 차면 아무도 안 봅니다.
    if (!/^(모델|다루는 길이|양자화)/.test(head[0] || '')) continue;

    // '필요한 VRAM' 도 같은 이유로 뺍니다 — 그건 살 카드 용량입니다.
    const needCol = head.findIndex((h) => /필요\s*메모리/.test(h));

    const cardCols = head
      .map((h, idx) => {
        if (idx === 0 || idx === needCol) return null;
        const vram = cardVramOf(h);
        return vram ? { idx, vram } : null;
      })
      .filter(Boolean);

    if (needCol === -1 && !cardCols.length) continue;

    const rows = [];
    let j = i + 2;
    for (; j < lines.length && lines[j].trim().startsWith('|') && lines[j].trim(); j++) {
      const c = cellsOf(lines[j]);
      const id = modelIdOf(c[0] || '');
      if (id) rows.push({ c, id, model: models.find((m) => m.id === id) });
    }
    i = j - 1;
    if (!rows.length) continue;

    // ① 각 행의 '필요 메모리' 를 설명할 수 있는 기준만 남깁니다.
    let bases = BASES;
    if (needCol !== -1) {
      for (const r of rows) {
        const m = /([\d.]+)\s*GB/i.exec(r.c[needCol] || '');
        if (!m) continue;
        const stated = Number(m[1]);
        // 소수점을 안 쓴 값('약 46GB')은 반올림 폭을 넓게 봅니다.
        const tol = m[1].includes('.') ? 0.1 : 0.5;
        const fit = bases.filter(
          (b) => Math.abs(parts(r.model, b.q, b.l.tokens).total - stated) <= tol
        );
        if (!fit.length) {
          warn(
            `표의 필요 메모리가 계산기와 맞지 않습니다 — ${r.model.label} ${stated}GB ` +
              `(어떤 양자화·길이로도 안 나옴). gpu-data.js 를 고쳤다면 이 표도 고치세요`
          );
          bases = [];
          break;
        }
        bases = fit;
      }
      if (!bases.length) continue;
    }

    // ② 판정 열을 남은 기준으로 검사합니다.
    for (const { idx, vram } of cardCols) {
      for (const r of rows) {
        const said = Object.entries(VERDICT_WORD).find(([, w]) => (r.c[idx] || '').includes(w));
        if (!said) continue;
        const okAny = bases.some(
          (b) => verdict(parts(r.model, b.q, b.l.tokens).total, vram) === said[0]
        );
        if (!okAny) {
          const b = bases[0];
          const got = VERDICT_WORD[verdict(parts(r.model, b.q, b.l.tokens).total, vram)];
          warn(
            `판정이 계산기와 다릅니다 — ${r.model.label} @ ${vram}GB: ` +
              `글은 "${said[1]}", 계산기는 "${got}" (${b.key})`
          );
        }
      }
    }
  }
}

// ---- 링크 글자와 목적지가 어긋나는지 검사 ----
//
// 실제로 겪은 일입니다 (2026-08-19 발견) — 맥 글의 "RTX 5090은 575W" 링크가
// rtx4060ti-16gb-vs-4070.html 로 가고 있었습니다. 5090 글이 나중에 생겼는데
// 링크를 안 옮긴 것입니다.
//
// **이 종류는 어떤 검사에도 안 걸렸습니다.** 목적지가 200 이라 깨진 링크가 아니고,
// 사이트맵·고아 글 검사에도 안 잡힙니다. 글자와 목적지가 다를 뿐이라
// 사람이 눌러봐야 압니다. 실제로 저장소를 전수로 읽다가 눈으로 찾았습니다.
//
// 그래서 **링크 글자에 든 GPU 모델 번호가 목적지 글에 있는지** 봅니다.
// gpu-data.js 에 실제로 있는 번호만 씁니다 — 대역폭 `1792` 같은 네 자리 숫자를
// 모델로 오인하면 오탐이 쏟아집니다.
//
// ⚠️ 오탐 0 이 이 검사의 조건입니다 (표 대조 검사와 같은 기준).
//    현재 콘텐츠에서 모델 번호가 든 링크 25개 중 경고 0건이고,
//    위 버그를 일부러 되돌리면 잡히는 것을 확인했습니다.
//    범위를 넓히려면 오탐이 안 생기는지 먼저 재세요.
const GPU_MODELS = new Set(gpus.flatMap((g) => g.name.match(/\b\d{4}\b/g) || []));
const POST_LINK_RE = /\[([^\]]+)\]\(\/posts\/([a-z0-9-]+)\.html\)/g;

function checkLinkTargets(body, titleOf, warn) {
  for (const [, text, slug] of body.matchAll(POST_LINK_RE)) {
    const nums = [...new Set((text.match(/\b\d{4}\b/g) || []).filter((n) => GPU_MODELS.has(n)))];
    if (!nums.length) continue;
    // 슬러그가 낡은 경우가 있어(4060ti 글이 50 시리즈로 다시 쓰임) 제목도 함께 봅니다.
    const target = `${slug} ${titleOf(slug) || ''}`;
    if (nums.some((n) => target.includes(n))) continue;
    warn(
      `링크 글자와 목적지가 어긋납니다 — "${text}" → ${slug}.html ` +
        `(${nums.join('·')} 이 대상 글에 없습니다)`
    );
  }
}

// ---- 「정리」가 본문이 더 이상 쓰지 않는 비교 대상을 들고 있는지 검사 ----
//
// 실제로 겪은 일입니다 (2026-08-20 발견) — rtx3060 글의 「정리」 2번이
// "신품 4060 8GB보다 VRAM·대역폭 둘 다 앞섭니다" 로 남아 있었습니다.
// 본문은 비교 대상을 4060 → 5060 으로 갱신했는데, 5060 은 대역폭이 448 이라
// 3060(360)보다 높습니다. **그 문장이 정반대가 된 채로 배포돼 있었습니다.**
//
// 이 종류는 앞의 두 검사에 안 걸립니다.
//   표 대조      필요 메모리와 판정만 봅니다. 산문은 범위 밖입니다
//   링크 목적지  링크만 봅니다. 이건 링크가 아닙니다
// "본문에 없는 카드" 로도 안 잡힙니다 — 4060 은 단종 언급으로 본문에 남아 있었습니다.
//
// 그래서 **본문의 표에 등장하는 카드**를 그 글이 실제로 견주는 대상으로 보고,
// 「정리」가 그 밖의 카드를 들고 있으면 경고합니다.
// 글을 다시 쓸 때 표는 고치고 정리를 안 고치는 것이 반복되는 실수입니다.
//
// ⚠️ 오탐 0 이 이 검사의 조건입니다 (앞의 두 검사와 같은 기준).
//    현재 콘텐츠 50편에서 경고 0건이고, 위 버그를 되돌리면 잡히는 것을 확인했습니다.
//    표가 없는 글은 건너뜁니다 — 비교 대상을 알 수 없어 찍으면 오탐이 됩니다.
const CONCLUSION_RE = /^##\s*정리\s*$/m;

function checkConclusionCards(body, warn) {
  const at = body.search(CONCLUSION_RE);
  if (at === -1) return;
  const conclusion = body.slice(at);
  const main = body.slice(0, at);

  const inTables = new Set();
  for (const line of main.split('\n')) {
    if (!/^\s*\|/.test(line)) continue;
    for (const n of line.match(/\b\d{4}\b/g) || []) if (GPU_MODELS.has(n)) inTables.add(n);
  }
  if (!inTables.size) return;

  const stale = [...new Set(conclusion.match(/\b\d{4}\b/g) || [])].filter(
    (n) => GPU_MODELS.has(n) && !inTables.has(n)
  );
  if (stale.length)
    warn(
      `「정리」가 본문 표에 없는 카드를 들고 있습니다 — ${stale.join('·')} ` +
        `(본문이 견주는 대상: ${[...inTables].join('·')}). ` +
        `표를 고치고 정리를 안 고쳤을 수 있습니다`
    );
}

async function build() {
  const written = [];
  const warnings = [];

  // ---- 글 ----
  const rawPosts = await readMarkdownDir(join(contentDir, 'posts'));

  const posts = rawPosts
    .filter((p) => p.data.draft !== true)
    .map((p) => {
      const faq = extractFaq(p.body);
      // 글의 표가 계산기와 어긋나면 여기서 잡습니다.
      checkToolTables(p.body, (msg) => warnings.push(`${p.slug}: ${msg}`));
      // 「정리」가 본문이 더 이상 안 쓰는 비교 대상을 들고 있으면 여기서 잡습니다.
      checkConclusionCards(p.body, (msg) => warnings.push(`${p.slug}: ${msg}`));
      const usesTool = p.body.includes(TOOL_MARK);
      // 위젯을 쓰면 그 자체가 제휴 링크이므로 공정위 고지가 붙어야 합니다.
      const usesWidget = WIDGET_RE.test(p.body);
      WIDGET_RE.lastIndex = 0; // 전역 정규식 상태 초기화
      return {
        toolData: usesTool ? toolData : null,
        usesWidget,
        slug: p.slug,
        url: `/posts/${p.slug}.html`,
        title: p.data.title || p.slug,
        description: p.data.description || '',
        date: p.data.date || '1970-01-01',
        updated: p.data.updated || '',
        category: p.data.category || '',
        tags: Array.isArray(p.data.tags) ? p.data.tags : [],
        // 계산기나 위젯을 실으면 그 안에 제휴 링크가 있으므로 자동으로 제휴 페이지가 됩니다.
        affiliate:
          p.data.affiliate === true || (usesTool && toolHasAffiliate) || usesWidget,
        image: p.data.image || '',
        faq,
        html: renderShortcodes(p.body, (msg) => warnings.push(`${p.slug}: ${msg}`)),
        // 작성용 메모(<!-- 공개 전 확인 -->)를 먼저 걷어냅니다.
        // 이게 없으면 대부분의 글에서 앞 600자가 통째로 메모라, 공개되는
        // 검색 인덱스에 내부 메모가 실리고 정작 본문은 색인되지 않습니다.
        // 주석 제거가 '-' 제거보다 먼저여야 합니다 — 순서를 바꾸면 --> 가 사라집니다.
        text: p.body
          .replace(/<!--[\s\S]*?-->/g, ' ')
          .replace(/[#>*`|_-]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim(),
      };
    })
    // 최신순. 날짜가 같으면 slug 로 가릅니다.
    //
    // 0 을 반환하지 않는 비교 함수를 쓰면 같은 날짜끼리 순서가 뒤집힙니다.
    // 이 사이트는 하루에 여러 편을 올리는 일이 잦아서 실제로 그랬습니다.
    .sort((a, b) => (a.date === b.date ? a.slug.localeCompare(b.slug) : a.date < b.date ? 1 : -1));

  // ---- 메뉴 조립 ----
  // 카테고리를 손으로 적어두면 글이 쌓여도 메뉴에 안 나옵니다. 실제로 그랬습니다.
  // 글이 있는 카테고리만 자동으로 붙입니다 — 빈 카테고리로 보내면 헛걸음입니다.
  const activeCategories = config.categories.filter((c) =>
    posts.some((p) => p.category === c.slug)
  );
  config.nav = [
    ...config.nav,
    ...activeCategories.map((c) => ({ href: `/${c.slug}.html`, label: c.label })),
  ];
  for (const cat of config.categories) {
    if (!activeCategories.includes(cat)) {
      warnings.push(`카테고리 '${cat.slug}' 에 글이 없어 메뉴에서 빠집니다`);
    }
    // 카테고리 description 은 그대로 검색 스니펫이 됩니다.
    // 짧으면 검색 결과에 그 몇 글자만 나가서 클릭이 안 됩니다.
    if (cat.description.length < 30)
      warnings.push(
        `카테고리 '${cat.slug}': description 이 ${cat.description.length}자 — 검색 스니펫으로 너무 짧습니다`
      );
  }

  // 품질 점검 — seo-checklist.md 항목을 빌드 때 강제합니다.
  for (const p of posts) {
    if (!p.description) warnings.push(`${p.slug}: description 없음 (검색 스니펫에 불리)`);
    if (p.description.length > 160)
      warnings.push(`${p.slug}: description 이 ${p.description.length}자 (160자 이하 권장)`);
    if (!p.category) warnings.push(`${p.slug}: category 없음 (목록에서 누락됨)`);
    if (p.title.length > 60)
      warnings.push(`${p.slug}: 제목이 ${p.title.length}자 (검색결과에서 잘림)`);
    // 제휴 링크가 있는데 affiliate 플래그가 없으면 고지가 안 붙습니다 → 수익 몰수 위험
    if (!p.affiliate && /coupang\.|coupa\.ng/.test(p.html))
      warnings.push(`${p.slug}: 제휴 링크가 있는데 affiliate: true 가 없습니다 ⚠️`);
  }

  // 링크 글자와 목적지 대조. 제목이 다 모인 뒤라야 하므로 여기서 합니다.
  const titleOf = (slug) => (posts.find((p) => p.slug === slug) || {}).title;
  for (const raw of rawPosts) {
    if (raw.data.draft === true) continue;
    checkLinkTargets(raw.body, titleOf, (msg) => warnings.push(`${raw.slug}: ${msg}`));
  }

  for (const post of posts) {
    const related = posts
      .filter((o) => o.slug !== post.slug && o.category === post.category)
      .slice(0, 3);
    written.push(await write(post.url.slice(1), postPage(post, related)));
  }

  // ---- 홈 ----
  //
  // 홈은 목록이 아니라 안내판입니다.
  // 글을 전부 쏟으면 처음 온 사람은 제목만 훑다 나가고, 150편이 되면 더 심해집니다.
  //   진입 카드 → 카테고리 → 골라 읽기 좋은 글 → 새로 쓴 글 순으로 좁혀 갑니다.

  // 글이 있는 카테고리만. 빈 칸을 보여주면 헛걸음입니다.
  const catCards = config.categories
    .map((c) => ({ ...c, count: posts.filter((p) => p.category === c.slug).length }))
    .filter((c) => c.count > 0);

  const featured = config.featured
    .map((slug) => {
      const post = posts.find((p) => p.slug === slug);
      // 글을 지우거나 파일명을 바꾸면 여기가 조용히 비어버립니다. 경고로 잡습니다.
      if (!post) warnings.push(`config.featured 에 없는 글: ${slug} — 이름이 바뀌었거나 지워졌습니다`);
      return post;
    })
    .filter(Boolean);

  written.push(
    await write(
      'index.html',
      listPage({
        posts: posts.slice(0, config.postsPerPage),
        title: config.siteName,
        description: config.description,
        path: '/',
        heading: `${config.siteName} — ${config.tagline}`,
        // intro 를 빼둡니다. 아래 hero.lead 와 카테고리 칩이 같은 일을 하고 있어서
        // 셋 다 두면 계산기 앞에 설명 문단이 두 개 겹칩니다.
        // (config.description 은 meta description 으로는 계속 쓰입니다)
        searchable: true,
        hero: true,
        catCards,
        featured,
        totalPosts: posts.length,
        // 홈에 계산기를 그대로 싣습니다. 링크로 보내면 처음 온 사람은 안 누릅니다.
        toolData,
        // 계산기에 제휴 링크가 있으면 공정위 고지가 홈 상단에 자동으로 붙습니다.
        //
        // ⚠️ 쿠팡 검색 위젯도 제휴 요소입니다. 지금은 계산기 때문에 어차피 붙지만,
        //    나중에 홈에서 계산기를 빼면 고지가 사라지고 검색 위젯만 남습니다.
        //    그러면 누락이고 수익 전액 몰수 사유입니다. 둘 중 하나만 있어도 붙게 둡니다.
        affiliate: toolHasAffiliate || Boolean(config.coupangSearch),
      })
    )
  );

  // ---- 카테고리 ----
  for (const cat of config.categories) {
    const inCat = posts.filter((p) => p.category === cat.slug);
    written.push(
      await write(
        `${cat.slug}.html`,
        listPage({
          posts: inCat,
          title: cat.label,
          description: `${cat.description} — ${config.siteName}`,
          path: `/${cat.slug}.html`,
          heading: cat.label,
          intro: cat.description,
          searchable: false,
        })
      )
    );
  }

  // ---- 고정 페이지 ----
  const rawPages = await readMarkdownDir(join(contentDir, 'pages'));

  // 개인정보처리방침과 실제 설정이 어긋나는지 점검합니다.
  // 쿠키를 쓰면서 안 쓴다고 적어두는 것도 부정확한 고지입니다.
  // 사람이 기억해서 맞추면 언젠가 빠뜨리므로 여기서 잡습니다.
  const privacy = rawPages.find((p) => p.slug === 'privacy');
  if (privacy) {
    const saysUnused = /구글 애널리틱스[^\n]*\n?[^\n]*사용하지 않습니다|애널리틱스\*\* — 사용하지 않습니다/.test(
      privacy.body
    );
    if (config.analytics.ga4 && saysUnused) {
      warnings.push(
        'privacy.md: 애널리틱스를 켰는데 "사용하지 않습니다" 로 적혀 있습니다 ⚠️ ' +
          '— 해당 절과 시행일을 고치세요'
      );
    }
    if (!config.analytics.ga4 && !saysUnused && /애널리틱스/.test(privacy.body)) {
      warnings.push(
        'privacy.md: 애널리틱스가 꺼져 있는데 쓴다고 적혀 있을 수 있습니다 — 확인하세요'
      );
    }
  }
  for (const page of rawPages) {
    written.push(
      await write(
        `${page.slug}.html`,
        staticPage({
          slug: page.slug,
          url: `/${page.slug}.html`,
          title: page.data.title || page.slug,
          description: page.data.description || '',
          html: markdownToHtml(page.body),
        })
      )
    );
  }

  // ---- 계산기 페이지 ----
  written.push(
    await write(
      'tools/vram.html',
      toolPage({
        title: 'VRAM 계산기 — 내 그래픽카드로 돌아가는 로컬 LLM',
        description:
          '그래픽카드를 고르면 어떤 크기의 로컬 LLM이 돌아가는지 바로 확인합니다. VRAM, 양자화, 컨텍스트 길이를 함께 계산합니다.',
        path: '/tools/vram.html',
        intro:
          '그래픽카드와 설정을 고르면 어떤 크기의 모델이 여유 있게 돌아가는지 표로 보여줍니다.',
        data: toolData,
        affiliate: toolHasAffiliate,
        body: markdownToHtml(`
## 내 그래픽카드 확인하는 법

모델명을 모르셔도 1분이면 확인됩니다.

**윈도우**

1. \`Ctrl\` + \`Shift\` + \`Esc\` 를 눌러 작업 관리자를 엽니다
2. **성능** 탭 → 왼쪽 목록에서 **GPU** 클릭
3. 오른쪽 위에 카드 이름이 나옵니다 (예: NVIDIA GeForce RTX 4060 Ti)
4. 오른쪽 아래 **전용 GPU 메모리**가 이 계산기에서 말하는 메모리입니다

**맥**

화면 왼쪽 위 사과 아이콘 → **이 Mac에 관하여**.
메모리 항목에 적힌 숫자를 그대로 고르시면 됩니다.

## 이 계산기가 실제로 계산하는 것

그래픽카드 메모리를 얼마나 쓰는지는 세 가지가 정합니다.

- **모델 자체의 크기** — 똑똑할수록 큽니다
- **한 번에 다루는 내용의 길이** — 길수록 메모리를 더 씁니다
- **여유 공간** — 프로그램이 돌아가는 데 필요한 몫

두 번째가 자주 놓치는 부분입니다.
**"처음엔 빨랐는데 대화가 길어지니 느려진다"**는 대부분 여기서 옵니다.
같은 모델이라도 긴 문서를 넣으면 메모리를 훨씬 많이 씁니다.

## 메모리가 모자라면 어떻게 되나요

**에러가 나지 않습니다. 그냥 느려집니다.** 이게 헷갈리는 지점입니다.

그래픽카드에 다 안 들어가면 프로그램이 나머지를 컴퓨터의 일반 메모리로 넘깁니다.
동작은 하지만 속도가 몇 배에서 수십 배까지 떨어집니다.

| 표시 | 뜻 |
|------|-----|
| 여유 | 쾌적하게 씁니다 |
| 빠듯 | 짧은 내용만 다루면 됩니다 |
| 느림 | 답답할 정도로 느려집니다 |
| 불가 | 사실상 못 씁니다 |

**"돌아간다"와 "쓸 만하다"는 다릅니다.**

## 이 결과를 얼마나 믿어야 하나요

**근사치입니다.** 실제로 쓰는 프로그램과 모델 종류에 따라 조금씩 달라집니다.

그래서 **경계선에 있다면 한 단계 위를 택하는 편이 안전합니다.**
메모리가 남는 것은 손해가 아니지만, 모자라면 아예 못 씁니다.

더 자세한 내용은 [Ollama 최소 사양 정리](/posts/ollama-minimum-spec.html)에 있습니다.
`),
      })
    )
  );

  // ---- 검색 인덱스 ----
  written.push(
    await write(
      'assets/search-index.json',
      // 검색 결과는 홈의 '새로 쓴 글' 과 같은 모양으로 그려집니다.
      // 그래서 화면에 필요한 것(분류 이름·짧은 날짜)을 여기서 미리 만들어 둡니다.
      // slug 를 그대로 내보내면 결과에 'gpu' 같은 영문이 노출됩니다.
      JSON.stringify(
        posts.map((p) => {
          const cat = config.categories.find((c) => c.slug === p.category);
          return {
            u: p.url,
            t: p.title,
            d: p.description,
            c: cat ? cat.label : '',
            dt: fmtShort(p.date),
            k: `${p.title} ${p.description} ${p.tags.join(' ')} ${p.text.slice(0, 600)}`.toLowerCase(),
          };
        })
      )
    )
  );

  // ---- sitemap ----
  const urls = [
    { loc: '/', priority: '1.0' },
    { loc: '/tools/vram.html', priority: '0.9' },
    ...config.categories.map((c) => ({ loc: `/${c.slug}.html`, priority: '0.7' })),
    ...rawPages.map((p) => ({ loc: `/${p.slug}.html`, priority: '0.3' })),
    ...posts.map((p) => ({ loc: p.url, priority: '0.8', lastmod: p.updated || p.date })),
  ];

  const base = config.siteUrl.replace(/\/$/, '');
  written.push(
    await write(
      'sitemap.xml',
      `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url><loc>${base}${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}<priority>${u.priority}</priority></url>`
  )
  .join('\n')}
</urlset>`
    )
  );

  // ---- robots.txt ----
  // robots.txt 는 '크롤링' 제어입니다. 색인을 막으려면 noindex 를 써야 합니다.
  written.push(
    await write(
      'robots.txt',
      `User-agent: *
Allow: /

Sitemap: ${base}/sitemap.xml
`
    )
  );

  // ---- ads.txt ----
  // 애드센스가 "이 사이트의 광고를 누가 팔 권한이 있는가" 를 확인하는 파일입니다.
  // 없으면 승인 후에도 "수익 손실 위험" 경고가 뜨고 광고 단가가 떨어질 수 있습니다.
  //
  // config.adsense.client 를 채우면 자동으로 생성됩니다.
  // 승인 전에는 만들지 않습니다 — 잘못된 게시자 ID 가 적힌 ads.txt 는 없느니만 못합니다.
  if (config.adsense.client) {
    // 'ca-pub-0000...' 에서 'ca-' 를 뗀 형태가 ads.txt 규격입니다.
    const pub = config.adsense.client.replace(/^ca-/, '');
    written.push(
      await write('ads.txt', `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`)
    );
  } else {
    console.log('\n💡 애드센스 승인 후 config.js 의 adsense.client 를 채우면');
    console.log('   광고 슬롯과 ads.txt 가 자동으로 생성됩니다.');
  }

  // ---- 남은 생성물 점검 ----
  // 카테고리를 지우거나 글을 삭제해도 예전 생성물이 그대로 남습니다.
  // 실제로 테스트용 카테고리를 지웠는데 cpu.html 이 배포까지 간 적이 있습니다.
  // 지우지는 않습니다 — 사람이 손으로 만든 파일을 지울 위험이 있기 때문입니다. 경고만 합니다.
  const expected = new Set(written.map((p) => p.replace(/\\/g, '/')));
  const scan = async (dir, prefix = '') => {
    for (const name of await readdir(join(root, dir || '.'))) {
      const rel = prefix ? `${prefix}/${name}` : name;
      if (['src', 'assets', 'node_modules', '.git', 'tools'].includes(rel)) continue;
      const full = join(root, rel);
      const stat = await import('node:fs/promises').then((m) => m.stat(full));
      if (stat.isDirectory()) await scan(rel, rel);
      else if (name.endsWith('.html') && !expected.has(rel))
        warnings.push(`생성물에 없는 HTML 이 남아 있습니다: ${rel} — 지워야 할 수 있습니다`);
    }
  };
  await scan('');

  console.log(`\n생성 완료: ${written.length}개 파일`);
  console.log(`  글 ${posts.length} · 카테고리 ${config.categories.length} · 페이지 ${rawPages.length}`);

  if (warnings.length) {
    console.log(`\n⚠️  점검 필요 ${warnings.length}건`);
    for (const w of warnings) console.log(`  - ${w}`);
  }

  if (!config.siteUrl.startsWith('https://specfit')) {
    console.log(`\n💡 도메인 구매 후 src/config.js 의 siteUrl 을 바꾸세요.`);
  }
  console.log('');
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});

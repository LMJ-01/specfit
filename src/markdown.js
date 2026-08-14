// 의존성 없는 최소 마크다운 파서.
// 기술 글에 필요한 것만 지원합니다: 제목, 문단, 목록, 표, 코드, 인용, 링크, 이미지.
//
// 이미지 크기 확장 문법:  ![alt](/img/a.png =800x450)
//   → width/height 속성이 붙어 CLS 를 막습니다. seo-checklist.md 참고.

const escapeHtml = (s) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// 코드 스팬 자리표시자.
// 마크다운 원문에 절대 나타나지 않는 제어문자(NUL)를 씁니다.
// " 0 " 같은 형태를 쓰면 본문의 "약 3 GB" 가 자리표시자로 오인되어 깨집니다.
//
// ⚠️ 반드시 백슬래시-u 이스케이프로 적습니다. 리터럴 NUL 바이트를 파일에 넣으면
//    git 이 이 파일을 바이너리로 판단해 diff·blame·merge 가 전부 막힙니다.
const PH = '\u0000';

// 인라인 요소. 코드 스팬을 먼저 떼어내 그 안은 건드리지 않습니다.
function inline(src) {
  const codes = [];
  let text = src.replace(/`([^`]+)`/g, (_, code) => {
    codes.push(`<code>${escapeHtml(code)}</code>`);
    return `${PH}${codes.length - 1}${PH}`;
  });

  text = escapeHtml(text);

  // 이미지 (링크보다 먼저)
  text = text.replace(
    /!\[([^\]]*)\]\(([^)\s]+)(?:\s+=(\d+)x(\d+))?\)/g,
    (_, alt, src2, w, h) => {
      const dim = w && h ? ` width="${w}" height="${h}"` : '';
      // 일단 전부 lazy 로 내고, 첫 이미지만 아래 promoteFirstImage 에서 되돌립니다.
      return `<img src="${src2}" alt="${alt}"${dim} loading="lazy" decoding="async">`;
    }
  );

  // 링크. 외부 링크는 rel 처리, 제휴 링크(coupang)는 sponsored 필수.
  text = text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
    const external = /^https?:\/\//.test(href);
    if (!external) return `<a href="${href}">${label}</a>`;
    const affiliate = /coupang\.|coupa\.ng/.test(href);
    const rel = affiliate ? 'sponsored nofollow noopener' : 'noopener';
    return `<a href="${href}" rel="${rel}" target="_blank">${label}</a>`;
  });

  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');

  return text.replace(/\u0000(\d+)\u0000/g, (_, i) => codes[Number(i)]);
}

function parseTable(lines, start) {
  const header = lines[start];
  const divider = lines[start + 1];
  if (!divider || !/^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(divider)) return null;

  const cells = (row) =>
    row
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((c) => c.trim());

  const aligns = cells(divider).map((c) => {
    if (/^:.*:$/.test(c)) return ' style="text-align:center"';
    if (/:$/.test(c)) return ' style="text-align:right"';
    return '';
  });

  let i = start + 2;
  const body = [];
  while (i < lines.length && lines[i].includes('|') && lines[i].trim()) {
    body.push(cells(lines[i]));
    i++;
  }

  const th = cells(header)
    .map((c, j) => `<th${aligns[j] || ''}>${inline(c)}</th>`)
    .join('');
  const rows = body
    .map(
      (r) =>
        `<tr>${r.map((c, j) => `<td${aligns[j] || ''}>${inline(c)}</td>`).join('')}</tr>`
    )
    .join('\n');

  // 넓은 표는 페이지 전체를 가로 스크롤시키지 않고 자기 안에서만 스크롤해야 합니다.
  return {
    html: `<div class="table-wrap"><table>\n<thead><tr>${th}</tr></thead>\n<tbody>\n${rows}\n</tbody>\n</table></div>`,
    next: i,
  };
}

function render(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    // HTML 주석은 출력에서 제거합니다 (작성용 메모가 페이지에 남지 않도록)
    if (/^\s*<!--/.test(line)) {
      while (i < lines.length && !/-->/.test(lines[i])) i++;
      i++;
      continue;
    }

    // 코드 블록
    if (/^```/.test(line)) {
      const lang = line.slice(3).trim();
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      const cls = lang ? ` class="language-${lang}"` : '';
      out.push(`<pre><code${cls}>${escapeHtml(buf.join('\n'))}</code></pre>`);
      continue;
    }

    // 원본 HTML 블록은 그대로 통과
    if (/^<(div|section|figure|table|iframe|aside|p|img|hr)\b/i.test(line.trim())) {
      const buf = [];
      while (i < lines.length && lines[i].trim()) buf.push(lines[i++]);
      out.push(buf.join('\n'));
      continue;
    }

    // 제목
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const text = heading[2].trim();
      const id = text
        .toLowerCase()
        .replace(/[^\w가-힣\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
      out.push(`<h${level} id="${id}">${inline(text)}</h${level}>`);
      i++;
      continue;
    }

    if (/^(---|\*\*\*)\s*$/.test(line)) {
      out.push('<hr>');
      i++;
      continue;
    }

    // 표
    if (line.includes('|')) {
      const table = parseTable(lines, i);
      if (table) {
        out.push(table.html);
        i = table.next;
        continue;
      }
    }

    // 인용
    if (/^>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      out.push(`<blockquote>${render(buf.join('\n'))}</blockquote>`);
      continue;
    }

    // 목록 (체크박스 포함)
    const listMatch = /^(\s*)([-*]|\d+\.)\s+(.*)$/.exec(line);
    if (listMatch) {
      const ordered = /\d/.test(listMatch[2]);
      const tag = ordered ? 'ol' : 'ul';
      const items = [];
      while (i < lines.length) {
        const m = /^(\s*)([-*]|\d+\.)\s+(.*)$/.exec(lines[i]);
        if (!m) break;
        const content = m[3];
        const task = /^\[([ xX])\]\s+(.*)$/.exec(content);
        if (task) {
          const checked = task[1].toLowerCase() === 'x' ? ' checked' : '';
          items.push(
            `<li class="task"><input type="checkbox" disabled${checked}> ${inline(task[2])}</li>`
          );
        } else {
          items.push(`<li>${inline(content)}</li>`);
        }
        i++;
      }
      out.push(`<${tag}>\n${items.join('\n')}\n</${tag}>`);
      continue;
    }

    // 문단 — 빈 줄까지 이어 붙입니다.
    const buf = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,6}\s|```|>\s?|\s*([-*]|\d+\.)\s|\s*<!--)/.test(lines[i]) &&
      !(lines[i].includes('|') && parseTable(lines, i))
    ) {
      buf.push(lines[i++]);
    }
    if (buf.length) out.push(`<p>${inline(buf.join('\n'))}</p>`);
    else i++;
  }

  return out.join('\n');
}

/**
 * 문서의 첫 이미지에서 lazy 를 떼고 fetchpriority="high" 를 붙입니다.
 *
 * 첫 이미지는 LCP 요소가 되기 쉽습니다. lazy 는 로딩을 일부러 미루는 속성이므로
 * 여기에 붙이면 LCP 를 스스로 늦춥니다 — 흔한 오해라 seo-checklist.md 에 정정해 둔 항목입니다.
 * lazy 는 뷰포트 밖 이미지에만 의미가 있습니다.
 *
 * 최종 HTML 문자열에서 처리하므로 인용문 안에 있는 이미지가 첫 번째여도 잡힙니다.
 */
function promoteFirstImage(html) {
  return html.replace(/<img\b[^>]*>/, (tag) =>
    tag.replace(' loading="lazy"', ' fetchpriority="high"')
  );
}

export function markdownToHtml(md) {
  return promoteFirstImage(render(md));
}

// frontmatter (--- 로 감싼 key: value) 를 떼어냅니다.
export function parseFrontmatter(raw) {
  const text = raw.replace(/^﻿/, '').replace(/\r\n/g, '\n');
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(text);
  if (!m) return { data: {}, body: text };

  const data = {};
  for (const line of m[1].split('\n')) {
    const kv = /^([A-Za-z0-9_]+)\s*:\s*(.*)$/.exec(line);
    if (!kv) continue;
    let value = kv[2].trim();

    if (/^\[.*\]$/.test(value)) {
      value = value
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^(["'])([\s\S]*)\1$/, '$2'))
        .filter(Boolean);
    } else if (value === 'true' || value === 'false') {
      value = value === 'true';
    } else {
      // 값 전체를 감싼 짝지어진 따옴표만 벗깁니다.
      // 앞뒤를 따로 떼면 «"32GB 사세요"는 답이 아닙니다» 같은 값에서
      // 앞 따옴표만 사라져 검색 스니펫에 «32GB 사세요"는» 이 나갑니다.
      value = value.replace(/^(["'])([\s\S]*)\1$/, '$2');
    }
    data[kv[1]] = value;
  }

  return { data, body: text.slice(m[0].length) };
}

export { escapeHtml };

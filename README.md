# 스펙핏 (specfit.kr)

AI·개발 작업용 하드웨어를 **스펙 기준으로 골라주는** 사이트.
GPU, 노트북, 모니터, 메모리를 다룹니다.

- 배포: https://specfit.kr (GitHub Pages)
- 계획·의사결정 기록: [`side-income-plan`](https://github.com/LMJ-01/side-income-plan) 저장소
- **다음에 할 일: [side-income-plan/docs/next-steps.md](https://github.com/LMJ-01/side-income-plan/blob/main/docs/next-steps.md)**

## 시작하기

```bash
npm run build    # 마크다운 → HTML 생성
npm run serve    # 빌드 후 localhost:4173
```

**`npm install` 이 필요 없습니다.** 의존성 0입니다.

`main` 에 푸시하면 GitHub Pages 가 자동 배포합니다. 생성된 HTML 도 커밋합니다.

## 구조

```
src/
  build.js       생성기 — 마크다운을 읽어 HTML·sitemap·검색인덱스 출력
  markdown.js    직접 만든 마크다운 파서 (표·코드·FAQ 지원)
  templates.js   레이아웃 + SEO 메타 + 구조화 데이터
  config.js      사이트 설정 ← 도메인·고지문구·애드센스는 여기만 고치면 됨
  gpu-data.js    계산기 데이터 ← 쿠팡 링크도 여기
  content/
    posts/*.md   글
    pages/*.md   고정 페이지
assets/          style.css, vram.js, search.js
```

루트의 `.html`, `sitemap.xml`, `robots.txt` 는 **생성물**입니다. 직접 고치지 마세요.

## 글 쓰는 법

`src/content/posts/` 에 `.md` 파일을 만듭니다. 파일명이 URL 이 됩니다.

```markdown
---
title: 제목 — 60자 이내 (넘으면 검색결과에서 잘림)
description: 검색 스니펫에 쓰입니다. 160자 이내.
date: 2026-08-14
category: gpu          # gpu / laptop / monitor / memory
tags: [RTX4070, 로컬LLM]
affiliate: false       # 쿠팡 링크를 본문에 넣으면 true
---

본문...

{{VRAM_TOOL}}          ← 이 줄이면 그 자리에 계산기가 들어감

{{COUPANG:rtx4070}}    ← 쿠팡 상품 위젯 (사진 + 실시간 가격)

## 자주 묻는 질문      ← 이 절의 h3 가 FAQPage 구조화 데이터로 자동 변환됨

### 질문은 h3 로
답변은 그 아래 문단으로 씁니다.
```

이미지에 크기를 주려면: `![설명](/img/a.png =800x450)` → `width`/`height` 가 붙어 CLS 를 막습니다.

## 빌드가 자동으로 잡아주는 것

`npm run build` 실행 시 경고로 표시됩니다.

- `description` 누락 / 160자 초과
- 제목 60자 초과
- `category` 누락
- **본문에 쿠팡 링크가 있는데 `affiliate: true` 가 없는 경우** ⚠️

마지막 항목이 중요합니다. 공정위 대가성 고지는 **글 첫 부분**에 있어야 하고,
누락이나 하단 표기는 **수익 전액 몰수 + 계정 경고** 사유입니다.

## 자동으로 처리되는 것들

사람이 기억할 필요가 없게 만들어 둔 것들입니다.

| 항목 | 동작 |
|------|------|
| 공정위 고지 | `affiliate: true` 이거나 **계산기·위젯을 실으면** 본문 맨 위에 자동 삽입 |
| 위젯 CLS | iframe 높이만큼 `min-height` 를 미리 잡아 콘텐츠 밀림 방지 |
| 위젯 오타 | 잘못된 id 는 경고 후 제거 — 페이지에 `{{COUPANG:…}}` 가 노출되지 않음 |
| 제휴 링크 rel | 쿠팡 링크에 `sponsored nofollow noopener` 자동 부착 |
| 구조화 데이터 | Article, BreadcrumbList, FAQPage, SoftwareApplication |
| sitemap.xml | 글 추가 시 자동 갱신 |
| 관련 글 | 같은 카테고리에서 자동 연결 |
| 계산기 JS | **계산기를 쓰는 페이지에만** 로드 (INP 보호) |

## 설정 위치

| 바꾸고 싶은 것 | 파일 |
|---------------|------|
| 도메인, 사이트명, 고지 문구 | `src/config.js` |
| **애드센스 client / slot** | `src/config.js` → `adsense` |
| 네이버 소유확인 태그 | `src/config.js` → `verification` |
| 메뉴, 카테고리 | `src/config.js` |
| **쿠팡 링크**, GPU 스펙 | `src/gpu-data.js` → `buy` |
| 계산기 용도·길이 선택지 | `src/gpu-data.js` → `useCases`, `lengths` |

`adsense` 가 비어 있으면 광고 슬롯이 **아예 렌더링되지 않습니다.**
승인 후 값을 채우면 `min-height` 가 잡힌 슬롯이 들어갑니다.

## 계산기

`gpu-data.js` 의 `new: false` 인 카드는 **추천 대상에서 제외**됩니다.
단종된 카드를 "이걸 사세요"라고 권하는 것은 제휴와 무관하게 나쁜 조언이기 때문입니다.
다만 그 카드를 이미 쓰는 사람도 진단은 받아야 하므로 드롭다운에는 남깁니다.

`buy` 가 빈 카드는 구매 버튼이 뜨지 않습니다. 쿠팡에 신품이 없으면 비워두세요.

## 콘텐츠 원칙

- **스펙으로 판단할 수 있는 것만** 다룹니다.
  키보드·의자처럼 써봐야 아는 제품은 제외합니다
- **직접 써본 것처럼 쓰지 않습니다.** 허위 광고입니다.
  "스펙 기준으로 선별했다"고 밝히는 편이 오히려 신뢰를 얻습니다
- `og:image` 는 **PNG/JPG** 만. WebP 는 카카오톡 크롤러가 못 읽어 공유 카드가 빕니다

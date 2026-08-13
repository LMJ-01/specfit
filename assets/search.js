// 홈 검색. INP 200ms 이하를 지키려고 최소한으로 짭니다.
// 인덱스는 첫 입력 시점에 한 번만 받아옵니다 — 초기 로딩을 늦추지 않기 위해서입니다.

(function () {
  const input = document.querySelector('[data-search]');
  const list = document.querySelector('[data-list]');
  const status = document.querySelector('[data-search-status]');
  if (!input || !list) return;

  const original = list.innerHTML;
  let index = null;
  let loading = null;
  let timer = 0;

  const loadIndex = () => {
    if (index) return Promise.resolve(index);
    if (loading) return loading;
    loading = fetch('/assets/search-index.json')
      .then((r) => r.json())
      .then((data) => {
        index = data;
        return index;
      })
      .catch(() => {
        index = [];
        return index;
      });
    return loading;
  };

  const render = (items, query) => {
    if (!query) {
      list.innerHTML = original;
      status.textContent = '';
      return;
    }
    if (!items.length) {
      list.innerHTML = '';
      status.textContent = `"${query}" 검색 결과가 없습니다.`;
      return;
    }
    status.textContent = `${items.length}개 찾았습니다.`;
    list.innerHTML = items
      .map(
        (p) =>
          `<li class="card"><a href="${p.u}">` +
          `<span class="card-cat">${p.c || ''}</span>` +
          `<span class="card-title">${p.t}</span>` +
          `<span class="card-desc">${p.d}</span></a></li>`
      )
      .join('');
  };

  const run = () => {
    const query = input.value.trim().toLowerCase();
    if (!query) {
      render([], '');
      return;
    }
    loadIndex().then((data) => {
      if (input.value.trim().toLowerCase() !== query) return; // 늦게 온 응답 무시
      const terms = query.split(/\s+/);
      const hits = data.filter((p) => terms.every((t) => p.k.includes(t)));
      render(hits, query);
    });
  };

  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(run, 120);
  });

  // 입력 전에 미리 받아두면 첫 검색이 즉시 반응합니다.
  input.addEventListener('focus', loadIndex, { once: true });
})();

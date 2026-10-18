(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  let secret = '', state = { watches: [], items: [], runs: [], hasMore: false }, offset = 0;
  const date = value => value ? new Date(value).toLocaleString('zh-CN', { timeZone: 'Europe/Paris' }) : '尚未搜索';
  function message(text, error = false) { $('message').textContent = text; $('message').className = error ? 'error' : ''; }
  async function api(body, page = 0) {
    const response = await fetch(`/api/finder${body ? '' : `?offset=${page}`}`, {
      method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${secret}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined
    });
    let data;
    try { data = await response.json(); } catch { throw new Error('搜索后台尚未部署或响应异常。'); }
    if (!response.ok) throw new Error(data.error || '请求失败，请重试。');
    return data;
  }
  function el(tag, text, className) { const node = document.createElement(tag); if (text != null) node.textContent = text; if (className) node.className = className; return node; }
  async function busy(button, fn) {
    button.disabled = true;
    try { await fn(); } catch (error) { message(error.message || '网络连接失败，请重试。', true); }
    finally { button.disabled = false; }
  }
  function action(text, fn) { const b = el('button', text, 'text-button'); b.type = 'button'; b.addEventListener('click', () => busy(b, fn)); return b; }
  function render() {
    $('watch-count').textContent = `${state.watches.length} / 10`;
    $('watches').replaceChildren();
    for (const watch of state.watches) {
      const row = el('div', null, 'watch-row');
      row.append(el('strong', watch.name), el('p', watch.query, 'hint'), el('small', `${watch.enabled ? '监控中' : '已暂停'} · ${watch.max_price == null ? '不限价格' : `≤ €${watch.max_price}`} · ${date(watch.last_checked_at)}`));
      if (watch.last_error) row.append(el('p', watch.last_error, 'hint'));
      const controls = el('div', null, 'finder-actions');
      controls.append(action(watch.enabled ? '暂停' : '恢复', async () => { await api({ action: 'toggle', id: watch.id, enabled: !watch.enabled }); await refresh(); }),
        action('删除', async () => { if (!confirm(`删除“${watch.name}”及其搜集记录？`)) return; await api({ action: 'delete', id: watch.id }); await refresh(); }));
      row.append(controls); $('watches').append(row);
    }
    const run = state.runs[0];
    const labels = { success: '搜索完成', partial: '部分完成，请查看条件下方提示', failed: '搜索失败', running: '搜索中（长时间未结束可能已超时）' };
    $('run-status').textContent = run ? `${labels[run.status] || run.status} · ${date(run.started_at)}（巴黎时间）${run.summary?.error ? ` · ${run.summary.error}` : ''}` : '尚未运行，点击“立即搜索并保存”开始';
    renderItems();
  }
  function renderItems() {
    $('results').replaceChildren();
    const filter = $('filter').value;
    const items = state.items.filter(item => !item.dismissed_snapshot && (filter === 'all' || (filter === 'new' ? !item.seen : item.match === filter)));
    if (!items.length) $('results').append(el('p', state.items.length ? '已加载记录中没有此类商品，可切换筛选或加载更多。' : '还没有搜集记录。添加关注并运行搜索后，结果会保存在这里。', 'empty'));
    for (const item of items) {
      const row = el('article', null, 'result-card'), meta = el('div', null, 'result-meta');
      meta.append(el('span', ({ match: '条件符合', review: '待确认', excluded: '已排除' })[item.match], `badge ${item.match}`));
      if (!item.seen) meta.append(el('span', item.reopened_at ? '商品已更新' : '新发现', 'badge new'));
      meta.append(el('span', state.watches.find(w => w.id === item.watch_id)?.name || '', 'hint'));
      const heading = el('h3');
      let safe = false;
      try { const url = new URL(item.url); safe = url.protocol === 'https:' && /(^|\.)ebay\.(fr|com|de|co\.uk|it|es)$/.test(url.hostname); } catch {}
      if (safe) { const link = el('a', item.title); link.href = item.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; heading.append(link); } else heading.textContent = item.title;
      const bottom = el('div', null, 'result-meta');
      bottom.append(el('span', item.price == null ? '价格待确认' : `${item.currency || ''} ${Number(item.price).toFixed(2)}`, 'result-price'));
      if ((item.buying_options || []).includes('AUCTION')) bottom.append(el('span', '含拍卖选项', 'hint'));
      if (!item.seen) bottom.append(action('标为已读', async () => { await api({ action: 'seen', id: item.id }); item.seen = true; renderItems(); }));
      const dismissButton = action('不符合要求', async () => {
        const snapshot = { title: item.title, price: item.price, currency: item.currency, buying_options: [...(item.buying_options || [])].sort() };
        await api({ action: 'dismiss', id: item.id, snapshot });
        item.dismissed_snapshot = snapshot;
        renderItems();
        message('已隐藏。重复搜索不会再显示；标题、价格、币种或购买方式变化后，会重新显示为“商品已更新”。');
      });
      dismissButton.disabled = !state.dismissEnabled;
      if (!state.dismissEnabled) dismissButton.title = '请先执行隐藏功能的数据库更新脚本';
      bottom.append(dismissButton);
      row.append(meta, heading, el('p', item.reason, 'hint'), bottom, el('p', `首次发现 ${date(item.first_seen_at)} · 最近看到 ${date(item.last_seen_at)}`, 'hint'));
      $('results').append(row);
    }
    $('more').hidden = !state.hasMore;
  }
  async function refresh() { state = await api(); offset = 0; render(); }
  $('login-form').addEventListener('submit', event => {
    event.preventDefault(); busy(event.submitter, async () => {
      secret = $('password').value; await refresh(); $('password').value = '';
      $('login-form').hidden = true; $('workspace').hidden = false; message('已连接数据库。搜索结果会保存，关闭网页不影响已配置的定时任务。');
    });
  });
  $('logout').addEventListener('click', () => { secret = ''; state = { watches: [], items: [], runs: [] }; $('watches').replaceChildren(); $('results').replaceChildren(); $('workspace').hidden = true; $('login-form').hidden = false; message('已退出。'); });
  $('refresh').addEventListener('click', () => busy($('refresh'), async () => { await refresh(); message('记录已刷新。'); }));
  $('run').addEventListener('click', () => busy($('run'), async () => {
    message('正在搜索 eBay 并保存，请稍候…');
    const result = await api({ action: 'run' }); await refresh();
    message(`搜索完成：取得 ${result.found} 条结果，新增 ${result.saved} 条记录。${result.errors.join('；')}`, result.errors.length > 0);
  }));
  $('watch-form').addEventListener('submit', event => {
    event.preventDefault(); busy(event.submitter, async () => { await api({ action: 'add', ...Object.fromEntries(new FormData(event.target)) }); event.target.reset(); await refresh(); message('关注已保存，将在下次搜索时生效。'); });
  });
  $('filter').addEventListener('change', renderItems);
  $('more').addEventListener('click', () => busy($('more'), async () => {
    const next = await api(null, offset + 100); offset += 100;
    const known = new Set(state.items.map(item => item.id)); state.items.push(...next.items.filter(item => !known.has(item.id)));
    state.hasMore = next.hasMore; renderItems();
  }));
})();

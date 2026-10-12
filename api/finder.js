const { AppError, handler, requireAdmin, db, validateWatch, runSearch } = require('../lib/finder.cjs');

module.exports = handler(async (req, res) => {
  requireAdmin(req);
  if (req.method === 'GET') {
    const offset = Math.max(0, Math.min(100000, Number.parseInt(req.query.offset, 10) || 0));
    const [watches, items, runs] = await Promise.all([
      db('finder_watches?order=created_at.asc'),
      db(`finder_items?match=neq.excluded&order=first_seen_at.desc,id.desc&limit=100&offset=${offset}`),
      db('finder_runs?order=started_at.desc&limit=5')
    ]);
    return res.status(200).json({ watches, items, runs, offset, hasMore: items.length === 100 });
  }
  if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); throw new AppError(405, '不支持此请求方式。'); }
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  if (body.action === 'run') return res.status(200).json(await runSearch());
  if (body.action === 'add') {
    const watch = validateWatch(body);
    const result = await db('rpc/finder_add_watch', { method: 'POST', body: { entry: watch } });
    if (!result) throw new AppError(400, '最多支持 10 个关注条件，请先删除不用的条件。');
    return res.status(201).json({ ok: true });
  }
  if (!/^[0-9a-f-]{36}$/i.test(body.id || '')) throw new AppError(400, '记录编号无效。');
  if (body.action === 'toggle') {
    if (typeof body.enabled !== 'boolean') throw new AppError(400, '状态无效。');
    await db(`finder_watches?id=eq.${body.id}`, { method: 'PATCH', body: { enabled: body.enabled } });
  } else if (body.action === 'delete') {
    await db(`finder_watches?id=eq.${body.id}`, { method: 'DELETE' });
  } else if (body.action === 'seen') {
    await db(`finder_items?id=eq.${body.id}`, { method: 'PATCH', body: { seen: true } });
  } else throw new AppError(400, '操作无效。');
  res.status(200).json({ ok: true });
});

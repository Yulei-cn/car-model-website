const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { PGlite } = require('@electric-sql/pglite');
const { classify, validateWatch, secretMatches } = require('../lib/finder.cjs');

test('matching strictly filters uncertain colors, wrong scale, empty boxes and budget', () => {
  const watch = { color: 'blue', max_price: 100 };
  assert.equal(classify('Norev Citroën DS5 BLEUE 1/18', watch, { value: '89', currency: 'EUR' }).match, 'match');
  assert.equal(classify('Norev DS5 1:18', watch, { value: '89', currency: 'EUR' }).match, 'excluded');
  assert.equal(classify('Norev DS5 blue 1/43', watch).match, 'excluded');
  assert.equal(classify('Norev DS5 blue 1/18 BOITE VIDE', watch).match, 'excluded');
  assert.equal(classify('Norev DS5 blue 1/18', watch, { value: '101', currency: 'EUR' }).match, 'excluded');
  assert.equal(classify('Norev DS5 blue 1/18', watch, { value: '89', currency: 'USD' }).match, 'review');
});
test('wrong, missing or multiple colors are excluded', () => {
  const white = { color: 'white' };
  const result = classify('NOREV 1/18 PEUGEOT 207 CC BLEUE', white);
  assert.equal(result.match, 'excluded');
  assert.match(result.reason, /蓝色.*白色/);
  assert.equal(classify('Norev 1/18 Peugeot 207 CC BLANCHE', white).match, 'match');
  assert.equal(classify('Norev 1/18 Peugeot 207 CC', white).match, 'excluded');
  assert.equal(classify('Norev 1/18 Peugeot 207 CC bleu blanc', white).match, 'excluded');
  assert.equal(classify('Norev 1/18 Citroen C6 argenté', { color: 'blue' }).match, 'excluded');
  assert.equal(classify('Norev 1/18 Citroen DS5 BLEUE', { color: '' }).match, 'match');
});
test('Roland Garros defect listing is excluded; clean condition wording is preserved', () => {
  const title = 'NOREV 1/18 PEUGEOT 207 CC ROLAND GARROS - WITH DEFECT READ DESCRIPTION';
  assert.equal(classify(title, { color: 'white' }).match, 'excluded');
  assert.equal(classify(title, { color: '' }).match, 'excluded');
  for (const defect of ['WITH DEFECT', 'avec défaut', 'abîmée', 'broken', 'pour pièces']) {
    assert.equal(classify(`Norev 1/18 blanc ${defect}`, { color: 'white' }).match, 'excluded');
  }
  for (const clean of ['NO DEFECTS', 'sans défaut', 'undamaged']) {
    assert.equal(classify(`Norev 1/18 blanc ${clean}`, { color: 'white' }).match, 'match');
  }
});
test('validation and authentication reject invalid input and empty secrets', () => {
  assert.throws(() => validateWatch({ name: 'car', query: 'car', max_price: -1 }));
  assert.throws(() => validateWatch({ name: 'car', query: 'car', color: 'invalid' }));
  assert.equal(validateWatch({ name: 'car', query: 'car', max_price: '' }).max_price, null);
  assert.equal(secretMatches('', ''), false);
  assert.equal(secretMatches('correct', 'incorrect'), false);
  assert.equal(secretMatches('correct', 'correct'), true);
});
test('API blocks unauthenticated access without touching the database', async () => {
  const route = require('../api/finder.js');
  const previous = process.env.FINDER_ADMIN_SECRET;
  process.env.FINDER_ADMIN_SECRET = 'test-only';
  const response = { setHeader() {}, status(code) { this.code = code; return this; }, json(value) { this.value = value; } };
  await route({ method: 'GET', headers: {}, query: {} }, response);
  assert.equal(response.code, 401);
  if (previous === undefined) delete process.env.FINDER_ADMIN_SECRET; else process.env.FINDER_ADMIN_SECRET = previous;
});
test('search restricts France and persists only local non-excluded items', async () => {
  const originalFetch = global.fetch;
  const keys = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'EBAY_CLIENT_ID', 'EBAY_CLIENT_SECRET'];
  const previous = keys.map(key => process.env[key]);
  keys.forEach(key => { process.env[key] = key === 'SUPABASE_URL' ? 'https://test.invalid' : 'test'; });
  let stored;
  global.fetch = async (url, options = {}) => {
    let result = null;
    if (url.includes('finder_claim_run')) result = 'test-run';
    else if (url.includes('finder_watches?enabled')) result = [{ id: 'test-watch', query: 'Norev', color: 'white' }];
    else if (url.includes('oauth2/token')) result = { access_token: 'test-token', expires_in: 7200 };
    else if (url.includes('item_summary/search')) {
      assert.match(new URL(url).searchParams.get('filter'), /itemLocationCountry:FR/);
      result = { itemSummaries: [
        { itemId: 'fr-white', title: 'Norev 1/18 blanc', itemLocation: { country: 'FR' } },
        { itemId: 'fr-blue', title: 'Norev 1/18 bleu', itemLocation: { country: 'FR' } },
        { itemId: 'it-white', title: 'Norev 1/18 blanc', itemLocation: { country: 'IT' } },
        { itemId: 'unknown', title: 'Norev 1/18 blanc' }
      ] };
    } else if (url.includes('finder_save_results')) { stored = JSON.parse(options.body).records; result = stored.length; }
    return new Response(JSON.stringify(result), { status: 200 });
  };
  try {
    const result = await require('../lib/finder.cjs').runSearch();
    assert.equal(result.saved, 1);
    assert.deepEqual(stored.map(item => item.item_id), ['fr-white']);
  } finally {
    global.fetch = originalFetch;
    keys.forEach((key, i) => { if (previous[i] === undefined) delete process.env[key]; else process.env[key] = previous[i]; });
  }
});
test('Postgres schema: idempotent seed, dedupe, preserve read status, lock and access isolation', async () => {
  const db = new PGlite();
  try {
    await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
    const schema = fs.readFileSync('docs/finder-schema.sql', 'utf8');
    await db.exec(schema); await db.exec(schema);
    assert.equal((await db.query('select count(*)::int as count from finder_watches')).rows[0].count, 3);
    const item = { watch_id: 'de005000-0000-4000-8000-000000000003', item_id: 'test-1', title: 'Norev DS5 1/18',
      url: 'https://www.ebay.fr/itm/1', price: 89, currency: 'EUR', buying_options: ['FIXED_PRICE'], match: 'match', reason: 'test', last_seen_at: new Date().toISOString() };
    await db.exec('set role service_role');
    const save = () => db.query('select finder_save_results($1::jsonb) as added', [JSON.stringify([item])]);
    assert.equal((await save()).rows[0].added, 1);
    const before = (await db.query('select first_seen_at from finder_items')).rows[0].first_seen_at;
    await db.exec('update finder_items set seen = true');
    item.price = 75;
    assert.equal((await save()).rows[0].added, 0);
    const row = (await db.query('select * from finder_items')).rows[0];
    assert.equal(Number(row.price), 75); assert.equal(row.seen, true); assert.deepEqual(row.first_seen_at, before);
    const snapshot = () => JSON.stringify({title:item.title,price:item.price,currency:item.currency,buying_options:item.buying_options});
    assert.equal((await db.query('select finder_dismiss_item($1, $2::jsonb) as ok', [row.id, snapshot()])).rows[0].ok, true);
    item.last_seen_at = '2026-10-20T10:00:00Z';
    item.url = 'https://www.ebay.fr/itm/1?tracking=changed';
    await save();
    let current = (await db.query('select * from finder_items')).rows[0];
    assert.ok(current.dismissed_snapshot); assert.equal(current.reopened_at, null);
    assert.equal((await db.query('select count(*)::int as count from finder_items where dismissed_snapshot is null')).rows[0].count, 0);
    item.price = 70;
    await save();
    current = (await db.query('select * from finder_items')).rows[0];
    assert.equal(current.dismissed_snapshot, null); assert.equal(current.seen, false); assert.ok(current.reopened_at);
    assert.deepEqual(current.first_seen_at, before);
    const oldSnapshot = snapshot();
    assert.equal((await db.query('select finder_dismiss_item($1, $2::jsonb) as ok', [row.id, oldSnapshot])).rows[0].ok, true);
    item.title += ' updated'; await save();
    assert.equal((await db.query('select dismissed_snapshot from finder_items')).rows[0].dismissed_snapshot, null);
    assert.equal((await db.query('select finder_dismiss_item($1, $2::jsonb) as ok', [row.id, oldSnapshot])).rows[0].ok, false);
    assert.ok((await db.query('select finder_claim_run() as id')).rows[0].id);
    assert.equal((await db.query('select finder_claim_run() as id')).rows[0].id, null);
    await db.exec("update finder_runs set status = 'success', finished_at = now() where status = 'running'");
    assert.ok((await db.query('select finder_claim_run() as id')).rows[0].id, 'completed run allows immediate retry');
    await db.exec("update finder_runs set started_at = now() - interval '6 minutes' where status = 'running'");
    assert.ok((await db.query('select finder_claim_run() as id')).rows[0].id, 'stale run permits recovery');
    assert.equal((await db.query("select count(*)::int as count from finder_runs where status = 'running'")).rows[0].count, 1);
    for (let i = 0; i < 7; i++) assert.ok((await db.query('select finder_add_watch($1::jsonb) as id', [JSON.stringify({ name: `test${i}`, query: 'Norev' })])).rows[0].id);
    assert.equal((await db.query('select finder_add_watch($1::jsonb) as id', ['{"name":"overflow","query":"Norev"}'])).rows[0].id, null);
    await db.exec('reset role; set role anon;');
    await assert.rejects(db.query('select * from finder_items'), /permission denied/);
    await assert.rejects(db.query('select finder_claim_run()'), /permission denied/);
    await assert.rejects(db.query('select finder_dismiss_item($1, $2::jsonb)', [row.id, snapshot()]), /permission denied/);
  } finally { await db.close(); }
});

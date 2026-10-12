const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { PGlite } = require('@electric-sql/pglite');
const { classify, validateWatch, secretMatches } = require('../lib/finder.cjs');

test('matching preserves uncertain colors and filters wrong scale, empty boxes and budget', () => {
  const watch = { color: 'blue', max_price: 100 };
  assert.equal(classify('Norev Citroën DS5 BLEUE 1/18', watch, { value: '89', currency: 'EUR' }).match, 'match');
  assert.equal(classify('Norev DS5 1:18', watch, { value: '89', currency: 'EUR' }).match, 'review');
  assert.equal(classify('Norev DS5 blue 1/43', watch).match, 'excluded');
  assert.equal(classify('Norev DS5 blue 1/18 BOITE VIDE', watch).match, 'excluded');
  assert.equal(classify('Norev DS5 blue 1/18', watch, { value: '101', currency: 'EUR' }).match, 'excluded');
  assert.equal(classify('Norev DS5 blue 1/18', watch, { value: '89', currency: 'USD' }).match, 'review');
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
    assert.ok((await db.query('select finder_claim_run() as id')).rows[0].id);
    assert.equal((await db.query('select finder_claim_run() as id')).rows[0].id, null);
    for (let i = 0; i < 7; i++) assert.ok((await db.query('select finder_add_watch($1::jsonb) as id', [JSON.stringify({ name: `test${i}`, query: 'Norev' })])).rows[0].id);
    assert.equal((await db.query('select finder_add_watch($1::jsonb) as id', ['{"name":"overflow","query":"Norev"}'])).rows[0].id, null);
    await db.exec('reset role; set role anon;');
    await assert.rejects(db.query('select * from finder_items'), /permission denied/);
    await assert.rejects(db.query('select finder_claim_run()'), /permission denied/);
  } finally { await db.close(); }
});

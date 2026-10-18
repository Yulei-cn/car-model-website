const { timingSafeEqual } = require('node:crypto');

class AppError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
function secretMatches(a, b) {
  if (!a || !b) return false;
  const aa = Buffer.from(a), bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}
function requireAdmin(req) {
  if (!process.env.FINDER_ADMIN_SECRET) throw new AppError(503, '尚未配置管理密码。');
  if (!secretMatches(req.headers.authorization, `Bearer ${process.env.FINDER_ADMIN_SECRET}`)) {
    throw new AppError(401, '管理密码不正确。');
  }
}
function requireCron(req) {
  if (!process.env.CRON_SECRET || !secretMatches(req.headers.authorization, `Bearer ${process.env.CRON_SECRET}`)) {
    throw new AppError(401, '定时任务认证失败。');
  }
}
function env(name) {
  if (!process.env[name]) throw new AppError(503, `尚未配置 ${name}。`);
  return process.env[name];
}
async function db(path, { method = 'GET', body, prefer } = {}) {
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  const response = await fetch(`${env('SUPABASE_URL').replace(/\/$/, '')}/rest/v1/${path}`, {
    method,
    headers: { apikey: key, ...(key.startsWith('sb_secret_') ? {} : { Authorization: `Bearer ${key}` }),
      'Content-Type': 'application/json', ...(prefer ? { Prefer: prefer } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new AppError(503, `数据库请求失败（${response.status}），请确认连接配置和建表脚本。`);
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}
function normalize(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}
function validateWatch(body) {
  const name = String(body.name || '').trim(), query = String(body.query || '').trim();
  const color = String(body.color || '').trim();
  const max = body.max_price === '' || body.max_price == null ? null : Number(body.max_price);
  if (!name || name.length > 100 || !query || query.length > 120) throw new AppError(400, '请填写名称和搜索词（最多 100 / 120 字符）。');
  if (!['', 'white', 'blue'].includes(color)) throw new AppError(400, '颜色选项无效。');
  if (max !== null && (!Number.isFinite(max) || max <= 0 || max > 100000)) throw new AppError(400, '最高价格必须为有效正数。');
  return { name, query, color, max_price: max };
}
function classify(title, watch, price) {
  const t = normalize(title);
  if (/\b1\s*[:/]\s*(43|24|64|87)\b/.test(t)) return { match: 'excluded', reason: '标题比例不符' };
  if (/\b(empty box|box only|boite vide|recherche|wanted)\b/.test(t)) return { match: 'excluded', reason: '空盒或求购' };
  const conditionText = t.replace(/\b(no defects?|without defects?|sans defauts?|not damaged|undamaged)\b/g, '');
  if (/\b(with defects?|defective|damaged|broken|for parts|spares or repair|avec defauts?|abimee?|cassee?|endommagee?|pour pieces)\b/.test(conditionText)) {
    return { match: 'excluded', reason: '标题明确标注瑕疵、损坏或零件用途' };
  }
  if (watch.max_price != null && price && price.currency === 'EUR' && Number(price.value) > Number(watch.max_price)) {
    return { match: 'excluded', reason: '超过商品价格上限（不含运费）' };
  }
  const colors = {
    white: { label: '白色', pattern: /\b(white|blanc|blanche|weiss|weiß)\b/ },
    blue: { label: '蓝色', pattern: /\b(blue|bleu|bleue|blau)\b/ },
    red: { label: '红色', pattern: /\b(red|rouge|rot)\b/ },
    black: { label: '黑色', pattern: /\b(black|noir|noire|schwarz)\b/ },
    silver: { label: '银色', pattern: /\b(silver|argent|argente|argentee|silber)\b/ },
    grey: { label: '灰色', pattern: /\b(grey|gray|gris|grise|grau)\b/ },
    green: { label: '绿色', pattern: /\b(green|vert|verte|grun)\b/ },
    yellow: { label: '黄色', pattern: /\b(yellow|jaune|gelb)\b/ },
    gold: { label: '金色', pattern: /\b(gold|golden|dore|doree)\b/ }
  };
  if (watch.color) {
    const detected = Object.keys(colors).filter(color => colors[color].pattern.test(t));
    if (detected.length === 1 && detected[0] !== watch.color) {
      return { match: 'excluded', reason: `颜色不符：标题为${colors[detected[0]].label}，目标为${colors[watch.color].label}` };
    }
    if (detected.length > 1) return { match: 'excluded', reason: '标题包含多种颜色，未明确匹配目标颜色' };
    if (!detected.length) return { match: 'excluded', reason: '标题未明确匹配目标颜色' };
  }
  if (watch.max_price != null && (!price || price.currency !== 'EUR')) return { match: 'review', reason: '需要核实价格或币种' };
  if (!/\bnorev\b/.test(t) || !/\b1\s*[:/]\s*18\b/.test(t)) return { match: 'review', reason: '品牌或比例需要确认' };
  return { match: 'match', reason: '关键词条件符合，购买前请核实详情' };
}
let tokenCache;
async function ebayToken() {
  if (tokenCache && tokenCache.until > Date.now()) return tokenCache.value;
  const response = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${env('EBAY_CLIENT_ID')}:${env('EBAY_CLIENT_SECRET')}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', scope: 'https://api.ebay.com/oauth/api_scope' }),
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new AppError(502, `eBay 认证失败（${response.status}），请检查正式环境密钥。`);
  const result = await response.json();
  tokenCache = { value: result.access_token, until: Date.now() + (result.expires_in - 60) * 1000 };
  return tokenCache.value;
}
async function searchEbay(watch, token, deadline) {
  const items = new Map();
  let truncated = false;
  // Bound each watch to three pages so scheduled runs cannot grow without limit.
  for (let offset = 0; offset < 600; offset += 200) {
    if (Date.now() >= deadline) throw new AppError(504, '本次搜索时间预算已用完，下次任务会重试。');
    const params = new URLSearchParams({ q: watch.query, limit: '200', offset: String(offset), sort: 'newlyListed',
      filter: 'buyingOptions:{FIXED_PRICE|AUCTION},itemLocationCountry:FR' });
    const response = await fetch(`https://api.ebay.com/buy/browse/v1/item_summary/search?${params}`, {
      headers: { Authorization: `Bearer ${token}`, 'X-EBAY-C-MARKETPLACE-ID': 'EBAY_FR' }, signal: AbortSignal.timeout(Math.max(1, Math.min(10000, deadline - Date.now())))
    });
    if (!response.ok) throw new AppError(502, `eBay 搜索失败（${response.status}）。`);
    const result = await response.json();
    for (const item of result.itemSummaries || []) items.set(item.itemId, item);
    if (!result.next) break;
    if (offset === 400) truncated = true;
  }
  return { items: [...items.values()], truncated };
}
async function runSearch() {
  const deadline = Date.now() + 40000;
  const lock = await db('rpc/finder_claim_run', { method: 'POST', body: {} });
  if (!lock) throw new AppError(409, '已有搜索正在运行，或距离上次开始不足 5 分钟。');
  let found = 0, saved = 0;
  const errors = [];
  try {
    const watches = await db('finder_watches?enabled=eq.true&order=last_checked_at.asc.nullsfirst,created_at.asc&limit=10');
    const token = watches.length ? await ebayToken() : null;
    for (const watch of watches) {
      if (Date.now() >= deadline) { errors.push('达到本次运行时间上限，剩余条件将在下次任务优先搜索。'); break; }
      try {
        const result = await searchEbay(watch, token, deadline);
        found += result.items.length;
        const now = new Date().toISOString();
        const rejected = [];
        const rows = result.items.flatMap(item => {
          const price = item.price || item.currentBidPrice;
          const classification = classify(item.title, watch, price);
          if (item.itemLocation?.country !== 'FR' || classification.match === 'excluded') {
            rejected.push(item.itemId);
            return [];
          }
          return [{ watch_id: watch.id, item_id: item.itemId, title: item.title,
            url: item.itemWebUrl, price: price ? Number(price.value) : null, currency: price?.currency || null,
            buying_options: item.buyingOptions || [], listed_at: item.itemCreationDate || null,
            last_seen_at: now, ...classification }];
        });
        for (let offset = 0; offset < rejected.length; offset += 50) {
          const ids = rejected.slice(offset, offset + 50).map(id => `"${id}"`).join(',');
          await db(`finder_items?watch_id=eq.${watch.id}&item_id=in.(${encodeURIComponent(ids)})`, { method: 'DELETE' });
        }
        await db(`finder_items?watch_id=eq.${watch.id}&match=eq.excluded`, { method: 'DELETE' });
        if (rows.length) {
          // RPC updates current fields while preserving first_seen_at and seen.
          saved += await db('rpc/finder_save_results', { method: 'POST', body: { records: rows } });
        }
        const warning = result.truncated ? '结果超过 600 条，只保存最新 600 条，请缩小搜索范围。' : null;
        if (warning) errors.push(`${watch.name}：${warning}`);
        await db(`finder_watches?id=eq.${watch.id}`, { method: 'PATCH', body: { last_checked_at: now, last_error: warning } });
      } catch (error) {
        const message = error instanceof AppError ? error.message : '网络请求超时或失败，请重试。';
        errors.push(`${watch.name}：${message}`);
        await db(`finder_watches?id=eq.${watch.id}`, { method: 'PATCH', body: { last_error: message } });
      }
    }
    const summary = { found, saved, errors };
    await db(`finder_runs?id=eq.${lock}`, { method: 'PATCH', body: { finished_at: new Date().toISOString(), status: errors.length ? 'partial' : 'success', summary } });
    return summary;
  } catch (error) {
    await db(`finder_runs?id=eq.${lock}`, { method: 'PATCH', body: { finished_at: new Date().toISOString(), status: 'failed', summary: { error: error instanceof AppError ? error.message : '搜索失败' } } }).catch(() => {});
    throw error;
  }
}
function handler(fn) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try { await fn(req, res); }
    catch (error) { res.status(error instanceof AppError ? error.status : 500).json({ error: error instanceof AppError ? error.message : '服务暂时不可用，请稍后重试。' }); }
  };
}
module.exports = { AppError, handler, requireAdmin, requireCron, db, validateWatch, classify, runSearch, secretMatches };

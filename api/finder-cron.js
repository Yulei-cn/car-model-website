const { AppError, handler, requireCron, runSearch } = require('../lib/finder.cjs');
module.exports = handler(async (req, res) => {
  requireCron(req);
  if (req.method !== 'GET') throw new AppError(405, '只支持 GET。');
  res.status(200).json(await runSearch());
});

# 车模搜索器部署

目标网站：https://car-model-website-smoky.vercel.app/finder.html

使用现有 Supabase 项目 `cayrysvmkzgwcjrbclwj`，无需新建数据库。

## 1. 建表

在 https://supabase.com/dashboard/project/cayrysvmkzgwcjrbclwj/sql/new 的 SQL Editor 执行本目录的 `finder-schema.sql`。
脚本仅新增 `finder_watches`、`finder_items`、`finder_runs` 及专用函数，开启 RLS，拒绝匿名和普通登录角色访问。
预置三款车。重复执行不会重置关注条件或已读记录。

## 2. Vercel 环境变量

在该网站项目的 Settings → Environment Variables 中，为 Production 添加以下变量，然后重新部署：

| 名称 | 值 |
| --- | --- |
| SUPABASE_URL | https://cayrysvmkzgwcjrbclwj.supabase.co |
| SUPABASE_SERVICE_ROLE_KEY | 项目 API Keys 中的 legacy service_role 密钥，仅后端使用 |
| EBAY_CLIENT_ID | 已激活的 Production Client ID |
| EBAY_CLIENT_SECRET | Production Client Secret；建议使用重置后的值 |
| FINDER_ADMIN_SECRET | 自己生成的随机管理密码，至少 32 个字符 |
| CRON_SECRET | 另一个独立的随机字符串，至少 32 个字符 |

不要将任何密钥写入 HTML、Git 仓库或聊天。`.env.example` 只有空模板。
service_role 可访问项目数据，必须仅在可信后端保存。网站 API 先验证管理密码或 Cron 密钥，再访问数据库。

## 3. 首次验证

已有数据库升级“不符合要求”隐藏功能时，在 SQL Editor 执行 `finder-dismiss-migration.sql`。不删除已有记录；新建项目的完整建表脚本已包含此更新。未执行更新时按钮禁用，原有搜索仍可使用。
隐藏按关注条件和商品编号分别保存，并记录标题、价格、币种和购买方式快照。重复抓取不恢复；这些字段变化后才恢复为未读“商品已更新”。最近看到时间、链接追踪参数和内部分类变化不触发恢复，暂不检测图片或描述变化。

打开 `/finder.html`，输入管理密码，确认三条关注条件出现。点击“立即搜索并保存”。
五分钟后再次运行：同一关注条件下同一 item ID 不会新增重复记录，价格和最近看到时间会更新，首次发现和已读状态保留。
首次搜索建立在售基线，显示“新发现”并不代表商品刚发布。
查看 Supabase 表和 Vercel Functions 日志确认运行结果，不要在日志中输出密钥。

## 4. 定时搜索

仓库默认 Vercel Cron 每天 06:00 UTC 调用 `/api/finder-cron`，免费 Hobby 计划只能每日一次且可能在该小时内延迟执行。
Vercel 自动携带 `Authorization: Bearer <CRON_SECRET>`。只有生产部署运行定时任务。

需要每 5 分钟搜索时，使用已有 Supabase 的 Cron：

1. 在 Supabase 启用 Cron / pg_cron 和 pg_net。
2. 在 Vault 新建名为 `car_finder_cron_secret` 的 secret，值与 Vercel 的 CRON_SECRET 相同。
3. 执行 `finder-schedule.sql`。该脚本调用当前 Vercel 网站，只读取专用 Cron 密钥，不传输数据库密钥。
4. 查看 Cron 运行记录和 `net._http_response`：HTTP 应返回 200；409 表示另一任务刚刚启动，属于防重入保护。
5. 要暂停，在 Supabase Cron 页面禁用 `car-model-finder-every-5-minutes`。

每次搜索最多 10 个条件，每条件最多 600 条结果，超过时显示截断提示。频率应结合 eBay API 配额调整。
后台防止五分钟内重复启动，但云端定时器不保证严格准点。页面不会自动发送邮件或 Telegram。

## 范围和限制

- eBay 法国站，关键词搜索，包含固定价格和拍卖；强制商品所在地为法国，并复核返回的 country=FR。商品所在地不代表卖家账号注册国家。不符合条件的结果不保存，已有排除记录会删除。
- 指定颜色必须在标题中明确匹配，颜色缺失、多色或明确瑕疵的商品直接过滤。此严格模式可能漏掉标题不完整的商品；没有图片识别或 leboncoin 抓取。
- 历史记录是观察记录，不代表商品仍在售；不会自动判定下架。价格不含运费。
- 目前不保存卖家个人资料。应按 eBay 数据使用要求制定保留 / 删除政策，再扩大服务范围。
- API 与数据库故障会显示错误，单个条件失败保留已有数据；失败不会记作搜索成功。
- 管理密码仅保留在页面内存；API 无公开数据入口。建议在 Vercel Firewall 对 `/api/finder` 添加适合个人使用的请求限流。

参考：https://vercel.com/docs/cron-jobs/usage-and-pricing 、https://supabase.com/docs/guides/cron

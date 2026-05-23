# 安全与防护说明

这个项目当前是纯静态网站，没有登录、数据库写入、支付回调或后台管理入口，所以主要风险不是数据库泄露，而是流量滥用、资源盗链、浏览器侧注入和误部署私密文件。

## 已加入的仓库级防护

- `vercel.json` 设置安全响应头：
  - `Content-Security-Policy`：只允许加载本站脚本、样式、图片和数据，禁止第三方脚本注入。
  - `X-Frame-Options: DENY` 和 `frame-ancestors 'none'`：禁止别人把网站嵌到 iframe 里。
  - `X-Content-Type-Options: nosniff`：降低浏览器错误解析文件类型的风险。
  - `Permissions-Policy`：关闭摄像头、麦克风、定位、支付、蓝牙等权限。
  - `Referrer-Policy`：减少外跳时泄露完整页面路径。
- `.vercelignore` 排除本地打印和素材文件：
  - `明信片/**`
  - `海报A4/**`
  - `海报A6/**`
  - `AI生成关键词.txt`
  - `docs/**`
  - `ai/**`
- 首页使用 `assets/thumbs` 缩略图，用户点开图库时才加载原图，降低出站流量。
- `assets` 使用长期缓存，`data/catalog.json` 使用短缓存，兼顾速度和库存更新。

## Vercel 控制台建议

这些需要在 Vercel 后台手动设置，仓库代码不能完全代替：

1. 打开项目的 Spend Management / Usage Alerts，设置接近免费额度时邮件提醒。
2. 如果看到异常流量，先临时关闭部署或开启 Vercel 防护规则。
3. 如果未来绑定自定义域名，优先使用 Cloudflare 托管 DNS，可以再加一层免费 WAF 和 Bot Fight Mode。
4. 如果某个图片被外站大量盗链，优先更换图片路径并重新部署；必要时把高清原图移到需要签名链接的存储服务。

## 当前不做的事情

- 不在公开网页放微信二维码和收款码。
- 不保存客户资料。
- 不提供公开表单。
- 不在前端放 Supabase service role key 或任何密钥。

## 后续如果接 Supabase

如果未来做库存后台、询价表单或客户备注，需要单独增加：

- Row Level Security。
- 只使用匿名公钥，绝不把 service role key 放到前端。
- 表单限流或验证码。
- 后台管理入口鉴权。
- 数据备份和删除策略。

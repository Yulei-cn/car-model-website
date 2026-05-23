# 车模网站

法国本地车模代购与收藏展示静态网站。

## 当前定位

- 公开页面展示现有模型照片、集运节奏、邮箱联系方式。
- 不在公网公开微信二维码和收款码，避免被爬取、骚扰或误用。
- 微信二维码、收款码放在随包裹明信片中，只给已成交客户。
- 网站先用纯静态方案，不需要 Supabase 数据库。
- 设计与执行顺序见 `PROJECT_DESIGN.md`：先网页，再明信片，再海报。

## 更新图片

图片源目录：

```powershell
C:\Users\57799\Pictures\car\archive
```

同步图片和目录数据：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sync-assets.ps1
python .\scripts\generate-thumbnails.py
```

然后提交并推送：

```powershell
git add .
git commit -m "Update car catalog"
git push
```

## 部署建议

第一版推荐 GitHub Pages。后续如果需要表单、预约、私密库存、客户备注或订单状态，再接 Supabase。

如果要用自定义域名，可以后续把 GitHub Pages 绑定到域名上。

## 设计素材

- `ai/`：用户筛选后的 AI 生成明信片和海报图片。
- `AI生成关键词2.txt`：第二版明信片和 A6 小海报生成提示词。

旧版 HTML/PNG 打印稿已经删除，后续以 `ai/` 里的图片为主继续排版。

## 流量控制

- 首页车型卡片使用 `assets/thumbs` 下的 WebP 缩略图。
- 用户点开图库时才加载原图。
- `ai/`、提示词和 docs 等设计素材通过 `.vercelignore` 排除在线部署，避免占用 Vercel 访问流量。

## 安全

基础安全头、缓存策略和 Vercel 防护建议见 `SECURITY.md`。当前站点不保存客户资料，不公开微信二维码和收款码。

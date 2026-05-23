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

## 打印设计稿

- `postcards.html`：5 个法国代购主题明信片版本。
- `postcards.css`：明信片屏幕预览和打印样式。
- `posters.html`：5 个法国代购主题 A4 海报版本。
- `posters.css`：海报屏幕预览和打印样式。
- `明信片/1-5/正面.html` 与 `明信片/1-5/反面.html`：单独打印文件。
- `海报A4/1-5/海报.html`：A4 单面海报打印文件。
- `海报A6/1-5/海报.html`：A6 单面小海报打印文件。

海报已经嵌入网站二维码 `assets/qr/site-qrcode.png`。明信片只保留微信二维码占位，不放收款码。

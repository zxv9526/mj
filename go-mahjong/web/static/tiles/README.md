# 🀄 麻将 SVG 牌面图片存放目录

本目录是**存放所有 SVG 牌面矢量图的官方标准路径**：
`go-mahjong/web/static/tiles/`

在 GitHub 仓库中，只需将你的 SVG 文件放到此文件夹并提交推送，Go Web 服务器会自动挂载并在前端页面加载。

---

## 📌 标准文件名命名规范 (共 34 种牌 + 1 个牌背)

程序推荐使用国际通用的 **数字 + 花色缩写** 命名法（全小写），同时也向下兼容中文名称：

### 1. 万子 (Wan / 1m ~ 9m)
- `1m.svg` (一万)
- `2m.svg` (二万)
- `3m.svg` (三万)
- `4m.svg` (四万)
- `5m.svg` (五万)
- `6m.svg` (六万)
- `7m.svg` (七万)
- `8m.svg` (八万)
- `9m.svg` (九万)

### 2. 筒子 / 饼子 (Tong / 1p ~ 9p)
- `1p.svg` (一筒)
- `2p.svg` (二筒)
- `3p.svg` (三筒)
- `4p.svg` (四筒)
- `5p.svg` (五筒)
- `6p.svg` (六筒)
- `7p.svg` (七筒)
- `8p.svg` (八筒)
- `9p.svg` (九筒)

### 3. 条子 / 索子 (Tiao / 1s ~ 9s)
- `1s.svg` (一条 / 一索 / 幺鸡)
- `2s.svg` (二条)
- `3s.svg` (三条)
- `4s.svg` (四条)
- `5s.svg` (五条)
- `6s.svg` (六条)
- `7s.svg` (七条)
- `8s.svg` (八条)
- `9s.svg` (九条)

### 4. 字牌 (Honors / 1z ~ 7z)
- `1z.svg` (东风)
- `2z.svg` (南风)
- `3z.svg` (西风)
- `4z.svg` (北风)
- `5z.svg` (红中)
- `6z.svg` (发财)
- `7z.svg` (白板)

### 5. 牌背
- `back.svg` (麻将牌背面贴图)

---

## 💡 如何在 GitHub 提交你的 SVG 文件

```bash
# 将你的 SVG 文件复制到本目录
cp /path/to/your/svgs/*.svg go-mahjong/web/static/tiles/

# 提交到 Git 仓库
git add web/static/tiles/*.svg
git commit -m "feat: 添加自定义麻将 SVG 牌面素材"
git push origin main
```

启动程序后，前端将通过 `/static/tiles/1m.svg` 等路径自动拉取图片渲染。
如果某些 SVG 文件未上传，系统会自动优雅回退为内置的矢量文字牌面，不会白屏或报错！

# 🀄 Termux Go Mahjong - 网络版 (Cloudflare Tunnel 穿透)

> 纯 Go 语言打造的麻将 Web 游戏服务器，专门适配 Android Termux 环境。
> 结合 **Cloudflare Tunnel (穿透隧道)**，玩家无需局域网或同一 WiFi，只需分享全球公网链接即可进入游戏！
> 支持自定义上传 **SVG 矢量麻将牌面** 图片！

---

## 🎨 关键问题一：SVG 麻将牌图片应该放在哪里？

所有 SVG 牌面图片请统一放置在以下目录：

📁 **`web/static/tiles/`** (在项目根目录下对应的完整路径是 `go-mahjong/web/static/tiles/`)

### 标准文件名列表 (共 34 种牌 + 1 个牌背)：
- **万子 (1m ~ 9m)**: `1m.svg`, `2m.svg`, `3m.svg`, `4m.svg`, `5m.svg`, `6m.svg`, `7m.svg`, `8m.svg`, `9m.svg`
- **筒子 (1p ~ 9p)**: `1p.svg`, `2p.svg`, `3p.svg`, `4p.svg`, `5p.svg`, `6p.svg`, `7p.svg`, `8p.svg`, `9p.svg`
- **条子 (1s ~ 9s)**: `1s.svg`, `2s.svg`, `3s.svg`, `4s.svg`, `5s.svg`, `6s.svg`, `7s.svg`, `8s.svg`, `9s.svg`
- **字牌 (1z ~ 7z)**:
  - 四风: `1z.svg` (东), `2z.svg` (南), `3z.svg` (西), `4z.svg` (北)
  - 三元: `5z.svg` (红中), `6z.svg` (发财), `7z.svg` (白板)
- **牌背**: `back.svg`

> 💡 **优雅降级机制**：如果某个 SVG 尚未上传，前端会自动显示内置精美矢量文字牌面，不会出现红叉或白屏！

---

## 🌐 关键问题二：Cloudflare Tunnel 免局域网公网穿透

在 Termux 启动游戏后，任何玩家无需处于同一 WiFi，无需路由器端口映射，通过 Cloudflare 免费公网隧道即可进入对战。

### 1. 启动游戏服务 (默认监听 8080 端口)
```bash
./mahjong
# 或后台挂起运行:
nohup ./mahjong > mahjong.log 2>&1 &
```

### 2. 在 Termux 中启动 Cloudflare 隧道
```bash
cloudflared tunnel --url http://localhost:8080
```
终端将瞬间输出类似如下的免费安全公网链接：
```text
+-----------------------------------------------------------------------+
|  Your quick Tunnel has been created! Visit it at (it may take a min):  |
|  https://cherry-matrix-phoenix-deal.trycloudflare.com                 |
+-----------------------------------------------------------------------+
```
复制该 **`https://xxxx.trycloudflare.com`** 链接发送给朋友或在手机浏览器中打开，即可从公网全球任何地方直接进入游戏！

---

## 🛠️ GitHub 仓库上传指南

```bash
# 1. 将下载解压后的代码 (连同你的 web/static/tiles/*.svg 图片) 放入目录
cd go-mahjong

# 2. 初始化 Git 仓库
git init
git add .
git commit -m "feat: 麻将 Web 服务与 SVG 牌面素材"

# 3. 关联你的 GitHub 远程仓库
git branch -M main
git remote add origin https://github.com/USERNAME/REPO_NAME.git
git push -u origin main
```

---

## 📲 Termux 一键拉取与部署

```bash
# 1. 更新环境并安装 git
pkg update -y && pkg install -y git

# 2. 克隆仓库
git clone https://github.com/USERNAME/REPO_NAME.git
cd REPO_NAME

# 3. 一键配置环境、编译并配置 cloudflared
chmod +x termux_setup.sh
./termux_setup.sh

# 4. 运行
mahjong
```

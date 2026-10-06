# 🀄 Termux Go Mahjong - 网络版部署与 Telegram 机器人管理员配置指南

> 纯 Go 语言打造的高性能麻将游戏服务器，专为 **Android Termux** 移动环境深度优化。
> 结合 **Cloudflare Tunnel (穿透隧道)**，玩家无需局域网或同一 WiFi，只需通过公网链接即可进入游戏。
> 内置 **Telegram Bot 管理员系统**，支持通过手机 Telegram 远程监控服务器、发布全服跑马灯、管理牌桌、接收胜局实时推送！

---

## 📁 关键环境：Termux 目录结构规范

根据您的配置要求，配置文件 `.env` 存放在 **Termux 根目录（即 `mj` 项目目录的上一级）**：

```text
/data/data/com.termux/files/home (即 Termux 的 ~ 根目录)
├── .env                       # 👈 核心配置文件 (保存 Bot Token 与 Admin ID)
└── mj/                        # 👈 你的麻将 GitHub 仓库目录
    ├── main.go                # 服务器入口
    ├── config/                # 配置文件自动加载模块 (自动优先读取 ../.env)
    ├── bot/                   # Telegram 机器人管理模块 (纯标准库，长轮询)
    ├── engine/                # 麻将规则与 AI 摸切对战引擎
    ├── web/
    │   ├── server.go          # HTTP 网页游戏服务
    │   └── static/tiles/      # 🀄 42 张 SVG 麻将牌面矢量图存放目录
    ├── termux_setup.sh        # 一键环境配置与编译脚本
    └── Makefile
```

---

## 🤖 第一部分：配置 Telegram 机器人管理员

### 步骤 1：申请 Telegram Bot Token
1. 在 Telegram 中搜索官方机器人 **`@BotFather`** 并点击开始。
2. 发送指令：`/newbot`。
3. 按照提示输入机器人昵称（例如：`我的麻将管家`）。
4. 输入机器人唯一的 username（必须以 `bot` 结尾，例如：`my_termux_mj_bot`）。
5. `@BotFather` 将返回类似如下的 **API Token**：
   ```text
   7123456789:AAFLKsdjkflsajk_sdjakfls-xxxxxx
   ```
   *(请妥善保管该 Token，不要泄露给他人)*

### 步骤 2：获取您的 Telegram 用户数字 ID
1. 在 Telegram 中搜索查询 ID 的机器人 **`@userinfobot`** 或 **`@getmyid_bot`**。
2. 点击开始（发送 `/start`）。
3. 机器人会立即回复你的专属数字 ID，例如：`123456789`。

### 步骤 3：在 Termux 根目录创建 `~/.env` 文件
在 Termux 终端中，直接粘贴执行以下命令（将里面的 Token 和 ID 替换为你的真实内容）：

```bash
cat << 'EOF' > ~/.env
# ==============================================================================
# Termux 麻将管理员与服务器配置文件 (位于 Termux 根目录 ~/.env)
# ==============================================================================

# 1. Telegram Bot Token (向 @BotFather 申请)
TELEGRAM_BOT_TOKEN="7123456789:AAFLKsdjkflsajk_sdjakfls-xxxxxx"

# 2. Telegram 管理员数字 ID (向 @userinfobot 查询，支持多个用逗号隔开)
TELEGRAM_ADMIN_ID="123456789"

# 3. 游戏服务本地监听端口 (默认: 8080)
PORT=8080

# 4. 麻将规则: GB (大众国标 136张) 或 SICHUAN (四川血战到底 108张)
MAHJONG_RULE=GB

# 5. Cloudflare 公网域名 (可选，启动 cloudflared 后也可通过机器人 /seturl 设置)
PUBLIC_URL=""
EOF
```

> 💡 **安全权限保护**：当非管理员 Telegram 用户给机器人发送消息时，机器人会自动拒绝并提示无权操作；只有 `TELEGRAM_ADMIN_ID` 中配置的管理员才能执行管理指令。

---

## 🎮 第二部分：Telegram 机器人管理指令与功能大全

启动服务后，管理员在手机 Telegram 中直接向你的 Bot 发送指令即可全权管理：

| 指令 | 说明 | 交互形式 |
| :--- | :--- | :--- |
| **`/start`** 或 **`/menu`** | 呼出**交互式控制面板** | 底部直观按键，一键点击操作 |
| **`/status`** | 查看服务器实时状态 | 显示 Termux Uptime、内存、当前牌墙数、各家分数 |
| **`/url`** | 获取游戏公网邀请链接 | 生成带点击按钮的微信/QQ/TG 一键组局卡片 |
| **`/seturl <链接>`** | 动态更新 Cloudflare 网址 | 例如：`/seturl https://xxx.trycloudflare.com` |
| **`/game`** 或 **`/room`** | 实时查看牌桌牌况 | 谁是庄家、当前出牌、四方玩家手牌数与胡牌状态 |
| **`/broadcast <文字>`** | 发送**全服跑马灯公告** | 实时在所有玩家网页顶部弹出金色滚动横幅 |
| **`/clearbanner`** | 清除网页跑马灯横幅 | 恢复纯净牌桌界面 |
| **`/reset`** | 强制重新洗牌开新局 | 牌局卡死或需要重开时一键重置 |
| **`/rule GB`** | 切换为国标大众规则 | 136 张牌含字牌 |
| **`/rule SICHUAN`** | 切换为四川血战到底规则 | 108 张牌去字牌，缺门对局 |
| **`/help`** | 显示指令帮助大全 | 详细使用说明 |

### 🔔 智能实时事件推送：
1. **服务启动通知**：服务器在手机 Termux 启动成功时，Bot 会自动向管理员发送就绪通知，附带公网直达按钮。
2. **胜局通报**：无论任何玩家或 AI 自摸或荣和胡牌，Bot 会立即向管理员推送：
   > 🀄 **【牌局捷报 · 精彩胡牌！】**
   > 🏆 赢家: 房主 (你)
   > 🎉 胡牌方式: 自摸
   > 🎴 牌型番种: 大三元、清一色
   > 💰 结算番数: 88 番 (+880 分)

---

## 🎨 第三部分：SVG 麻将牌面存放位置

所有 SVG 矢量图片存放于仓库内的：
📁 **`web/static/tiles/`** (在当前项目中对应 `mj/web/static/tiles/`)

- 万子: `1m.svg` ~ `9m.svg`
- 筒子: `1p.svg` ~ `9p.svg`
- 条子: `1s.svg` ~ `9s.svg`
- 字牌: `1z.svg` (东), `2z.svg` (南), `3z.svg` (西), `4z.svg` (北), `5z.svg` (中), `6z.svg` (发), `7z.svg` (白)
- 牌背: `back.svg`

---

## 🚀 第四部分：Termux 完整部署流程 (四步搞定)

在 Android 手机上打开 **Termux**：

```bash
# 步骤 1：更新软件包并安装 Git
pkg update -y && pkg install -y git

# 步骤 2：在 Termux 根目录配置 ~/.env (按第一部分说明配置 Token 与 Admin ID)
# (如果在上一级已配置，此步可跳过)

# 步骤 3：克隆仓库到 mj 目录 (确保目录名为 mj)
git clone https://github.com/你的用户名/你的仓库名.git mj
cd mj

# 步骤 4：执行一键编译与配置脚本
chmod +x termux_setup.sh
./termux_setup.sh
```

### 启动与公网开黑：

```bash
# 1. 启动游戏服务 (在 mj 目录下)
./mahjong

# 2. 另开一个 Termux 会话窗口，启动 Cloudflare 隧道穿透：
cloudflared tunnel --url http://localhost:8080
```

终端将打印出类似：
`https://cherry-matrix-phoenix-deal.trycloudflare.com`

**将该链接通过 Telegram 发送 `/seturl https://...` 告诉机器人**，机器人即可一键生成组局邀请卡片，任何朋友点击链接即可在手机浏览器中免局域网联机对战！

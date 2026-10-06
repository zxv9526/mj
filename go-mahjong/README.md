# 🀄 Termux Go Mahjong (Termux 终端与网页双模麻将)

> 专为 Android Termux 终端与 GitHub 仓库打造的轻量级 Go 语言开源麻将游戏。
> 零外部 CGO 依赖、秒速编译、内存占用极低，支持纯终端 ANSI 彩色 TUI 界面与内嵌移动端 Web 双模式！

---

## ✨ 项目特性

- 🚀 **零依赖轻量编译**：纯 Go 语言标准库实现，无任何外部 CGO 绑定，在 Termux ARM64/ARM32 上 `go build` 仅需 2 秒。
- 🎨 **精美 ANSI 终端 TUI**：支持 136 张国标麻将牌及 108 张川麻血战，彩色区分万/筒/条/字牌，直观的数字键出牌与吃碰杠胡响应。
- 📱 **移动 Web 触摸双模式**：内置 HTTP 服务 (`./mahjong -web`)，在手机浏览器中打开 `http://localhost:8080` 即刻畅玩高清触摸卡牌版，支持局域网好友同玩！
- 🤖 **3 席智能 AI 陪练**：内置向听数与废牌评估算法，支持自动吃碰杠胡判断与听牌即时提示。
- 📦 **一键自动化安装**：内置 `termux_setup.sh` 脚本，自动安装 Go 编译器并建立 `mahjong` 全局快捷命令。

---

## 🛠️ 第一步：将文件上传到你的 GitHub 仓库

你可以使用本项目网页端的**【一键下载完整源码 ZIP】**解压后上传，或者在电脑/手机终端中直接执行：

```bash
# 1. 进入项目根目录
cd go-mahjong

# 2. 初始化 Git 仓库
git init

# 3. 添加所有文件并提交
git add .
git commit -m "feat: 初次提交 Go 麻将游戏源码"

# 4. 关联你的 GitHub 远程仓库 (将 USERNAME 与 REPO_NAME 替换为你自己的)
git branch -M main
git remote add origin https://github.com/USERNAME/REPO_NAME.git

# 5. 推送到 GitHub
git push -u origin main
```

---

## 📲 第二步：在 Termux 中拉取并部署运行

打开 Android 手机上的 **Termux** 应用，依次输入以下命令：

### 方法 A：一键全自动部署 (推荐)

```bash
# 1. 更新环境并安装 git
pkg update -y && pkg install -y git

# 2. 克隆你的 GitHub 仓库
git clone https://github.com/USERNAME/REPO_NAME.git
cd REPO_NAME

# 3. 授予脚本权限并执行一键编译安装
chmod +x termux_setup.sh
./termux_setup.sh
```

### 方法 B：手动编译与运行

```bash
# 1. 安装 Go 语言环境和 Git
pkg update -y
pkg install -y golang git

# 2. 拉取仓库
git clone https://github.com/USERNAME/REPO_NAME.git
cd REPO_NAME

# 3. 编译二进制程序 (仅需几秒钟)
go build -o mahjong main.go

# 4. 启动终端 TUI 麻将
./mahjong
```

---

## 🎮 操作指令与参数说明

### 1. 终端 TUI 模式常用操作
- **数字序号 1-14**：出对应位置手牌 (直接回车默认摸切最新抓到的牌)。
- **H 键**：自摸或抓铳胡牌。
- **P 键**：碰牌。
- **G 键**：明杠 / 暗杠 / 补杠。
- **C 键**：吃牌。
- **Enter / S 键**：过 (Pass)。
- **Q 键**：退出游戏。

### 2. 命令行启动参数

```bash
# 启动手机浏览器触摸版 (默认端口 8080)
./mahjong -web

# 指定端口启动 Web 版
./mahjong -web -port 8888

# 切换为四川血战到底规则 (108张，去字牌)
./mahjong -rule SICHUAN

# 自定义玩家昵称
./mahjong -name "雀坛高斯"
```

---

## 📂 项目结构

```text
├── go.mod               # Go 模块配置文件
├── main.go              # 程序主入口与命令行参数解析
├── Makefile             # 常用构建命令集合
├── termux_setup.sh      # Termux 自动化部署配置脚本
├── README.md            # 项目说明与操作指南
├── engine/              # 麻将核心算法引擎
│   ├── tile.go          # 牌面定义、花色、洗牌与终端彩色渲染
│   ├── rules.go         # 吃碰杠胡判断、七对/清一色判定、听牌计算
│   ├── ai.go            # 3席电脑人智能出牌与响应逻辑
│   └── game.go          # 游戏状态机、发牌、巡目与计分结算
├── tui/                 # Termux ANSI 纯终端界面
│   └── terminal.go      # 牌桌绘制、牌河展示与终端交互监听
└── web/                 # 内嵌移动端 Web 服务器
    └── server.go        # HTTP/JSON 服务与内嵌单文件移动端 HTML5
```

---

## 📜 开源许可
MIT License - 自由修改、分发与二次开发。

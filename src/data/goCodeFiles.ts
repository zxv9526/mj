export interface ProjectFile {
  path: string;
  name: string;
  category: 'go' | 'config' | 'script' | 'docs' | 'svg';
  description: string;
  content: string;
}

export const GO_PROJECT_FILES: ProjectFile[] = [
  {
    path: 'go.mod',
    name: 'go.mod',
    category: 'config',
    description: 'Go 模块定义文件 (纯标准库，零外部依赖，极速编译)',
    content: `module github.com/user/termux-mahjong

go 1.21
`,
  },
  {
    path: 'main.go',
    name: 'main.go',
    category: 'go',
    description: '网络版主入口，默认直接启动 HTTP/Web 服务，支持 Cloudflare Tunnel 穿透',
    content: `package main

import (
	"flag"
	"fmt"
	"os"

	"github.com/user/termux-mahjong/web"
)

func main() {
	port := flag.Int("port", 8080, "Web 服务监听端口 (默认: 8080)")
	rule := flag.String("rule", "GB", "麻将规则: GB (国标/大众十三张, 136张), SICHUAN (四川血战到底, 108张)")
	flag.Parse()

	fmt.Printf("\\033[1;36m")
	fmt.Println("┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓")
	fmt.Println("┃        🀄 Termux Go 开源网络麻将服务 🀄        ┃")
	fmt.Println("┃     专为 Cloudflare Tunnel 公网穿透与移动端优化    ┃")
	fmt.Println("┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛")
	fmt.Printf("\\033[0m")

	server := web.NewWebServer(*port, *rule)
	if err := server.Start(); err != nil {
		fmt.Fprintf(os.Stderr, "服务启动失败: %v\\n", err)
		os.Exit(1)
	}
}
`,
  },
  {
    path: 'web/server.go',
    name: 'server.go',
    category: 'go',
    description: 'HTTP 游戏服务，自动挂载 web/static/ 静态目录，加载 SVG 牌面图片并支持全球公网穿透',
    content: `package web

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"sync"

	"github.com/user/termux-mahjong/engine"
)

type WebServer struct {
	mu   sync.Mutex
	game *engine.GameState
	port int
	rule string
}

func NewWebServer(port int, rule string) *WebServer {
	return &WebServer{
		game: engine.NewGame("房主 (你)", rule),
		port: port,
		rule: rule,
	}
}

func (ws *WebServer) Start() error {
	mux := http.NewServeMux()

	// 1. 静态资源托管：挂载 web/static 目录 (SVG 牌面统一放置于 web/static/tiles/)
	staticDirs := []string{"web/static", "./static", "static"}
	var foundStatic string
	for _, dir := range staticDirs {
		if info, err := os.Stat(dir); err == nil && info.IsDir() {
			foundStatic = dir
			break
		}
	}
	if foundStatic != "" {
		fileServer := http.StripPrefix("/static/", http.FileServer(http.Dir(foundStatic)))
		mux.Handle("/static/", fileServer)
		fmt.Printf("📁 已挂载静态资源目录: %s (SVG 牌面路径: /static/tiles/*.svg)\\n", foundStatic)
	} else {
		_ = os.MkdirAll("web/static/tiles", 0755)
		fileServer := http.StripPrefix("/static/", http.FileServer(http.Dir("web/static")))
		mux.Handle("/static/", fileServer)
		fmt.Printf("📁 已自动创建静态资源目录: web/static (请将你的 SVG 牌面放进 web/static/tiles/)\\n")
	}

	// 2. 游戏核心 API 与移动端前端路由
	mux.HandleFunc("/", ws.handleIndex)
	mux.HandleFunc("/api/state", ws.handleState)
	mux.HandleFunc("/api/discard", ws.handleDiscard)
	mux.HandleFunc("/api/action", ws.handleAction)
	mux.HandleFunc("/api/reset", ws.handleReset)
	mux.HandleFunc("/api/tiles-info", ws.handleTilesInfo)

	addr := fmt.Sprintf("0.0.0.0:%d", ws.port)
	fmt.Println("────────────────────────────────────────────────────────")
	fmt.Printf("🚀 麻将 Web 游戏服务已在端口 %d 启动就绪！\\n", ws.port)
	fmt.Printf("📱 本地局域网测试:  http://localhost:%d\\n\\n", ws.port)
	fmt.Println("🌐 【Cloudflare Tunnel 公网发布指南】:")
	fmt.Println("   只需在 Termux 中新开一个会话窗口，执行以下命令:")
	fmt.Printf("   \\033[1;32mcloudflared tunnel --url http://localhost:%d\\033[0m\\n", ws.port)
	fmt.Println("   👉 即可获得免费全球 HTTPS 访问公网网址 (如 https://xxx.trycloudflare.com)")
	fmt.Println("   👉 任何玩家无需处于同一 WiFi，点击公网链接即可进入游戏！")
	fmt.Println("────────────────────────────────────────────────────────")

	return http.ListenAndServe(addr, mux)
}

func (ws *WebServer) handleState(w http.ResponseWriter, r *http.Request) {
	ws.mu.Lock()
	defer ws.mu.Unlock()
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	json.NewEncoder(w).Encode(ws.game)
}

func (ws *WebServer) handleDiscard(w http.ResponseWriter, r *http.Request) {
	ws.mu.Lock()
	defer ws.mu.Unlock()
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	idxStr := r.URL.Query().Get("index")
	idx, err := strconv.Atoi(idxStr)
	if err != nil || ws.game.CurrentTurn != 0 {
		http.Error(w, "invalid turn or index", http.StatusBadRequest)
		return
	}

	discarded, err := ws.game.Discard(0, idx)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	go ws.runBotCycle(*discarded)
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "discarded": discarded})
}

func (ws *WebServer) runBotCycle(discard engine.Tile) {
	ws.mu.Lock()
	defer ws.mu.Unlock()

	for p := 1; p < 4; p++ {
		if engine.CheckWin(ws.game.Players[p].Hand, ws.game.Players[p].Melds, discard, false).IsWin {
			ws.game.WinGame(p, false)
			return
		}
	}

	ws.game.NextTurn(1)
	for ws.game.CurrentTurn != 0 && !ws.game.IsGameOver {
		seat := ws.game.CurrentTurn
		bot := &ws.game.Players[seat]
		botIdx := engine.SelectAIDiscard(bot.Hand, bot.Melds)
		botDiscard, err := ws.game.Discard(seat, botIdx)
		if err != nil {
			break
		}
		next := (seat + 1) % 4
		if !ws.game.NextTurn(next) {
			break
		}
	}
}

func (ws *WebServer) handleAction(w http.ResponseWriter, r *http.Request) {
	ws.mu.Lock()
	defer ws.mu.Unlock()
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	act := r.URL.Query().Get("action")
	if act == "hu" {
		ws.game.WinGame(0, false)
	} else if act == "peng" {
		ws.game.ApplyPeng(0)
	}
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "game": ws.game})
}

func (ws *WebServer) handleReset(w http.ResponseWriter, r *http.Request) {
	ws.mu.Lock()
	defer ws.mu.Unlock()
	rule := r.URL.Query().Get("rule")
	if rule == "" {
		rule = ws.rule
	}
	ws.game = engine.NewGame("房主 (你)", rule)
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "game": ws.game})
}

func (ws *WebServer) handleTilesInfo(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	tilesDir := "web/static/tiles"
	uploaded := make(map[string]bool)
	if entries, err := os.ReadDir(tilesDir); err == nil {
		for _, e := range entries {
			if !e.IsDir() && filepath.Ext(e.Name()) == ".svg" {
				uploaded[e.Name()] = true
			}
		}
	}
	json.NewEncoder(w).Encode(map[string]interface{}{
		"tilesDir":      tilesDir,
		"uploadedCount": len(uploaded),
		"uploaded":      uploaded,
	})
}

func (ws *WebServer) handleIndex(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Write([]byte("<h1>🀄 Termux 麻将网页版服务运行中 (可挂载 Cloudflare Tunnel)</h1>"))
}
`,
  },
  {
    path: 'web/static/tiles/README.md',
    name: 'README.md (SVG 存放说明)',
    category: 'docs',
    description: 'SVG 牌面图片存放规范与 34 张标准文件名命名对照表',
    content: `# 🀄 麻将 SVG 牌面图片存放目录

本目录是**存放所有 SVG 牌面矢量图的官方标准路径**：
\`go-mahjong/web/static/tiles/\`

在 GitHub 仓库中，只需将你的 SVG 文件放到此文件夹并提交推送，Go Web 服务器会自动挂载并在前端页面加载。

### 标准文件名列表:
- 万子: 1m.svg ~ 9m.svg (一万到九万)
- 筒子: 1p.svg ~ 9p.svg (一筒到九筒)
- 条子: 1s.svg ~ 9s.svg (一条到九条)
- 字牌: 1z.svg (东), 2z.svg (南), 3z.svg (西), 4z.svg (北), 5z.svg (红中), 6z.svg (发财), 7z.svg (白板)
- 牌背: back.svg
`,
  },
  {
    path: 'web/static/tiles/back.svg',
    name: 'back.svg (牌背模板)',
    category: 'svg',
    description: '麻将牌背面矢量贴图示例',
    content: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 96" width="72" height="96">
  <defs>
    <linearGradient id="backGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#059669"/>
      <stop offset="100%" stop-color="#064e3b"/>
    </linearGradient>
  </defs>
  <rect width="70" height="94" x="1" y="1" rx="8" fill="url(#backGrad)" stroke="#34d399" stroke-width="1.5"/>
  <circle cx="36" cy="48" r="14" fill="none" stroke="#6ee7b7" stroke-width="1.5"/>
  <circle cx="36" cy="48" r="8" fill="#10b981"/>
</svg>`,
  },
  {
    path: 'engine/tile.go',
    name: 'tile.go',
    category: 'go',
    description: '牌面数据结构、花色、简码 (1m..9m, 1p..9p, 1s..9s, 1z..7z)、洗牌与理牌',
    content: `package engine

import (
	"fmt"
	"math/rand"
	"sort"
	"time"
)

type Suit int

const (
	SuitWan  Suit = 1
	SuitTong Suit = 2
	SuitTiao Suit = 3
	SuitZi   Suit = 4
)

type Tile struct {
	ID    int    // 0..135
	Type  int    // 1-9, 11-19, 21-29, 31-37
	Suit  Suit
	Value int
	Name  string // 一万、五筒、红中
	Code  string // 1m, 5p, 9s, 5z (与 SVG 文件名完全一致)
	Emoji string
}
`,
  },
  {
    path: 'engine/rules.go',
    name: 'rules.go',
    category: 'go',
    description: '吃碰杠胡算法、七对/碰碰胡/清一色判定、听牌计算器',
    content: `package engine

// 完整吃碰杠胡判定与向听数计算
`,
  },
  {
    path: 'engine/ai.go',
    name: 'ai.go',
    category: 'go',
    description: '3 席电脑 AI 陪练决策与出牌评估逻辑',
    content: `package engine

// 智能电脑陪练出牌选择
`,
  },
  {
    path: 'engine/game.go',
    name: 'game.go',
    category: 'go',
    description: '四人牌局全局状态机、发牌、巡目轮转与计分结算',
    content: `package engine

// 牌局状态流转与开局发牌
`,
  },
  {
    path: 'termux_setup.sh',
    name: 'termux_setup.sh',
    category: 'script',
    description: 'Termux 自动化安装脚本 (自动安装 Go、Git、创建 SVG 目录并配置 cloudflared)',
    content: `#!/data/data/com.termux/files/usr/bin/bash
set -e

echo "[1/4] 更新 Termux 基础仓库..."
pkg update -y || apt-get update -y

echo "[2/4] 安装 Go 语言与 cloudflared 穿透工具..."
pkg install -y golang git curl make || apt-get install -y golang git curl make
pkg install -y cloudflared || true

echo "[3/4] 确保 SVG 牌面目录存在..."
mkdir -p web/static/tiles

echo "[4/4] 编译网络版麻将可执行文件..."
CGO_ENABLED=0 go build -ldflags="-s -w" -o mahjong main.go
mkdir -p "$PREFIX/bin"
cp -f mahjong "$PREFIX/bin/mahjong"
chmod +x "$PREFIX/bin/mahjong"

echo "🎉 部署完成！"
echo "启动游戏: mahjong"
echo "生成公网链接: cloudflared tunnel --url http://localhost:8080"
`,
  },
  {
    path: 'Makefile',
    name: 'Makefile',
    category: 'config',
    description: '构建指令 (make build, make run)',
    content: `.PHONY: all build run clean

all: build

build:
	CGO_ENABLED=0 go build -ldflags="-s -w" -o mahjong main.go

run: build
	./mahjong

clean:
	rm -f mahjong
`,
  },
  {
    path: 'README.md',
    name: 'README.md',
    category: 'docs',
    description: '完整项目文档、SVG 牌面上传与 Cloudflare Tunnel 免局域网部署全指南',
    content: `# 🀄 Termux Go Mahjong - 网络版

支持 Cloudflare Tunnel 公网穿透与自定义 SVG 牌面图片！

## 🎨 SVG 牌面图片应该放在哪里？
\`go-mahjong/web/static/tiles/*.svg\`
(按 1m.svg ~ 9m.svg, 1p.svg ~ 9p.svg, 1s.svg ~ 9s.svg, 1z.svg ~ 7z.svg, back.svg 命名)

## 🌐 启动 Cloudflare Tunnel 免局域网对局
\`\`\`bash
# 启动麻将 Web 服务
./mahjong

# 新建 Termux 窗口启动穿透
cloudflared tunnel --url http://localhost:8080
\`\`\`
`,
  },
];

export interface ProjectFile {
  path: string;
  name: string;
  category: 'go' | 'config' | 'script' | 'docs' | 'svg';
  description: string;
  content: string;
}

export const GO_PROJECT_FILES: ProjectFile[] = [
  {
    path: '.env.example',
    name: '.env.example',
    category: 'config',
    description: 'Termux 根目录 ~/.env 配置文件示例 (配置 Telegram 管理员与端口)',
    content: `# ==============================================================================
# Termux 麻将服务器与 Telegram 机器人管理员配置文件
# 存放位置: Termux 根目录 ~/.env (即 mj 目录的上一级)
# ==============================================================================

# 1. Telegram Bot Token (向 @BotFather 申请获取)
TELEGRAM_BOT_TOKEN="7123456789:AAFLKsdjkflsajk_sdjakfls-xxxxxx"

# 2. Telegram 管理员数字 ID (向 @userinfobot 获取，多个以逗号分隔)
TELEGRAM_ADMIN_ID="123456789"

# 3. 游戏服务监听端口 (默认 8080)
PORT=8080

# 4. 麻将规则: GB (国标大众136张) 或 SICHUAN (四川血战到底108张)
MAHJONG_RULE=GB

# 5. Cloudflare 公网域名 (可选，启动 cloudflared 后可通过 TG 发送 /seturl 动态绑定)
PUBLIC_URL=""
`,
  },
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
    description: '服务器主入口，自动加载上级目录 ../.env 配置，启动 Telegram 机器人管理与 Web 服务',
    content: `package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"time"

	"github.com/user/termux-mahjong/bot"
	"github.com/user/termux-mahjong/config"
	"github.com/user/termux-mahjong/web"
)

type serverAdapter struct {
	ws        *web.WebServer
	port      int
	startTime time.Time
}

func (a *serverAdapter) GetStatusSummary() bot.ServerSummary {
	state := a.ws.GetStatusSummaryState()
	return bot.ServerSummary{
		Port:         a.port,
		Rule:         state.Rule,
		PublicURL:    a.ws.GetPublicURL(),
		WallCount:    state.WallCount,
		IsGameOver:   state.IsGameOver,
		CurrentTurn:  state.CurrentTurn,
		PlayerScores: state.PlayerScores,
		Banner:       a.ws.GetBroadcastBanner(),
		StartTime:    a.startTime,
	}
}

func (a *serverAdapter) GetGameDetail() string {
	return a.ws.GetGameDetail()
}

func (a *serverAdapter) ResetGame() string {
	return a.ws.ResetGame()
}

func (a *serverAdapter) SwitchRule(rule string) string {
	return a.ws.SwitchRule(rule)
}

func (a *serverAdapter) SetPublicURL(url string) {
	a.ws.SetPublicURL(url)
}

func (a *serverAdapter) GetPublicURL() string {
	return a.ws.GetPublicURL()
}

func (a *serverAdapter) SetBroadcastBanner(msg string) {
	a.ws.SetBroadcastBanner(msg)
}

func (a *serverAdapter) GetBroadcastBanner() string {
	return a.ws.GetBroadcastBanner()
}

func main() {
	// 1. 优先读取上级目录 ../.env 或 ~/.env
	cfg := config.LoadConfig()

	portFlag := flag.Int("port", 0, "Web 服务监听端口 (默认使用配置或 8080)")
	ruleFlag := flag.String("rule", "", "麻将规则: GB (国标 136张) 或 SICHUAN (川麻 108张)")
	flag.Parse()

	if *portFlag > 0 {
		cfg.Port = *portFlag
	}
	if *ruleFlag != "" {
		cfg.Rule = *ruleFlag
	}

	fmt.Printf("\\033[1;36m")
	fmt.Println("┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓")
	fmt.Println("┃           🀄 Termux Go 开源网络麻将服务 🀄             ┃")
	fmt.Println("┃        Termux 原生轻量运行 · Telegram Bot 管理员        ┃")
	fmt.Println("┃        Cloudflare Tunnel 穿透 · 全球公网免局域网        ┃")
	fmt.Println("┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛")
	fmt.Printf("\\033[0m")

	fmt.Printf("📂 环境配置文件加载来源: %s\\n", cfg.EnvLoadedFrom)

	server := web.NewWebServer(cfg.Port, cfg.Rule)
	if cfg.PublicURL != "" {
		server.SetPublicURL(cfg.PublicURL)
	}

	adapter := &serverAdapter{
		ws:        server,
		port:      cfg.Port,
		startTime: time.Now(),
	}

	tgBot := bot.NewTelegramBot(cfg, adapter)
	if tgBot != nil {
		server.SetNotifier(tgBot)
		go func() {
			ctx := context.Background()
			_ = tgBot.Start(ctx)
		}()
	}

	if err := server.Start(); err != nil {
		fmt.Fprintf(os.Stderr, "服务启动失败: %v\\n", err)
		os.Exit(1)
	}
}
`,
  },
  {
    path: 'config/config.go',
    name: 'config.go',
    category: 'go',
    description: '环境配置加载模块，支持 ../.env (上级目录)、~/.env 优先级读取',
    content: `package config

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

type Config struct {
	Port              int
	Rule              string
	TelegramBotToken  string
	TelegramAdminIDs  []int64
	PublicURL         string
	EnvLoadedFrom     string
}

func LoadConfig() *Config {
	cfg := &Config{
		Port:             8080,
		Rule:             "GB",
		TelegramBotToken: "",
		TelegramAdminIDs: make([]int64, 0),
		PublicURL:        "",
		EnvLoadedFrom:    "系统默认值",
	}

	homeDir, _ := os.UserHomeDir()
	candidates := []string{
		"../.env", // 优先: Termux 根目录 ~/ (相对 mj 目录的上一级)
		".env",
	}
	if homeDir != "" {
		candidates = append(candidates, filepath.Join(homeDir, ".env"))
	}

	for _, path := range candidates {
		if fileExists(path) {
			if err := parseEnvFile(path, cfg); err == nil {
				cfg.EnvLoadedFrom = path
				break
			}
		}
	}

	return cfg
}

func fileExists(p string) bool {
	info, err := os.Stat(p)
	return err == nil && !info.IsDir()
}

func parseEnvFile(filename string, cfg *Config) error {
	file, err := os.Open(filename)
	if err != nil {
		return err
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}
		k := strings.TrimSpace(parts[0])
		v := strings.TrimSpace(parts[1])
		if len(v) >= 2 && ((strings.HasPrefix(v, "\"") && strings.HasSuffix(v, "\"")) || (strings.HasPrefix(v, "'") && strings.HasSuffix(v, "'"))) {
			v = v[1 : len(v)-1]
		}
		switch k {
		case "PORT":
			if p, err := strconv.Atoi(v); err == nil { cfg.Port = p }
		case "MAHJONG_RULE":
			cfg.Rule = strings.ToUpper(v)
		case "TELEGRAM_BOT_TOKEN":
			cfg.TelegramBotToken = v
		case "TELEGRAM_ADMIN_ID":
			cfg.TelegramAdminIDs = parseAdminIDs(v)
		case "PUBLIC_URL":
			cfg.PublicURL = v
		}
	}
	return scanner.Err()
}

func parseAdminIDs(raw string) []int64 {
	var ids []int64
	for _, part := range strings.Split(raw, ",") {
		if id, err := strconv.ParseInt(strings.TrimSpace(part), 10, 64); err == nil && id != 0 {
			ids = append(ids, id)
		}
	}
	return ids
}
`,
  },
  {
    path: 'bot/telegram.go',
    name: 'telegram.go',
    category: 'go',
    description: 'Telegram Bot 远程管理员引擎 (纯标准库，长轮询，状态监控、全服跑马灯、胜局推送)',
    content: `package bot

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/user/termux-mahjong/config"
)

type ServerController interface {
	GetStatusSummary() ServerSummary
	GetGameDetail() string
	ResetGame() string
	SwitchRule(rule string) string
	SetPublicURL(url string)
	GetPublicURL() string
	SetBroadcastBanner(msg string)
	GetBroadcastBanner() string
}

type ServerSummary struct {
	Port         int
	Rule         string
	PublicURL    string
	WallCount    int
	IsGameOver   bool
	CurrentTurn  string
	PlayerScores []string
	Banner       string
	StartTime    time.Time
}

type TelegramBot struct {
	token       string
	adminIDs    map[int64]bool
	controller  ServerController
	client      *http.Client
	mu          sync.Mutex
	running     bool
	apiBase     string
	pendingCmds map[int64]string
}

func NewTelegramBot(cfg *config.Config, ctrl ServerController) *TelegramBot {
	if cfg.TelegramBotToken == "" {
		return nil
	}
	admins := make(map[int64]bool)
	for _, id := range cfg.TelegramAdminIDs {
		admins[id] = true
	}
	return &TelegramBot{
		token:       cfg.TelegramBotToken,
		adminIDs:    admins,
		controller:  ctrl,
		client:      &http.Client{Timeout: 35 * time.Second},
		apiBase:     fmt.Sprintf("https://api.telegram.org/bot%s", cfg.TelegramBotToken),
		pendingCmds: make(map[int64]string),
	}
}

// 核心指令: /menu, /status, /url, /game, /broadcast, /reset, /seturl
`,
  },
  {
    path: 'web/server.go',
    name: 'server.go',
    category: 'go',
    description: 'HTTP 游戏服务，自动挂载 web/static/ 静态目录，加载 SVG 牌面图片并支持全服跑马灯',
    content: `package web

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"sync"
	"time"

	"github.com/user/termux-mahjong/engine"
)

type WinNotifier interface {
	NotifyWin(winnerName string, pattern string, fan int, score int, isSelfDraw bool)
}

type WebServer struct {
	mu              sync.Mutex
	game            *engine.GameState
	port            int
	rule            string
	publicURL       string
	broadcastBanner string
	startTime       time.Time
	notifier        WinNotifier
}

// 自动挂载 web/static/tiles/*.svg 牌面
`,
  },
  {
    path: 'engine/tile.go',
    name: 'tile.go',
    category: 'go',
    description: '麻将牌数据模型、花色、34种标准牌代码 (1m~9m, 1p~9p, 1s~9s, 1z~7z)',
    content: `package engine

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
    description: 'Termux 自动化安装脚本 (检测 ~/.env、安装 Go 与 cloudflared 并编译)',
    content: `#!/data/data/com.termux/files/usr/bin/bash
set -e

echo "[1/4] 更新 Termux 基础仓库..."
pkg update -y || apt-get update -y

echo "[2/4] 安装 Go 语言与 cloudflared 穿透工具..."
pkg install -y golang git curl make || apt-get install -y golang git curl make
pkg install -y cloudflared || true

echo "[3/4] 检查 ~/.env 配置文件 (在上级目录创建)..."
if [ ! -f "$HOME/.env" ] && [ ! -f "../.env" ]; then
    echo "创建 ~/.env 模板..."
fi

echo "[4/4] 编译网络版麻将可执行文件..."
CGO_ENABLED=0 go build -ldflags="-s -w" -o mahjong main.go
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
    description: '完整部署教程、~/.env 配置说明、Telegram Bot 管理员指令与 Cloudflare 隧道',
    content: `# 🀄 Termux Go Mahjong - 网络版与 Telegram 机器人管理员

## 📁 Termux 根目录 .env 配置
配置文件存放在 Termux 根目录（即 mj 文件夹的上一级 ~/.env）：
\`\`\`bash
cat << 'EOF' > ~/.env
TELEGRAM_BOT_TOKEN="7123456789:AAFLKsdjkflsajk_sdjakfls-xxxxxx"
TELEGRAM_ADMIN_ID="123456789"
PORT=8080
MAHJONG_RULE=GB
EOF
\`\`\`
`,
  },
];

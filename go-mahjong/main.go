package main

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
	// 1. Load config from parent .env (Termux root ~/ relative to ~/mj), .env, or env vars
	cfg := config.LoadConfig()

	// 2. Allow CLI flags to override
	portFlag := flag.Int("port", 0, "Web 服务监听端口 (默认使用配置或 8080)")
	ruleFlag := flag.String("rule", "", "麻将规则: GB (国标 136张) 或 SICHUAN (川麻 108张)")
	flag.Parse()

	if *portFlag > 0 {
		cfg.Port = *portFlag
	}
	if *ruleFlag != "" {
		cfg.Rule = *ruleFlag
	}

	fmt.Printf("\033[1;36m")
	fmt.Println("┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓")
	fmt.Println("┃           🀄 Termux Go 开源网络麻将服务 🀄             ┃")
	fmt.Println("┃        Termux 原生轻量运行 · Telegram Bot 管理员        ┃")
	fmt.Println("┃        Cloudflare Tunnel 穿透 · 全球公网免局域网        ┃")
	fmt.Println("┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛")
	fmt.Printf("\033[0m")

	fmt.Printf("📂 环境配置文件加载来源: %s\n", cfg.EnvLoadedFrom)
	if len(cfg.TelegramAdminIDs) > 0 {
		fmt.Printf("🛡️ 已配置 Telegram 管理员 ID: %v\n", cfg.TelegramAdminIDs)
	} else {
		fmt.Printf("⚠️ 未配置 Telegram 管理员 ID (可在上级目录 .env 中配置 TELEGRAM_ADMIN_ID)\n")
	}

	// 3. Create Web Server
	server := web.NewWebServer(cfg.Port, cfg.Rule)
	if cfg.PublicURL != "" {
		server.SetPublicURL(cfg.PublicURL)
	}

	// 4. Initialize Telegram Bot if Token configured
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
			if err := tgBot.Start(ctx); err != nil {
				fmt.Printf("[Telegram Bot] 启动后台轮询异常: %v\n", err)
			}
		}()
	} else {
		fmt.Println("ℹ️ 未检测到 TELEGRAM_BOT_TOKEN，Telegram 机器人管理未启用 (游戏 Web 服务正常运行)")
		fmt.Println("   💡 如需启用 Bot，请在 Termux 根目录 ~/.env 中配置 TELEGRAM_BOT_TOKEN 和 TELEGRAM_ADMIN_ID")
	}

	// 5. Start Web Server
	if err := server.Start(); err != nil {
		fmt.Fprintf(os.Stderr, "服务启动失败: %v\n", err)
		os.Exit(1)
	}
}

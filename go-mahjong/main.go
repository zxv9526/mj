package main

import (
	"flag"
	"fmt"
	"os"

	"github.com/user/termux-mahjong/tui"
	"github.com/user/termux-mahjong/web"
)

func main() {
	webMode := flag.Bool("web", false, "启用手机浏览器 Web 界面服务模式 (适合局域网/触摸屏操作)")
	port := flag.Int("port", 8080, "Web 服务监听端口 (默认: 8080)")
	rule := flag.String("rule", "GB", "麻将规则: GB (国标/大众十三张), SICHUAN (四川血战/108张)")
	name := flag.String("name", "雀神", "玩家名称")
	flag.Parse()

	if *webMode {
		fmt.Printf("🀄 启动 Termux 麻将 Web 服务 (端口: %d, 规则: %s)...\n", *port, *rule)
		server := web.NewWebServer(*port, *rule)
		if err := server.Start(); err != nil {
			fmt.Fprintf(os.Stderr, "服务启动失败: %v\n", err)
			os.Exit(1)
		}
	} else {
		// Terminal TUI Mode
		tg := tui.NewTerminalGame(*name, *rule)
		tg.Run()
	}
}

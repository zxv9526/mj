package main

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

	fmt.Printf("\033[1;36m")
	fmt.Println("┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓")
	fmt.Println("┃           🀄 Termux Go 开源网络麻将服务 🀄             ┃")
	fmt.Println("┃       专为 Cloudflare Tunnel 公网穿透与移动端优化      ┃")
	fmt.Println("┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛")
	fmt.Printf("\033[0m")

	server := web.NewWebServer(*port, *rule)
	if err := server.Start(); err != nil {
		fmt.Fprintf(os.Stderr, "服务启动失败: %v\n", err)
		os.Exit(1)
	}
}

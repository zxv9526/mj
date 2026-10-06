#!/data/data/com.termux/files/usr/bin/bash
# ==============================================================================
# Termux 一键全自动环境配置、编译与运行脚本
# 适用平台: Android Termux (ARM64 / ARM32 / x86_64)
# ==============================================================================

set -e

echo -e "\033[1;36m"
echo "  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓"
echo "  ┃   🀄 Termux Go 纯终端麻将环境自动化安装向导    ┃"
echo "  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛"
echo -e "\033[0m"

echo -e "\033[1;33m[1/4] 检查并更新 Termux 基础软件包仓库...\033[0m"
pkg update -y || apt-get update -y

echo -e "\033[1;33m[2/4] 安装 Go 语言与 Git 工具链...\033[0m"
pkg install -y golang git make || apt-get install -y golang git make

echo -e "\033[1;32m✓ Go 语言版本信息:\033[0m"
go version

echo -e "\033[1;33m[3/4] 编译麻将游戏为本地原生二进制可执行文件...\033[0m"
CGO_ENABLED=0 go build -ldflags="-s -w" -o mahjong main.go

echo -e "\033[1;32m✓ 编译成功！生成文件: ./mahjong\033[0m"

echo -e "\033[1;33m[4/4] 注册系统级快捷指令 (可选)...\033[0m"
mkdir -p "$PREFIX/bin"
cp -f mahjong "$PREFIX/bin/mahjong"
chmod +x "$PREFIX/bin/mahjong"

echo -e "\033[1;32m"
echo "  ================================================================"
echo "  🎉 安装与部署全部完成！"
echo "  "
echo "  👉 启动终端 TUI 麻将:    mahjong"
echo "  👉 启动手机 Web 触摸版:  mahjong -web"
echo "  👉 指定川麻血战规则:     mahjong -rule SICHUAN"
echo "  ================================================================"
echo -e "\033[0m"

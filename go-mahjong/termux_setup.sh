#!/data/data/com.termux/files/usr/bin/bash
# ==============================================================================
# Termux 一键自动化配置、编译与 Cloudflare Tunnel 隧道安装脚本
# 适用平台: Android Termux (ARM64 / ARM32 / x86_64)
# ==============================================================================

set -e

echo -e "\033[1;36m"
echo "  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓"
echo "  ┃  🀄 Termux 麻将网络版 + Cloudflare 隧道部署向导  ┃"
echo "  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛"
echo -e "\033[0m"

echo -e "\033[1;33m[1/5] 更新 Termux 基础软件包仓库...\033[0m"
pkg update -y || apt-get update -y

echo -e "\033[1;33m[2/5] 安装 Go 语言与 Git 工具链...\033[0m"
pkg install -y golang git curl make || apt-get install -y golang git curl make

echo -e "\033[1;33m[3/5] 检查并配置 Cloudflare Tunnel (cloudflared 工具)...\033[0m"
if command -v cloudflared >/dev/null 2>&1; then
    echo -e "\033[1;32m✓ 检测到 cloudflared 已安装\033[0m"
else
    echo "正在尝试通过 pkg 安装 cloudflared..."
    if pkg install -y cloudflared 2>/dev/null; then
        echo -e "\033[1;32m✓ cloudflared 安装成功\033[0m"
    else
        echo "正在从官方下载适用于 Android ARM64 的 cloudflared 独立二进制文件..."
        ARCH=$(uname -m)
        CF_URL=""
        if [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
            CF_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64"
        elif [ "$ARCH" = "armv7l" ] || [ "$ARCH" = "arm" ]; then
            CF_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm"
        else
            CF_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64"
        fi
        mkdir -p "$PREFIX/bin"
        curl -sSL "$CF_URL" -o "$PREFIX/bin/cloudflared" && chmod +x "$PREFIX/bin/cloudflared" || true
        echo -e "\033[1;32m✓ cloudflared 配置完毕\033[0m"
    fi
fi

echo -e "\033[1;33m[4/5] 创建 SVG 牌面存放目录 (如未存在)...\033[0m"
mkdir -p web/static/tiles
echo "提示: 可随时将自定义 SVG 牌面图片拷贝至 web/static/tiles/ 目录下。"

echo -e "\033[1;33m[5/5] 编译麻将 Web 服务可执行文件...\033[0m"
CGO_ENABLED=0 go build -ldflags="-s -w" -o mahjong main.go
mkdir -p "$PREFIX/bin"
cp -f mahjong "$PREFIX/bin/mahjong"
chmod +x "$PREFIX/bin/mahjong"

echo -e "\033[1;32m"
echo "  ================================================================"
echo "  🎉 部署完成！随时开玩！"
echo "  "
echo "  👉 启动游戏 Web 服务:  mahjong"
echo "  👉 生成公网免局域网链接: cloudflared tunnel --url http://localhost:8080"
echo "  "
echo "  💡 玩家无论处于蜂窝移动数据还是其他网络，点击生成的 HTTPS 网址即可立即加入！"
echo "  ================================================================"
echo -e "\033[0m"

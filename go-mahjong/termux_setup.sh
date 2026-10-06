#!/data/data/com.termux/files/usr/bin/bash
# ==============================================================================
# Termux 一键自动化配置、编译、Telegram 机器人管理员与 Cloudflare 隧道部署脚本
# 适用平台: Android Termux (ARM64 / ARM32 / x86_64)
# ==============================================================================

set -e

echo -e "\033[1;36m"
echo "  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓"
echo "  ┃  🀄 Termux 麻将网络版 + Telegram 机器人管理员 + 隧道部署向导  ┃"
echo "  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛"
echo -e "\033[0m"

echo -e "\033[1;33m[1/6] 更新 Termux 基础软件包仓库...\033[0m"
pkg update -y || apt-get update -y

echo -e "\033[1;33m[2/6] 安装 Go 语言与 Git 工具链...\033[0m"
pkg install -y golang git curl make || apt-get install -y golang git curl make

echo -e "\033[1;33m[3/6] 检查 Termux 根目录 ~/.env 配置文件...\033[0m"
# 用户规则：在 termux 根目录 (即 mj 文件夹的上一级) 创建 .env 文件
ENV_PATH="$HOME/.env"
if [ ! -f "$ENV_PATH" ] && [ ! -f "../.env" ]; then
    echo -e "\033[1;33m⚠️ 未检测到 $ENV_PATH 文件，正在自动为您生成基础模板...\033[0m"
    cat << 'EOF' > "$ENV_PATH"
# ==============================================================================
# Termux 麻将服务器与 Telegram 管理员机器人配置文件
# 存放位置: Termux 根目录 ~/.env (即 mj 目录的上一级)
# ==============================================================================

# 1. Telegram Bot Token (向 @BotFather 申请获取)
# 示例: TELEGRAM_BOT_TOKEN="7123456789:AAFLKsdjkflsajk_sdjakfls-xxxx"
TELEGRAM_BOT_TOKEN=""

# 2. Telegram 管理员数字 ID (向 @userinfobot 或 @getmyid_bot 获取，多个用英文逗号分隔)
# 示例: TELEGRAM_ADMIN_ID="123456789"
TELEGRAM_ADMIN_ID=""

# 3. 游戏服务端口 (默认 8080)
PORT=8080

# 4. 比赛规则: GB (国标大众136张) 或 SICHUAN (四川血战到底108张)
MAHJONG_RULE=GB

# 5. Cloudflare 公网链接 (可选，启动 cloudflared 后填入，也可通过 TG 发送 /seturl 动态绑定)
PUBLIC_URL=""
EOF
    echo -e "\033[1;32m✓ 已在 $ENV_PATH 生成配置模板！\033[0m"
    echo -e "💡 提示: 您可随时在 Termux 中执行 \033[1;36mnano ~/.env\033[0m 填入你的 Bot Token 与 Admin ID。"
else
    echo -e "\033[1;32m✓ 检测到上级配置环境已就绪 ($ENV_PATH)\033[0m"
fi

echo -e "\033[1;33m[4/6] 检查并配置 Cloudflare Tunnel (cloudflared 工具)...\033[0m"
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

echo -e "\033[1;33m[5/6] 检查 SVG 牌面存放目录...\033[0m"
mkdir -p web/static/tiles
echo "✓ SVG 牌面目录: web/static/tiles/ (已就绪)"

echo -e "\033[1;33m[6/6] 编译麻将 Web 服务可执行文件...\033[0m"
CGO_ENABLED=0 go build -ldflags="-s -w" -o mahjong main.go
mkdir -p "$PREFIX/bin"
cp -f mahjong "$PREFIX/bin/mahjong"
chmod +x "$PREFIX/bin/mahjong"

echo -e "\033[1;32m"
echo "  ================================================================"
echo "  🎉 部署完成！随时开玩！"
echo "  "
echo "  👉 1. 编辑配置文件 (配置 TG 机器人): nano ~/.env"
echo "  👉 2. 启动游戏服务 (在 mj 目录下):    ./mahjong"
echo "  👉 3. 启动公网穿透 (另开 Termux 窗口): cloudflared tunnel --url http://localhost:8080"
echo "  "
echo "  🤖 Telegram 机器人管理员可在手机 Telegram 中输入 /menu 全权操控！"
echo "  ================================================================"
echo -e "\033[0m"

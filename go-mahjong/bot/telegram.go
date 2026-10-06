package bot

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/user/termux-mahjong/config"
)

// ServerController defines methods the bot can execute on the WebServer
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

// ServerSummary contains stats for status display
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

// TelegramBot handles admin interaction via Telegram Bot API
type TelegramBot struct {
	token       string
	adminIDs    map[int64]bool
	adminList   []int64
	controller  ServerController
	client      *http.Client
	botUser     *tgUser
	mu          sync.Mutex
	running     bool
	startTime   time.Time
	apiBase     string
	pendingCmds map[int64]string // Tracks awaiting input (e.g. broadcast message)
}

// Telegram API Types
type tgUser struct {
	ID        int64  `json:"id"`
	FirstName string `json:"first_name"`
	Username  string `json:"username"`
}

type tgChat struct {
	ID   int64  `json:"id"`
	Type string `json:"type"`
}

type tgMessage struct {
	MessageID int64   `json:"message_id"`
	From      *tgUser `json:"from"`
	Chat      tgChat  `json:"chat"`
	Text      string  `json:"text"`
	Date      int64   `json:"date"`
}

type tgCallbackQuery struct {
	ID      string     `json:"id"`
	From    *tgUser    `json:"from"`
	Message *tgMessage `json:"message"`
	Data    string     `json:"data"`
}

type tgUpdate struct {
	UpdateID      int64            `json:"update_id"`
	Message       *tgMessage       `json:"message"`
	CallbackQuery *tgCallbackQuery `json:"callback_query"`
}

type tgApiResponse struct {
	OK          bool            `json:"ok"`
	Result      json.RawMessage `json:"result"`
	Description string          `json:"description"`
}

type InlineKeyboardButton struct {
	Text         string `json:"text"`
	CallbackData string `json:"callback_data,omitempty"`
	URL          string `json:"url,omitempty"`
}

type InlineKeyboardMarkup struct {
	InlineKeyboard [][]InlineKeyboardButton `json:"inline_keyboard"`
}

// NewTelegramBot creates a bot instance
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
		adminList:   cfg.TelegramAdminIDs,
		controller:  ctrl,
		client:      &http.Client{Timeout: 35 * time.Second},
		startTime:   time.Now(),
		apiBase:     fmt.Sprintf("https://api.telegram.org/bot%s", cfg.TelegramBotToken),
		pendingCmds: make(map[int64]string),
	}
}

// Start runs the bot polling loop in background
func (b *TelegramBot) Start(ctx context.Context) error {
	b.mu.Lock()
	b.running = true
	b.mu.Unlock()

	// Verify token
	user, err := b.getMe()
	if err != nil {
		fmt.Printf("\033[1;31m[Telegram Bot] ⚠️ 无法连接 Telegram Bot API: %v (请检查 TOKEN 是否有效或网络连接)\033[0m\n", err)
		return err
	}
	b.botUser = user

	fmt.Printf("\033[1;32m[Telegram Bot] ✓ 机器人验证成功: @%s (ID: %d)\033[0m\n", user.Username, user.ID)
	if len(b.adminIDs) > 0 {
		fmt.Printf("\033[1;32m[Telegram Bot] ✓ 授权管理员数: %d 位 (管理员可在 Telegram 手机端输入 /menu 控制游戏)\033[0m\n", len(b.adminIDs))
	} else {
		fmt.Printf("\033[1;33m[Telegram Bot] ⚠️ 提示: 尚未配置 TELEGRAM_ADMIN_ID，可在上级目录 .env 中添加你的 TG 数字 ID\033[0m\n")
	}

	// Send startup notification to all admins
	b.NotifyAdmins(b.formatStartupMessage())

	go b.pollLoop(ctx)
	return nil
}

func (b *TelegramBot) pollLoop(ctx context.Context) {
	var offset int64 = 0
	for {
		select {
		case <-ctx.Done():
			return
		default:
		}

		updates, err := b.getUpdates(offset, 25)
		if err != nil {
			time.Sleep(3 * time.Second)
			continue
		}

		for _, u := range updates {
			if u.UpdateID >= offset {
				offset = u.UpdateID + 1
			}

			if u.Message != nil {
				b.handleMessage(u.Message)
			} else if u.CallbackQuery != nil {
				b.handleCallback(u.CallbackQuery)
			}
		}
	}
}

func (b *TelegramBot) isAdmin(userID int64) bool {
	if len(b.adminIDs) == 0 {
		return false
	}
	return b.adminIDs[userID]
}

func (b *TelegramBot) handleMessage(msg *tgMessage) {
	if msg.From == nil {
		return
	}
	userID := msg.From.ID
	chatID := msg.Chat.ID
	text := strings.TrimSpace(msg.Text)

	// Check Admin permission
	if !b.isAdmin(userID) {
		reply := fmt.Sprintf(
			"⛔️ <b>权限不足 (Access Denied)</b>\n\n"+
				"您不是本 Termux 麻将服务器的指定管理员。\n"+
				"👤 <b>您的 Telegram ID</b>: <code>%d</code>\n\n"+
				"💡 <b>授权方法</b>:\n"+
				"请在 Termux 根目录(或上级目录)的 <code>.env</code> 文件中加入:\n"+
				"<code>TELEGRAM_ADMIN_ID=\"%d\"</code>\n"+
				"保存后重启游戏服务即可获得完全控制权。",
			userID, userID,
		)
		b.sendMessage(chatID, reply, nil)
		return
	}

	// Check if awaiting pending input (e.g. broadcast message)
	b.mu.Lock()
	pending, hasPending := b.pendingCmds[userID]
	if hasPending {
		delete(b.pendingCmds, userID)
	}
	b.mu.Unlock()

	if hasPending && pending == "awaiting_broadcast" && !strings.HasPrefix(text, "/") {
		b.controller.SetBroadcastBanner(text)
		b.sendMessage(chatID, fmt.Sprintf("📢 <b>广播公告发布成功！</b>\n\n全服跑马灯已更新为:\n<blockquote>%s</blockquote>", text), b.mainMenuKeyboard())
		return
	}

	// Command routing
	parts := strings.Fields(text)
	cmd := ""
	if len(parts) > 0 {
		cmd = strings.ToLower(parts[0])
		if idx := strings.Index(cmd, "@"); idx != -1 {
			cmd = cmd[:idx] // strip @botusername
		}
	}

	switch cmd {
	case "/start", "/menu":
		b.sendMessage(chatID, b.formatMenuText(), b.mainMenuKeyboard())

	case "/status":
		b.sendMessage(chatID, b.formatStatusText(), b.mainMenuKeyboard())

	case "/url":
		b.sendMessage(chatID, b.formatURLText(), b.urlActionKeyboard())

	case "/seturl":
		if len(parts) > 1 {
			newURL := parts[1]
			b.controller.SetPublicURL(newURL)
			b.sendMessage(chatID, fmt.Sprintf("✅ <b>公网网址已更新为</b>:\n<a href=\"%s\">%s</a>", newURL, newURL), b.mainMenuKeyboard())
		} else {
			b.sendMessage(chatID, "💡 <b>用法说明</b>:\n<code>/seturl https://xxx.trycloudflare.com</code>", nil)
		}

	case "/room", "/rooms", "/game":
		b.sendMessage(chatID, b.controller.GetGameDetail(), b.mainMenuKeyboard())

	case "/reset":
		res := b.controller.ResetGame()
		b.sendMessage(chatID, fmt.Sprintf("🔄 <b>%s</b>", res), b.mainMenuKeyboard())

	case "/rule":
		if len(parts) > 1 {
			ruleName := strings.ToUpper(parts[1])
			res := b.controller.SwitchRule(ruleName)
			b.sendMessage(chatID, res, b.mainMenuKeyboard())
		} else {
			b.sendMessage(chatID, "💡 <b>用法说明</b>:\n<code>/rule GB</code> (大众国标 136张)\n<code>/rule SICHUAN</code> (四川血战到底 108张)", b.mainMenuKeyboard())
		}

	case "/broadcast", "/bc":
		if len(parts) > 1 {
			content := strings.Join(parts[1:], " ")
			b.controller.SetBroadcastBanner(content)
			b.sendMessage(chatID, fmt.Sprintf("📢 <b>广播已发送</b>:\n<blockquote>%s</blockquote>", content), b.mainMenuKeyboard())
		} else {
			b.mu.Lock()
			b.pendingCmds[userID] = "awaiting_broadcast"
			b.mu.Unlock()
			b.sendMessage(chatID, "📢 <b>请输入你要广播给全服玩家的内容:</b>\n(直接回复文本，例如: <i>『今晚雀神争霸赛正式开打！』</i>)", nil)
		}

	case "/clearbanner":
		b.controller.SetBroadcastBanner("")
		b.sendMessage(chatID, "🧹 <b>已清除全服跑马灯公告。</b>", b.mainMenuKeyboard())

	case "/help":
		b.sendMessage(chatID, b.formatHelpText(), b.mainMenuKeyboard())

	default:
		b.sendMessage(chatID, "❓ 未知指令，发送 /menu 呼出管理菜单，或 /help 查看指令集。", b.mainMenuKeyboard())
	}
}

func (b *TelegramBot) handleCallback(cq *tgCallbackQuery) {
	if cq.From == nil {
		return
	}
	userID := cq.From.ID
	chatID := cq.Message.Chat.ID
	data := cq.Data

	if !b.isAdmin(userID) {
		b.answerCallbackQuery(cq.ID, "⛔️ 您不是管理员，无权操作！", true)
		return
	}

	b.answerCallbackQuery(cq.ID, "", false)

	switch data {
	case "btn_status":
		b.sendMessage(chatID, b.formatStatusText(), b.mainMenuKeyboard())
	case "btn_url":
		b.sendMessage(chatID, b.formatURLText(), b.urlActionKeyboard())
	case "btn_game":
		b.sendMessage(chatID, b.controller.GetGameDetail(), b.mainMenuKeyboard())
	case "btn_reset":
		res := b.controller.ResetGame()
		b.sendMessage(chatID, fmt.Sprintf("🔄 <b>%s</b>", res), b.mainMenuKeyboard())
	case "btn_rule_toggle":
		sum := b.controller.GetStatusSummary()
		newRule := "SICHUAN"
		if sum.Rule == "SICHUAN" {
			newRule = "GB"
		}
		res := b.controller.SwitchRule(newRule)
		b.sendMessage(chatID, fmt.Sprintf("⚙️ %s", res), b.mainMenuKeyboard())
	case "btn_broadcast_prompt":
		b.mu.Lock()
		b.pendingCmds[userID] = "awaiting_broadcast"
		b.mu.Unlock()
		b.sendMessage(chatID, "📢 <b>请输入你要广播的通知内容:</b>\n(直接在此聊天窗口发送文字即可)", nil)
	case "btn_help":
		b.sendMessage(chatID, b.formatHelpText(), b.mainMenuKeyboard())
	}
}

// Menu Keyboards
func (b *TelegramBot) mainMenuKeyboard() *InlineKeyboardMarkup {
	pubURL := b.controller.GetPublicURL()
	var row1 []InlineKeyboardButton
	row1 = append(row1, InlineKeyboardButton{Text: "📊 服务器状态", CallbackData: "btn_status"})
	row1 = append(row1, InlineKeyboardButton{Text: "🀄 实时对局", CallbackData: "btn_game"})

	var row2 []InlineKeyboardButton
	row2 = append(row2, InlineKeyboardButton{Text: "🔗 链接与分享", CallbackData: "btn_url"})
	row2 = append(row2, InlineKeyboardButton{Text: "📢 全服广播", CallbackData: "btn_broadcast_prompt"})

	var row3 []InlineKeyboardButton
	row3 = append(row3, InlineKeyboardButton{Text: "🔄 强制新局", CallbackData: "btn_reset"})
	row3 = append(row3, InlineKeyboardButton{Text: "⚙️ 切换规则", CallbackData: "btn_rule_toggle"})

	var row4 []InlineKeyboardButton
	if pubURL != "" {
		row4 = append(row4, InlineKeyboardButton{Text: "🌐 直达网页", URL: pubURL})
	}
	row4 = append(row4, InlineKeyboardButton{Text: "🆘 指令说明", CallbackData: "btn_help"})

	return &InlineKeyboardMarkup{
		InlineKeyboard: [][]InlineKeyboardButton{row1, row2, row3, row4},
	}
}

func (b *TelegramBot) urlActionKeyboard() *InlineKeyboardMarkup {
	pubURL := b.controller.GetPublicURL()
	var row []InlineKeyboardButton
	if pubURL != "" {
		row = append(row, InlineKeyboardButton{Text: "👉 进入游戏 (网页 PWA)", URL: pubURL})
	}
	row = append(row, InlineKeyboardButton{Text: "🔙 返回主菜单", CallbackData: "btn_status"})
	return &InlineKeyboardMarkup{
		InlineKeyboard: [][]InlineKeyboardButton{row},
	}
}

// Text formatters
func (b *TelegramBot) formatStartupMessage() string {
	sum := b.controller.GetStatusSummary()
	pubLink := sum.PublicURL
	if pubLink == "" {
		pubLink = fmt.Sprintf("http://localhost:%d (待启动 Cloudflare)", sum.Port)
	}

	return fmt.Sprintf(
		"🚀 <b>【Termux 麻将服务器已启动就绪】</b>\n\n"+
			"⏱ <b>启动时间</b>: %s\n"+
			"🚪 <b>监听端口</b>: <code>%d</code>\n"+
			"📜 <b>当前规则</b>: <b>%s</b>\n"+
			"🌐 <b>游戏链接</b>: <a href=\"%s\">%s</a>\n\n"+
			"🤖 <b>管理员已授权</b>: 您可在随时发送 /menu 管理游戏。",
		b.startTime.Format("2006-01-02 15:04:05"),
		sum.Port,
		sum.Rule,
		pubLink,
		pubLink,
	)
}

func (b *TelegramBot) formatMenuText() string {
	sum := b.controller.GetStatusSummary()
	return fmt.Sprintf(
		"🀄 <b>雀神天下 · Termux 麻将管理员中控台</b>\n\n"+
			"⚡️ <b>运行状态</b>: 🟢 运行中 (端口: %d)\n"+
			"📜 <b>比赛规则</b>: <b>%s</b>\n"+
			"📢 <b>当前公告</b>: %s\n\n"+
			"请点击下方快捷按钮进行操控，或直接输入指令管理。",
		sum.Port,
		sum.Rule,
		formatBanner(sum.Banner),
	)
}

func (b *TelegramBot) formatStatusText() string {
	sum := b.controller.GetStatusSummary()
	uptime := time.Since(b.startTime).Round(time.Second)

	var memStats runtime.MemStats
	runtime.ReadMemStats(&memStats)
	allocMB := float64(memStats.Alloc) / 1024 / 1024

	pubURL := sum.PublicURL
	if pubURL == "" {
		pubURL = "未配置 (执行 cloudflared 获取后可用 /seturl 绑定)"
	}

	return fmt.Sprintf(
		"📊 <b>【Termux 服务器与对局状态】</b>\n\n"+
			"⏱ <b>持续运行</b>: <code>%s</code>\n"+
			"📱 <b>系统宿主</b>: Android Termux (Goroutines: %d, 内存: %.2f MB)\n"+
			"🔌 <b>本地端口</b>: <code>%d</code>\n"+
			"🌐 <b>穿透网址</b>: <a href=\"%s\">%s</a>\n\n"+
			"🀄 <b>牌桌详情</b>:\n"+
			"• 牌墙剩余: <b>%d 张</b>\n"+
			"• 当前出牌权: %s\n"+
			"• 牌局状态: %s\n\n"+
			"👥 <b>玩家计分板</b>:\n%s",
		uptime,
		runtime.NumGoroutine(),
		allocMB,
		sum.Port,
		pubURL,
		pubURL,
		sum.WallCount,
		sum.CurrentTurn,
		formatGameOver(sum.IsGameOver),
		strings.Join(sum.PlayerScores, "\n"),
	)
}

func (b *TelegramBot) formatURLText() string {
	pubURL := b.controller.GetPublicURL()
	if pubURL == "" {
		return "⚠️ <b>尚未配置公网隧道网址</b>\n\n请在 Termux 中运行:\n<code>cloudflared tunnel --url http://localhost:8080</code>\n\n获取到网址后，向 Bot 发送:\n<code>/seturl https://xxx.trycloudflare.com</code> 即可更新！"
	}

	return fmt.Sprintf(
		"🔗 <b>【游戏公网分享链接】</b>\n\n"+
			"👉 <b>直接进入</b>:\n<a href=\"%s\">%s</a>\n\n"+
			"📋 <b>微信/QQ/TG 组局一键邀请文案</b> (长按复制):\n"+
			"——————————————\n"+
			"🀄 <b>【雀神天下】麻将三缺一！速来开搓！</b>\n"+
			"🌐 手机点开即玩: %s\n"+
			"✨ 纯正中文语音报牌 · 碰杠胡超燃音效 · 支持保存到桌面 PWA\n"+
			"——————————————",
		pubURL, pubURL, pubURL,
	)
}

func (b *TelegramBot) formatHelpText() string {
	return "📖 <b>【Termux 麻将管理员指令大全】</b>\n\n" +
		"• <code>/menu</code> - 呼出交互式控制按键面板\n" +
		"• <code>/status</code> - 查看 Termux 硬件内存、牌局与玩家数据\n" +
		"• <code>/url</code> - 获取全球公网免局域网邀请卡片\n" +
		"• <code>/seturl &lt;url&gt;</code> - 动态更新 Cloudflare 穿透链接\n" +
		"• <code>/game</code> - 查看实时麻将牌桌与各家分数\n" +
		"• <code>/broadcast &lt;文字&gt;</code> - 发送全服顶部跑马灯横幅\n" +
		"• <code>/clearbanner</code> - 清除顶部跑马灯\n" +
		"• <code>/reset</code> - 强制重新洗牌开新局\n" +
		"• <code>/rule &lt;GB|SICHUAN&gt;</code> - 切换国标(136张)与川麻(108张)\n" +
		"• <code>/help</code> - 显示本帮助说明"
}

func formatBanner(b string) string {
	if b == "" {
		return "<i>(暂无)</i>"
	}
	return fmt.Sprintf("「%s」", b)
}

func formatGameOver(isOver bool) string {
	if isOver {
		return "🏁 对局已结束 (等待重开)"
	}
	return "🟢 对局火热进行中"
}

// NotifyAdmins sends an alert to all configured admin chat IDs
func (b *TelegramBot) NotifyAdmins(htmlText string) {
	if b == nil || !b.running {
		return
	}
	for id := range b.adminIDs {
		go b.sendMessage(id, htmlText, nil)
	}
}

// NotifyWin alerts the admin when someone wins
func (b *TelegramBot) NotifyWin(winnerName string, pattern string, fan int, score int, isSelfDraw bool) {
	winType := "荣和 (点炮)"
	if isSelfDraw {
		winType = "自摸"
	}
	msg := fmt.Sprintf(
		"🀄 <b>【牌局捷报 · 精彩胡牌！】</b>\n\n"+
			"🏆 <b>赢家</b>: <b>%s</b>\n"+
			"🎉 <b>胡牌方式</b>: <b>%s</b>\n"+
			"🎴 <b>牌型番种</b>: <code>%s</code>\n"+
			"💰 <b>结算番数</b>: <b>%d 番</b> (+%d 分)\n\n"+
			"可发送 /game 查看各家最新筹码得分。",
		winnerName, winType, pattern, fan, score,
	)
	b.NotifyAdmins(msg)
}

// Low-level Telegram API calls
func (b *TelegramBot) getMe() (*tgUser, error) {
	url := fmt.Sprintf("%s/getMe", b.apiBase)
	resp, err := b.client.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var apiResp tgApiResponse
	if err := json.NewDecoder(resp.Body).Decode(&apiResp); err != nil {
		return nil, err
	}
	if !apiResp.OK {
		return nil, fmt.Errorf("telegram API error: %s", apiResp.Description)
	}

	var user tgUser
	if err := json.Unmarshal(apiResp.Result, &user); err != nil {
		return nil, err
	}
	return &user, nil
}

func (b *TelegramBot) getUpdates(offset int64, timeout int) ([]tgUpdate, error) {
	url := fmt.Sprintf("%s/getUpdates?offset=%d&timeout=%d", b.apiBase, offset, timeout)
	resp, err := b.client.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var apiResp tgApiResponse
	if err := json.NewDecoder(resp.Body).Decode(&apiResp); err != nil {
		return nil, err
	}
	if !apiResp.OK {
		return nil, fmt.Errorf("telegram error: %s", apiResp.Description)
	}

	var updates []tgUpdate
	if err := json.Unmarshal(apiResp.Result, &updates); err != nil {
		return nil, err
	}
	return updates, nil
}

func (b *TelegramBot) sendMessage(chatID int64, text string, replyMarkup *InlineKeyboardMarkup) error {
	payload := map[string]interface{}{
		"chat_id":    chatID,
		"text":       text,
		"parse_mode": "HTML",
	}
	if replyMarkup != nil {
		payload["reply_markup"] = replyMarkup
	}

	body, _ := json.Marshal(payload)
	url := fmt.Sprintf("%s/sendMessage", b.apiBase)
	resp, err := b.client.Post(url, "application/json", bytes.NewBuffer(body))
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	return nil
}

func (b *TelegramBot) answerCallbackQuery(cqID string, text string, showAlert bool) {
	payload := map[string]interface{}{
		"callback_query_id": cqID,
		"show_alert":        showAlert,
	}
	if text != "" {
		payload["text"] = text
	}

	body, _ := json.Marshal(payload)
	url := fmt.Sprintf("%s/answerCallbackQuery", b.apiBase)
	_, _ = b.client.Post(url, "application/json", bytes.NewBuffer(body))
}

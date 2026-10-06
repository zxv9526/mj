package web

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/user/termux-mahjong/engine"
)

// WinNotifier receives game outcome events to forward to Telegram
type WinNotifier interface {
	NotifyWin(winnerName string, pattern string, fan int, score int, isSelfDraw bool)
}

// WebServer provides HTTP server on Termux
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

// NewWebServer creates a web server
func NewWebServer(port int, rule string) *WebServer {
	if rule == "" {
		rule = "GB"
	}
	return &WebServer{
		game:      engine.NewGame("房主 (你)", rule),
		port:      port,
		rule:      rule,
		startTime: time.Now(),
	}
}

// SetNotifier registers the Telegram bot for push alerts
func (ws *WebServer) SetNotifier(n WinNotifier) {
	ws.mu.Lock()
	defer ws.mu.Unlock()
	ws.notifier = n
}

// SetPublicURL sets the public Cloudflare tunnel URL
func (ws *WebServer) SetPublicURL(url string) {
	ws.mu.Lock()
	defer ws.mu.Unlock()
	ws.publicURL = url
}

// GetPublicURL gets the current public URL
func (ws *WebServer) GetPublicURL() string {
	ws.mu.Lock()
	defer ws.mu.Unlock()
	return ws.publicURL
}

// SetBroadcastBanner updates the server-wide marquee announcement
func (ws *WebServer) SetBroadcastBanner(msg string) {
	ws.mu.Lock()
	defer ws.mu.Unlock()
	ws.broadcastBanner = msg
}

// GetBroadcastBanner retrieves the marquee announcement
func (ws *WebServer) GetBroadcastBanner() string {
	ws.mu.Lock()
	defer ws.mu.Unlock()
	return ws.broadcastBanner
}

// ResetGame resets the game and deals new hands
func (ws *WebServer) ResetGame() string {
	ws.mu.Lock()
	defer ws.mu.Unlock()
	ws.game = engine.NewGame("房主 (你)", ws.rule)
	return fmt.Sprintf("牌局已重置并重新洗牌，当前规则: %s", ws.rule)
}

// SwitchRule toggles between GB and SICHUAN
func (ws *WebServer) SwitchRule(newRule string) string {
	ws.mu.Lock()
	defer ws.mu.Unlock()
	if newRule != "SICHUAN" {
		newRule = "GB"
	}
	ws.rule = newRule
	ws.game = engine.NewGame("房主 (你)", newRule)
	desc := "大众国标 (136张)"
	if newRule == "SICHUAN" {
		desc = "四川血战到底 (108张，去字牌)"
	}
	return fmt.Sprintf("规则已切换为: %s (%s)，已开启新对局", newRule, desc)
}

// ServerStateSummary contains snapshot data for status display
type ServerStateSummary struct {
	Rule         string
	WallCount    int
	IsGameOver   bool
	CurrentTurn  string
	PlayerScores []string
}

// GetStatusSummaryState returns table summary for status display
func (ws *WebServer) GetStatusSummaryState() ServerStateSummary {
	ws.mu.Lock()
	defer ws.mu.Unlock()

	turnName := "未知"
	if ws.game.CurrentTurn >= 0 && ws.game.CurrentTurn < 4 {
		turnName = ws.game.Players[ws.game.CurrentTurn].Name
	}

	var scores []string
	for _, p := range ws.game.Players {
		scores = append(scores, fmt.Sprintf("• %s (%s): %d分", p.Name, p.Wind, p.Score))
	}

	return ServerStateSummary{
		Rule:         ws.rule,
		WallCount:    ws.game.WallRemaining,
		IsGameOver:   ws.game.IsGameOver,
		CurrentTurn:  turnName,
		PlayerScores: scores,
	}
}

// GetGameDetail formats table status for the Telegram Bot
func (ws *WebServer) GetGameDetail() string {
	ws.mu.Lock()
	defer ws.mu.Unlock()

	var sb strings.Builder
	sb.WriteString("🀄 <b>【实时麻将牌桌看板】</b>\n\n")
	sb.WriteString(fmt.Sprintf("• <b>对局名称</b>: %s (%s)\n", ws.game.RoundName, ws.rule))
	sb.WriteString(fmt.Sprintf("• <b>牌墙剩余</b>: %d 张\n", ws.game.WallRemaining))

	turnName := "未知"
	if ws.game.CurrentTurn >= 0 && ws.game.CurrentTurn < 4 {
		turnName = ws.game.Players[ws.game.CurrentTurn].Name
	}
	sb.WriteString(fmt.Sprintf("• <b>当前摸/出牌权</b>: <b>%s</b>\n", turnName))

	if ws.game.LastDiscard != nil {
		sb.WriteString(fmt.Sprintf("• <b>最新打出牌</b>: <code>%s</code>\n", ws.game.LastDiscard.Name))
	}

	sb.WriteString("\n👥 <b>四方选手状态</b>:\n")
	for i, p := range ws.game.Players {
		tag := "👤"
		if p.IsAI {
			tag = "🤖"
		}
		status := "理牌中"
		if p.HasWon {
			status = "🏆 已胡牌"
		} else if p.IsTing {
			status = "⚡️ 已听牌"
		}
		sb.WriteString(fmt.Sprintf("%s <b>[%s] %s</b>: %d分 (%d张手牌, %s)\n",
			tag, p.Wind, p.Name, p.Score, len(p.Hand), status))
		_ = i
	}

	if len(ws.game.HistoryLogs) > 0 {
		lastLog := ws.game.HistoryLogs[len(ws.game.HistoryLogs)-1]
		sb.WriteString(fmt.Sprintf("\n📜 <b>最新动作</b>: <i>%s</i>", lastLog))
	}

	return sb.String()
}

// Start launches the HTTP server
func (ws *WebServer) Start() error {
	mux := http.NewServeMux()

	// 1. Static file server for uploaded SVG tiles (web/static/tiles/)
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
		fmt.Printf("📁 已挂载静态资源目录: %s (SVG 牌面路径: /static/tiles/*.svg)\n", foundStatic)
	} else {
		_ = os.MkdirAll("web/static/tiles", 0755)
		fileServer := http.StripPrefix("/static/", http.FileServer(http.Dir("web/static")))
		mux.Handle("/static/", fileServer)
		fmt.Printf("📁 已创建并挂载静态资源目录: web/static (请将 SVG 放入 web/static/tiles/)\n")
	}

	// 2. Application routes
	mux.HandleFunc("/", ws.handleIndex)
	mux.HandleFunc("/api/state", ws.handleState)
	mux.HandleFunc("/api/discard", ws.handleDiscard)
	mux.HandleFunc("/api/action", ws.handleAction)
	mux.HandleFunc("/api/reset", ws.handleReset)
	mux.HandleFunc("/api/tiles-info", ws.handleTilesInfo)
	mux.HandleFunc("/api/config", ws.handleConfig)
	mux.HandleFunc("/api/broadcast", ws.handleBroadcast)

	addr := fmt.Sprintf("0.0.0.0:%d", ws.port)

	fmt.Println("────────────────────────────────────────────────────────")
	fmt.Printf("🚀 麻将 Web 游戏服务已在端口 %d 启动就绪！\n", ws.port)
	fmt.Printf("📱 本地局域网测试:  http://localhost:%d\n\n", ws.port)
	fmt.Println("🌐 【Cloudflare Tunnel 公网发布指南】:")
	fmt.Println("   只需在 Termux 中新开一个会话窗口，执行以下命令:")
	fmt.Printf("   \033[1;32mcloudflared tunnel --url http://localhost:%d\033[0m\n", ws.port)
	fmt.Println("   👉 即可获得免费全球 HTTPS 访问公网网址 (如 https://xxx.trycloudflare.com)")
	fmt.Println("   👉 任何玩家无需处于同一 WiFi，点击公网链接即可进入游戏！")
	fmt.Println("────────────────────────────────────────────────────────")

	return http.ListenAndServe(addr, mux)
}

func (ws *WebServer) handleConfig(w http.ResponseWriter, r *http.Request) {
	ws.mu.Lock()
	defer ws.mu.Unlock()

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	json.NewEncoder(w).Encode(map[string]interface{}{
		"port":            ws.port,
		"rule":            ws.rule,
		"publicUrl":       ws.publicURL,
		"broadcastBanner": ws.broadcastBanner,
		"uptimeSeconds":   int(time.Since(ws.startTime).Seconds()),
	})
}

func (ws *WebServer) handleBroadcast(w http.ResponseWriter, r *http.Request) {
	ws.mu.Lock()
	defer ws.mu.Unlock()

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	msg := r.URL.Query().Get("msg")
	ws.broadcastBanner = msg

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"banner":  ws.broadcastBanner,
	})
}

func (ws *WebServer) handleState(w http.ResponseWriter, r *http.Request) {
	ws.mu.Lock()
	defer ws.mu.Unlock()

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	// Wrap game state with server broadcast and public url
	resp := map[string]interface{}{
		"game":            ws.game,
		"broadcastBanner": ws.broadcastBanner,
		"publicUrl":       ws.publicURL,
		"rule":            ws.rule,
	}

	json.NewEncoder(w).Encode(resp)
}

func (ws *WebServer) handleDiscard(w http.ResponseWriter, r *http.Request) {
	ws.mu.Lock()
	defer ws.mu.Unlock()

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	idxStr := r.URL.Query().Get("index")
	idx, err := strconv.Atoi(idxStr)
	if err != nil {
		http.Error(w, "invalid index", http.StatusBadRequest)
		return
	}

	if ws.game.CurrentTurn != 0 {
		http.Error(w, "not your turn", http.StatusBadRequest)
		return
	}

	discarded, err := ws.game.Discard(0, idx)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Trigger AI bot turns
	go ws.runBotCycle(*discarded)

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":   true,
		"discarded": discarded,
	})
}

func (ws *WebServer) runBotCycle(discard engine.Tile) {
	ws.mu.Lock()
	defer ws.mu.Unlock()

	claimed := false
	for p := 1; p < 4; p++ {
		if engine.CheckWin(ws.game.Players[p].Hand, ws.game.Players[p].Melds, discard, false).IsWin {
			res := ws.game.WinGame(p, false)
			if ws.notifier != nil {
				ws.notifier.NotifyWin(ws.game.Players[p].Name, res.Pattern, res.Fan, res.Score, false)
			}
			return
		}
		if engine.CanPeng(ws.game.Players[p].Hand, discard) && engine.ShouldAIPeng(ws.game.Players[p].Hand, ws.game.Players[p].Melds, discard) {
			ws.game.ApplyPeng(p)
			claimed = true
			break
		}
	}

	if !claimed {
		ws.game.NextTurn(1)
	}

	for ws.game.CurrentTurn != 0 && !ws.game.IsGameOver {
		seat := ws.game.CurrentTurn
		bot := &ws.game.Players[seat]

		var winTile engine.Tile
		if ws.game.JustDrawnTile != nil {
			winTile = *ws.game.JustDrawnTile
		}
		if engine.CheckWin(bot.Hand, bot.Melds, winTile, true).IsWin {
			res := ws.game.WinGame(seat, true)
			if ws.notifier != nil {
				ws.notifier.NotifyWin(bot.Name, res.Pattern, res.Fan, res.Score, true)
			}
			break
		}

		botIdx := engine.SelectAIDiscard(bot.Hand, bot.Melds)
		botDiscard, err := ws.game.Discard(seat, botIdx)
		if err != nil {
			break
		}

		// Check if Human can claim
		me := ws.game.Players[0]
		canHu := engine.CheckWin(me.Hand, me.Melds, *botDiscard, false).IsWin
		canPeng := engine.CanPeng(me.Hand, *botDiscard)
		if canHu || canPeng {
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
	switch act {
	case "hu":
		if ws.game.JustDrawnTile != nil && ws.game.CurrentTurn == 0 {
			res := ws.game.WinGame(0, true)
			if ws.notifier != nil {
				ws.notifier.NotifyWin("房主 (你)", res.Pattern, res.Fan, res.Score, true)
			}
		} else if ws.game.LastDiscard != nil {
			res := ws.game.WinGame(0, false)
			if ws.notifier != nil {
				ws.notifier.NotifyWin("房主 (你)", res.Pattern, res.Fan, res.Score, false)
			}
		}
	case "peng":
		ws.game.ApplyPeng(0)
	case "gang":
		ws.game.ApplyGang(0, true)
	case "pass":
		if ws.game.LastDiscardSeat != -1 && ws.game.CurrentTurn != 0 {
			next := (ws.game.LastDiscardSeat + 1) % 4
			ws.game.NextTurn(next)
		}
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"state":   ws.game,
	})
}

func (ws *WebServer) handleReset(w http.ResponseWriter, r *http.Request) {
	ws.mu.Lock()
	defer ws.mu.Unlock()

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	rule := r.URL.Query().Get("rule")
	if rule == "" {
		rule = ws.rule
	}
	ws.game = engine.NewGame("房主 (你)", rule)

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"state":   ws.game,
	})
}

func (ws *WebServer) handleTilesInfo(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	staticDir := "web/static/tiles"
	files, _ := filepath.Glob(filepath.Join(staticDir, "*.svg"))
	names := make([]string, 0, len(files))
	for _, f := range files {
		names = append(names, filepath.Base(f))
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"expectedCount": 35,
		"foundCount":    len(names),
		"foundFiles":    names,
		"targetDir":     "web/static/tiles/",
	})
}

func (ws *WebServer) handleIndex(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Write([]byte(htmlClientTemplate))
}

const htmlClientTemplate = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>雀神天下 · Termux 纯正麻将</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
    body { background: #064e3b; color: #fff; font-family: system-ui, -apple-system, sans-serif; display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
    #broadcastBar { background: linear-gradient(90deg, #78350f, #b45309, #78350f); color: #fef08a; padding: 6px 12px; font-size: 12px; font-weight: bold; text-align: center; display: none; border-bottom: 1px solid #f59e0b; }
    header { background: #022c22; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #065f46; font-size: 13px; }
    .table-view { flex: 1; display: flex; flex-direction: column; justify-content: space-between; padding: 10px; position: relative; }
    .hand-container { display: flex; gap: 4px; overflow-x: auto; padding: 8px 4px; background: rgba(0,0,0,0.25); border-radius: 10px; min-height: 85px; align-items: center; }
    .tile { width: 44px; height: 62px; background: #fffdfa; border-radius: 6px; box-shadow: 0 4px 6px rgba(0,0,0,0.4), inset 0 0 0 1px #cbd5e1; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.15s; flex-shrink: 0; position: relative; }
    .tile:active { transform: translateY(-8px); }
    .tile img { width: 85%; height: 85%; object-fit: contain; }
    .tile .fallback-text { font-size: 13px; font-weight: 900; color: #0f172a; }
    .river-grid { display: flex; flex-wrap: wrap; gap: 4px; max-width: 320px; margin: 0 auto; min-height: 100px; justify-content: center; }
    .action-btn { padding: 8px 16px; border-radius: 9999px; font-weight: bold; font-size: 14px; border: none; cursor: pointer; margin: 0 4px; }
    .action-btn.hu { background: #ef4444; color: white; }
    .action-btn.peng { background: #3b82f6; color: white; }
    .action-btn.pass { background: #475569; color: white; }
    .log-box { font-size: 12px; color: #a7f3d0; text-align: center; margin-bottom: 6px; }
  </style>
</head>
<body>
  <div id="broadcastBar"></div>
  <header>
    <div>🀄 <b>雀神天下</b> · <span id="roundName">东风局</span></div>
    <div>剩余牌: <b id="wallCount">84</b> 张</div>
  </header>
  <div class="table-view">
    <div class="log-box" id="log-box">等待开牌...</div>
    <div class="river-grid" id="discardsGrid"></div>
    <div style="text-align: center;" id="actionsBar"></div>
    <div class="hand-container" id="myHand"></div>
  </div>
<script>
async function fetchState() {
  try {
    const res = await fetch('/api/state');
    const data = await res.json();
    renderState(data.game, data.broadcastBanner);
  } catch (e) {}
}

function renderState(state, banner) {
  if (!state) return;
  const bBar = document.getElementById('broadcastBar');
  if (banner) {
    bBar.style.display = 'block';
    bBar.innerText = '📢 ' + banner;
  } else {
    bBar.style.display = 'none';
  }

  document.getElementById('wallCount').innerText = state.wallRemaining;
  document.getElementById('roundName').innerText = state.roundName || '比赛对局';

  const myHand = (state.players && state.players[0] && state.players[0].hand) || [];
  const handDiv = document.getElementById('myHand');
  handDiv.innerHTML = '';
  myHand.forEach((t, idx) => {
    const el = document.createElement('div');
    el.className = 'tile';
    el.onclick = () => discard(idx);
    const svgImg = document.createElement('img');
    svgImg.src = '/static/tiles/' + t.type + '.svg';
    svgImg.onerror = () => {
      svgImg.style.display = 'none';
      const textSpan = document.createElement('span');
      textSpan.className = 'fallback-text';
      textSpan.innerText = t.name;
      el.appendChild(textSpan);
    };
    el.appendChild(svgImg);
    handDiv.appendChild(el);
  });

  const riverDiv = document.getElementById('discardsGrid');
  riverDiv.innerHTML = '';
  (state.players || []).forEach(p => {
    (p.discards || []).forEach(d => {
      const sp = document.createElement('div');
      sp.style.cssText = 'background:#f8fafc;color:#0f172a;font-size:11px;font-weight:bold;padding:4px 6px;border-radius:4px;box-shadow:0 1px 3px rgba(0,0,0,0.3);';
      sp.innerText = d.name;
      riverDiv.appendChild(sp);
    });
  });

  const actDiv = document.getElementById('actionsBar');
  actDiv.innerHTML = '';
  if (state.lastDiscard && state.currentTurn !== 0) {
    actDiv.innerHTML += '<button class="action-btn hu" onclick="doAction(\'hu\')">胡牌!</button>';
    actDiv.innerHTML += '<button class="action-btn peng" onclick="doAction(\'peng\')">碰牌</button>';
    actDiv.innerHTML += '<button class="action-btn pass" onclick="doAction(\'pass\')">过</button>';
  }

  const logs = state.historyLogs || [];
  if (logs.length > 0) {
    document.getElementById('log-box').innerText = logs[logs.length - 1];
  }
}

async function discard(idx) {
  await fetch('/api/discard?index=' + idx);
  fetchState();
}

async function doAction(act) {
  await fetch('/api/action?action=' + act);
  fetchState();
}

setInterval(fetchState, 1000);
fetchState();
</script>
</body>
</html>`

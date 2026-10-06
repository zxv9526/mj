package web

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

// WebServer provides HTTP server on Termux
type WebServer struct {
	mu   sync.Mutex
	game *engine.GameState
	port int
	rule string
}

// NewWebServer creates a web server
func NewWebServer(port int, rule string) *WebServer {
	return &WebServer{
		game: engine.NewGame("房主 (你)", rule),
		port: port,
		rule: rule,
	}
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
		// Create default web/static/tiles folder if not existing
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
			ws.game.WinGame(p, false)
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
			ws.game.WinGame(seat, true)
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
			ws.game.WinGame(0, true)
		} else if ws.game.LastDiscard != nil {
			ws.game.WinGame(0, false)
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

	// Check which SVG files are uploaded
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
	w.Write([]byte(embeddedHTML))
}

const embeddedHTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">
<title>Termux 云端麻将 - Cloudflare 联机版</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  body { background: #090d16; color: #f8fafc; display: flex; flex-direction: column; height: 100vh; overflow: hidden; user-select: none; }
  header { background: #111827; padding: 10px 16px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1f2937; }
  .title { font-size: 15px; font-weight: 800; color: #38bdf8; display: flex; align-items: center; gap: 8px; }
  .status-badge { background: #064e3b; color: #34d399; font-size: 11px; padding: 2px 8px; border-radius: 999px; font-weight: 600; }
  #board { flex: 1; display: grid; grid-template-rows: auto 1fr auto; padding: 10px; gap: 10px; overflow: hidden; }
  .opponents-bar { display: flex; justify-content: space-around; background: #131b2e; border: 1px solid #1f293d; border-radius: 12px; padding: 8px; font-size: 12px; }
  .river-container { background: #064e3b/90; background-color: #064e3b; border-radius: 14px; border: 2px solid #047857; display: flex; flex-direction: column; padding: 12px; overflow-y: auto; box-shadow: inset 0 2px 8px rgba(0,0,0,0.4); }
  .river-header { font-size: 12px; color: #a7f3d0; font-weight: bold; margin-bottom: 8px; text-align: center; }
  .discards-grid { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; align-content: flex-start; }
  .player-console { background: #111827; border-radius: 14px; padding: 12px; border: 1px solid #1f2937; display: flex; flex-direction: column; gap: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.5); }
  .hand-tiles-wrap { display: flex; gap: 6px; overflow-x: auto; padding: 6px 0; justify-content: center; }
  
  /* Mahjong Tile with SVG Image & Fallback */
  .tile { width: 44px; height: 60px; background: #fffdf5; border-radius: 6px; box-shadow: 0 4px 8px rgba(0,0,0,0.3); border: 1px solid #e2e8f0; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.15s, box-shadow 0.15s; flex-shrink: 0; position: relative; overflow: hidden; }
  .tile:active, .tile:hover { transform: translateY(-8px); box-shadow: 0 8px 16px rgba(0,0,0,0.4); border-color: #fbbf24; }
  .tile img { width: 100%; height: 100%; object-fit: contain; pointer-events: none; }
  .tile-fallback { font-size: 13px; font-weight: 900; line-height: 1.1; text-align: center; color: #1e293b; }
  .tile-suit-wan { color: #dc2626; }
  .tile-suit-tong { color: #0284c7; }
  .tile-suit-tiao { color: #16a34a; }
  .tile-suit-zi { color: #d97706; }

  .actions-bar { display: flex; gap: 8px; justify-content: center; }
  button.action-btn { background: #2563eb; color: white; border: none; padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: bold; cursor: pointer; transition: 0.15s; }
  button.action-btn.hu { background: #dc2626; box-shadow: 0 0 12px rgba(220,38,38,0.5); }
  button.action-btn.peng { background: #d97706; }
  button.action-btn.pass { background: #4b5563; }
  #log-box { text-align: center; font-size: 11px; color: #94a3b8; height: 18px; }
</style>
</head>
<body>
<header>
  <div class="title">
    <span>🀄 Termux 麻将</span>
    <span class="status-badge">Cloudflare 联机就绪</span>
  </div>
  <div style="font-size: 12px; color: #94a3b8;" id="wallInfo">牌墙余: --</div>
</header>

<div id="board">
  <div class="opponents-bar" id="opponentsBar">
    <div id="oppN">【北】小美 (AI)</div>
    <div id="oppW">【西】老李 (AI)</div>
    <div id="oppE">【东】阿强 (AI)</div>
  </div>

  <div class="river-container">
    <div class="river-header">牌 河 (历史舍牌)</div>
    <div class="discards-grid" id="discardsGrid"></div>
  </div>

  <div class="player-console">
    <div class="actions-bar" id="actionsBar"></div>
    <div class="hand-tiles-wrap" id="handTiles"></div>
    <div id="log-box">等待开局...</div>
  </div>
</div>

<script>
let state = null;
const svgBase = '/static/tiles/';

async function fetchState() {
  try {
    const res = await fetch('/api/state');
    state = await res.json();
    render();
  } catch(e) {}
}

function render() {
  if (!state) return;
  document.getElementById('wallInfo').innerText = '牌墙余 ' + state.wallRemaining + ' 张 | ' + state.roundName;
  
  // Render human hand
  const me = state.players[0];
  const handDiv = document.getElementById('handTiles');
  handDiv.innerHTML = '';
  me.hand.forEach((tile, idx) => {
    const el = document.createElement('div');
    el.className = 'tile';
    el.onclick = () => discard(idx);

    // Try loading SVG, fallback to text
    const svgImg = document.createElement('img');
    svgImg.src = svgBase + tile.code + '.svg';
    svgImg.onerror = function() {
      // SVG not found: fallback to styled text
      this.style.display = 'none';
      let suitClass = tile.suit === 1 ? 'tile-suit-wan' : (tile.suit === 2 ? 'tile-suit-tong' : (tile.suit === 3 ? 'tile-suit-tiao' : 'tile-suit-zi'));
      const textSpan = document.createElement('span');
      textSpan.className = 'tile-fallback ' + suitClass;
      textSpan.innerHTML = '<span style="font-size:10px;opacity:0.6;display:block;">' + tile.code + '</span>' + tile.name;
      el.appendChild(textSpan);
    };
    el.appendChild(svgImg);
    handDiv.appendChild(el);
  });

  // Render River
  const riverDiv = document.getElementById('discardsGrid');
  riverDiv.innerHTML = '';
  state.players.forEach(p => {
    (p.discards || []).forEach(d => {
      const sp = document.createElement('div');
      sp.style.cssText = 'background:#f8fafc;color:#0f172a;font-size:11px;font-weight:bold;padding:4px 6px;border-radius:4px;box-shadow:0 1px 3px rgba(0,0,0,0.3);';
      sp.innerText = d.name;
      riverDiv.appendChild(sp);
    });
  });

  // Action buttons
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

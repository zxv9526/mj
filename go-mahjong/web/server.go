package web

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"sync"

	"github.com/user/termux-mahjong/engine"
)

// WebServer provides HTTP server on Termux
type WebServer struct {
	mu   sync.Mutex
	game *engine.GameState
	port int
}

// NewWebServer creates a web server
func NewWebServer(port int, rule string) *WebServer {
	return &WebServer{
		game: engine.NewGame("Termux玩家", rule),
		port: port,
	}
}

// Start launches the HTTP server
func (ws *WebServer) Start() error {
	mux := http.NewServeMux()
	mux.HandleFunc("/", ws.handleIndex)
	mux.HandleFunc("/api/state", ws.handleState)
	mux.HandleFunc("/api/discard", ws.handleDiscard)
	mux.HandleFunc("/api/action", ws.handleAction)
	mux.HandleFunc("/api/reset", ws.handleReset)

	addr := fmt.Sprintf("0.0.0.0:%d", ws.port)
	fmt.Printf("\n🚀 麻将 Web 服务已启动！\n")
	fmt.Printf("📱 本地手机浏览器打开:  http://localhost:%d\n", ws.port)
	fmt.Printf("🌐 局域网好友对战访问:  http://[手机IP地址]:%d\n", ws.port)
	fmt.Printf("💡 提示: 在 Termux 中可保持后台运行 (按 Ctrl+C 停止)\n\n")

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

	// Advance AI turns automatically if no claim
	go ws.runBotCycle(*discarded)

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":   true,
		"discarded": discarded,
	})
}

func (ws *WebServer) runBotCycle(discard engine.Tile) {
	ws.mu.Lock()
	defer ws.mu.Unlock()

	// Check if any bot claims
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

	// If current turn is AI, simulate bot play until it returns to human or ends
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
			// Leave turn waiting for human input
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
		rule = "GB"
	}
	ws.game = engine.NewGame("Termux玩家", rule)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "game": ws.game})
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
<title>Termux 手机麻将 - Web版</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, system-ui, sans-serif; }
  body { background: #0f172a; color: #f8fafc; display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
  header { background: #1e293b; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; }
  .title { font-size: 16px; font-weight: bold; color: #38bdf8; display: flex; align-items: center; gap: 6px; }
  .stats { font-size: 13px; color: #94a3b8; }
  #board { flex: 1; display: grid; grid-template-rows: 1fr 2fr 1fr; padding: 8px; gap: 8px; }
  .opponents { display: flex; justify-content: space-around; background: #1e293b55; border-radius: 8px; padding: 8px; align-items: center; font-size: 12px; }
  .center-river { background: #064e3b; border-radius: 10px; border: 2px solid #047857; display: flex; flex-direction: column; padding: 10px; overflow-y: auto; }
  .river-title { font-size: 11px; color: #6ee7b7; text-align: center; margin-bottom: 6px; }
  .discards-wrap { display: flex; flex-wrap: wrap; gap: 4px; justify-content: center; }
  .player-hand { background: #1e293b; border-radius: 10px; padding: 10px; display: flex; flex-direction: column; justify-content: center; border: 1px solid #334155; }
  .hand-tiles { display: flex; overflow-x: auto; gap: 6px; padding: 6px 0; justify-content: center; }
  .tile { width: 38px; height: 52px; background: #fffbeb; color: #1e293b; border-radius: 5px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.5); display: flex; flex-direction: column; align-items: center; justify-content: center; font-weight: bold; cursor: pointer; transition: transform 0.15s; user-select: none; flex-shrink: 0; }
  .tile:hover, .tile:active { transform: translateY(-8px); background: #fef08a; }
  .tile-name { font-size: 13px; font-weight: 800; }
  .tile-suit-wan { color: #dc2626; }
  .tile-suit-tong { color: #0284c7; }
  .tile-suit-tiao { color: #16a34a; }
  .tile-suit-zi { color: #d97706; }
  .actions { display: flex; gap: 8px; justify-content: center; margin-top: 6px; }
  button { background: #3b82f6; border: none; color: white; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: bold; cursor: pointer; }
  button.hu { background: #ef4444; }
  button.peng { background: #f59e0b; }
  button.gang { background: #8b5cf6; }
  #log { font-size: 11px; color: #cbd5e1; text-align: center; margin-top: 4px; height: 16px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; }
</style>
</head>
<body>
<header>
  <div class="title">🀄 Termux 麻将 (手机局域网版)</div>
  <div class="stats" id="info">牌墙: -- | 圈: --</div>
</header>
<div id="board">
  <div class="opponents" id="opponents">
    <div>【北】小美</div>
    <div>【西】老李</div>
    <div>【东】阿强</div>
  </div>
  <div class="center-river">
    <div class="river-title">牌 河</div>
    <div class="discards-wrap" id="river"></div>
  </div>
  <div class="player-hand">
    <div class="actions" id="actionBtns"></div>
    <div class="hand-tiles" id="myHand"></div>
    <div id="log">等待开局...</div>
  </div>
</div>
<script>
let state = null;
async function fetchState() {
  try {
    const res = await fetch('/api/state');
    state = await res.json();
    render();
  } catch(e) {}
}

function render() {
  if (!state) return;
  document.getElementById('info').innerText = '牌墙余: ' + state.wallRemaining + ' 张 | ' + state.roundName;
  const me = state.players[0];
  const handDiv = document.getElementById('myHand');
  handDiv.innerHTML = '';
  me.hand.forEach((t, idx) => {
    const d = document.createElement('div');
    d.className = 'tile';
    d.onclick = () => discard(idx);
    let suitClass = t.suit === 1 ? 'tile-suit-wan' : (t.suit === 2 ? 'tile-suit-tong' : (t.suit === 3 ? 'tile-suit-tiao' : 'tile-suit-zi'));
    d.innerHTML = '<span class="tile-name ' + suitClass + '">' + t.name + '</span>';
    handDiv.appendChild(d);
  });

  const riverDiv = document.getElementById('river');
  riverDiv.innerHTML = '';
  state.players.forEach(p => {
    (p.discards || []).forEach(d => {
      const t = document.createElement('span');
      t.style.cssText = 'background:#f1f5f9;color:#0f172a;font-size:10px;padding:2px 4px;border-radius:3px;font-weight:bold;';
      t.innerText = d.name;
      riverDiv.appendChild(t);
    });
  });

  const logs = state.historyLogs || [];
  if (logs.length > 0) document.getElementById('log').innerText = logs[logs.length - 1];

  // Actions
  const btnDiv = document.getElementById('actionBtns');
  btnDiv.innerHTML = '';
  if (state.lastDiscard && state.currentTurn !== 0) {
    btnDiv.innerHTML += '<button class="hu" onclick="doAction(\'hu\')">胡牌</button>';
    btnDiv.innerHTML += '<button class="peng" onclick="doAction(\'peng\')">碰牌</button>';
    btnDiv.innerHTML += '<button onclick="doAction(\'pass\')">过</button>';
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

package tui

import (
	"bufio"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/user/termux-mahjong/engine"
)

// ANSI color constants
const (
	ColorReset   = "\033[0m"
	ColorBold    = "\033[1m"
	ColorDim     = "\033[2m"
	ColorRed     = "\033[31m"
	ColorGreen   = "\033[32m"
	ColorYellow  = "\033[33m"
	ColorBlue    = "\033[34m"
	ColorMagenta = "\033[35m"
	ColorCyan    = "\033[36m"
	ColorWhite   = "\033[37m"
	ColorBgGreen = "\033[42;30m"
	ColorBgGray  = "\033[48;5;236m"
)

// TerminalGame manages TUI lifecycle in Termux
type TerminalGame struct {
	game   *engine.GameState
	reader *bufio.Reader
}

// NewTerminalGame creates a new TUI controller
func NewTerminalGame(playerName, rule string) *TerminalGame {
	return &TerminalGame{
		game:   engine.NewGame(playerName, rule),
		reader: bufio.NewReader(os.Stdin),
	}
}

// Run starts the interactive game loop
func (tg *TerminalGame) Run() {
	tg.clearScreen()
	tg.printBanner()
	time.Sleep(1 * time.Second)

	for !tg.game.IsGameOver {
		tg.renderTable()

		turn := tg.game.CurrentTurn
		if turn == 0 {
			// Human Turn
			tg.handleHumanTurn()
		} else {
			// Bot Turn
			tg.handleBotTurn(turn)
		}
	}

	// Game Over Summary
	tg.renderTable()
	fmt.Printf("\n%s╔════════════════════════════════════════════════════════════╗%s\n", ColorYellow, ColorReset)
	if tg.game.WinnerSeat >= 0 {
		winner := tg.game.Players[tg.game.WinnerSeat]
		fmt.Printf("║  🎉 游戏结束！胜者: %-32s║\n", winner.Name)
		if tg.game.WinInfo != nil {
			fmt.Printf("║  🏆 番型: %-16s 得分: %-18d ║\n", tg.game.WinInfo.Pattern, tg.game.WinInfo.Score)
		}
	} else {
		fmt.Printf("║  🍃 流局！牌墙已摸空，平局结算。                          ║\n")
	}
	fmt.Printf("╚════════════════════════════════════════════════════════════╝\n")
	fmt.Println("\n按回车键退出游戏...")
	tg.reader.ReadString('\n')
}

func (tg *TerminalGame) clearScreen() {
	fmt.Print("\033[H\033[2J")
}

func (tg *TerminalGame) printBanner() {
	fmt.Printf("%s", ColorCyan)
	fmt.Println("┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓")
	fmt.Println("┃           🀄 Termux Go 纯终端麻将 v1.0.0 🀄            ┃")
	fmt.Println("┃        专为 Android Termux 终端与命令行深度优化        ┃")
	fmt.Println("┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛")
	fmt.Printf("%s\n", ColorReset)
}

func (tg *TerminalGame) renderTable() {
	tg.clearScreen()
	g := tg.game

	// Header
	fmt.Printf("%s[ %s | 规则: %s | 牌墙余: %d 张 ]%s\n",
		ColorYellow, g.RoundName, g.RuleType, g.WallRemaining, ColorReset)
	fmt.Println(strings.Repeat("─", 62))

	// Opponents overview
	// North (Seat 2), West (Seat 3), East (Seat 1)
	fmt.Printf("%s【北家】%-10s (分: %d) 手牌: %d 张%s\n",
		ColorCyan, g.Players[2].Name, g.Players[2].Score, len(g.Players[2].Hand), ColorReset)
	tg.printMelds(g.Players[2].Melds)

	fmt.Printf("\n%s【西家】%-10s (分: %d)       【东家】%-10s (分: %d)%s\n",
		ColorMagenta, g.Players[3].Name, g.Players[3].Score,
		ColorBlue, g.Players[1].Name, g.Players[1].Score, ColorReset)
	fmt.Printf("手牌: %d 张                     手牌: %d 张\n",
		len(g.Players[3].Hand), len(g.Players[1].Hand))

	// River (Discards Pool)
	fmt.Println("\n" + strings.Repeat("┈", 22) + " 【 牌 河 】 " + strings.Repeat("┈", 22))
	for pIdx := 0; pIdx < 4; pIdx++ {
		p := g.Players[pIdx]
		fmt.Printf("%-6s: ", p.Name)
		if len(p.Discards) == 0 {
			fmt.Printf("%s(空)%s", ColorDim, ColorReset)
		} else {
			// Print up to last 12 discards
			start := 0
			if len(p.Discards) > 12 {
				start = len(p.Discards) - 12
			}
			for _, d := range p.Discards[start:] {
				fmt.Printf("%s ", d.TerminalDisplay())
			}
		}
		fmt.Println()
	}
	fmt.Println(strings.Repeat("─", 62))

	// Human Player (South - Seat 0)
	me := g.Players[0]
	fmt.Printf("%s【你·南家】%s (当前积分: %d)%s\n", ColorGreen, me.Name, me.Score, ColorReset)
	tg.printMelds(me.Melds)

	// Display hand indices & tiles
	fmt.Printf("%s序号: ", ColorDim)
	for i := range me.Hand {
		fmt.Printf("%3d  ", i+1)
	}
	fmt.Printf("%s\n手牌: ", ColorReset)
	for i, t := range me.Hand {
		if g.CurrentTurn == 0 && g.JustDrawnTile != nil && i == len(me.Hand)-1 {
			// Newly drawn tile highlighted
			fmt.Printf("\033[4m%s\033[0m ", t.TerminalDisplay())
		} else {
			fmt.Printf("%s ", t.TerminalDisplay())
		}
	}
	fmt.Println()

	// Ting indicator
	if len(me.TingTiles) > 0 {
		fmt.Printf("%s💡 听牌提示: 当前叫听 [ ", ColorYellow)
		for _, tt := range me.TingTiles {
			fmt.Printf("%s ", tt.TerminalDisplay())
		}
		fmt.Printf("]%s\n", ColorReset)
	}

	// Recent Log
	fmt.Println(strings.Repeat("┈", 62))
	fmt.Printf("%s[战报日志]%s ", ColorCyan, ColorReset)
	if len(g.HistoryLogs) > 0 {
		fmt.Printf("%s\n", g.HistoryLogs[len(g.HistoryLogs)-1])
	} else {
		fmt.Println("暂无")
	}
	fmt.Println(strings.Repeat("─", 62))
}

func (tg *TerminalGame) printMelds(melds []engine.Meld) {
	if len(melds) == 0 {
		return
	}
	fmt.Print("副露: ")
	for _, m := range melds {
		fmt.Printf("[%s: ", m.Type)
		for _, t := range m.Tiles {
			fmt.Printf("%s", t.Name)
		}
		fmt.Print("] ")
	}
	fmt.Println()
}

func (tg *TerminalGame) handleHumanTurn() {
	g := tg.game
	me := &g.Players[0]

	// Check self-draw win (自摸)
	var winTile engine.Tile
	if g.JustDrawnTile != nil {
		winTile = *g.JustDrawnTile
	} else if len(me.Hand) > 0 {
		winTile = me.Hand[len(me.Hand)-1]
	}

	canSelfWin := engine.CheckWin(me.Hand, me.Melds, winTile, true).IsWin
	_, anGang, buGang := engine.CanGang(me.Hand, me.Melds, engine.Tile{}, true)
	canGang := len(anGang) > 0 || len(buGang) > 0

	prompt := fmt.Sprintf("%s👉 你的回合: 请输入出牌序号 (1-%d)", ColorBold, len(me.Hand))
	if canSelfWin {
		prompt += fmt.Sprintf(" | %s[H] 自摸胡牌%s", ColorRed, ColorBold)
	}
	if canGang {
		prompt += " | [G] 暗杠/补杠"
	}
	prompt += fmt.Sprintf(" | [Q] 退出 %s> ", ColorReset)

	fmt.Print(prompt)
	input, _ := tg.reader.ReadString('\n')
	input = strings.TrimSpace(input)

	if strings.EqualFold(input, "q") {
		fmt.Println("退出游戏。")
		os.Exit(0)
	}

	if canSelfWin && strings.EqualFold(input, "h") {
		g.WinGame(0, true)
		return
	}

	if canGang && strings.EqualFold(input, "g") {
		// execute Gang
		if len(anGang) > 0 {
			tg.executeAnGang(anGang[0])
			return
		} else if len(buGang) > 0 {
			tg.executeBuGang(buGang[0])
			return
		}
	}

	idx, err := strconv.Atoi(input)
	if err != nil || idx < 1 || idx > len(me.Hand) {
		// Default: discard last drawn tile if just hit Enter
		if input == "" {
			idx = len(me.Hand)
		} else {
			fmt.Println("输入无效，请重新输入数字序号！")
			time.Sleep(1 * time.Second)
			return
		}
	}

	discarded, err := g.Discard(0, idx-1)
	if err != nil {
		return
	}

	// Check if any bot wants to Hu, Peng, Gang the human discard
	claimed := tg.checkBotsClaim(*discarded, 0)
	if !claimed {
		// Next turn is Seat 1
		g.NextTurn(1)
	}
}

func (tg *TerminalGame) executeAnGang(tType int) {
	g := tg.game
	me := &g.Players[0]

	var melded []engine.Tile
	newHand := make([]engine.Tile, 0)
	for _, t := range me.Hand {
		if t.Type == tType {
			melded = append(melded, t)
		} else {
			newHand = append(newHand, t)
		}
	}

	me.Hand = newHand
	me.Melds = append(me.Melds, engine.Meld{
		Type:     engine.MeldGang,
		Tiles:    melded,
		FromSeat: -1,
	})

	g.Log(fmt.Sprintf("%s 暗杠: %s", me.Name, melded[0].Name))
	// Draw replacement
	g.ApplyGang(0, false)
}

func (tg *TerminalGame) executeBuGang(tType int) {
	g := tg.game
	me := &g.Players[0]

	var extra engine.Tile
	newHand := make([]engine.Tile, 0)
	for _, t := range me.Hand {
		if t.Type == tType && extra.ID == 0 {
			extra = t
		} else {
			newHand = append(newHand, t)
		}
	}
	me.Hand = newHand

	for i := range me.Melds {
		if me.Melds[i].Type == engine.MeldPeng && me.Melds[i].Tiles[0].Type == tType {
			me.Melds[i].Type = engine.MeldGang
			me.Melds[i].Tiles = append(me.Melds[i].Tiles, extra)
			break
		}
	}
	g.Log(fmt.Sprintf("%s 补杠: %s", me.Name, extra.Name))
	g.ApplyGang(0, false)
}

func (tg *TerminalGame) handleBotTurn(seat int) {
	g := tg.game
	bot := &g.Players[seat]

	time.Sleep(800 * time.Millisecond)

	// Check if Bot self-wins
	var winTile engine.Tile
	if g.JustDrawnTile != nil {
		winTile = *g.JustDrawnTile
	}
	if engine.CheckWin(bot.Hand, bot.Melds, winTile, true).IsWin {
		g.WinGame(seat, true)
		return
	}

	// Bot AI chooses discard
	chosenIdx := engine.SelectAIDiscard(bot.Hand, bot.Melds)
	discarded, err := g.Discard(seat, chosenIdx)
	if err != nil {
		return
	}

	// Check if human can Claim (Hu, Peng, Gang, Chi)
	claimed := tg.promptHumanClaim(*discarded, seat)
	if claimed {
		return
	}

	// Check if other bots claim
	botClaimed := tg.checkBotsClaim(*discarded, seat)
	if !botClaimed {
		nextSeat := (seat + 1) % 4
		g.NextTurn(nextSeat)
	}
}

func (tg *TerminalGame) promptHumanClaim(discard engine.Tile, fromSeat int) bool {
	g := tg.game
	me := &g.Players[0]

	canHu := engine.CheckWin(me.Hand, me.Melds, discard, false).IsWin
	canPeng := engine.CanPeng(me.Hand, discard)
	canMingGang, _, _ := engine.CanGang(me.Hand, me.Melds, discard, false)
	isLeftPlayer := (fromSeat+1)%4 == 0
	chiOptions := [][]engine.Tile{}
	if isLeftPlayer {
		chiOptions = engine.CanChi(me.Hand, discard)
	}

	if !canHu && !canPeng && !canMingGang && len(chiOptions) == 0 {
		return false
	}

	tg.renderTable()
	fmt.Printf("\n%s⚡ %s 打出了 %s！你可以响应操作：%s\n",
		ColorYellow, g.Players[fromSeat].Name, discard.TerminalDisplay(), ColorReset)

	var actions []string
	if canHu {
		actions = append(actions, fmt.Sprintf("%s[H] 胡牌!%s", ColorRed, ColorReset))
	}
	if canMingGang {
		actions = append(actions, "[G] 杠")
	}
	if canPeng {
		actions = append(actions, "[P] 碰")
	}
	if len(chiOptions) > 0 {
		actions = append(actions, "[C] 吃")
	}
	actions = append(actions, "[Enter/S] 过 (Pass)")

	fmt.Printf("可选指令: %s > ", strings.Join(actions, "  "))
	input, _ := tg.reader.ReadString('\n')
	input = strings.TrimSpace(input)

	if canHu && strings.EqualFold(input, "h") {
		g.WinGame(0, false)
		return true
	}
	if canMingGang && strings.EqualFold(input, "g") {
		g.ApplyGang(0, true)
		return true
	}
	if canPeng && strings.EqualFold(input, "p") {
		g.ApplyPeng(0)
		return true
	}
	if len(chiOptions) > 0 && strings.EqualFold(input, "c") {
		g.ApplyChi(0, 0)
		return true
	}

	// Passed
	return false
}

func (tg *TerminalGame) checkBotsClaim(discard engine.Tile, fromSeat int) bool {
	g := tg.game

	// 1. Check if any bot can Hu
	for p := 1; p < 4; p++ {
		if p == fromSeat {
			continue
		}
		if engine.CheckWin(g.Players[p].Hand, g.Players[p].Melds, discard, false).IsWin {
			g.WinGame(p, false)
			return true
		}
	}

	// 2. Check Peng / Gang
	for p := 1; p < 4; p++ {
		if p == fromSeat {
			continue
		}
		canGang, _, _ := engine.CanGang(g.Players[p].Hand, g.Players[p].Melds, discard, false)
		if canGang && engine.ShouldAIGang() {
			g.ApplyGang(p, true)
			return true
		}
		if engine.CanPeng(g.Players[p].Hand, discard) && engine.ShouldAIPeng(g.Players[p].Hand, g.Players[p].Melds, discard) {
			g.ApplyPeng(p)
			return true
		}
	}

	return false
}

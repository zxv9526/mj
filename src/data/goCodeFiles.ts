export interface ProjectFile {
  path: string;
  name: string;
  category: 'go' | 'config' | 'script' | 'docs';
  description: string;
  content: string;
}

export const GO_PROJECT_FILES: ProjectFile[] = [
  {
    path: 'go.mod',
    name: 'go.mod',
    category: 'config',
    description: 'Go 模块定义文件 (纯标准库，零外部依赖)',
    content: `module github.com/user/termux-mahjong

go 1.21
`,
  },
  {
    path: 'main.go',
    name: 'main.go',
    category: 'go',
    description: '程序主入口，支持 TUI 终端模式与移动端 Web 网页双模切换',
    content: `package main

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
		fmt.Printf("🀄 启动 Termux 麻将 Web 服务 (端口: %d, 规则: %s)...\\n", *port, *rule)
		server := web.NewWebServer(*port, *rule)
		if err := server.Start(); err != nil {
			fmt.Fprintf(os.Stderr, "服务启动失败: %v\\n", err)
			os.Exit(1)
		}
	} else {
		// Terminal TUI Mode
		tg := tui.NewTerminalGame(*name, *rule)
		tg.Run()
	}
}
`,
  },
  {
    path: 'engine/tile.go',
    name: 'tile.go',
    category: 'go',
    description: '牌面数据结构、花色、Unicode/ANSI终端着色、洗牌与理牌',
    content: `package engine

import (
	"fmt"
	"math/rand"
	"sort"
	"time"
)

type Suit int

const (
	SuitWan  Suit = 1 // 万子
	SuitTong Suit = 2 // 筒子
	SuitTiao Suit = 3 // 条子
	SuitZi   Suit = 4 // 字牌 (东南西北中发白)
)

type Tile struct {
	ID    int    // 唯一序号 0..135
	Type  int    // 逻辑编码: 1-9 (万), 11-19 (筒), 21-29 (条), 31-37 (字)
	Suit  Suit   // 花色
	Value int    // 面值 1-9
	Name  string // 中文名称: "一万", "五筒", "红中"
	Code  string // 简码: "1m", "5p", "9s", "1z"
	Emoji string // Unicode 麻将符号: 🀇..🀄
}

var (
	wanNames   = []string{"一万", "二万", "三万", "四万", "五万", "六万", "七万", "八万", "九万"}
	tongNames  = []string{"一筒", "二筒", "三筒", "四筒", "五筒", "六筒", "七筒", "八筒", "九筒"}
	tiaoNames  = []string{"一条", "二条", "三条", "四条", "五条", "六条", "七条", "八条", "九条"}
	windNames  = []string{"东风", "南风", "西风", "北风"}
	dragonNames = []string{"红中", "发财", "白板"}

	wanEmojis   = []string{"🀇", "🀈", "🀉", "🀊", "🀋", "🀌", "🀍", "🀎", "🀏"}
	tongEmojis  = []string{"🀙", "🀚", "🀛", "🀜", "🀝", "🀞", "🀟", "🀠", "🀡"}
	tiaoEmojis  = []string{"🀐", "🀑", "🀒", "🀓", "🀔", "🀕", "🀖", "🀗", "🀘"}
	windEmojis  = []string{"🀀", "🀁", "🀂", "🀃"}
	dragonEmojis = []string{"🀄", "🀅", "🀆"}
)

func NewTile(id, tileType int) Tile {
	t := Tile{ID: id, Type: tileType}
	switch {
	case tileType >= 1 && tileType <= 9:
		t.Suit = SuitWan
		t.Value = tileType
		t.Name = wanNames[tileType-1]
		t.Code = fmt.Sprintf("%dm", tileType)
		t.Emoji = wanEmojis[tileType-1]
	case tileType >= 11 && tileType <= 19:
		t.Suit = SuitTong
		t.Value = tileType - 10
		t.Name = tongNames[t.Value-1]
		t.Code = fmt.Sprintf("%dp", t.Value)
		t.Emoji = tongEmojis[t.Value-1]
	case tileType >= 21 && tileType <= 29:
		t.Suit = SuitTiao
		t.Value = tileType - 20
		t.Name = tiaoNames[t.Value-1]
		t.Code = fmt.Sprintf("%ds", t.Value)
		t.Emoji = tiaoEmojis[t.Value-1]
	case tileType >= 31 && tileType <= 34:
		t.Suit = SuitZi
		t.Value = tileType - 30
		t.Name = windNames[t.Value-1]
		t.Code = fmt.Sprintf("%dz", t.Value)
		t.Emoji = windEmojis[t.Value-1]
	case tileType >= 35 && tileType <= 37:
		t.Suit = SuitZi
		t.Value = tileType - 30
		t.Name = dragonNames[tileType-35]
		t.Code = fmt.Sprintf("%dz", t.Value)
		t.Emoji = dragonEmojis[tileType-35]
	}
	return t
}

func (t Tile) String() string {
	return t.Name
}

func (t Tile) TerminalDisplay() string {
	switch t.Suit {
	case SuitWan:
		return fmt.Sprintf("\\033[1;31m[%s]\\033[0m", t.Name)
	case SuitTong:
		return fmt.Sprintf("\\033[1;36m[%s]\\033[0m", t.Name)
	case SuitTiao:
		return fmt.Sprintf("\\033[1;32m[%s]\\033[0m", t.Name)
	case SuitZi:
		if t.Type == 35 { // 中
			return fmt.Sprintf("\\033[1;31;47m[%s]\\033[0m", t.Name)
		} else if t.Type == 36 { // 发
			return fmt.Sprintf("\\033[1;32;47m[%s]\\033[0m", t.Name)
		}
		return fmt.Sprintf("\\033[1;33m[%s]\\033[0m", t.Name)
	default:
		return fmt.Sprintf("[%s]", t.Name)
	}
}

func NewDeck(includeHonors bool) []Tile {
	deck := make([]Tile, 0, 136)
	id := 0
	for copy := 0; copy < 4; copy++ {
		for i := 1; i <= 9; i++ {
			deck = append(deck, NewTile(id, i))
			id++
		}
		for i := 11; i <= 19; i++ {
			deck = append(deck, NewTile(id, i))
			id++
		}
		for i := 21; i <= 29; i++ {
			deck = append(deck, NewTile(id, i))
			id++
		}
		if includeHonors {
			for i := 31; i <= 34; i++ {
				deck = append(deck, NewTile(id, i))
				id++
			}
			for i := 35; i <= 37; i++ {
				deck = append(deck, NewTile(id, i))
				id++
			}
		}
	}
	return deck
}

func ShuffleDeck(deck []Tile) {
	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	r.Shuffle(len(deck), func(i, j int) {
		deck[i], deck[j] = deck[j], deck[i]
	})
}

func SortTiles(tiles []Tile) {
	sort.Slice(tiles, func(i, j int) bool {
		if tiles[i].Type != tiles[j].Type {
			return tiles[i].Type < tiles[j].Type
		}
		return tiles[i].ID < tiles[j].ID
	})
}
`,
  },
  {
    path: 'engine/rules.go',
    name: 'rules.go',
    category: 'go',
    description: '吃碰杠胡算法、七对/碰碰胡/清一色判定、听牌计算器',
    content: `package engine

type MeldType string

const (
	MeldChi  MeldType = "CHI"  // 顺子
	MeldPeng MeldType = "PENG" // 刻子
	MeldGang MeldType = "GANG" // 杠子
)

type Meld struct {
	Type     MeldType \`json:"type"\`
	Tiles    []Tile   \`json:"tiles"\`
	FromSeat int      \`json:"fromSeat"\`
}

type WinResult struct {
	IsWin   bool     \`json:"isWin"\`
	Pattern string   \`json:"pattern"\`
	Fan     int      \`json:"fan"\`
	Score   int      \`json:"score"\`
	Details []string \`json:"details"\`
}

func CanChi(hand []Tile, discard Tile) [][]Tile {
	if discard.Suit == SuitZi {
		return nil
	}
	tType := discard.Type
	var results [][]Tile
	if (tType%10) >= 3 && hasType(hand, tType-2) && hasType(hand, tType-1) {
		t1 := findAndExtract(hand, tType-2)
		t2 := findAndExtract(hand, tType-1)
		results = append(results, []Tile{t1, t2, discard})
	}
	if (tType%10) >= 2 && (tType%10) <= 8 && hasType(hand, tType-1) && hasType(hand, tType+1) {
		t1 := findAndExtract(hand, tType-1)
		t2 := findAndExtract(hand, tType+1)
		results = append(results, []Tile{t1, discard, t2})
	}
	if (tType%10) <= 7 && hasType(hand, tType+1) && hasType(hand, tType+2) {
		t1 := findAndExtract(hand, tType+1)
		t2 := findAndExtract(hand, tType+2)
		results = append(results, []Tile{discard, t1, t2})
	}
	return results
}

func CanPeng(hand []Tile, discard Tile) bool {
	count := 0
	for _, t := range hand {
		if t.Type == discard.Type {
			count++
			if count >= 2 {
				return true
			}
		}
	}
	return false
}

func CanGang(hand []Tile, melds []Meld, discard Tile, isSelfTurn bool) (canMingGang bool, anGangTypes []int, buGangTypes []int) {
	if !isSelfTurn {
		count := 0
		for _, t := range hand {
			if t.Type == discard.Type {
				count++
			}
		}
		if count >= 3 {
			canMingGang = true
		}
		return
	}
	counts := make(map[int]int)
	for _, t := range hand {
		counts[t.Type]++
	}
	for tType, count := range counts {
		if count == 4 {
			anGangTypes = append(anGangTypes, tType)
		}
	}
	for _, m := range melds {
		if m.Type == MeldPeng && len(m.Tiles) > 0 {
			pType := m.Tiles[0].Type
			if counts[pType] > 0 {
				buGangTypes = append(buGangTypes, pType)
			}
		}
	}
	return
}

func CheckWin(hand []Tile, melds []Meld, winTile Tile, isSelfDraw bool) WinResult {
	allHand := append([]Tile{}, hand...)
	if !isSelfDraw {
		allHand = append(allHand, winTile)
	}
	SortTiles(allHand)

	if len(melds) == 0 && len(allHand) == 14 {
		if isSevenPairs(allHand) {
			fan := 4
			pattern := "七对"
			if isAllOneSuit(allHand, melds) {
				fan = 16
				pattern = "清一色·七对"
			}
			return WinResult{
				IsWin:   true,
				Pattern: pattern,
				Fan:     fan,
				Score:   fan * 10,
				Details: []string{pattern, "门前清"},
			}
		}
	}

	if checkStandardWin(allHand) {
		fan := 1
		pattern := "平胡"
		isAllTriplets := true
		for _, m := range melds {
			if m.Type == MeldChi {
				isAllTriplets = false
				break
			}
		}
		if isAllTriplets && isHandAllTriplets(allHand) {
			fan = 4
			pattern = "碰碰胡"
		}
		if isAllOneSuit(allHand, melds) {
			fan += 8
			pattern = "清一色·" + pattern
		}
		if isSelfDraw {
			fan += 1
			pattern += " (自摸)"
		}
		return WinResult{
			IsWin:   true,
			Pattern: pattern,
			Fan:     fan,
			Score:   fan * 10,
			Details: []string{pattern},
		}
	}
	return WinResult{IsWin: false}
}

func checkStandardWin(tiles []Tile) bool {
	if len(tiles)%3 != 2 {
		return false
	}
	typeCounts := make(map[int]int)
	for _, t := range tiles {
		typeCounts[t.Type]++
	}
	for tType, count := range typeCounts {
		if count >= 2 {
			typeCounts[tType] -= 2
			if canFormSets(typeCounts) {
				return true
			}
			typeCounts[tType] += 2
		}
	}
	return false
}

func canFormSets(counts map[int]int) bool {
	var first int = -1
	for t := 1; t <= 37; t++ {
		if counts[t] > 0 {
			first = t
			break
		}
	}
	if first == -1 {
		return true
	}
	if counts[first] >= 3 {
		counts[first] -= 3
		if canFormSets(counts) {
			counts[first] += 3
			return true
		}
		counts[first] += 3
	}
	suit := first / 10
	val := first % 10
	if suit <= 2 && val >= 1 && val <= 7 {
		if counts[first+1] > 0 && counts[first+2] > 0 {
			counts[first]--
			counts[first+1]--
			counts[first+2]--
			if canFormSets(counts) {
				counts[first]++
				counts[first+1]++
				counts[first+2]++
				return true
			}
			counts[first]++
			counts[first+1]++
			counts[first+2]++
		}
	}
	return false
}

func isSevenPairs(tiles []Tile) bool {
	if len(tiles) != 14 {
		return false
	}
	for i := 0; i < 14; i += 2 {
		if tiles[i].Type != tiles[i+1].Type {
			return false
		}
	}
	return true
}

func isHandAllTriplets(tiles []Tile) bool {
	counts := make(map[int]int)
	for _, t := range tiles {
		counts[t.Type]++
	}
	pairCount := 0
	for _, c := range counts {
		if c == 2 {
			pairCount++
		} else if c != 3 && c != 0 {
			return false
		}
	}
	return pairCount == 1
}

func isAllOneSuit(tiles []Tile, melds []Meld) bool {
	if len(tiles) == 0 {
		return false
	}
	targetSuit := tiles[0].Suit
	if targetSuit == SuitZi {
		return false
	}
	for _, t := range tiles {
		if t.Suit != targetSuit {
			return false
		}
	}
	for _, m := range melds {
		for _, t := range m.Tiles {
			if t.Suit != targetSuit {
				return false
			}
		}
	}
	return true
}

func CalculateTing(hand []Tile, melds []Meld) []Tile {
	var winningTiles []Tile
	candidateTypes := []int{
		1, 2, 3, 4, 5, 6, 7, 8, 9,
		11, 12, 13, 14, 15, 16, 17, 18, 19,
		21, 22, 23, 24, 25, 26, 27, 28, 29,
		31, 32, 33, 34, 35, 36, 37,
	}
	for _, cType := range candidateTypes {
		dummyTile := NewTile(999, cType)
		res := CheckWin(hand, melds, dummyTile, false)
		if res.IsWin {
			winningTiles = append(winningTiles, dummyTile)
		}
	}
	return winningTiles
}

func hasType(hand []Tile, tType int) bool {
	for _, t := range hand {
		if t.Type == tType {
			return true
		}
	}
	return false
}

func findAndExtract(hand []Tile, tType int) Tile {
	for _, t := range hand {
		if t.Type == tType {
			return t
		}
	}
	return Tile{}
}
`,
  },
  {
    path: 'engine/ai.go',
    name: 'ai.go',
    category: 'go',
    description: '3席电脑 AI 对手决策逻辑：评估孤张、字牌优先度与碰杠概率',
    content: `package engine

import "math/rand"

func SelectAIDiscard(hand []Tile, melds []Meld) int {
	if len(hand) == 0 {
		return 0
	}
	typeCounts := make(map[int]int)
	for _, t := range hand {
		typeCounts[t.Type]++
	}
	scores := make([]int, len(hand))
	for i, t := range hand {
		score := 0
		c := typeCounts[t.Type]
		if c >= 3 {
			score += 100
		} else if c == 2 {
			score += 50
		}
		if t.Suit == SuitZi {
			if c == 1 {
				score -= 80
			}
		} else {
			val := t.Value
			hasLeft1 := typeCounts[t.Type-1] > 0
			hasLeft2 := typeCounts[t.Type-2] > 0
			hasRight1 := typeCounts[t.Type+1] > 0
			hasRight2 := typeCounts[t.Type+2] > 0
			if hasLeft1 && hasRight1 {
				score += 40
			}
			if (hasLeft1 && val > 1) || (hasRight1 && val < 9) {
				score += 25
			}
			if hasLeft2 || hasRight2 {
				score += 10
			}
			if val == 1 || val == 9 {
				score -= 10
			}
		}
		scores[i] = score
	}

	lowestIdx := 0
	lowestScore := scores[0]
	for i := 1; i < len(scores); i++ {
		if scores[i] < lowestScore {
			lowestScore = scores[i]
			lowestIdx = i
		} else if scores[i] == lowestScore && rand.Float32() < 0.3 {
			lowestIdx = i
		}
	}
	return lowestIdx
}

func ShouldAIPeng(hand []Tile, melds []Meld, discard Tile) bool {
	if discard.Suit == SuitZi {
		return true
	}
	if len(melds) >= 2 {
		return true
	}
	return rand.Float32() < 0.6
}

func ShouldAIGang() bool {
	return true
}

func ShouldAIChi() bool {
	return rand.Float32() < 0.45
}
`,
  },
  {
    path: 'engine/game.go',
    name: 'game.go',
    category: 'go',
    description: '四人牌局全局状态机、发牌、巡目轮转、摸切与结算',
    content: `package engine

import (
	"fmt"
	"time"
)

type Player struct {
	ID        int      \`json:"id"\`
	Name      string   \`json:"name"\`
	IsAI      bool     \`json:"isAI"\`
	Hand      []Tile   \`json:"hand"\`
	Melds     []Meld   \`json:"melds"\`
	Discards  []Tile   \`json:"discards"\`
	Score     int      \`json:"score"\`
	Wind      string   \`json:"wind"\`
	HasWon    bool     \`json:"hasWon"\`
	IsTing    bool     \`json:"isTing"\`
	TingTiles []Tile   \`json:"tingTiles"\`
}

type GameState struct {
	RoundName      string    \`json:"roundName"\`
	RuleType       string    \`json:"ruleType"\`
	Wall           []Tile    \`json:"wall"\`
	WallRemaining  int       \`json:"wallRemaining"\`
	Players        [4]Player \`json:"players"\`
	CurrentTurn    int       \`json:"currentTurn"\`
	LastDiscard    *Tile     \`json:"lastDiscard"\`
	LastDiscardSeat int      \`json:"lastDiscardSeat"\`
	JustDrawnTile  *Tile     \`json:"justDrawnTile"\`
	IsGameOver     bool      \`json:"isGameOver"\`
	WinnerSeat     int       \`json:"winnerSeat"\`
	WinInfo        *WinResult\`json:"winInfo"\`
	HistoryLogs    []string  \`json:"historyLogs"\`
}

func NewGame(playerName string, ruleType string) *GameState {
	if ruleType == "" {
		ruleType = "GB"
	}
	includeHonors := ruleType != "SICHUAN"
	deck := NewDeck(includeHonors)
	ShuffleDeck(deck)

	winds := []string{"东", "南", "西", "北"}
	var players [4]Player
	players[0] = Player{
		ID: 0, Name: playerName, IsAI: false, Score: 1000, Wind: winds[0],
		Hand: make([]Tile, 0, 14), Melds: make([]Meld, 0), Discards: make([]Tile, 0),
	}
	botNames := []string{"阿强 (AI)", "小美 (AI)", "老李 (AI)"}
	for i := 1; i < 4; i++ {
		players[i] = Player{
			ID: i, Name: botNames[i-1], IsAI: true, Score: 1000, Wind: winds[i],
			Hand: make([]Tile, 0, 14), Melds: make([]Meld, 0), Discards: make([]Tile, 0),
		}
	}

	g := &GameState{
		RoundName:       "东风圈·第1局",
		RuleType:        ruleType,
		Wall:            deck,
		WallRemaining:   len(deck),
		Players:         players,
		CurrentTurn:     0,
		WinnerSeat:      -1,
		LastDiscardSeat: -1,
		HistoryLogs:     make([]string, 0),
	}

	for round := 0; round < 13; round++ {
		for p := 0; p < 4; p++ {
			t := g.drawFromWall()
			g.Players[p].Hand = append(g.Players[p].Hand, t)
		}
	}
	for p := 0; p < 4; p++ {
		SortTiles(g.Players[p].Hand)
	}

	extra := g.drawFromWall()
	g.Players[0].Hand = append(g.Players[0].Hand, extra)
	g.JustDrawnTile = &extra
	g.WallRemaining = len(g.Wall)
	g.Log(fmt.Sprintf("牌局开始！庄家 %s 起手摸牌: %s", g.Players[0].Name, extra.Name))
	return g
}

func (g *GameState) drawFromWall() Tile {
	if len(g.Wall) == 0 {
		return Tile{}
	}
	t := g.Wall[0]
	g.Wall = g.Wall[1:]
	g.WallRemaining = len(g.Wall)
	return t
}

func (g *GameState) Log(msg string) {
	timestamp := time.Now().Format("15:04:05")
	g.HistoryLogs = append(g.HistoryLogs, fmt.Sprintf("[%s] %s", timestamp, msg))
	if len(g.HistoryLogs) > 40 {
		g.HistoryLogs = g.HistoryLogs[len(g.HistoryLogs)-40:]
	}
}

func (g *GameState) Discard(seat int, tileIdx int) (*Tile, error) {
	if seat != g.CurrentTurn {
		return nil, fmt.Errorf("不是该玩家的回合")
	}
	p := &g.Players[seat]
	if tileIdx < 0 || tileIdx >= len(p.Hand) {
		return nil, fmt.Errorf("无效的牌索引")
	}
	discarded := p.Hand[tileIdx]
	p.Hand = append(p.Hand[:tileIdx], p.Hand[tileIdx+1:]...)
	SortTiles(p.Hand)

	p.Discards = append(p.Discards, discarded)
	g.LastDiscard = &discarded
	g.LastDiscardSeat = seat
	g.JustDrawnTile = nil
	g.Log(fmt.Sprintf("%s 打出: %s", p.Name, discarded.Name))

	if seat == 0 {
		p.TingTiles = CalculateTing(p.Hand, p.Melds)
		p.IsTing = len(p.TingTiles) > 0
	}
	return &discarded, nil
}

func (g *GameState) NextTurn(nextSeat int) bool {
	if len(g.Wall) <= 0 {
		g.IsGameOver = true
		g.WinnerSeat = -1
		g.Log("荒庄流局！牌墙已摸完。")
		return false
	}
	g.CurrentTurn = nextSeat
	t := g.drawFromWall()
	p := &g.Players[nextSeat]
	p.Hand = append(p.Hand, t)
	g.JustDrawnTile = &t
	g.Log(fmt.Sprintf("%s 摸牌", p.Name))
	return true
}

func (g *GameState) ApplyPeng(seat int) bool {
	if g.LastDiscard == nil || g.LastDiscardSeat == seat {
		return false
	}
	p := &g.Players[seat]
	discard := *g.LastDiscard
	count := 0
	newHand := make([]Tile, 0, len(p.Hand))
	meldedTiles := make([]Tile, 0, 3)
	for _, t := range p.Hand {
		if t.Type == discard.Type && count < 2 {
			count++
			meldedTiles = append(meldedTiles, t)
		} else {
			newHand = append(newHand, t)
		}
	}
	if count < 2 {
		return false
	}
	meldedTiles = append(meldedTiles, discard)
	p.Hand = newHand
	p.Melds = append(p.Melds, Meld{
		Type:     MeldPeng,
		Tiles:    meldedTiles,
		FromSeat: g.LastDiscardSeat,
	})
	opp := &g.Players[g.LastDiscardSeat]
	if len(opp.Discards) > 0 {
		opp.Discards = opp.Discards[:len(opp.Discards)-1]
	}
	g.CurrentTurn = seat
	g.LastDiscard = nil
	g.JustDrawnTile = nil
	g.Log(fmt.Sprintf("%s 碰了 %s 的 %s！", p.Name, opp.Name, discard.Name))
	return true
}

func (g *GameState) ApplyChi(seat int, chosenIdx int) bool {
	if g.LastDiscard == nil || (g.LastDiscardSeat+1)%4 != seat {
		return false
	}
	p := &g.Players[seat]
	discard := *g.LastDiscard
	options := CanChi(p.Hand, discard)
	if chosenIdx < 0 || chosenIdx >= len(options) {
		return false
	}
	chosenCombo := options[chosenIdx]
	needed := make(map[int]int)
	for _, t := range chosenCombo {
		if t.ID != discard.ID {
			needed[t.ID]++
		}
	}
	newHand := make([]Tile, 0, len(p.Hand))
	for _, t := range p.Hand {
		if needed[t.ID] > 0 {
			needed[t.ID]--
		} else {
			newHand = append(newHand, t)
		}
	}
	p.Hand = newHand
	p.Melds = append(p.Melds, Meld{
		Type:     MeldChi,
		Tiles:    chosenCombo,
		FromSeat: g.LastDiscardSeat,
	})
	opp := &g.Players[g.LastDiscardSeat]
	if len(opp.Discards) > 0 {
		opp.Discards = opp.Discards[:len(opp.Discards)-1]
	}
	g.CurrentTurn = seat
	g.LastDiscard = nil
	g.JustDrawnTile = nil
	g.Log(fmt.Sprintf("%s 吃了 %s 的 %s！", p.Name, opp.Name, discard.Name))
	return true
}

func (g *GameState) ApplyGang(seat int, isMingGang bool) bool {
	p := &g.Players[seat]
	if isMingGang {
		if g.LastDiscard == nil {
			return false
		}
		discard := *g.LastDiscard
		count := 0
		newHand := make([]Tile, 0, len(p.Hand))
		melded := make([]Tile, 0, 4)
		for _, t := range p.Hand {
			if t.Type == discard.Type && count < 3 {
				count++
				melded = append(melded, t)
			} else {
				newHand = append(newHand, t)
			}
		}
		if count < 3 {
			return false
		}
		melded = append(melded, discard)
		p.Hand = newHand
		p.Melds = append(p.Melds, Meld{
			Type:     MeldGang,
			Tiles:    melded,
			FromSeat: g.LastDiscardSeat,
		})
		opp := &g.Players[g.LastDiscardSeat]
		if len(opp.Discards) > 0 {
			opp.Discards = opp.Discards[:len(opp.Discards)-1]
		}
	}
	if len(g.Wall) > 0 {
		suppTile := g.Wall[len(g.Wall)-1]
		g.Wall = g.Wall[:len(g.Wall)-1]
		g.WallRemaining = len(g.Wall)
		p.Hand = append(p.Hand, suppTile)
		g.CurrentTurn = seat
		g.JustDrawnTile = &suppTile
		g.LastDiscard = nil
		g.Log(fmt.Sprintf("%s 杠后补牌: %s", p.Name, suppTile.Name))
		return true
	}
	return false
}

func (g *GameState) WinGame(winnerSeat int, isSelfDraw bool) WinResult {
	p := &g.Players[winnerSeat]
	var winTile Tile
	if isSelfDraw && g.JustDrawnTile != nil {
		winTile = *g.JustDrawnTile
	} else if g.LastDiscard != nil {
		winTile = *g.LastDiscard
	}
	result := CheckWin(p.Hand, p.Melds, winTile, isSelfDraw)
	g.IsGameOver = true
	g.WinnerSeat = winnerSeat
	g.WinInfo = &result
	p.HasWon = true
	if isSelfDraw {
		g.Log(fmt.Sprintf("🎉 恭喜！%s 自摸胡牌！牌型: %s (%d番, %d分)", p.Name, result.Pattern, result.Fan, result.Score))
		for i := 0; i < 4; i++ {
			if i != winnerSeat {
				g.Players[i].Score -= result.Score
				p.Score += result.Score
			}
		}
	} else {
		loser := &g.Players[g.LastDiscardSeat]
		g.Log(fmt.Sprintf("🎉 %s 荣和胡牌！抓铳 %s！牌型: %s (%d番, %d分)", p.Name, loser.Name, result.Pattern, result.Fan, result.Score))
		loser.Score -= result.Score * 3
		p.Score += result.Score * 3
	}
	return result
}
`,
  },
  {
    path: 'tui/terminal.go',
    name: 'terminal.go',
    category: 'go',
    description: 'Termux 原生 ANSI 彩色终端界面渲染、手牌与牌河绘制、按键交互',
    content: `package tui

import (
	"bufio"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/user/termux-mahjong/engine"
)

const (
	ColorReset   = "\\033[0m"
	ColorBold    = "\\033[1m"
	ColorDim     = "\\033[2m"
	ColorRed     = "\\033[31m"
	ColorGreen   = "\\033[32m"
	ColorYellow  = "\\033[33m"
	ColorBlue    = "\\033[34m"
	ColorMagenta = "\\033[35m"
	ColorCyan    = "\\033[36m"
)

type TerminalGame struct {
	game   *engine.GameState
	reader *bufio.Reader
}

func NewTerminalGame(playerName, rule string) *TerminalGame {
	return &TerminalGame{
		game:   engine.NewGame(playerName, rule),
		reader: bufio.NewReader(os.Stdin),
	}
}

func (tg *TerminalGame) Run() {
	tg.clearScreen()
	tg.printBanner()
	time.Sleep(1 * time.Second)

	for !tg.game.IsGameOver {
		tg.renderTable()
		turn := tg.game.CurrentTurn
		if turn == 0 {
			tg.handleHumanTurn()
		} else {
			tg.handleBotTurn(turn)
		}
	}

	tg.renderTable()
	fmt.Printf("\\n%s╔════════════════════════════════════════════════════════════╗%s\\n", ColorYellow, ColorReset)
	if tg.game.WinnerSeat >= 0 {
		winner := tg.game.Players[tg.game.WinnerSeat]
		fmt.Printf("║  🎉 游戏结束！胜者: %-32s║\\n", winner.Name)
	} else {
		fmt.Printf("║  🍃 流局！牌墙已摸空，平局结算。                          ║\\n")
	}
	fmt.Printf("╚════════════════════════════════════════════════════════════╝\\n")
	fmt.Println("\\n按回车键退出游戏...")
	tg.reader.ReadString('\\n')
}

func (tg *TerminalGame) clearScreen() {
	fmt.Print("\\033[H\\033[2J")
}

func (tg *TerminalGame) printBanner() {
	fmt.Printf("%s", ColorCyan)
	fmt.Println("┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓")
	fmt.Println("┃        🀄 Termux Go 纯终端麻将 v1.0.0 🀄        ┃")
	fmt.Println("┃     专为 Android Termux 终端与命令行深度优化    ┃")
	fmt.Println("┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛")
	fmt.Printf("%s\\n", ColorReset)
}

func (tg *TerminalGame) renderTable() {
	tg.clearScreen()
	g := tg.game

	fmt.Printf("%s[ %s | 规则: %s | 牌墙余: %d 张 ]%s\\n",
		ColorYellow, g.RoundName, g.RuleType, g.WallRemaining, ColorReset)
	fmt.Println(strings.Repeat("─", 62))

	fmt.Printf("%s【北家】%-10s (分: %d) 手牌: %d 张%s\\n",
		ColorCyan, g.Players[2].Name, g.Players[2].Score, len(g.Players[2].Hand), ColorReset)
	tg.printMelds(g.Players[2].Melds)

	fmt.Printf("\\n%s【西家】%-10s (分: %d)       【东家】%-10s (分: %d)%s\\n",
		ColorMagenta, g.Players[3].Name, g.Players[3].Score,
		ColorBlue, g.Players[1].Name, g.Players[1].Score, ColorReset)

	fmt.Println("\\n" + strings.Repeat("┈", 22) + " 【 牌 河 】 " + strings.Repeat("┈", 22))
	for pIdx := 0; pIdx < 4; pIdx++ {
		p := g.Players[pIdx]
		fmt.Printf("%-6s: ", p.Name)
		if len(p.Discards) == 0 {
			fmt.Printf("%s(空)%s", ColorDim, ColorReset)
		} else {
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

	me := g.Players[0]
	fmt.Printf("%s【你·南家】%s (当前积分: %d)%s\\n", ColorGreen, me.Name, me.Score, ColorReset)
	tg.printMelds(me.Melds)

	fmt.Printf("%s序号: ", ColorDim)
	for i := range me.Hand {
		fmt.Printf("%3d  ", i+1)
	}
	fmt.Printf("%s\\n手牌: ", ColorReset)
	for _, t := range me.Hand {
		fmt.Printf("%s ", t.TerminalDisplay())
	}
	fmt.Println()

	if len(me.TingTiles) > 0 {
		fmt.Printf("%s💡 听牌提示: 当前叫听 [ ", ColorYellow)
		for _, tt := range me.TingTiles {
			fmt.Printf("%s ", tt.TerminalDisplay())
		}
		fmt.Printf("]%s\\n", ColorReset)
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

	var winTile engine.Tile
	if g.JustDrawnTile != nil {
		winTile = *g.JustDrawnTile
	}
	canSelfWin := engine.CheckWin(me.Hand, me.Melds, winTile, true).IsWin

	prompt := fmt.Sprintf("%s👉 你的回合: 请输入出牌序号 (1-%d)", ColorBold, len(me.Hand))
	if canSelfWin {
		prompt += fmt.Sprintf(" | %s[H] 自摸胡牌%s", ColorRed, ColorBold)
	}
	prompt += fmt.Sprintf(" | [Q] 退出 %s> ", ColorReset)

	fmt.Print(prompt)
	input, _ := tg.reader.ReadString('\\n')
	input = strings.TrimSpace(input)

	if strings.EqualFold(input, "q") {
		os.Exit(0)
	}
	if canSelfWin && strings.EqualFold(input, "h") {
		g.WinGame(0, true)
		return
	}

	idx, err := strconv.Atoi(input)
	if err != nil || idx < 1 || idx > len(me.Hand) {
		idx = len(me.Hand) // 摸切
	}

	discarded, err := g.Discard(0, idx-1)
	if err != nil {
		return
	}

	claimed := tg.checkBotsClaim(*discarded, 0)
	if !claimed {
		g.NextTurn(1)
	}
}

func (tg *TerminalGame) handleBotTurn(seat int) {
	g := tg.game
	bot := &g.Players[seat]
	time.Sleep(800 * time.Millisecond)

	var winTile engine.Tile
	if g.JustDrawnTile != nil {
		winTile = *g.JustDrawnTile
	}
	if engine.CheckWin(bot.Hand, bot.Melds, winTile, true).IsWin {
		g.WinGame(seat, true)
		return
	}

	chosenIdx := engine.SelectAIDiscard(bot.Hand, bot.Melds)
	discarded, err := g.Discard(seat, chosenIdx)
	if err != nil {
		return
	}

	claimed := tg.promptHumanClaim(*discarded, seat)
	if claimed {
		return
	}

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
	if !canHu && !canPeng {
		return false
	}

	tg.renderTable()
	fmt.Printf("\\n%s⚡ %s 打出 %s！你可以响应: ", ColorYellow, g.Players[fromSeat].Name, discard.TerminalDisplay())
	if canHu {
		fmt.Printf("%s[H] 胡牌!%s ", ColorRed, ColorReset)
	}
	if canPeng {
		fmt.Print("[P] 碰 ")
	}
	fmt.Printf("[Enter] 过 > %s", ColorReset)

	input, _ := tg.reader.ReadString('\\n')
	input = strings.TrimSpace(input)

	if canHu && strings.EqualFold(input, "h") {
		g.WinGame(0, false)
		return true
	}
	if canPeng && strings.EqualFold(input, "p") {
		g.ApplyPeng(0)
		return true
	}
	return false
}

func (tg *TerminalGame) checkBotsClaim(discard engine.Tile, fromSeat int) bool {
	g := tg.game
	for p := 1; p < 4; p++ {
		if p == fromSeat {
			continue
		}
		if engine.CheckWin(g.Players[p].Hand, g.Players[p].Melds, discard, false).IsWin {
			g.WinGame(p, false)
			return true
		}
		if engine.CanPeng(g.Players[p].Hand, discard) && engine.ShouldAIPeng(g.Players[p].Hand, g.Players[p].Melds, discard) {
			g.ApplyPeng(p)
			return true
		}
	}
	return false
}
`,
  },
  {
    path: 'web/server.go',
    name: 'server.go',
    category: 'go',
    description: '内嵌极简 HTTP 服务，支持手机浏览器局域网触摸对局',
    content: `package web

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"sync"

	"github.com/user/termux-mahjong/engine"
)

type WebServer struct {
	mu   sync.Mutex
	game *engine.GameState
	port int
}

func NewWebServer(port int, rule string) *WebServer {
	return &WebServer{
		game: engine.NewGame("Termux玩家", rule),
		port: port,
	}
}

func (ws *WebServer) Start() error {
	mux := http.NewServeMux()
	mux.HandleFunc("/", ws.handleIndex)
	mux.HandleFunc("/api/state", ws.handleState)
	mux.HandleFunc("/api/discard", ws.handleDiscard)
	mux.HandleFunc("/api/action", ws.handleAction)

	addr := fmt.Sprintf("0.0.0.0:%d", ws.port)
	fmt.Printf("📱 本地手机浏览器打开:  http://localhost:%d\\n", ws.port)
	return http.ListenAndServe(addr, mux)
}

func (ws *WebServer) handleState(w http.ResponseWriter, r *http.Request) {
	ws.mu.Lock()
	defer ws.mu.Unlock()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(ws.game)
}

func (ws *WebServer) handleDiscard(w http.ResponseWriter, r *http.Request) {
	ws.mu.Lock()
	defer ws.mu.Unlock()
	idx, _ := strconv.Atoi(r.URL.Query().Get("index"))
	ws.game.Discard(0, idx)
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

func (ws *WebServer) handleAction(w http.ResponseWriter, r *http.Request) {
	ws.mu.Lock()
	defer ws.mu.Unlock()
	act := r.URL.Query().Get("action")
	if act == "peng" {
		ws.game.ApplyPeng(0)
	} else if act == "hu" {
		ws.game.WinGame(0, false)
	}
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

func (ws *WebServer) handleIndex(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Write([]byte("<h1>🀄 Termux 麻将网页端已就绪</h1>"))
}
`,
  },
  {
    path: 'termux_setup.sh',
    name: 'termux_setup.sh',
    category: 'script',
    description: 'Termux 一键自动化配置脚本 (自动安装 Go、Git、编译与快捷方式生成)',
    content: `#!/data/data/com.termux/files/usr/bin/bash
set -e

echo -e "\\033[1;36m[1/4] 正在更新 Termux 基础仓库...\\033[0m"
pkg update -y || apt-get update -y

echo -e "\\033[1;33m[2/4] 安装 Go 语言与 Git 环境...\\033[0m"
pkg install -y golang git make || apt-get install -y golang git make

echo -e "\\033[1;33m[3/4] 编译麻将原生程序...\\033[0m"
CGO_ENABLED=0 go build -ldflags="-s -w" -o mahjong main.go

echo -e "\\033[1;33m[4/4] 注册系统快捷命令...\\033[0m"
mkdir -p "$PREFIX/bin"
cp -f mahjong "$PREFIX/bin/mahjong"
chmod +x "$PREFIX/bin/mahjong"

echo -e "\\033[1;32m🎉 部署成功！直接在命令行输入 mahjong 即可开玩！\\033[0m"
`,
  },
  {
    path: 'Makefile',
    name: 'Makefile',
    category: 'config',
    description: 'Linux/Termux 构建指令集合 (make build, make run, make run-web)',
    content: `.PHONY: all build run run-web clean

all: build

build:
	CGO_ENABLED=0 go build -ldflags="-s -w" -o mahjong main.go

run: build
	./mahjong

run-web: build
	./mahjong -web -port 8080

clean:
	rm -f mahjong
`,
  },
  {
    path: 'README.md',
    name: 'README.md',
    category: 'docs',
    description: '完整项目文档、GitHub 创建上传与 Termux 部署实战全指南',
    content: `# 🀄 Termux Go Mahjong (双模麻将)

专为 Android Termux 打造的 Go 语言开源麻将。

## 🚀 极速部署

\`\`\`bash
# 1. 在 Termux 中安装 Git
pkg update -y && pkg install -y git

# 2. 克隆仓库 (替换为你的仓库地址)
git clone https://github.com/USERNAME/REPO_NAME.git
cd REPO_NAME

# 3. 执行自动化安装脚本
chmod +x termux_setup.sh
./termux_setup.sh

# 4. 启动游戏
mahjong
\`\`\`
`,
  },
];

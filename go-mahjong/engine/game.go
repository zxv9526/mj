package engine

import (
	"fmt"
	"time"
)

// Player represents one participant in the Mahjong match
type Player struct {
	ID        int      `json:"id"`
	Name      string   `json:"name"`
	IsAI      bool     `json:"isAI"`
	Hand      []Tile   `json:"hand"`
	Melds     []Meld   `json:"melds"`
	Discards  []Tile   `json:"discards"`
	Score     int      `json:"score"`
	Wind      string   `json:"wind"` // "东", "南", "西", "北"
	HasWon    bool     `json:"hasWon"`
	IsTing    bool     `json:"isTing"`
	TingTiles []Tile   `json:"tingTiles"`
}

// GameState represents the complete game snapshot
type GameState struct {
	RoundName      string    `json:"roundName"` // e.g. "东风局 第1局"
	RuleType       string    `json:"ruleType"`  // "GB" (国标) or "SICHUAN" (川麻)
	Wall           []Tile    `json:"wall"`
	WallRemaining  int       `json:"wallRemaining"`
	Players        [4]Player `json:"players"`
	CurrentTurn    int       `json:"currentTurn"` // 0..3
	LastDiscard    *Tile     `json:"lastDiscard"`
	LastDiscardSeat int      `json:"lastDiscardSeat"`
	JustDrawnTile  *Tile     `json:"justDrawnTile"`
	IsGameOver     bool      `json:"isGameOver"`
	WinnerSeat     int       `json:"winnerSeat"` // -1 if draw or ongoing
	WinInfo        *WinResult`json:"winInfo"`
	HistoryLogs    []string  `json:"historyLogs"`
}

// NewGame initializes a new 4-player match
func NewGame(playerName string, ruleType string) *GameState {
	if ruleType == "" {
		ruleType = "GB"
	}
	includeHonors := ruleType != "SICHUAN"
	deck := NewDeck(includeHonors)
	ShuffleDeck(deck)

	winds := []string{"东", "南", "西", "北"}
	var players [4]Player

	// Player 0 is Human (unless configured)
	players[0] = Player{
		ID: 0, Name: playerName, IsAI: false, Score: 1000, Wind: winds[0],
		Hand: make([]Tile, 0, 14), Melds: make([]Meld, 0), Discards: make([]Tile, 0),
	}
	// Players 1, 2, 3 are Bots
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
		CurrentTurn:     0, // Dealer starts
		WinnerSeat:      -1,
		LastDiscardSeat: -1,
		HistoryLogs:     make([]string, 0),
	}

	// Deal 13 tiles to everyone
	for round := 0; round < 13; round++ {
		for p := 0; p < 4; p++ {
			t := g.drawFromWall()
			g.Players[p].Hand = append(g.Players[p].Hand, t)
		}
	}

	for p := 0; p < 4; p++ {
		SortTiles(g.Players[p].Hand)
	}

	// Dealer (seat 0) draws the 14th tile
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

// Log records a message
func (g *GameState) Log(msg string) {
	timestamp := time.Now().Format("15:04:05")
	entry := fmt.Sprintf("[%s] %s", timestamp, msg)
	g.HistoryLogs = append(g.HistoryLogs, entry)
	if len(g.HistoryLogs) > 40 {
		g.HistoryLogs = g.HistoryLogs[len(g.HistoryLogs)-40:]
	}
}

// Discard handles a player discarding a tile
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

	// Update Ting state for human
	if seat == 0 {
		p.TingTiles = CalculateTing(p.Hand, p.Melds)
		p.IsTing = len(p.TingTiles) > 0
	}

	return &discarded, nil
}

// NextTurn moves to next player's draw phase
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

// ApplyPeng executes a Peng for target seat
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

	// Remove from opponent's discards
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

// ApplyChi executes a Chi
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

	// Remove the 2 hand tiles from player's hand
	newHand := make([]Tile, 0, len(p.Hand))
	needed := make(map[int]int)
	for _, t := range chosenCombo {
		if t.ID != discard.ID {
			needed[t.ID]++
		}
	}

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

	// Remove from left player's discards
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

// ApplyGang executes a Gang
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
		g.Log(fmt.Sprintf("%s 明杠 %s！", p.Name, discard.Name))
	}

	// Draw supplementary replacement tile from end of wall
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

// WinGame handles winning event
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

	// Update points
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
		g.Log(fmt.Sprintf("🎉 %s 荣和胡牌！抓了 %s 的放铳！牌型: %s (%d番, %d分)", p.Name, loser.Name, result.Pattern, result.Fan, result.Score))
		loser.Score -= result.Score * 3
		p.Score += result.Score * 3
	}

	return result
}

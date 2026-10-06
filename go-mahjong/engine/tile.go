package engine

import (
	"fmt"
	"math/rand"
	"sort"
	"time"
)

// Suit represents tile category
type Suit int

const (
	SuitWan  Suit = 1 // 万子 (Characters)
	SuitTong Suit = 2 // 筒子 (Dots)
	SuitTiao Suit = 3 // 条子 (Bamboo)
	SuitZi   Suit = 4 // 字牌 (Honors)
)

// Tile represents a single Mahjong tile
type Tile struct {
	ID    int    // Unique instance ID (0..135)
	Type  int    // Logical Type code: 1-9 (Wan), 11-19 (Tong), 21-29 (Tiao), 31-34 (Wind), 35-37 (Dragon)
	Suit  Suit   // Category
	Value int    // 1-9 or 1-4 (Wind) or 1-3 (Dragon)
	Name  string // e.g. "一万", "五筒", "红中"
	Code  string // e.g. "1w", "5t", "9s", "hz"
	Emoji string // Unicode Mahjong glyph
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

// NewTile creates a Tile instance
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

// String returns readable representation
func (t Tile) String() string {
	return t.Name
}

// TerminalDisplay returns ANSI colored representation for Termux terminal
func (t Tile) TerminalDisplay() string {
	switch t.Suit {
	case SuitWan:
		// Red ANSI for Wan
		return fmt.Sprintf("\033[1;31m[%s]\033[0m", t.Name)
	case SuitTong:
		// Cyan ANSI for Tong
		return fmt.Sprintf("\033[1;36m[%s]\033[0m", t.Name)
	case SuitTiao:
		// Green ANSI for Tiao
		return fmt.Sprintf("\033[1;32m[%s]\033[0m", t.Name)
	case SuitZi:
		// Yellow/Magenta ANSI for Honors
		if t.Type == 35 { // 中
			return fmt.Sprintf("\033[1;31;47m[%s]\033[0m", t.Name)
		} else if t.Type == 36 { // 发
			return fmt.Sprintf("\033[1;32;47m[%s]\033[0m", t.Name)
		}
		return fmt.Sprintf("\033[1;33m[%s]\033[0m", t.Name)
	default:
		return fmt.Sprintf("[%s]", t.Name)
	}
}

// NewDeck builds a full 136-tile deck (or 108 tiles for Sichuan rule)
func NewDeck(includeHonors bool) []Tile {
	deck := make([]Tile, 0, 136)
	id := 0

	// 4 copies of each tile
	for copy := 0; copy < 4; copy++ {
		// Wan 1..9
		for i := 1; i <= 9; i++ {
			deck = append(deck, NewTile(id, i))
			id++
		}
		// Tong 11..19
		for i := 11; i <= 19; i++ {
			deck = append(deck, NewTile(id, i))
			id++
		}
		// Tiao 21..29
		for i := 21; i <= 29; i++ {
			deck = append(deck, NewTile(id, i))
			id++
		}
		if includeHonors {
			// Winds 31..34
			for i := 31; i <= 34; i++ {
				deck = append(deck, NewTile(id, i))
				id++
			}
			// Dragons 35..37
			for i := 35; i <= 37; i++ {
				deck = append(deck, NewTile(id, i))
				id++
			}
		}
	}
	return deck
}

// ShuffleDeck shuffles tiles randomly
func ShuffleDeck(deck []Tile) {
	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	r.Shuffle(len(deck), func(i, j int) {
		deck[i], deck[j] = deck[j], deck[i]
	})
}

// SortTiles sorts a list of tiles by suit and value
func SortTiles(tiles []Tile) {
	sort.Slice(tiles, func(i, j int) bool {
		if tiles[i].Type != tiles[j].Type {
			return tiles[i].Type < tiles[j].Type
		}
		return tiles[i].ID < tiles[j].ID
	})
}

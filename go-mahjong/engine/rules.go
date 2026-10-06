package engine

// MeldType denotes the kind of exposed or concealed meld
type MeldType string

const (
	MeldChi  MeldType = "CHI"  // 顺子
	MeldPeng MeldType = "PENG" // 刻子
	MeldGang MeldType = "GANG" // 杠子
)

// Meld represents exposed melds (吃、碰、杠)
type Meld struct {
	Type     MeldType `json:"type"`
	Tiles    []Tile   `json:"tiles"`
	FromSeat int      `json:"fromSeat"` // Seat of discarded player (-1 for concealed gang)
}

// WinResult contains result of win evaluation
type WinResult struct {
	IsWin     bool     `json:"isWin"`
	Pattern   string   `json:"pattern"` // e.g. "平胡", "碰碰胡", "七对", "清一色", "十三幺"
	Fan       int      `json:"fan"`     // 番数
	Score     int      `json:"score"`   // 分数
	Details   []string `json:"details"`
}

// CanChi checks if a player can Chi the discard (only from left seat)
func CanChi(hand []Tile, discard Tile) [][]Tile {
	// Honors cannot form sequence
	if discard.Suit == SuitZi {
		return nil
	}

	tType := discard.Type
	var results [][]Tile

	// Case 1: [discard-2, discard-1, discard]
	if (tType%10) >= 3 && hasType(hand, tType-2) && hasType(hand, tType-1) {
		t1 := findAndExtract(hand, tType-2)
		t2 := findAndExtract(hand, tType-1)
		results = append(results, []Tile{t1, t2, discard})
	}
	// Case 2: [discard-1, discard, discard+1]
	if (tType%10) >= 2 && (tType%10) <= 8 && hasType(hand, tType-1) && hasType(hand, tType+1) {
		t1 := findAndExtract(hand, tType-1)
		t2 := findAndExtract(hand, tType+1)
		results = append(results, []Tile{t1, discard, t2})
	}
	// Case 3: [discard, discard+1, discard+2]
	if (tType%10) <= 7 && hasType(hand, tType+1) && hasType(hand, tType+2) {
		t1 := findAndExtract(hand, tType+1)
		t2 := findAndExtract(hand, tType+2)
		results = append(results, []Tile{discard, t1, t2})
	}

	return results
}

// CanPeng checks if player has at least 2 matching tiles for Peng
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

// CanGang checks if player can perform a Gang
func CanGang(hand []Tile, melds []Meld, discard Tile, isSelfTurn bool) (canMingGang bool, anGangTypes []int, buGangTypes []int) {
	if !isSelfTurn {
		// Ming Gang on opponent's discard: needs 3 in hand
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

	// Self turn:
	// 1. An Gang: 4 identical tiles in hand
	counts := make(map[int]int)
	for _, t := range hand {
		counts[t.Type]++
	}
	for tType, count := range counts {
		if count == 4 {
			anGangTypes = append(anGangTypes, tType)
		}
	}

	// 2. Bu Gang: tile in hand matches an existing PENG meld
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

// CheckWin determines if the current hand + melds + winTile constitutes a winning hand
func CheckWin(hand []Tile, melds []Meld, winTile Tile, isSelfDraw bool) WinResult {
	allHand := append([]Tile{}, hand...)
	if !isSelfDraw {
		allHand = append(allHand, winTile)
	}
	SortTiles(allHand)

	// Check Seven Pairs (七对)
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
				Details: []string{pattern, "门前清", "特殊番种"},
			}
		}
	}

	// Check standard 3N + 2 decomposition
	if checkStandardWin(allHand) {
		fan := 1
		pattern := "平胡"

		// Check PengPeng Hu (All Triplets)
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

		// Check Pure One Suit (清一色)
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

// checkStandardWin tests if a set of tiles (length 2, 5, 8, 11, or 14) can form M sets + 1 pair
func checkStandardWin(tiles []Tile) bool {
	if len(tiles)%3 != 2 {
		return false
	}

	typeCounts := make(map[int]int)
	for _, t := range tiles {
		typeCounts[t.Type]++
	}

	// Try each possible pair (雀头)
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

// canFormSets checks if the remaining tiles can completely form sequences or triplets
func canFormSets(counts map[int]int) bool {
	// Find the lowest tile type with count > 0
	var first int = -1
	for t := 1; t <= 37; t++ {
		if counts[t] > 0 {
			first = t
			break
		}
	}
	if first == -1 {
		return true // All tiles decomposed
	}

	// Option A: Try Triplet (刻子)
	if counts[first] >= 3 {
		counts[first] -= 3
		if canFormSets(counts) {
			counts[first] += 3
			return true
		}
		counts[first] += 3
	}

	// Option B: Try Sequence (顺子) - only Wan, Tong, Tiao and value <= 7
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

// CalculateTing finds which tiles would produce a win for the current hand
func CalculateTing(hand []Tile, melds []Meld) []Tile {
	var winningTiles []Tile
	// Try all possible Mahjong tile types 1..9, 11..19, 21..29, 31..37
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

package engine

import "math/rand"

// SelectAIDiscard decides which tile in hand the AI should discard
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

		// If it's part of a triplet or quad, keep it!
		if c >= 3 {
			score += 100
		} else if c == 2 {
			score += 50
		}

		// Honors evaluation:
		if t.Suit == SuitZi {
			if c == 1 {
				// Single isolated honor is prime discard candidate
				score -= 80
			}
		} else {
			// Suited tiles: Wan, Tong, Tiao
			val := t.Value

			// Check adjacent tiles for sequences
			hasLeft1 := typeCounts[t.Type-1] > 0
			hasLeft2 := typeCounts[t.Type-2] > 0
			hasRight1 := typeCounts[t.Type+1] > 0
			hasRight2 := typeCounts[t.Type+2] > 0

			if hasLeft1 && hasRight1 {
				score += 40 // Centered sequence: e.g. 2-[3]-4
			}
			if (hasLeft1 && val > 1) || (hasRight1 && val < 9) {
				score += 25 // Two-sided wait or adjacent
			}
			if hasLeft2 || hasRight2 {
				score += 10 // Kanchan gap wait
			}

			// Terminal tiles (1 and 9) are slightly less flexible
			if val == 1 || val == 9 {
				score -= 10
			} else if val == 2 || val == 8 {
				score -= 5
			}
		}

		scores[i] = score
	}

	// Pick the tile with lowest score (worst utility)
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

// ShouldAIPeng decides whether AI should call Peng
func ShouldAIPeng(hand []Tile, melds []Meld, discard Tile) bool {
	// If honors (dragons or seat wind), usually peng
	if discard.Suit == SuitZi {
		return true
	}
	// If already has 2 or more melds, speed up by penging
	if len(melds) >= 2 {
		return true
	}
	// 50% chance for regular suited tiles
	return rand.Float32() < 0.6
}

// ShouldAIGang decides whether AI should call Gang
func ShouldAIGang() bool {
	return true
}

// ShouldAIChi decides whether AI should call Chi
func ShouldAIChi() bool {
	return rand.Float32() < 0.45
}

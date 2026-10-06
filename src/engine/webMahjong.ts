import { GameState, Meld, Player, Suit, Tile, WinResult } from '../types/mahjong';

const WAN_NAMES = ['一万', '二万', '三万', '四万', '五万', '六万', '七万', '八万', '九万'];
const TONG_NAMES = ['一筒', '二筒', '三筒', '四筒', '五筒', '六筒', '七筒', '八筒', '九筒'];
const TIAO_NAMES = ['一条', '二条', '三条', '四条', '五条', '六条', '七条', '八条', '九条'];
const WIND_NAMES = ['东风', '南风', '西风', '北风'];
const DRAGON_NAMES = ['红中', '发财', '白板'];

const WAN_EMOJIS = ['🀇', '🀈', '🀉', '🀊', '🀋', '🀌', '🀍', '🀎', '🀏'];
const TONG_EMOJIS = ['🀙', '🀚', '🀛', '🀜', '🀝', '🀞', '🀟', '🀠', '🀡'];
const TIAO_EMOJIS = ['🀐', '🀑', '🀒', '🀓', '🀔', '🀕', '🀖', '🀗', '🀘'];
const WIND_EMOJIS = ['🀀', '🀁', '🀂', '🀃'];
const DRAGON_EMOJIS = ['🀄', '🀅', '🀆'];

export function createTile(id: number, type: number): Tile {
  let suit: Suit = Suit.Wan;
  let value = 1;
  let name = '';
  let code = '';
  let emoji = '';

  if (type >= 1 && type <= 9) {
    suit = Suit.Wan;
    value = type;
    name = WAN_NAMES[type - 1];
    code = `${type}m`;
    emoji = WAN_EMOJIS[type - 1];
  } else if (type >= 11 && type <= 19) {
    suit = Suit.Tong;
    value = type - 10;
    name = TONG_NAMES[value - 1];
    code = `${value}p`;
    emoji = TONG_EMOJIS[value - 1];
  } else if (type >= 21 && type <= 29) {
    suit = Suit.Tiao;
    value = type - 20;
    name = TIAO_NAMES[value - 1];
    code = `${value}s`;
    emoji = TIAO_EMOJIS[value - 1];
  } else if (type >= 31 && type <= 34) {
    suit = Suit.Zi;
    value = type - 30;
    name = WIND_NAMES[value - 1];
    code = `${value}z`;
    emoji = WIND_EMOJIS[value - 1];
  } else if (type >= 35 && type <= 37) {
    suit = Suit.Zi;
    value = type - 30;
    name = DRAGON_NAMES[type - 35];
    code = `${value}z`;
    emoji = DRAGON_EMOJIS[type - 35];
  }

  return { id, type, suit, value, name, code, emoji };
}

export function createDeck(includeHonors = true): Tile[] {
  const deck: Tile[] = [];
  let id = 0;
  for (let copy = 0; copy < 4; copy++) {
    for (let i = 1; i <= 9; i++) deck.push(createTile(id++, i));
    for (let i = 11; i <= 19; i++) deck.push(createTile(id++, i));
    for (let i = 21; i <= 29; i++) deck.push(createTile(id++, i));
    if (includeHonors) {
      for (let i = 31; i <= 34; i++) deck.push(createTile(id++, i));
      for (let i = 35; i <= 37; i++) deck.push(createTile(id++, i));
    }
  }
  return shuffle(deck);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function sortTiles(tiles: Tile[]): Tile[] {
  return [...tiles].sort((a, b) => {
    if (a.type !== b.type) return a.type - b.type;
    return a.id - b.id;
  });
}

export function checkWin(hand: Tile[], melds: Meld[], winTile: Tile, isSelfDraw: boolean): WinResult {
  const allHand = isSelfDraw ? [...hand] : [...hand, winTile];
  sortTiles(allHand);

  // 1. Seven pairs (七对)
  if (melds.length === 0 && allHand.length === 14) {
    let is7P = true;
    for (let i = 0; i < 14; i += 2) {
      if (allHand[i].type !== allHand[i + 1]?.type) {
        is7P = false;
        break;
      }
    }
    if (is7P) {
      const isPure = isAllOneSuit(allHand, melds);
      const fan = isPure ? 16 : 4;
      const pattern = isPure ? '清一色·七对' : '七对子';
      return {
        isWin: true,
        pattern,
        fan,
        score: fan * 10,
        details: [pattern, '门前清', isSelfDraw ? '自摸' : '荣和'],
      };
    }
  }

  // 2. Standard 3N + 2
  if (checkStandardWin(allHand)) {
    let fan = 1;
    let pattern = '平胡';

    const isAllTrips = isHandAllTriplets(allHand) && melds.every(m => m.type !== 'CHI');
    if (isAllTrips) {
      fan = 4;
      pattern = '碰碰胡';
    }

    if (isAllOneSuit(allHand, melds)) {
      fan += 8;
      pattern = '清一色·' + pattern;
    }

    if (isSelfDraw) {
      fan += 1;
      pattern += ' (自摸)';
    }

    return {
      isWin: true,
      pattern,
      fan,
      score: fan * 10,
      details: [pattern, isSelfDraw ? '自摸加番' : '放铳荣和'],
    };
  }

  return { isWin: false, pattern: '', fan: 0, score: 0, details: [] };
}

function checkStandardWin(tiles: Tile[]): boolean {
  if (tiles.length % 3 !== 2) return false;
  const counts: Record<number, number> = {};
  for (const t of tiles) counts[t.type] = (counts[t.type] || 0) + 1;

  for (const typeStr of Object.keys(counts)) {
    const tType = Number(typeStr);
    if (counts[tType] >= 2) {
      counts[tType] -= 2;
      if (canFormSets(counts)) return true;
      counts[tType] += 2;
    }
  }
  return false;
}

function canFormSets(counts: Record<number, number>): boolean {
  let first = -1;
  for (let t = 1; t <= 37; t++) {
    if ((counts[t] || 0) > 0) {
      first = t;
      break;
    }
  }
  if (first === -1) return true;

  // Triplet
  if (counts[first] >= 3) {
    counts[first] -= 3;
    if (canFormSets(counts)) return true;
    counts[first] += 3;
  }

  // Sequence
  const suit = Math.floor(first / 10);
  const val = first % 10;
  if (suit <= 2 && val >= 1 && val <= 7) {
    if ((counts[first + 1] || 0) > 0 && (counts[first + 2] || 0) > 0) {
      counts[first]--;
      counts[first + 1]--;
      counts[first + 2]--;
      if (canFormSets(counts)) return true;
      counts[first]++;
      counts[first + 1]++;
      counts[first + 2]++;
    }
  }

  return false;
}

function isHandAllTriplets(tiles: Tile[]): boolean {
  const counts: Record<number, number> = {};
  for (const t of tiles) counts[t.type] = (counts[t.type] || 0) + 1;
  let pairCount = 0;
  for (const c of Object.values(counts)) {
    if (c === 2) pairCount++;
    else if (c !== 3 && c !== 0) return false;
  }
  return pairCount === 1;
}

function isAllOneSuit(tiles: Tile[], melds: Meld[]): boolean {
  if (tiles.length === 0) return false;
  const target = tiles[0].suit;
  if (target === Suit.Zi) return false;
  if (tiles.some(t => t.suit !== target)) return false;
  for (const m of melds) {
    if (m.tiles.some(t => t.suit !== target)) return false;
  }
  return true;
}

export function calculateTing(hand: Tile[], melds: Meld[]): Tile[] {
  const tingList: Tile[] = [];
  const candidateTypes = [
    1, 2, 3, 4, 5, 6, 7, 8, 9,
    11, 12, 13, 14, 15, 16, 17, 18, 19,
    21, 22, 23, 24, 25, 26, 27, 28, 29,
    31, 32, 33, 34, 35, 36, 37,
  ];
  for (const ct of candidateTypes) {
    const dummy = createTile(999, ct);
    if (checkWin(hand, melds, dummy, false).isWin) {
      tingList.push(dummy);
    }
  }
  return tingList;
}

export function canPeng(hand: Tile[], discard: Tile): boolean {
  const count = hand.filter(t => t.type === discard.type).length;
  return count >= 2;
}

export function canChi(hand: Tile[], discard: Tile): Tile[][] {
  if (discard.suit === Suit.Zi) return [];
  const t = discard.type;
  const v = discard.value;
  const results: Tile[][] = [];

  const has = (typ: number) => hand.some(x => x.type === typ);
  const get = (typ: number) => hand.find(x => x.type === typ)!;

  if (v >= 3 && has(t - 2) && has(t - 1)) {
    results.push([get(t - 2), get(t - 1), discard]);
  }
  if (v >= 2 && v <= 8 && has(t - 1) && has(t + 1)) {
    results.push([get(t - 1), discard, get(t + 1)]);
  }
  if (v <= 7 && has(t + 1) && has(t + 2)) {
    results.push([discard, get(t + 1), get(t + 2)]);
  }
  return results;
}

export function selectAIDiscard(hand: Tile[]): number {
  if (hand.length === 0) return 0;
  const counts: Record<number, number> = {};
  for (const t of hand) counts[t.type] = (counts[t.type] || 0) + 1;

  let minScore = 9999;
  let bestIdx = 0;

  hand.forEach((t, i) => {
    let score = 0;
    const c = counts[t.type] || 0;
    if (c >= 3) score += 100;
    else if (c === 2) score += 40;

    if (t.suit === Suit.Zi) {
      if (c === 1) score -= 60;
    } else {
      const v = t.value;
      const hasL1 = (counts[t.type - 1] || 0) > 0;
      const hasR1 = (counts[t.type + 1] || 0) > 0;
      if (hasL1 && hasR1) score += 35;
      else if (hasL1 || hasR1) score += 20;
      if (v === 1 || v === 9) score -= 10;
    }

    if (score < minScore) {
      minScore = score;
      bestIdx = i;
    }
  });

  return bestIdx;
}

export function createInitialGame(playerName = '雀神 (玩家)', ruleType: 'GB' | 'SICHUAN' = 'GB'): GameState {
  const deck = createDeck(ruleType !== 'SICHUAN');
  const winds = ['东', '南', '西', '北'];
  const botNames = ['阿强 (AI·东家)', '小美 (AI·北家)', '老李 (AI·西家)'];

  const players: Player[] = [
    {
      id: 0,
      name: playerName,
      isAI: false,
      score: 1000,
      wind: '南',
      hand: [],
      melds: [],
      discards: [],
      hasWon: false,
      isTing: false,
      tingTiles: [],
    },
    ...botNames.map((name, i) => ({
      id: i + 1,
      name,
      isAI: true,
      score: 1000,
      wind: winds[i],
      hand: [],
      melds: [],
      discards: [],
      hasWon: false,
      isTing: false,
      tingTiles: [],
    })),
  ];

  // Deal 13 cards each
  for (let round = 0; round < 13; round++) {
    for (let p = 0; p < 4; p++) {
      const t = deck.shift();
      if (t) players[p].hand.push(t);
    }
  }

  for (let p = 0; p < 4; p++) {
    players[p].hand = sortTiles(players[p].hand);
  }

  // Dealer (Seat 0) draws 14th card
  const extra = deck.shift()!;
  players[0].hand.push(extra);

  return {
    roundName: '东风圈·第1局',
    ruleType,
    wall: deck,
    wallRemaining: deck.length,
    players,
    currentTurn: 0,
    lastDiscard: null,
    lastDiscardSeat: -1,
    justDrawnTile: extra,
    isGameOver: false,
    winnerSeat: -1,
    winInfo: null,
    historyLogs: [`牌局开始！${players[0].name} 起手抓进 [${extra.name}]`],
  };
}

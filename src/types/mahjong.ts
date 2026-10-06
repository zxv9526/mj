export enum Suit {
  Wan = 1,  // 万
  Tong = 2, // 筒
  Tiao = 3, // 条
  Zi = 4,   // 字 (东、南、西、北、中、发、白)
}

export interface Tile {
  id: number;
  type: number;
  suit: Suit;
  value: number;
  name: string;
  code: string;
  emoji: string;
}

export type MeldType = 'CHI' | 'PENG' | 'GANG';

export interface Meld {
  type: MeldType;
  tiles: Tile[];
  fromSeat: number;
}

export interface Player {
  id: number;
  name: string;
  isAI: boolean;
  hand: Tile[];
  melds: Meld[];
  discards: Tile[];
  score: number;
  wind: string;
  hasWon: boolean;
  isTing: boolean;
  tingTiles: Tile[];
}

export interface WinResult {
  isWin: boolean;
  pattern: string;
  fan: number;
  score: number;
  details: string[];
}

export interface GameState {
  roundName: string;
  ruleType: 'GB' | 'SICHUAN';
  wall: Tile[];
  wallRemaining: number;
  players: Player[];
  currentTurn: number; // 0..3
  lastDiscard: Tile | null;
  lastDiscardSeat: number;
  justDrawnTile: Tile | null;
  isGameOver: boolean;
  winnerSeat: number;
  winInfo: WinResult | null;
  historyLogs: string[];
}

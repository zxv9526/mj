import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { GameState, Tile } from '../types/mahjong';
import {
  calculateTing,
  canChi,
  canPeng,
  checkWin,
  createInitialGame,
  selectAIDiscard,
  sortTiles,
} from '../engine/webMahjong';
import { TileView } from './TileView';
import {
  playDiscardSound,
  playMeldSound,
  playTileClickSound,
  playWinFanfare,
} from '../utils/audio';
import {
  RotateCcw,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';

export const VisualBoard: React.FC = () => {
  const [game, setGame] = useState<GameState>(() => createInitialGame());
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [botSpeed, setBotSpeed] = useState<number>(700); // ms
  const isProcessingRef = useRef(false);

  const human = game.players[0];
  const isHumanTurn = game.currentTurn === 0 && !game.isGameOver;

  // Calculate Ting for human
  const tingTiles = React.useMemo(() => {
    if (game.isGameOver) return [];
    return calculateTing(human.hand, human.melds);
  }, [human.hand, human.melds, game.isGameOver]);

  // Check possible human actions when opponent discards
  const opponentDiscard = game.lastDiscard;
  const isOpponentDiscard =
    game.lastDiscardSeat !== 0 &&
    game.lastDiscardSeat !== -1 &&
    game.currentTurn !== 0;

  const canHumanHu = Boolean(
    isOpponentDiscard &&
      opponentDiscard &&
      checkWin(human.hand, human.melds, opponentDiscard, false).isWin
  );

  const canHumanPeng = Boolean(
    isOpponentDiscard && opponentDiscard && canPeng(human.hand, opponentDiscard)
  );

  const canHumanChi = Boolean(
    isOpponentDiscard &&
      opponentDiscard &&
      (game.lastDiscardSeat + 1) % 4 === 0 &&
      canChi(human.hand, opponentDiscard).length > 0
  );

  // Check self-draw win (自摸)
  const canSelfWin = Boolean(
    isHumanTurn &&
      game.justDrawnTile &&
      checkWin(human.hand, human.melds, game.justDrawnTile, true).isWin
  );

  // Discard tile by human
  const handleHumanDiscard = (idx: number) => {
    if (!isHumanTurn || isProcessingRef.current) return;
    if (idx < 0 || idx >= human.hand.length) return;

    if (soundEnabled) playDiscardSound();

    const tile = human.hand[idx];
    const newHand = [...human.hand];
    newHand.splice(idx, 1);
    const sorted = sortTiles(newHand);

    const updatedPlayers = [...game.players];
    updatedPlayers[0] = {
      ...human,
      hand: sorted,
      discards: [...human.discards, tile],
    };

    const newLogs = [
      ...game.historyLogs,
      `${human.name} 打出: [${tile.name}]`,
    ].slice(-30);

    setGame(prev => ({
      ...prev,
      players: updatedPlayers,
      lastDiscard: tile,
      lastDiscardSeat: 0,
      justDrawnTile: null,
      historyLogs: newLogs,
    }));
    setSelectedIdx(null);

    // Trigger AI response sequence
    triggerBotCycle(tile, 0);
  };

  // Bot action cycle
  const triggerBotCycle = (discard: Tile, fromSeat: number) => {
    isProcessingRef.current = true;

    setTimeout(() => {
      setGame(prev => {
        // Check if any bot claims the discard
        for (let p = 1; p < 4; p++) {
          if (p === fromSeat) continue;
          const bot = prev.players[p];
          const winCheck = checkWin(bot.hand, bot.melds, discard, false);
          if (winCheck.isWin) {
            if (soundEnabled) playWinFanfare();
            const updated = [...prev.players];
            updated[p] = { ...bot, score: bot.score + winCheck.score * 3, hasWon: true };
            updated[fromSeat] = {
              ...prev.players[fromSeat],
              score: prev.players[fromSeat].score - winCheck.score * 3,
            };
            isProcessingRef.current = false;
            return {
              ...prev,
              players: updated,
              isGameOver: true,
              winnerSeat: p,
              winInfo: winCheck,
              historyLogs: [
                ...prev.historyLogs,
                `🎉 ${bot.name} 荣和胡牌！抓了 ${prev.players[fromSeat].name} 的放铳 [${discard.name}]！(+${winCheck.score}分)`,
              ],
            };
          }
        }

        // Advance to next turn
        const nextSeat = (fromSeat + 1) % 4;
        isProcessingRef.current = false;
        return advanceToTurn(prev, nextSeat);
      });
    }, botSpeed / 2);
  };

  const advanceToTurn = (state: GameState, seat: number): GameState => {
    if (state.wall.length === 0) {
      return {
        ...state,
        isGameOver: true,
        winnerSeat: -1,
        historyLogs: [...state.historyLogs, '荒庄流局！牌墙摸空。'],
      };
    }

    const newWall = [...state.wall];
    const drawn = newWall.shift()!;
    const updatedPlayers = [...state.players];
    const player = updatedPlayers[seat];

    updatedPlayers[seat] = {
      ...player,
      hand: [...player.hand, drawn],
    };

    return {
      ...state,
      wall: newWall,
      wallRemaining: newWall.length,
      currentTurn: seat,
      justDrawnTile: drawn,
      players: updatedPlayers,
      historyLogs: [
        ...state.historyLogs,
        `${player.name} 摸牌`,
      ].slice(-30),
    };
  };

  // Bot turns loop
  useEffect(() => {
    if (game.isGameOver) return;
    if (game.currentTurn === 0) return; // Human turn

    const botSeat = game.currentTurn;
    const bot = game.players[botSeat];

    const timer = setTimeout(() => {
      // 1. Check self win for bot
      if (game.justDrawnTile) {
        const selfWin = checkWin(bot.hand, bot.melds, game.justDrawnTile, true);
        if (selfWin.isWin) {
          if (soundEnabled) playWinFanfare();
          const updated = [...game.players];
          updated[botSeat] = {
            ...bot,
            score: bot.score + selfWin.score * 3,
            hasWon: true,
          };
          for (let i = 0; i < 4; i++) {
            if (i !== botSeat) {
              updated[i] = { ...updated[i], score: updated[i].score - selfWin.score };
            }
          }
          setGame(prev => ({
            ...prev,
            players: updated,
            isGameOver: true,
            winnerSeat: botSeat,
            winInfo: selfWin,
            historyLogs: [
              ...prev.historyLogs,
              `🎉 ${bot.name} 自摸胡牌！(${selfWin.pattern}, ${selfWin.fan}番)`,
            ],
          }));
          return;
        }
      }

      // 2. Bot discards
      const discardIdx = selectAIDiscard(bot.hand);
      const discardedTile = bot.hand[discardIdx];
      const newHand = [...bot.hand];
      newHand.splice(discardIdx, 1);
      const sorted = sortTiles(newHand);

      const updatedPlayers = [...game.players];
      updatedPlayers[botSeat] = {
        ...bot,
        hand: sorted,
        discards: [...bot.discards, discardedTile],
      };

      if (soundEnabled) playDiscardSound();

      setGame(prev => ({
        ...prev,
        players: updatedPlayers,
        lastDiscard: discardedTile,
        lastDiscardSeat: botSeat,
        justDrawnTile: null,
        historyLogs: [
          ...prev.historyLogs,
          `${bot.name} 打出: [${discardedTile.name}]`,
        ].slice(-30),
      }));

      // Check if Human can claim
      const canHu = checkWin(human.hand, human.melds, discardedTile, false).isWin;
      const canP = canPeng(human.hand, discardedTile);
      if (canHu || canP) {
        // Wait for human response
        return;
      }

      // Otherwise advance to next
      triggerBotCycle(discardedTile, botSeat);
    }, botSpeed);

    return () => clearTimeout(timer);
  }, [game.currentTurn, game.isGameOver, botSpeed, soundEnabled]);

  // Human Action Handlers
  const handleHumanHu = () => {
    if (soundEnabled) playWinFanfare();
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });

    const winTile = canSelfWin ? game.justDrawnTile! : game.lastDiscard!;
    const isSelf = canSelfWin;
    const res = checkWin(human.hand, human.melds, winTile, isSelf);

    const updated = [...game.players];
    if (isSelf) {
      updated[0] = { ...human, score: human.score + res.score * 3, hasWon: true };
      for (let i = 1; i < 4; i++) {
        updated[i] = { ...updated[i], score: updated[i].score - res.score };
      }
    } else {
      const loserSeat = game.lastDiscardSeat;
      updated[0] = { ...human, score: human.score + res.score * 3, hasWon: true };
      updated[loserSeat] = {
        ...updated[loserSeat],
        score: updated[loserSeat].score - res.score * 3,
      };
    }

    setGame(prev => ({
      ...prev,
      players: updated,
      isGameOver: true,
      winnerSeat: 0,
      winInfo: res,
      historyLogs: [
        ...prev.historyLogs,
        `🎊 恭喜！你胡牌了！牌型: ${res.pattern} (${res.fan}番, +${res.score * 3}分)`,
      ],
    }));
  };

  const handleHumanPeng = () => {
    if (!opponentDiscard) return;
    if (soundEnabled) playMeldSound();

    let count = 0;
    const meldCards: Tile[] = [];
    const newHand: Tile[] = [];

    for (const t of human.hand) {
      if (t.type === opponentDiscard.type && count < 2) {
        count++;
        meldCards.push(t);
      } else {
        newHand.push(t);
      }
    }
    meldCards.push(opponentDiscard);

    const updated = [...game.players];
    updated[0] = {
      ...human,
      hand: newHand,
      melds: [
        ...human.melds,
        { type: 'PENG', tiles: meldCards, fromSeat: game.lastDiscardSeat },
      ],
    };
    // remove from opponent discards
    const opp = updated[game.lastDiscardSeat];
    opp.discards = opp.discards.slice(0, -1);

    setGame(prev => ({
      ...prev,
      players: updated,
      currentTurn: 0,
      lastDiscard: null,
      justDrawnTile: null,
      historyLogs: [
        ...prev.historyLogs,
        `${human.name} 碰了 ${opp.name} 的 [${opponentDiscard.name}]！`,
      ],
    }));
  };

  const handleHumanPass = () => {
    if (game.lastDiscard && game.currentTurn !== 0) {
      const next = (game.lastDiscardSeat + 1) % 4;
      setGame(prev => advanceToTurn(prev, next));
    }
  };

  const handleReset = (rule: 'GB' | 'SICHUAN' = 'GB') => {
    setGame(createInitialGame('雀神 (你)', rule));
    setSelectedIdx(null);
  };

  // Trigger win confetti if game over with win
  useEffect(() => {
    if (game.isGameOver && game.winnerSeat === 0) {
      confetti({ particleCount: 150, spread: 90 });
    }
  }, [game.isGameOver, game.winnerSeat]);

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
      {/* Top Status & Controls Bar */}
      <div className="bg-slate-900/90 backdrop-blur border-b border-slate-800 px-4 py-2.5 flex items-center justify-between text-xs sm:text-sm">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-md border border-emerald-800/60">
            <Sparkles className="w-4 h-4" />
            {game.roundName}
          </span>
          <span className="text-slate-400 hidden sm:inline">
            规则:{' '}
            <span className="text-amber-300 font-semibold">
              {game.ruleType === 'GB' ? '国标十三张 (带字牌)' : '四川血战 (108张)'}
            </span>
          </span>
          <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-mono">
            牌墙余: <strong className="text-emerald-400">{game.wallRemaining}</strong> 张
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title={soundEnabled ? '音效开启' : '音效静音'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          <select
            value={botSpeed}
            onChange={e => setBotSpeed(Number(e.target.value))}
            className="bg-slate-800 text-slate-300 text-xs rounded px-2 py-1 border border-slate-700 outline-none"
            title="出牌速度"
          >
            <option value={1000}>🐢 慢速 (1.0s)</option>
            <option value={600}>⚡ 正常 (0.6s)</option>
            <option value={250}>🚀 极速 (0.25s)</option>
          </select>

          <button
            onClick={() => handleReset(game.ruleType)}
            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded text-xs transition-colors border border-slate-700 font-medium"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            重开
          </button>
        </div>
      </div>

      {/* Main Mahjong Table Felt */}
      <div className="flex-1 relative bg-gradient-to-b from-emerald-950 via-slate-900 to-emerald-950 p-3 sm:p-4 flex flex-col justify-between overflow-hidden">
        {/* Opponent: North (Seat 2 - 小美) */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-800 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-sky-400">【北】{game.players[2].name}</span>
            <span className="text-amber-400 font-mono font-semibold">{game.players[2].score}分</span>
            {game.currentTurn === 2 && <span className="text-amber-400 animate-bounce font-bold">思考中...</span>}
          </div>
          {/* North Hand Backs & Melds */}
          <div className="flex items-center gap-2 mt-1">
            <div className="flex gap-0.5">
              {game.players[2].hand.map((_, i) => (
                <TileView key={i} isBack size="sm" />
              ))}
            </div>
            {/* North Melds */}
            {game.players[2].melds.length > 0 && (
              <div className="flex gap-1 ml-2 border-l border-emerald-700/50 pl-2">
                {game.players[2].melds.map((m, mi) => (
                  <div key={mi} className="flex gap-0.5 bg-slate-800/80 p-0.5 rounded">
                    {m.tiles.map((t, ti) => (
                      <TileView key={ti} tile={t} size="sm" />
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Middle Area: West (Seat 3), Center River (牌河), East (Seat 1) */}
        <div className="flex items-center justify-between my-2 sm:my-3">
          {/* West Player (Seat 3 - 老李) */}
          <div className="flex flex-col items-center w-24 sm:w-28 flex-shrink-0">
            <div className="bg-slate-900/80 px-2 py-1 rounded-md border border-slate-800 text-[11px] text-center mb-1">
              <div className="font-bold text-purple-400">【西】老李</div>
              <div className="text-amber-400 font-mono text-[10px]">{game.players[3].score}分</div>
              {game.currentTurn === 3 && <div className="text-amber-400 font-bold text-[9px]">摸打中</div>}
            </div>
            <div className="flex flex-wrap gap-0.5 justify-center w-16">
              {game.players[3].hand.slice(0, 8).map((_, i) => (
                <TileView key={i} isBack size="sm" />
              ))}
            </div>
          </div>

          {/* Center Felt: The River of Discards (牌河) */}
          <div className="flex-1 max-w-xl mx-2 bg-emerald-950/70 border border-emerald-600/30 rounded-xl p-3 shadow-inner flex flex-col min-h-[160px]">
            <div className="flex items-center justify-between border-b border-emerald-800/40 pb-1.5 mb-2 text-xs">
              <span className="text-emerald-400 font-semibold tracking-wide flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                四方牌河 (历史舍牌)
              </span>
              <span className="text-slate-400 font-mono text-[11px]">
                当前回合:{' '}
                <strong className="text-amber-300 font-bold">
                  {game.players[game.currentTurn].name}
                </strong>
              </span>
            </div>

            {/* Discarded Tiles Display */}
            <div className="flex-1 overflow-y-auto max-h-36 flex flex-wrap gap-1.5 content-start p-1">
              {game.players.flatMap(p => p.discards).length === 0 ? (
                <div className="w-full h-24 flex items-center justify-center text-emerald-600/70 text-xs italic">
                  牌局刚开，静候第一张舍牌...
                </div>
              ) : (
                game.players.flatMap((p, pIdx) =>
                  p.discards.map((d, dIdx) => {
                    const isLast =
                      game.lastDiscard?.id === d.id && game.lastDiscardSeat === pIdx;
                    return (
                      <div key={`${pIdx}-${dIdx}`} className="relative">
                        <TileView tile={d} size="sm" isHighlight={isLast} />
                        {isLast && (
                          <span className="absolute -top-1.5 -right-1 bg-amber-400 text-slate-950 text-[8px] font-black px-1 rounded-full animate-bounce">
                            新
                          </span>
                        )}
                      </div>
                    );
                  })
                )
              )}
            </div>

            {/* Live Ticker Message */}
            <div className="border-t border-emerald-800/40 pt-1.5 text-center text-xs text-slate-300 truncate font-mono">
              📢 {game.historyLogs[game.historyLogs.length - 1] || '对局进行中'}
            </div>
          </div>

          {/* East Player (Seat 1 - 阿强) */}
          <div className="flex flex-col items-center w-24 sm:w-28 flex-shrink-0">
            <div className="bg-slate-900/80 px-2 py-1 rounded-md border border-slate-800 text-[11px] text-center mb-1">
              <div className="font-bold text-blue-400">【东】阿强</div>
              <div className="text-amber-400 font-mono text-[10px]">{game.players[1].score}分</div>
              {game.currentTurn === 1 && <div className="text-amber-400 font-bold text-[9px]">摸打中</div>}
            </div>
            <div className="flex flex-wrap gap-0.5 justify-center w-16">
              {game.players[1].hand.slice(0, 8).map((_, i) => (
                <TileView key={i} isBack size="sm" />
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Area: Human Player (Seat 0 - 你) */}
        <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-xl p-3 shadow-xl">
          {/* Header & Interactive Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="font-black text-sm text-emerald-400 flex items-center gap-1">
                【你·南家】
                <span className="text-amber-300 font-mono text-sm">{human.score} 分</span>
              </span>

              {isHumanTurn && (
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs px-2 py-0.5 rounded-full font-bold animate-pulse">
                  👉 请点击手牌出牌
                </span>
              )}

              {/* Ting Assist Card */}
              {tingTiles.length > 0 && (
                <div className="flex items-center gap-1.5 bg-amber-950/60 border border-amber-600/50 px-2.5 py-0.5 rounded-md text-xs text-amber-300">
                  <span className="font-bold">💡 听牌:</span>
                  <div className="flex gap-1">
                    {tingTiles.slice(0, 4).map((t, i) => (
                      <span key={i} className="font-bold bg-amber-900/80 px-1 rounded text-[11px]">
                        {t.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action Bar (Hu / Peng / Chi / Pass) */}
            <div className="flex items-center gap-1.5">
              {canSelfWin && (
                <button
                  onClick={handleHumanHu}
                  className="bg-red-600 hover:bg-red-500 text-white font-black text-xs px-3.5 py-1.5 rounded-md shadow-lg shadow-red-600/40 transition-transform active:scale-95 animate-bounce"
                >
                  🎉 自摸胡牌!
                </button>
              )}
              {canHumanHu && (
                <button
                  onClick={handleHumanHu}
                  className="bg-red-600 hover:bg-red-500 text-white font-black text-xs px-3.5 py-1.5 rounded-md shadow-lg shadow-red-600/40 transition-transform active:scale-95 animate-bounce"
                >
                  ⚡ 荣和抓铳!
                </button>
              )}
              {canHumanPeng && (
                <button
                  onClick={handleHumanPeng}
                  className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs px-3 py-1.5 rounded-md shadow-md transition-transform active:scale-95"
                >
                  碰牌
                </button>
              )}
              {(canHumanHu || canHumanPeng || canHumanChi) && (
                <button
                  onClick={handleHumanPass}
                  className="bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium text-xs px-2.5 py-1.5 rounded-md transition-colors"
                >
                  过 (Pass)
                </button>
              )}
            </div>
          </div>

          {/* Melds Display if any */}
          {human.melds.length > 0 && (
            <div className="flex gap-2 mb-2 pb-1 border-b border-slate-800/60 overflow-x-auto">
              <span className="text-[11px] text-slate-400 self-center">副露:</span>
              {human.melds.map((m, mi) => (
                <div key={mi} className="flex gap-0.5 bg-slate-800/80 p-1 rounded-md border border-slate-700">
                  <span className="text-[10px] text-amber-400 font-bold self-center mr-1">
                    {m.type === 'PENG' ? '碰' : m.type === 'GANG' ? '杠' : '吃'}
                  </span>
                  {m.tiles.map((t, ti) => (
                    <TileView key={ti} tile={t} size="sm" />
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Human Hand Tiles (Interactive) */}
          <div className="flex items-end justify-center gap-1 sm:gap-1.5 overflow-x-auto py-1">
            {human.hand.map((tile, idx) => {
              const isJustDrawn =
                isHumanTurn &&
                game.justDrawnTile?.id === tile.id &&
                idx === human.hand.length - 1;

              return (
                <div
                  key={tile.id}
                  className={`relative ${isJustDrawn ? 'ml-3 sm:ml-4' : ''}`}
                >
                  {isJustDrawn && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-950 text-[9px] font-black px-1 rounded-xs uppercase">
                      摸牌
                    </span>
                  )}
                  <TileView
                    tile={tile}
                    size="lg"
                    indexLabel={idx + 1}
                    isSelected={selectedIdx === idx}
                    onClick={() => {
                      if (!isHumanTurn) return;
                      if (selectedIdx === idx) {
                        handleHumanDiscard(idx);
                      } else {
                        if (soundEnabled) playTileClickSound();
                        setSelectedIdx(idx);
                      }
                    }}
                  />
                </div>
              );
            })}
          </div>

          <div className="text-center text-[11px] text-slate-500 mt-1">
            💡 点击一张牌选中，再次点击或双击即可出牌 (也可在下方 Termux 终端模式中输入数字序号)
          </div>
        </div>
      </div>

      {/* Victory / Game Over Modal */}
      {game.isGameOver && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 text-center shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4 border border-amber-500/40">
              <Trophy className="w-8 h-8" />
            </div>

            <h3 className="text-2xl font-black text-slate-100 mb-1">
              {game.winnerSeat === 0 ? '🏆 恭喜大获全胜！' : '游戏结束'}
            </h3>

            <p className="text-sm text-slate-400 mb-4">
              {game.winnerSeat >= 0 ? (
                <>
                  赢家:{' '}
                  <strong className="text-amber-300 font-bold">
                    {game.players[game.winnerSeat].name}
                  </strong>
                </>
              ) : (
                '流局荒庄，牌墙已摸空'
              )}
            </p>

            {game.winInfo && (
              <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/80 mb-5 text-left text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">获胜番型:</span>
                  <span className="font-bold text-amber-300">{game.winInfo.pattern}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">番数倍率:</span>
                  <span className="font-bold text-emerald-400">{game.winInfo.fan} 番</span>
                </div>
                <div className="flex justify-between border-t border-slate-700/60 pt-1.5">
                  <span className="text-slate-400">积分结算:</span>
                  <span className="font-black text-lg text-emerald-400">
                    +{game.winInfo.score * 3} 分
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => handleReset('GB')}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-600/30"
              >
                国标十三张 再来一局
              </button>
              <button
                onClick={() => handleReset('SICHUAN')}
                className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-2.5 rounded-xl transition-all shadow-lg shadow-amber-600/30"
              >
                四川血战 再来一局
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

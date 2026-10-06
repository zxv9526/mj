import React, { useState, useEffect, useRef } from 'react';
import { GameState, Tile } from '../types/mahjong';
import {
  calculateTing,
  checkWin,
  createInitialGame,
  selectAIDiscard,
  sortTiles,
} from '../engine/webMahjong';
import {
  Terminal,
  Play,
  RotateCcw,
  Send,
  CornerDownLeft,
  Smartphone,
  ChevronRight,
} from 'lucide-react';

export const TerminalSim: React.FC = () => {
  const [game, setGame] = useState<GameState>(() => createInitialGame());
  const [inputVal, setInputVal] = useState('');
  const [cliLogs, setCliLogs] = useState<string[]>([
    'Welcome to Termux (v0.118.0)',
    'Type `pkg help` for a list of available subcommands.',
    '~ $ cd go-mahjong && go build -o mahjong main.go',
    '[OK] Compiled binary: ./mahjong (CGO_ENABLED=0)',
    '~ $ ./mahjong',
    '┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓',
    '┃        🀄 Termux Go 纯终端麻将 v1.0.0 🀄        ┃',
    '┃     专为 Android Termux 终端与命令行深度优化    ┃',
    '┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛',
    '对局初始化完毕，庄家已起手摸牌！',
  ]);

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const human = game.players[0];
  const isHumanTurn = game.currentTurn === 0 && !game.isGameOver;

  const tingTiles = React.useMemo(() => {
    return calculateTing(human.hand, human.melds);
  }, [human.hand, human.melds]);

  const scrollToBottom = () => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [cliLogs, game.currentTurn]);

  // Handle Command Submission
  const handleCommand = (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    setInputVal('');

    // System commands
    if (trimmed === 'clear') {
      setCliLogs(['~ $ clear']);
      return;
    }
    if (trimmed === 'restart' || trimmed === 'r') {
      setGame(createInitialGame());
      setCliLogs(prev => [...prev, '~ $ ./mahjong (牌局重新开始)']);
      return;
    }

    // Human Turn action
    if (isHumanTurn) {
      if (trimmed.toLowerCase() === 'h') {
        const canWin =
          game.justDrawnTile &&
          checkWin(human.hand, human.melds, game.justDrawnTile, true).isWin;
        if (canWin) {
          setCliLogs(prev => [
            ...prev,
            `> ${trimmed}`,
            '🎉 自摸胡牌！恭喜你赢得本局胜利！',
          ]);
          setGame(prev => ({ ...prev, isGameOver: true, winnerSeat: 0 }));
          return;
        } else {
          setCliLogs(prev => [...prev, `> ${trimmed}`, '❌ 此时手牌未达到胡牌番型！']);
          return;
        }
      }

      const num = parseInt(trimmed, 10);
      if (!isNaN(num) && num >= 1 && num <= human.hand.length) {
        const idx = num - 1;
        executeHumanDiscard(idx);
        return;
      }

      setCliLogs(prev => [
        ...prev,
        `> ${trimmed}`,
        `⚠️ 无效指令。请输入 1-${human.hand.length} 序号出牌，或输入 h 胡牌，r 重新开局。`,
      ]);
    } else {
      setCliLogs(prev => [...prev, `> ${trimmed}`, '⏳ 当前不是你的出牌回合，AI 正在决策中...']);
    }
  };

  const executeHumanDiscard = (idx: number) => {
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

    setCliLogs(prev => [
      ...prev,
      `> [出牌] 你打出了序号 [${idx + 1}]: ${tile.name}`,
    ]);

    setGame(prev => ({
      ...prev,
      players: updatedPlayers,
      lastDiscard: tile,
      lastDiscardSeat: 0,
      justDrawnTile: null,
      currentTurn: 1, // Pass to Bot 1
    }));
  };

  // Bot Turn Effect
  useEffect(() => {
    if (game.isGameOver) return;
    if (game.currentTurn === 0) return; // Human turn

    const seat = game.currentTurn;
    const bot = game.players[seat];

    const timer = setTimeout(() => {
      // 1. Draw tile for bot
      if (game.wall.length === 0) {
        setCliLogs(prev => [...prev, '🍃 牌墙摸空，荒庄平局！']);
        setGame(prev => ({ ...prev, isGameOver: true, winnerSeat: -1 }));
        return;
      }

      const newWall = [...game.wall];
      const drawn = newWall.shift()!;
      const botHandWithDrawn = [...bot.hand, drawn];

      // Check Bot Win
      const selfWin = checkWin(botHandWithDrawn, bot.melds, drawn, true);
      if (selfWin.isWin) {
        setCliLogs(prev => [
          ...prev,
          `🤖 ${bot.name} 自摸胡牌！(${selfWin.pattern})`,
        ]);
        setGame(prev => ({
          ...prev,
          isGameOver: true,
          winnerSeat: seat,
          winInfo: selfWin,
        }));
        return;
      }

      // Bot Discard
      const discardIdx = selectAIDiscard(botHandWithDrawn);
      const discarded = botHandWithDrawn[discardIdx];
      botHandWithDrawn.splice(discardIdx, 1);
      const sorted = sortTiles(botHandWithDrawn);

      const updated = [...game.players];
      updated[seat] = {
        ...bot,
        hand: sorted,
        discards: [...bot.discards, discarded],
      };

      setCliLogs(prev => [
        ...prev,
        `🤖 ${bot.name} 打出了: [${discarded.name}]`,
      ]);

      const nextSeat = (seat + 1) % 4;

      // Check if next is human: human draws
      if (nextSeat === 0) {
        if (newWall.length === 0) {
          setCliLogs(prev => [...prev, '🍃 牌墙摸空，荒庄平局！']);
          setGame(prev => ({ ...prev, isGameOver: true, winnerSeat: -1 }));
          return;
        }
        const humanDrawn = newWall.shift()!;
        const updatedWithHuman = [...updated];
        updatedWithHuman[0] = {
          ...human,
          hand: [...human.hand, humanDrawn],
        };

        setCliLogs(prev => [
          ...prev,
          `\n👉 轮到你的回合！摸进一张 [${humanDrawn.name}]`,
        ]);

        setGame(prev => ({
          ...prev,
          wall: newWall,
          wallRemaining: newWall.length,
          players: updatedWithHuman,
          currentTurn: 0,
          justDrawnTile: humanDrawn,
          lastDiscard: discarded,
          lastDiscardSeat: seat,
        }));
      } else {
        // Next is another bot
        setGame(prev => ({
          ...prev,
          wall: newWall,
          wallRemaining: newWall.length,
          players: updated,
          currentTurn: nextSeat,
          lastDiscard: discarded,
          lastDiscardSeat: seat,
          justDrawnTile: null,
        }));
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [game.currentTurn, game.isGameOver]);

  return (
    <div className="flex flex-col h-full bg-[#0d1117] text-slate-100 rounded-xl overflow-hidden border border-slate-800 shadow-2xl font-mono">
      {/* Termux Android Header Bar */}
      <div className="bg-[#161b22] px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs select-none">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-green-500/80 inline-block" />
          </div>
          <span className="text-slate-400 font-semibold flex items-center gap-1.5 ml-2">
            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            Termux (Android ARM64) - Session #1
          </span>
        </div>

        <div className="flex items-center gap-2 text-slate-400 text-[11px]">
          <span className="bg-slate-800 px-2 py-0.5 rounded text-emerald-400">
            PID: 14208 (Go runtime)
          </span>
          <button
            onClick={() => handleCommand('restart')}
            className="flex items-center gap-1 text-slate-300 hover:text-white px-2 py-0.5 rounded hover:bg-slate-800 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            重置
          </button>
        </div>
      </div>

      {/* Main Terminal View (ANSI Colored ASCII Mahjong Table) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs sm:text-sm font-mono leading-relaxed bg-[#0d1117] text-slate-200">
        {/* Terminal Header Info */}
        <div className="text-slate-500 space-y-0.5 border-b border-slate-800 pb-2 text-xs">
          {cliLogs.slice(-6).map((log, i) => (
            <div key={i} className="text-slate-400 font-mono">
              {log}
            </div>
          ))}
        </div>

        {/* Live Table ANSI Representation */}
        <div className="bg-[#161b22] p-3 rounded-lg border border-slate-800 space-y-2">
          <div className="text-amber-400 font-bold flex justify-between">
            <span>[ {game.roundName} | 规则: {game.ruleType} ]</span>
            <span>牌墙余: {game.wallRemaining} 张</span>
          </div>
          <div className="border-t border-slate-800 pt-1 text-slate-400 text-xs">
            【北家·小美】手牌: {game.players[2].hand.length}张 (分: {game.players[2].score})
            &nbsp;|&nbsp; 【西家·老李】手牌: {game.players[3].hand.length}张 (分: {game.players[3].score})
            &nbsp;|&nbsp; 【东家·阿强】手牌: {game.players[1].hand.length}张 (分: {game.players[1].score})
          </div>

          {/* River Discard Pool ASCII */}
          <div className="bg-[#090d13] p-2 rounded border border-slate-800 text-xs">
            <span className="text-emerald-400 font-bold">─── 【 牌 河 】 ───</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 mt-1 text-[11px]">
              {game.players.map(p => (
                <div key={p.id} className="truncate">
                  <span className="text-slate-400">{p.name.slice(0, 2)}:</span>{' '}
                  {p.discards.length === 0 ? (
                    <span className="text-slate-600">(空)</span>
                  ) : (
                    p.discards.slice(-4).map((d, di) => (
                      <span key={di} className="text-slate-200 font-bold ml-1">
                        [{d.name}]
                      </span>
                    ))
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Human Hand ASCII Display with Numbers */}
          <div className="pt-2 border-t border-slate-800">
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="text-emerald-400 font-bold">
                【你·南家】积分: {human.score} 分
              </span>
              {tingTiles.length > 0 && (
                <span className="text-amber-400 text-[11px]">
                  💡 听牌: {tingTiles.map(t => `[${t.name}]`).join(' ')}
                </span>
              )}
            </div>

            {/* Sequence Numbers Row */}
            <div className="flex flex-wrap gap-1 text-[10px] text-slate-500 font-bold mb-0.5">
              <span className="w-10 text-slate-500">序号:</span>
              {human.hand.map((_, i) => (
                <span key={i} className="w-9 text-center">
                  {i + 1}
                </span>
              ))}
            </div>

            {/* Mahjong Tile Names Row with colors */}
            <div className="flex flex-wrap gap-1 text-xs font-bold items-center">
              <span className="w-10 text-slate-400">手牌:</span>
              {human.hand.map((t, i) => {
                const isDrawn = isHumanTurn && i === human.hand.length - 1;
                let color = 'text-slate-200';
                if (t.suit === 1) color = 'text-red-400';
                else if (t.suit === 2) color = 'text-cyan-400';
                else if (t.suit === 3) color = 'text-emerald-400';
                else if (t.suit === 4) color = 'text-amber-400';

                return (
                  <button
                    key={i}
                    onClick={() => isHumanTurn && executeHumanDiscard(i)}
                    className={`w-9 py-1 text-center rounded border transition-all cursor-pointer ${
                      isDrawn
                        ? 'border-amber-400 bg-amber-950/40'
                        : 'border-slate-700 bg-slate-800/80 hover:bg-slate-700'
                    } ${color}`}
                    title={`点击出牌 [${i + 1}] ${t.name}`}
                  >
                    {t.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div ref={terminalEndRef} />
      </div>

      {/* Termux Extra Key Toolbar (Like Termux touch keys) */}
      <div className="bg-[#161b22] border-t border-slate-800 px-3 py-1.5 flex items-center justify-between text-xs select-none overflow-x-auto gap-1">
        <span className="text-slate-500 text-[11px] font-bold mr-1">触屏快捷:</span>
        <div className="flex gap-1">
          {human.hand.slice(0, 10).map((_, i) => (
            <button
              key={i}
              onClick={() => isHumanTurn && executeHumanDiscard(i)}
              className="bg-slate-800 hover:bg-slate-700 active:bg-emerald-700 text-slate-300 font-bold px-1.5 py-0.5 rounded text-xs transition-colors"
            >
              {i + 1}
            </button>
          ))}
          {human.hand.length > 10 && (
            <button
              onClick={() => isHumanTurn && executeHumanDiscard(human.hand.length - 1)}
              className="bg-amber-900 hover:bg-amber-800 text-amber-300 font-bold px-2 py-0.5 rounded text-xs"
            >
              摸切({human.hand.length})
            </button>
          )}
          <button
            onClick={() => handleCommand('h')}
            className="bg-red-900 hover:bg-red-800 text-red-200 font-bold px-2 py-0.5 rounded text-xs"
          >
            H (胡)
          </button>
        </div>
      </div>

      {/* Command Input Bar */}
      <form
        onSubmit={e => {
          e.preventDefault();
          handleCommand(inputVal);
        }}
        className="bg-[#090d13] p-3 border-t border-slate-800 flex items-center gap-2"
      >
        <span className="text-emerald-400 font-bold flex items-center gap-1 text-sm">
          <span>termux</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
        </span>
        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          placeholder={
            isHumanTurn
              ? `输入数字 1-${human.hand.length} 选牌出牌，或输入 h 胡牌，clear 清屏`
              : 'AI 思考中... 可以输入命令'
          }
          className="flex-1 bg-transparent border-none text-slate-100 placeholder:text-slate-600 focus:outline-none text-xs sm:text-sm font-mono"
        />
        <button
          type="submit"
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 transition-colors"
        >
          <CornerDownLeft className="w-3.5 h-3.5" />
          回车发送
        </button>
      </form>
    </div>
  );
};

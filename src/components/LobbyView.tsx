import React, { useState } from 'react';
import {
  Trophy,
  Users,
  Play,
  PlusCircle,
  LogIn,
  Settings,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Flame,
  Globe,
  Sparkles,
  Award,
  Crown,
  History,
  Shield,
  Layers,
  CheckCircle2,
  Share2,
} from 'lucide-react';
import { mahjongAudio } from '../utils/mahjongAudio';
import { PWAInstallButton } from './PWAInstallButton';

interface LobbyViewProps {
  onStartGame: (rule: 'GB' | 'SICHUAN', roomName: string) => void;
  onNavigateTab: (tab: 'visual' | 'svg' | 'tunnel' | 'code' | 'guide') => void;
  uploadedSvgCount: number;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  onStartGame,
  onNavigateTab,
  uploadedSvgCount,
}) => {
  const [soundOn, setSoundOn] = useState(mahjongAudio.soundEnabled);
  const [voiceOn, setVoiceOn] = useState(mahjongAudio.voiceEnabled);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [roomCode, setRoomCode] = useState('689234');
  const [selectedRule, setSelectedRule] = useState<'GB' | 'SICHUAN'>('GB');
  const [rounds, setRounds] = useState<number>(4);
  const [maxFan, setMaxFan] = useState<number>(16);

  const toggleSound = () => {
    const next = !soundOn;
    mahjongAudio.soundEnabled = next;
    setSoundOn(next);
    if (next) mahjongAudio.playActionAlert();
  };

  const toggleVoice = () => {
    const next = !voiceOn;
    mahjongAudio.voiceEnabled = next;
    setVoiceOn(next);
    if (next) mahjongAudio.speak('语音报牌已开启', 1.1, 1.1);
  };

  const handleQuickStart = (rule: 'GB' | 'SICHUAN', name: string) => {
    mahjongAudio.playShuffleSound();
    mahjongAudio.speak('游戏开始！祝您牌运亨通！', 1.1, 1.1);
    onStartGame(rule, name);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 rounded-xl overflow-y-auto border border-slate-800 shadow-2xl p-3 sm:p-6 space-y-6">
      {/* Lobby User & Status Header */}
      <div className="bg-gradient-to-r from-amber-950/80 via-slate-900 to-emerald-950/80 border border-amber-600/30 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        {/* User Card */}
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-red-600 p-0.5 shadow-lg shadow-amber-500/20">
              <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center text-2xl font-black">
                🀄
              </div>
            </div>
            <span className="absolute -bottom-1 -right-1 bg-amber-400 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded-full ring-2 ring-slate-900">
              VIP 8
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-100">
                雀神房主 (你)
              </h2>
              <span className="bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                <Crown className="w-3 h-3" /> 雀圣·九段
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
              <span>金币: <strong className="text-amber-300 font-mono">18,880</strong></span>
              <span>•</span>
              <span>胜率: <strong className="text-emerald-400 font-mono">74.2%</strong></span>
              <span>•</span>
              <span>当前段位: <strong className="text-cyan-400">登峰造极</strong></span>
            </div>
          </div>
        </div>

        {/* Audio & Settings Quick Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleVoice}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              voiceOn
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
            title="真人中文报牌语音开关"
          >
            {voiceOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
            <span>语音报牌: {voiceOn ? '开启' : '静音'}</span>
          </button>

          <button
            onClick={toggleSound}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              soundOn
                ? 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
            title="打牌碰撞与胜利音效开关"
          >
            {soundOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>牌桌音效: {soundOn ? '开启' : '关闭'}</span>
          </button>
        </div>
      </div>

      {/* SVG Recognition Status Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded-md bg-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
          </span>
          <span className="text-slate-300">
            已成功识别并加载你上传的 <strong className="text-emerald-400 font-bold">42 张高清 SVG 麻将牌面</strong>（含字牌、条筒万与花牌）！
          </span>
        </div>
        <button
          onClick={() => onNavigateTab('svg')}
          className="text-cyan-400 hover:text-cyan-300 font-semibold underline underline-offset-4 cursor-pointer"
        >
          查看牌面文件对照表 →
        </button>
      </div>

      {/* PWA In-App Install Card */}
      <PWAInstallButton variant="full" />

      {/* Main Room Selection Cards */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-sm sm:text-base font-black text-slate-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            精选对局房间模式
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
              创建自选房
            </button>
            <button
              onClick={() => setShowJoinModal(true)}
              className="flex items-center gap-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5 text-cyan-400" />
              输入房号加入
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Room 1: GB Classic */}
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-emerald-500/60 rounded-2xl p-5 flex flex-col justify-between transition-all group hover:shadow-xl hover:shadow-emerald-950/30">
            <div>
              <div className="flex justify-between items-start mb-3">
                <span className="text-2xl">🀄</span>
                <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  热门推荐
                </span>
              </div>
              <h4 className="text-base font-black text-slate-100 group-hover:text-emerald-400 transition-colors">
                国标大众十三张
              </h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                经典136张麻将，包含万/筒/条与东南西北中发白。支持平胡、七对、碰碰胡、清一色。
              </p>
              <div className="mt-3 text-[11px] text-slate-400 space-y-1">
                <div>底分: <span className="text-amber-300 font-mono font-bold">100 分</span></div>
                <div>智能电脑位: <span className="text-slate-300">阿强、小美、老李 (3人陪练)</span></div>
                <div>语音功能: <span className="text-emerald-400">中文实时报牌 + 碰杠胡大喊</span></div>
              </div>
            </div>

            <button
              onClick={() => handleQuickStart('GB', '国标大众场')}
              className="mt-5 w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              立即开始对局
            </button>
          </div>

          {/* Room 2: Sichuan Bloodbath */}
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-amber-500/60 rounded-2xl p-5 flex flex-col justify-between transition-all group hover:shadow-xl hover:shadow-amber-950/30">
            <div>
              <div className="flex justify-between items-start mb-3">
                <span className="text-2xl">🌶️</span>
                <span className="bg-amber-950 text-amber-400 border border-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  血战到底
                </span>
              </div>
              <h4 className="text-base font-black text-slate-100 group-hover:text-amber-400 transition-colors">
                四川麻将·血战到底
              </h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                108张去字牌，定缺一门。一家胡牌后牌局不结束，其余三家继续血战直至摸空！
              </p>
              <div className="mt-3 text-[11px] text-slate-400 space-y-1">
                <div>底分: <span className="text-amber-300 font-mono font-bold">200 分</span></div>
                <div>特色机制: <span className="text-amber-400">刮风下雨、查花猪、查大叫</span></div>
                <div>牌数: <span className="text-slate-300">108 张 (万/筒/条)</span></div>
              </div>
            </div>

            <button
              onClick={() => handleQuickStart('SICHUAN', '四川血战场')}
              className="mt-5 w-full bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs py-2.5 rounded-xl shadow-lg shadow-amber-600/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              进入血战房间
            </button>
          </div>

          {/* Room 3: Cloudflare Public Online Room */}
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-cyan-500/60 rounded-2xl p-5 flex flex-col justify-between transition-all group hover:shadow-xl hover:shadow-cyan-950/30">
            <div>
              <div className="flex justify-between items-start mb-3">
                <span className="text-2xl">🌐</span>
                <span className="bg-cyan-950 text-cyan-400 border border-cyan-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  公网穿透
                </span>
              </div>
              <h4 className="text-base font-black text-slate-100 group-hover:text-cyan-400 transition-colors">
                Cloudflare 隧道公网联机房
              </h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                专为手机 Termux + cloudflared 隧道定制！复制全球 HTTPS 链接，好友免局域网免下载即刻加入！
              </p>
              <div className="mt-3 text-[11px] text-slate-400 space-y-1">
                <div>连接方式: <span className="text-cyan-400 font-mono">https://*.trycloudflare.com</span></div>
                <div>免局域网: <span className="text-emerald-400">跨 WiFi / 4G / 5G 随时随地开黑</span></div>
                <div>状态: <span className="text-emerald-400 font-bold">● 隧道就绪</span></div>
              </div>
            </div>

            <button
              onClick={() => onNavigateTab('tunnel')}
              className="mt-5 w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs py-2.5 rounded-xl shadow-lg shadow-cyan-600/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5" />
              查看公网邀请链接
            </button>
          </div>
        </div>
      </div>

      {/* Leaderboard and Match History Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Hall of Fame Leaderboard */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="text-xs sm:text-sm font-bold text-slate-200 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              雀神竞技排行榜 (积分风云榜)
            </h4>
            <span className="text-[11px] text-slate-500">每周一重置</span>
          </div>

          <div className="space-y-2">
            {[
              { rank: 1, name: '雀神房主 (你)', score: '18,880', title: '雀圣', winRate: '74%' },
              { rank: 2, name: '小美 (AI·北家)', score: '14,200', title: '雀杰', winRate: '61%' },
              { rank: 3, name: '阿强 (AI·东家)', score: '11,500', title: '雀士', winRate: '52%' },
              { rank: 4, name: '老李 (AI·西家)', score: '9,350', title: '雀士', winRate: '45%' },
            ].map(p => (
              <div
                key={p.rank}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-[11px] ${
                      p.rank === 1
                        ? 'bg-amber-400 text-slate-950'
                        : p.rank === 2
                        ? 'bg-slate-300 text-slate-950'
                        : p.rank === 3
                        ? 'bg-amber-700 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {p.rank}
                  </span>
                  <span className="font-bold text-slate-200">{p.name}</span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded font-mono">
                    {p.title}
                  </span>
                </div>
                <div className="flex items-center gap-3 font-mono">
                  <span className="text-slate-400 text-[11px]">胜率: {p.winRate}</span>
                  <span className="text-amber-400 font-bold">{p.score} 分</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Big Win History */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="text-xs sm:text-sm font-bold text-slate-200 flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-400" />
              近期大牌胡牌战绩 (名人堂)
            </h4>
            <span className="text-[11px] text-slate-500">自动记录</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/40 space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  清一色·七对子 (自摸)
                </span>
                <span className="font-mono text-amber-400 font-bold">16 番 (+480分)</span>
              </div>
              <p className="text-[11px] text-slate-400">
                玩家: 雀神房主 (你) • 关键和牌: [九筒] • 牌型耗时: 12 巡
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-200">碰碰胡·红中刻 (荣和)</span>
                <span className="font-mono text-amber-400 font-bold">4 番 (+120分)</span>
              </div>
              <p className="text-[11px] text-slate-400">
                玩家: 小美 (AI) • 抓铳: 老李 • 关键牌: [红中]
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-200">纯正平胡·自摸</span>
                <span className="font-mono text-amber-400 font-bold">2 番 (+60分)</span>
              </div>
              <p className="text-[11px] text-slate-400">
                玩家: 雀神房主 (你) • 关键牌: [六万] • 叫听: [三万/六万]
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <h3 className="text-base font-black text-slate-100 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-emerald-400" />
              自定义创建麻将房间
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">玩法规则:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSelectedRule('GB')}
                    className={`py-2 px-3 rounded-lg border font-bold ${
                      selectedRule === 'GB'
                        ? 'border-emerald-500 bg-emerald-950/60 text-emerald-300'
                        : 'border-slate-800 bg-slate-950 text-slate-400'
                    }`}
                  >
                    国标大众十三张
                  </button>
                  <button
                    onClick={() => setSelectedRule('SICHUAN')}
                    className={`py-2 px-3 rounded-lg border font-bold ${
                      selectedRule === 'SICHUAN'
                        ? 'border-amber-500 bg-amber-950/60 text-amber-300'
                        : 'border-slate-800 bg-slate-950 text-slate-400'
                    }`}
                  >
                    四川血战到底
                  </button>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">对局局数:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[4, 8, 16].map(r => (
                    <button
                      key={r}
                      onClick={() => setRounds(r)}
                      className={`py-1.5 rounded-lg border font-bold ${
                        rounds === r
                          ? 'border-cyan-500 bg-cyan-950/60 text-cyan-300'
                          : 'border-slate-800 bg-slate-950 text-slate-400'
                      }`}
                    >
                      {r} 局
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">番数封顶:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[8, 16, 32].map(f => (
                    <button
                      key={f}
                      onClick={() => setMaxFan(f)}
                      className={`py-1.5 rounded-lg border font-bold ${
                        maxFan === f
                          ? 'border-cyan-500 bg-cyan-950/60 text-cyan-300'
                          : 'border-slate-800 bg-slate-950 text-slate-400'
                      }`}
                    >
                      {f} 番封顶
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-xl text-xs font-bold"
              >
                取消
              </button>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  handleQuickStart(selectedRule, `自定义房间 (${rounds}局)`);
                }}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30"
              >
                立即创建并入座
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Join Room Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <h3 className="text-base font-black text-slate-100 flex items-center gap-2">
              <LogIn className="w-5 h-5 text-cyan-400" />
              输入 6 位房间号码加入
            </h3>

            <div>
              <label className="text-xs text-slate-400 block mb-1.5">房间号 (Room Code):</label>
              <input
                type="text"
                value={roomCode}
                onChange={e => setRoomCode(e.target.value)}
                maxLength={6}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-center text-xl font-mono tracking-widest text-cyan-300 focus:outline-cyan-500 font-black"
                placeholder="689234"
              />
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowJoinModal(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-xl text-xs font-bold"
              >
                取消
              </button>
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  handleQuickStart('GB', `房间 #${roomCode}`);
                }}
                className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white py-2 rounded-xl text-xs font-bold shadow-lg shadow-cyan-600/30"
              >
                进入房间
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

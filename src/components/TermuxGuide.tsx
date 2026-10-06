import React, { useState } from 'react';
import {
  Smartphone,
  Terminal,
  Zap,
  CheckCircle,
  Copy,
  Check,
  AlertCircle,
  Cpu,
  Globe,
  Share2,
  ShieldCheck,
  Flame,
  Bot,
  Key,
  FolderTree,
  Send,
  MessageSquare,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

export const TermuxGuide: React.FC = () => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Interactive .env generator state
  const [botToken, setBotToken] = useState('7123456789:AAFLKsdjkflsajk_sdjakfls-xxxxxx');
  const [adminId, setAdminId] = useState('123456789');
  const [port, setPort] = useState('8080');
  const [rule, setRule] = useState<'GB' | 'SICHUAN'>('GB');
  const [repoUser, setRepoUser] = useState('YOUR_GITHUB_USERNAME');
  const [repoName, setRepoName] = useState('mj');

  // Simulated Telegram Bot preview state
  const [chatLog, setChatLog] = useState<Array<{ sender: 'user' | 'bot'; text: string; time: string; buttons?: string[] }>>([
    {
      sender: 'bot',
      text: '🚀 <b>【Termux 麻将服务器已启动就绪】</b>\n\n⏱ <b>启动时间</b>: 2026-10-06 18:30:00\n🚪 <b>监听端口</b>: 8080\n📜 <b>比赛规则</b>: 大众国标 (136张)\n🌐 <b>公网链接</b>: https://mj-play.trycloudflare.com\n\n🤖 管理员已授权连接，发送 /menu 即可管理。',
      time: '18:30',
      buttons: ['📊 服务器状态', '🀄 实时对局', '🔗 链接与分享', '📢 全服广播'],
    },
  ]);
  const [inputMsg, setInputMsg] = useState('');

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const generatedEnvContent = `# ==============================================================================
# Termux 麻将服务器与 Telegram 机器人管理员配置文件
# 存放位置: Termux 根目录 ~/.env (即 mj 目录的上一级)
# ==============================================================================

# 1. Telegram Bot Token (向 @BotFather 申请获取)
TELEGRAM_BOT_TOKEN="${botToken}"

# 2. Telegram 管理员数字 ID (向 @userinfobot 或 @getmyid_bot 获取，多个用逗号隔开)
TELEGRAM_ADMIN_ID="${adminId}"

# 3. 游戏服务端口 (默认 8080)
PORT=${port}

# 4. 麻将规则: GB (国标 136张) 或 SICHUAN (川麻 108张)
MAHJONG_RULE=${rule}

# 5. Cloudflare 穿透网址 (可选，可通过 TG 发送 /seturl 动态绑定)
PUBLIC_URL=""`;

  const termuxWriteEnvCommand = `cat << 'EOF' > ~/.env
${generatedEnvContent}
EOF`;

  const handleSimulateCommand = (cmd: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = { sender: 'user' as const, text: cmd, time };

    let botReply = '';
    let buttons: string[] | undefined = undefined;

    switch (cmd.toLowerCase()) {
      case '/menu':
      case '/start':
        botReply = `🀄 <b>雀神天下 · Termux 麻将管理员中控台</b>\n\n⚡️ <b>运行状态</b>: 🟢 运行中 (端口: ${port})\n📜 <b>比赛规则</b>: ${rule === 'GB' ? '大众国标 (136张)' : '四川血战到底 (108张)'}\n📢 <b>当前公告</b>: <i>(暂无)</i>\n\n请点击下方快捷按键操控：`;
        buttons = ['📊 服务器状态', '🀄 实时对局', '🔗 链接与分享', '📢 全服广播', '🔄 强制新局', '⚙️ 切换规则'];
        break;
      case '/status':
      case '📊 服务器状态':
        botReply = `📊 <b>【Termux 服务器与对局状态】</b>\n\n⏱ <b>持续运行</b>: 1小时 24分\n📱 <b>系统宿主</b>: Android Termux (Goroutines: 12, 内存: 4.8 MB)\n🔌 <b>本地端口</b>: ${port}\n🌐 <b>穿透网址</b>: https://mj-play.trycloudflare.com\n\n🀄 <b>牌桌详情</b>:\n• 牌墙剩余: 72 张\n• 当前出牌权: 房主 (你)\n• 牌局状态: 🟢 对局火热进行中\n\n👥 <b>玩家计分板</b>:\n• 房主 (你): 1200分\n• 阿强 (AI): 960分\n• 小美 (AI): 880分\n• 老李 (AI): 960分`;
        buttons = ['🔄 刷新', '🔙 返回菜单'];
        break;
      case '/url':
      case '🔗 链接与分享':
        botReply = `🔗 <b>【游戏公网分享卡片】</b>\n\n👉 <b>全球直达网页</b>:\nhttps://mj-play.trycloudflare.com\n\n📋 <b>一键组局文案 (长按复制)</b>:\n🀄【雀神天下】麻将三缺一！速来开搓！\n🌐 手机点开即玩: https://mj-play.trycloudflare.com\n✨ 纯正中文语音报牌 · 碰杠胡超燃音效 · 支持保存到桌面 PWA`;
        buttons = ['👉 进入游戏', '🔙 返回菜单'];
        break;
      case '/game':
      case '🀄 实时对局':
        botReply = `🀄 <b>【实时麻将牌桌看板】</b>\n\n• <b>对局名称</b>: 东风局 第1局 (${rule})\n• <b>牌墙剩余</b>: 68 张\n• <b>当前出牌权</b>: <b>房主 (你)</b>\n• <b>最新打出牌</b>: [七万]\n\n👥 <b>四方选手</b>:\n👤 [东] 房主 (你): 1200分 (14张手牌, 理牌中)\n🤖 [南] 阿强 (AI): 960分 (13张手牌, 理牌中)\n🤖 [西] 小美 (AI): 880分 (13张手牌, ⚡️已听牌)\n🤖 [北] 老李 (AI): 960分 (13张手牌, 理牌中)`;
        buttons = ['🔄 洗牌重置', '🔙 返回菜单'];
        break;
      case '/reset':
      case '🔄 强制新局':
        botReply = `🔄 <b>牌局已重置并重新洗牌，全新对局已开启！</b>\n当前规则: ${rule}`;
        break;
      default:
        if (cmd.startsWith('/broadcast') || cmd.startsWith('/bc')) {
          const content = cmd.replace(/^\/(broadcast|bc)\s*/, '');
          botReply = `📢 <b>广播公告发布成功！</b>\n\n所有手机网页端玩家顶部跑马灯已更新为:\n<blockquote>${content || '全体雀友请注意：今晚争霸赛开启！'}</blockquote>`;
        } else {
          botReply = `💡 收到指令: <code>${cmd}</code>\n发送 /menu 可呼出管理菜单。`;
        }
        break;
    }

    setChatLog(prev => [
      ...prev,
      userMsg,
      { sender: 'bot', text: botReply, time, buttons },
    ]);
    setInputMsg('');
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 rounded-xl overflow-y-auto border border-slate-800 shadow-2xl p-3 sm:p-6 space-y-6">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-cyan-950 border border-emerald-700/40 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs px-3 py-1 rounded-full font-bold mb-3">
            <Bot className="w-3.5 h-3.5" />
            Termux 部署 + Telegram 机器人管理员完全教程
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-100 mb-2">
            Termux 根目录 .env 配置与 Telegram 管理员全权控制
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            按照您的规划，配置文件 <code className="text-amber-300 bg-black/40 px-1 py-0.5 rounded">.env</code> 存放在 Termux 根目录（即 <code className="text-emerald-300 bg-black/40 px-1 py-0.5 rounded">mj</code> 目录的上一级）。
            Go 服务器启动时会自动从上一级目录读取 Telegram Bot Token 与管理员 ID，无需向外暴露配置。
          </p>
        </div>
      </div>

      {/* Directory Structure Visualization */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
        <div className="flex items-center gap-2 mb-3">
          <FolderTree className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold text-slate-200">
            Termux 目录拓扑结构规范 (关键：.env 在 mj 的上一级)
          </h3>
        </div>
        <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 font-mono text-xs text-slate-300 leading-relaxed overflow-x-auto">
          <pre>{`~ (Termux 用户家目录 /data/data/com.termux/files/home)
├── \x1b[33m.env\x1b[0m                     👈 【核心配置文件】位于此处！配置 TELEGRAM_BOT_TOKEN 与 TELEGRAM_ADMIN_ID
└── \x1b[32mmj/\x1b[0m                      👈 【你的麻将项目仓库】git clone 到此文件夹
    ├── mahjong              (编译出的原生 ARM64 二进制执行程序)
    ├── main.go              (程序主入口，自动先向上一级检测 ../.env)
    ├── config/              (环境配置解析器，支持 ../.env、~/.env 优先级)
    ├── bot/                 (纯 Go 标准库实现的 Telegram 机器人管理员)
    ├── web/
    │   ├── server.go        (HTTP 网页服务，支持向所有玩家推送跑马灯横幅)
    │   └── static/tiles/    (🀄 42 张 SVG 矢量牌面图片存放处)
    ├── termux_setup.sh      (自动化部署安装脚本)
    └── README.md`}</pre>
        </div>
        <p className="text-xs text-slate-400 mt-2.5 flex items-center gap-1.5">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          Go 代码内部已内置 <code className="text-emerald-400 font-mono">../.env</code> 优先读取策略，确保在 <code className="text-slate-300 font-mono">~/mj</code> 目录下运行无论怎么启动都能精确加载配置！
        </p>
      </div>

      {/* Interactive .env Generator & One-Click Copy */}
      <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-600/30 rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm sm:text-base font-bold text-amber-300">
              交互式 ~/.env 配置文件生成器
            </h3>
          </div>
          <span className="text-[11px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono">
            填入参数 · 一键复制写入 Termux
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              1. Telegram Bot Token (向 @BotFather 申请)
            </label>
            <input
              type="text"
              value={botToken}
              onChange={e => setBotToken(e.target.value)}
              placeholder="7123456789:AAFLKsdjkflsajk_sdjakfls-xxxxxx"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-amber-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              2. Telegram 管理员数字 ID (向 @userinfobot 获取)
            </label>
            <input
              type="text"
              value={adminId}
              onChange={e => setAdminId(e.target.value)}
              placeholder="123456789"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-cyan-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              3. 服务端口 (默认 8080)
            </label>
            <input
              type="text"
              value={port}
              onChange={e => setPort(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              4. 默认比赛规则
            </label>
            <select
              value={rule}
              onChange={e => setRule(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="GB">GB - 大众国标 (136张含风牌箭牌)</option>
              <option value="SICHUAN">SICHUAN - 四川血战到底 (108张去字牌)</option>
            </select>
          </div>
        </div>

        {/* Generated Termux Command Box */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono text-slate-400">
              在 Termux 终端直接粘贴此命令（自动写入 ~/.env）：
            </span>
            <button
              onClick={() => copyToClipboard(termuxWriteEnvCommand, 'env-cmd')}
              className="flex items-center gap-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition shadow"
            >
              {copiedKey === 'env-cmd' ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  已复制到剪贴板
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  一键复制命令
                </>
              )}
            </button>
          </div>
          <pre className="font-mono text-xs text-amber-200/90 overflow-x-auto whitespace-pre leading-relaxed p-1">
            {termuxWriteEnvCommand}
          </pre>
        </div>
      </div>

      {/* Two Essential Bot Steps: BotFather & userinfobot */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Step A: BotFather */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                A
              </div>
              <h4 className="text-sm font-bold text-slate-200">
                如何向 @BotFather 获取 Bot Token
              </h4>
            </div>
            <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed mt-3">
              <li>在 Telegram 搜索并打开官方机器人 <strong>@BotFather</strong></li>
              <li>发送 <code className="text-amber-300 font-mono">/newbot</code></li>
              <li>输入你的麻将机器人显示名称（例如：<code>雀神管家</code>）</li>
              <li>输入以 <code>bot</code> 结尾的专属用户名（例如：<code>my_mahjong_bot</code>）</li>
              <li>复制获得的 <strong>HTTP API Token</strong>（形如 <code>7123456789:AAFLK...</code>）</li>
            </ol>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Telegram 官方验证</span>
            <span className="text-[11px] text-blue-400 font-mono flex items-center gap-1">
              @BotFather <ExternalLink className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Step B: userinfobot */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                B
              </div>
              <h4 className="text-sm font-bold text-slate-200">
                如何查询你的 Telegram 数字 ID
              </h4>
            </div>
            <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed mt-3">
              <li>在 Telegram 搜索 <strong>@userinfobot</strong> 或 <strong>@getmyid_bot</strong></li>
              <li>点击 <strong>Start</strong> 发送 <code className="text-emerald-300 font-mono">/start</code></li>
              <li>机器人将立即回复你的专属数字 ID（例如：<code>123456789</code>）</li>
              <li>将该纯数字填入 <code className="text-emerald-300 font-mono">TELEGRAM_ADMIN_ID</code></li>
              <li>支持多个管理员：用英文逗号分隔，如 <code>123456789,987654321</code></li>
            </ol>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">精准安全鉴权 · 杜绝闲人越权</span>
            <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
              @userinfobot <ExternalLink className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* Step by Step Termux Execution */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5">
        <h3 className="text-sm sm:text-base font-bold text-slate-100 mb-3 flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          Termux 手机完整拉取、编译与运行命令
        </h3>

        <div className="space-y-4">
          {/* Step 1 */}
          <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-emerald-400">
                1. 在 Termux 中安装 Git 与更新软件源
              </span>
              <button
                onClick={() => copyToClipboard('pkg update -y && pkg install -y git', 'cmd1')}
                className="text-[11px] text-slate-400 hover:text-emerald-300 flex items-center gap-1"
              >
                {copiedKey === 'cmd1' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                复制
              </button>
            </div>
            <code className="text-xs font-mono text-slate-300 block bg-slate-900 px-2.5 py-1.5 rounded">
              pkg update -y && pkg install -y git
            </code>
          </div>

          {/* Step 2 */}
          <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-emerald-400">
                2. 克隆你的 GitHub 麻将仓库到 mj 目录并进入
              </span>
              <button
                onClick={() => copyToClipboard(`git clone https://github.com/${repoUser}/${repoName}.git mj\ncd mj`, 'cmd2')}
                className="text-[11px] text-slate-400 hover:text-emerald-300 flex items-center gap-1"
              >
                {copiedKey === 'cmd2' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                复制
              </button>
            </div>
            <code className="text-xs font-mono text-slate-300 block bg-slate-900 px-2.5 py-1.5 rounded">
              {`git clone https://github.com/${repoUser}/${repoName}.git mj && cd mj`}
            </code>
          </div>

          {/* Step 3 */}
          <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-emerald-400">
                3. 执行自动化安装与编译脚本 (自动检测上级 .env 并编译 ARM64 二进制)
              </span>
              <button
                onClick={() => copyToClipboard('chmod +x termux_setup.sh && ./termux_setup.sh', 'cmd3')}
                className="text-[11px] text-slate-400 hover:text-emerald-300 flex items-center gap-1"
              >
                {copiedKey === 'cmd3' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                复制
              </button>
            </div>
            <code className="text-xs font-mono text-slate-300 block bg-slate-900 px-2.5 py-1.5 rounded">
              chmod +x termux_setup.sh && ./termux_setup.sh
            </code>
          </div>

          {/* Step 4 */}
          <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-emerald-400">
                4. 启动麻将服务 + 启动 Cloudflare 公网隧道
              </span>
              <button
                onClick={() => copyToClipboard('./mahjong &\ncloudflared tunnel --url http://localhost:8080', 'cmd4')}
                className="text-[11px] text-slate-400 hover:text-emerald-300 flex items-center gap-1"
              >
                {copiedKey === 'cmd4' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                复制
              </button>
            </div>
            <code className="text-xs font-mono text-slate-300 block bg-slate-900 px-2.5 py-1.5 rounded">
              {`# 启动游戏服务 (后台运行):\n./mahjong &\n\n# 启动 Cloudflare 隧道 (打印公网链接):\ncloudflared tunnel --url http://localhost:8080`}
            </code>
          </div>
        </div>
      </div>

      {/* Telegram Bot Live Interactive Simulator & Command Reference */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Commands Table (Left 7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <Bot className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-slate-100">
              Telegram 管理员机器人核心指令速查
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2 px-2">指令</th>
                  <th className="py-2 px-2">功能说明</th>
                  <th className="py-2 px-2">试用</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                <tr>
                  <td className="py-2 px-2 text-amber-300 font-bold">/menu</td>
                  <td className="py-2 px-2 text-slate-300 font-sans">呼出交互式控制中控台面板</td>
                  <td className="py-2 px-2">
                    <button
                      onClick={() => handleSimulateCommand('/menu')}
                      className="text-[11px] bg-slate-800 hover:bg-slate-700 text-cyan-300 px-2 py-0.5 rounded font-sans"
                    >
                      在右侧模拟
                    </button>
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-2 text-amber-300 font-bold">/status</td>
                  <td className="py-2 px-2 text-slate-300 font-sans">查看 Termux 内存、Uptime、牌墙与分数</td>
                  <td className="py-2 px-2">
                    <button
                      onClick={() => handleSimulateCommand('/status')}
                      className="text-[11px] bg-slate-800 hover:bg-slate-700 text-cyan-300 px-2 py-0.5 rounded font-sans"
                    >
                      在右侧模拟
                    </button>
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-2 text-amber-300 font-bold">/url</td>
                  <td className="py-2 px-2 text-slate-300 font-sans">获取游戏公网网址与群发邀请文案</td>
                  <td className="py-2 px-2">
                    <button
                      onClick={() => handleSimulateCommand('/url')}
                      className="text-[11px] bg-slate-800 hover:bg-slate-700 text-cyan-300 px-2 py-0.5 rounded font-sans"
                    >
                      在右侧模拟
                    </button>
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-2 text-amber-300 font-bold">/game</td>
                  <td className="py-2 px-2 text-slate-300 font-sans">实时牌桌看板（庄家、打出牌、听牌）</td>
                  <td className="py-2 px-2">
                    <button
                      onClick={() => handleSimulateCommand('/game')}
                      className="text-[11px] bg-slate-800 hover:bg-slate-700 text-cyan-300 px-2 py-0.5 rounded font-sans"
                    >
                      在右侧模拟
                    </button>
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-2 text-amber-300 font-bold">/broadcast</td>
                  <td className="py-2 px-2 text-slate-300 font-sans">向所有在线玩家发送顶部跑马灯横幅</td>
                  <td className="py-2 px-2">
                    <button
                      onClick={() => handleSimulateCommand('/broadcast 今晚雀王争霸赛正式开打！')}
                      className="text-[11px] bg-slate-800 hover:bg-slate-700 text-cyan-300 px-2 py-0.5 rounded font-sans"
                    >
                      在右侧模拟
                    </button>
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-2 text-amber-300 font-bold">/reset</td>
                  <td className="py-2 px-2 text-slate-300 font-sans">强制重新洗牌开新局</td>
                  <td className="py-2 px-2">
                    <button
                      onClick={() => handleSimulateCommand('/reset')}
                      className="text-[11px] bg-slate-800 hover:bg-slate-700 text-cyan-300 px-2 py-0.5 rounded font-sans"
                    >
                      在右侧模拟
                    </button>
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-2 text-amber-300 font-bold">/seturl</td>
                  <td className="py-2 px-2 text-slate-300 font-sans">动态绑定 Cloudflare 临时分配的网址</td>
                  <td className="py-2 px-2 text-slate-500 font-sans text-[11px]">
                    /seturl &lt;url&gt;
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Telegram Chat Simulation (Right 5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col h-[460px] shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-cyan-600 flex items-center justify-center text-white font-bold text-xs">
                🀄
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">雀神管家 (Bot 模拟体验)</h4>
                <p className="text-[10px] text-emerald-400">● 机器人在线 · 管理员已授权</p>
              </div>
            </div>
            <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
              可直接交互
            </span>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto py-3 space-y-3 font-sans pr-1">
            {chatLog.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[90%] rounded-xl px-3 py-2 text-xs leading-relaxed shadow ${
                    m.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-slate-800 text-slate-200 border border-slate-700/60 rounded-bl-none'
                  }`}
                  dangerouslySetInnerHTML={{ __html: m.text }}
                />
                {m.buttons && m.buttons.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2 max-w-[90%]">
                    {m.buttons.map((btn, bIdx) => (
                      <button
                        key={bIdx}
                        onClick={() => handleSimulateCommand(btn)}
                        className="bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/80 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition"
                      >
                        {btn}
                      </button>
                    ))}
                  </div>
                )}
                <span className="text-[9px] text-slate-500 mt-1 px-1">{m.time}</span>
              </div>
            ))}
          </div>

          {/* Send Input */}
          <form
            onSubmit={e => {
              e.preventDefault();
              if (inputMsg.trim()) handleSimulateCommand(inputMsg.trim());
            }}
            className="pt-2 border-t border-slate-800 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputMsg}
              onChange={e => setInputMsg(e.target.value)}
              placeholder="发送 /menu 或输入指令..."
              className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            />
            <button
              type="submit"
              className="bg-cyan-600 hover:bg-cyan-500 text-white p-2 rounded-lg transition"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

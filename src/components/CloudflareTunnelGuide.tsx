import React, { useState } from 'react';
import {
  Globe,
  Zap,
  ShieldCheck,
  Terminal,
  Copy,
  Check,
  Share2,
  ExternalLink,
  Smartphone,
  Flame,
  Wifi,
  Sparkles,
} from 'lucide-react';

export const CloudflareTunnelGuide: React.FC = () => {
  const [tunnelUrl, setTunnelUrl] = useState('https://lucky-mahjong-play.trycloudflare.com');
  const [copiedCodeIdx, setCopiedCodeIdx] = useState<number | null>(null);
  const [copiedShare, setCopiedShare] = useState(false);

  const copyText = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedCodeIdx(idx);
    setTimeout(() => setCopiedCodeIdx(null), 2000);
  };

  const shareText = `🀄【三缺一速来！】我用 Termux 搭建的麻将开局了！无需下载任何软件，在手机浏览器打开即可进入对战：\n${tunnelUrl}`;

  const handleCopyShare = () => {
    navigator.clipboard.writeText(shareText);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  const sections = [
    {
      title: '第一步：在 Termux 中安装 Cloudflare Tunnel (cloudflared)',
      desc: 'Termux 官方仓库或直装脚本已支持 cloudflared 工具，输入一条命令即可完成安装：',
      code: `# 方法 1: 使用 pkg 官方包管理器安装 (推荐)
pkg install -y cloudflared

# 方法 2: 若提示包不存在，直接下载 ARM64 官方二进制单文件:
curl -sSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 -o $PREFIX/bin/cloudflared
chmod +x $PREFIX/bin/cloudflared

# 验证安装是否成功
cloudflared --version`,
    },
    {
      title: '第二步：启动麻将游戏服务',
      desc: '在你的 Termux 中启动编译好的二进制程序 (默认监听 8080 端口)：',
      code: `# 启动麻将服务
./mahjong

# 或后台保持运行 (退出终端也不会中断):
nohup ./mahjong > mahjong.log 2>&1 &`,
    },
    {
      title: '第三步：启动 Cloudflare Tunnel 免公网穿透 (核心！)',
      desc: '新建一个 Termux 会话，输入以下命令。无需注册账号，无需购买域名，3秒自动生成全球 HTTPS 公网网址：',
      code: `# 启动快速免配置公网穿透隧道
cloudflared tunnel --url http://localhost:8080

# 终端输出中将包含类似如下的临时公网网址:
# +-----------------------------------------------------------------------+
# |  Your quick Tunnel has been created! Visit it at:                     |
# |  https://xxxx-xxxx-xxxx.trycloudflare.com                             |
# +-----------------------------------------------------------------------+`,
    },
    {
      title: '第四步：后台长期运行与保活技巧 (防安卓休眠)',
      desc: '为了让朋友随时都能访问，可以开启 Termux 唤醒锁并在后台运行：',
      code: `# 1. 开启 Termux 保持 CPU 运行唤醒锁
termux-wake-lock

# 2. 将隧道服务也在后台挂起:
nohup cloudflared tunnel --url http://localhost:8080 > tunnel.log 2>&1 &

# 3. 查看刚刚生成的公网 URL
cat tunnel.log | grep -o 'https://.*\.trycloudflare\.com'`,
    },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 rounded-xl overflow-y-auto border border-slate-800 shadow-2xl p-4 sm:p-6 space-y-6">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-orange-950 via-slate-900 to-amber-950 border border-orange-700/50 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 bg-orange-500/20 text-orange-400 border border-orange-500/40 text-xs px-3 py-1 rounded-full font-bold mb-3">
            <Globe className="w-3.5 h-3.5" />
            Cloudflare Tunnel 公网免局域网全解
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-100 mb-2">
            手机做服务器 · 全球好友免局域网即点即玩
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            传统局域网开黑要求所有手机必须连同一个 WiFi。使用 Cloudflare Tunnel 隧道后，
            利用全球 Cloudflare CDN 边缘节点建立安全反向代理，
            <strong>玩家无论使用 4G/5G 蜂窝数据还是在千里之外，点开链接即刻开战！</strong>
          </p>
        </div>
      </div>

      {/* Benefits Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-orange-950 text-orange-400 border border-orange-800">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-200">免公网 IP · 免路由器配置</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              直接穿透大内网与 NAT，无需申请公网 IP 或配置路由器端口转发
            </p>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-200">免费自动 HTTPS 证书</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              自带权威 SSL 加密，手机浏览器打开无任何“不安全”风险拦截提示
            </p>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-blue-950 text-blue-400 border border-blue-800">
            <Wifi className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-200">完全免费 · 不限流量</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Cloudflare Quick Tunnel 零收费，随时启动，用完随时关闭
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Public URL Card & Inviter */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-bold text-slate-200 flex items-center gap-2">
            <Share2 className="w-4 h-4 text-orange-400" />
            好友对局邀请链接模拟与一键生成
          </h3>
          <span className="text-[11px] text-slate-400">将生成的 trycloudflare 网址粘贴至下方</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={tunnelUrl}
            onChange={e => setTunnelUrl(e.target.value)}
            placeholder="https://xxxx.trycloudflare.com"
            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm font-mono text-orange-300 focus:outline-orange-500"
          />
          <button
            onClick={handleCopyShare}
            className="bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs px-4 py-2 rounded-lg shadow-lg shadow-orange-600/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer font-sans"
          >
            {copiedShare ? (
              <>
                <Check className="w-4 h-4 text-emerald-200" />
                <span>已复制邀请文案</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>复制微信/QQ开黑邀请</span>
              </>
            )}
          </button>
        </div>

        <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800/80 text-xs text-slate-400 font-mono whitespace-pre-wrap">
          {shareText}
        </div>
      </div>

      {/* Step by Step Commands */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <Terminal className="w-4 h-4 text-orange-400" />
          Termux 终端逐步部署命令 (点击复制)
        </h3>

        <div className="space-y-3">
          {sections.map((sec, idx) => (
            <div
              key={idx}
              className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 transition-all hover:border-slate-700"
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs sm:text-sm font-bold text-slate-200 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-orange-950 text-orange-400 border border-orange-800 text-[10px] flex items-center justify-center font-bold">
                    {idx + 1}
                  </span>
                  {sec.title}
                </h4>

                <button
                  onClick={() => copyText(sec.code, idx)}
                  className="flex items-center gap-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded transition-colors font-mono cursor-pointer"
                >
                  {copiedCodeIdx === idx ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">已复制</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>复制</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-xs text-slate-400 mb-2.5">{sec.desc}</p>

              <div className="bg-[#0d1117] p-3 rounded-lg border border-slate-800 font-mono text-xs text-orange-300 overflow-x-auto whitespace-pre">
                {sec.code}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

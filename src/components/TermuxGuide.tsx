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
} from 'lucide-react';

export const TermuxGuide: React.FC = () => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const steps = [
    {
      title: '步骤 1：在手机上准备 Termux 环境',
      desc: '请确保在 Android 手机上安装了最新版 Termux (推荐从 F-Droid 或 GitHub Releases 下载，勿用 Google Play 过期版本)。',
      code: `# 首次打开 Termux，建议更新系统软件源
pkg update -y

# 安装 Go 语言编译器与 Git 工具 (仅需约 50MB)
pkg install -y golang git make`,
    },
    {
      title: '步骤 2：克隆你的 GitHub 麻将仓库',
      desc: '使用 git clone 将你的代码拉取到手机本地目录。',
      code: `# 克隆你的 GitHub 仓库 (将 USERNAME 替换为你的真实 GitHub 账号)
git clone https://github.com/USERNAME/termux-mahjong.git

# 进入项目目录
cd termux-mahjong`,
    },
    {
      title: '步骤 3：编译原生可执行文件 (零依赖秒级编译)',
      desc: '由于本项目使用 Go 纯标准库开发，无需 GCC/Clang，ARM64 编译仅需 2 秒！',
      code: `# 赋予一键部署脚本执行权限并运行
chmod +x termux_setup.sh
./termux_setup.sh

# 或者手动一条命令编译:
CGO_ENABLED=0 go build -ldflags="-s -w" -o mahjong main.go`,
    },
    {
      title: '步骤 4：启动畅玩！(双模随时切换)',
      desc: '支持终端 TUI 字符对战或手机 Chrome 网页高清触摸对局。',
      code: `# 【模式 A】纯终端 TUI 字符麻将 (随时随地秒开)
./mahjong

# 【模式 B】手机网页触摸版 (在手机浏览器打开 http://localhost:8080)
./mahjong -web

# 【模式 C】四川血战到底规则 (108张去字牌)
./mahjong -rule SICHUAN`,
    },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 rounded-xl overflow-y-auto border border-slate-800 shadow-2xl p-4 sm:p-6 space-y-6">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-cyan-950 border border-emerald-700/40 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs px-3 py-1 rounded-full font-bold mb-3">
            <Smartphone className="w-3.5 h-3.5" />
            Android Termux 极速部署指南
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-100 mb-2">
            手机终端上运行的 Go 语言麻将游戏
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            纯 Go 标准库打造，零外部 CGO 依赖，完美兼容 Android ARM64 架构。既能在 Termux
            字符黑窗中高速摸切吃碰杠，也能一键启动 Web 服务，在手机浏览器中进行高清触摸对战！
          </p>
        </div>
      </div>

      {/* Feature Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-200">纯 Go 零依赖</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              无需安装复杂的 C 编译器，`go build` 2秒编译出单一可执行文件
            </p>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-200">双模式互通</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              字符终端 TUI 模式 + 手机浏览器 Web 触摸屏双模随心切换
            </p>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-950 text-amber-400 border border-amber-800">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-200">局域网同屏对局</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              手机开热点或同处 WiFi，好友输入你的 IP 即可一起打麻将
            </p>
          </div>
        </div>
      </div>

      {/* Step by Step Deployment Section */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          逐步实操命令 (点击右上角一键复制)
        </h2>

        <div className="space-y-3">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 transition-all hover:border-slate-700"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs sm:text-sm font-bold text-slate-200 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] flex items-center justify-center font-bold">
                    {idx + 1}
                  </span>
                  {step.title}
                </h3>

                <button
                  onClick={() => copyCode(step.code, idx)}
                  className="flex items-center gap-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded transition-colors font-mono cursor-pointer"
                >
                  {copiedIndex === idx ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">已复制</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>复制命令</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-xs text-slate-400 mb-2.5">{step.desc}</p>

              <div className="bg-[#0d1117] p-3 rounded-lg border border-slate-800 font-mono text-xs text-emerald-400 overflow-x-auto whitespace-pre">
                {step.code}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Termux Pro-Tips & FAQ */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
        <h3 className="text-xs sm:text-sm font-bold text-slate-200 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          Termux 手机运行技巧与避坑指南
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-300">
          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 space-y-1">
            <div className="font-bold text-amber-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              1. 解决下载慢 / 软件源报错
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              在 Termux 中输入 <code className="text-cyan-400">termux-change-repo</code>，选择
              Tsinghua (清华镜像站) 或 USTC (中科大镜像)，即可将国内拉取速度提升 10 倍以上。
            </p>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 space-y-1">
            <div className="font-bold text-emerald-400 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5" />
              2. 防止安卓后台休眠杀进程
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              运行前输入 <code className="text-cyan-400">termux-wake-lock</code> 可保持唤醒锁。并在手机系统设置中将 Termux 的省电策略设为“无限制/允许后台运行”。
            </p>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 space-y-1">
            <div className="font-bold text-blue-400 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5" />
              3. 创建全局快捷启动指令
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              执行 <code className="text-cyan-400">echo "alias mj='~/termux-mahjong/mahjong'" &gt;&gt; ~/.bashrc</code>，以后在 Termux 任意目录下输入 <code className="text-emerald-400">mj</code> 即可秒开游戏！
            </p>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 space-y-1">
            <div className="font-bold text-purple-400 flex items-center gap-1.5">
              <Share2 className="w-3.5 h-3.5" />
              4. 局域网分享给室友/好友玩
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              输入 <code className="text-cyan-400">ifconfig wlan0</code> 查看手机 IP（例如 192.168.1.105），同局域网设备用浏览器访问 <code className="text-emerald-400">http://192.168.1.105:8080</code> 即可同台竞技！
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

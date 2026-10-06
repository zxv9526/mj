import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, X, Share, CheckCircle2 } from 'lucide-react';

interface PWAInstallButtonProps {
  variant?: 'compact' | 'full';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'compact' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running inside installed standalone PWA, suppress the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    if (variant === 'compact') {
      return (
        <button
          onClick={install}
          className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-md shadow-emerald-600/30 transition-all cursor-pointer animate-pulse"
          title="点击安装到手机桌面或电脑桌面"
        >
          <Download className="w-3.5 h-3.5" />
          <span>安装App</span>
        </button>
      );
    }

    return (
      <div className="bg-gradient-to-r from-emerald-950/80 to-teal-950/80 border border-emerald-500/40 rounded-xl p-3 flex items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40 font-black text-lg">
            🀄
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
              安装《麻将》客户端到桌面
              <span className="text-[9px] bg-emerald-500 text-slate-950 font-black px-1.5 py-0.2 rounded-full">
                PWA
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">
              免应用商店，即点即装，沉浸全屏无浏览器地址栏，支持离线运行
            </p>
          </div>
        </div>
        <button
          onClick={install}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-lg shadow-md shadow-emerald-600/30 flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          <span>立即安装</span>
        </button>
      </div>
    );
  }

  // iOS Safari flow (WebKit beforeinstallprompt requires manual Add to Home Screen)
  if (isIOS) {
    return (
      <>
        {variant === 'compact' ? (
          <button
            onClick={() => setShowIOSGuide(true)}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs px-2.5 py-1.5 rounded-lg border border-emerald-500/30 transition-all cursor-pointer"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>添加到主屏</span>
          </button>
        ) : (
          <div className="bg-slate-900 border border-emerald-500/30 rounded-xl p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🀄</span>
              <div>
                <h4 className="text-xs font-bold text-slate-100">添加到 iPhone / iPad 主屏幕</h4>
                <p className="text-[11px] text-slate-400">如同原生 App，全屏流畅体验</p>
              </div>
            </div>
            <button
              onClick={() => setShowIOSGuide(true)}
              className="bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold text-xs px-3 py-1.5 rounded-lg border border-slate-700"
            >
              安装指引
            </button>
          </div>
        )}

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-5 shadow-2xl text-slate-100 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  iPhone / iPad 安装教程
                </h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-300">
                <div className="flex items-start gap-2.5 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="w-5 h-5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[11px] flex items-center justify-center font-bold shrink-0">
                    1
                  </span>
                  <div>
                    点击 Safari 浏览器底部的{' '}
                    <strong className="text-emerald-400 inline-flex items-center gap-1">
                      <Share className="w-3.5 h-3.5" /> 分享
                    </strong>{' '}
                    按钮。
                  </div>
                </div>

                <div className="flex items-start gap-2.5 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="w-5 h-5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[11px] flex items-center justify-center font-bold shrink-0">
                    2
                  </span>
                  <div>
                    在菜单中向下滑动，找到并点击{' '}
                    <strong className="text-amber-300">【添加到主屏幕】</strong>。
                  </div>
                </div>

                <div className="flex items-start gap-2.5 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="w-5 h-5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[11px] flex items-center justify-center font-bold shrink-0">
                    3
                  </span>
                  <div>
                    确认名称为 <strong className="text-emerald-400">“麻将”</strong>，点击右上角【添加】即可！
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-xl text-xs transition-colors"
              >
                我知道了
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Fallback desktop / other browser install hint
  if (variant === 'full') {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-emerald-400 text-base">🀄</span>
          <span className="text-slate-300">
            支持 PWA 原生应用模式：点击浏览器地址栏右侧的 <strong className="text-emerald-400">【安装】</strong> 图标即可保存至桌面。
          </span>
        </div>
      </div>
    );
  }

  return null;
};

import React from 'react';
import {
  Home,
  Gamepad2,
  FolderCode,
  BookOpen,
  Globe,
  Palette,
  Sparkles,
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

export type ActiveTab = 'lobby' | 'visual' | 'svg' | 'tunnel' | 'code' | 'guide';

interface NavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  uploadedSvgCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  uploadedSvgCount,
}) => {
  const tabs = [
    {
      id: 'lobby' as ActiveTab,
      label: '麻将游戏大厅',
      icon: Home,
      badge: '大厅',
    },
    {
      id: 'visual' as ActiveTab,
      label: '对局牌桌',
      icon: Gamepad2,
      badge: '实战',
    },
    {
      id: 'svg' as ActiveTab,
      label: 'SVG 牌面识别',
      icon: Palette,
      badge: '42张已就绪',
    },
    {
      id: 'tunnel' as ActiveTab,
      label: 'Cloudflare 隧道',
      icon: Globe,
      badge: '免局域网',
    },
    {
      id: 'code' as ActiveTab,
      label: 'Go 源码树',
      icon: FolderCode,
      badge: 'ZIP下载',
    },
    {
      id: 'guide' as ActiveTab,
      label: 'Termux 指南',
      icon: BookOpen,
      badge: null,
    },
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 px-3 sm:px-6 py-2.5 flex items-center justify-between flex-shrink-0 select-none">
      {/* Brand */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 via-red-600 to-emerald-500 flex items-center justify-center shadow-md shadow-amber-500/20 text-white font-black text-base">
          🀄
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-base font-black text-slate-100 tracking-tight flex items-center gap-1.5">
              雀神天下
              <span className="text-amber-400 font-mono text-xs font-normal">
                Termux 麻将
              </span>
            </h1>
            <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              SVG 矢量版
            </span>
          </div>
          <p className="text-[11px] text-slate-400 hidden sm:block">
            真人中文报牌语音 · 碰杠胡大喊 · Cloudflare Tunnel 免局域网开黑
          </p>
        </div>
      </div>

      {/* Navigation Tabs & PWA Install */}
      <div className="flex items-center gap-2">
        <nav className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer relative ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-600 to-emerald-600 text-white shadow-md shadow-amber-600/30 font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden md:inline">{tab.label}</span>
                <span className="md:hidden">
                  {tab.id === 'lobby'
                    ? '大厅'
                    : tab.id === 'visual'
                    ? '牌桌'
                    : tab.id === 'svg'
                    ? 'SVG'
                    : tab.id === 'tunnel'
                    ? '隧道'
                    : tab.id === 'code'
                    ? '源码'
                    : '指南'}
                </span>
                {tab.badge && (
                  <span
                    className={`hidden lg:inline text-[9px] px-1 py-0.2 rounded-full font-mono ${
                      isActive
                        ? 'bg-amber-950 text-amber-200 border border-amber-700/60'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* PWA In-App Install Button */}
        <PWAInstallButton variant="compact" />
      </div>
    </header>
  );
};

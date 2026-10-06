import React from 'react';
import {
  Gamepad2,
  FolderCode,
  BookOpen,
  Globe,
  Palette,
} from 'lucide-react';

export type ActiveTab = 'visual' | 'svg' | 'tunnel' | 'code' | 'guide';

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
      id: 'visual' as ActiveTab,
      label: '网页实战对局',
      icon: Gamepad2,
      badge: null,
    },
    {
      id: 'svg' as ActiveTab,
      label: 'SVG 牌面管理与放置',
      icon: Palette,
      badge: uploadedSvgCount > 0 ? `${uploadedSvgCount}张` : '路径指南',
    },
    {
      id: 'tunnel' as ActiveTab,
      label: 'Cloudflare 隧道公网',
      icon: Globe,
      badge: '免局域网',
    },
    {
      id: 'code' as ActiveTab,
      label: 'Go 源码树与导出',
      icon: FolderCode,
      badge: 'ZIP下载',
    },
    {
      id: 'guide' as ActiveTab,
      label: 'Termux 部署指南',
      icon: BookOpen,
      badge: null,
    },
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 px-3 sm:px-6 py-2.5 flex items-center justify-between flex-shrink-0 select-none">
      {/* Brand */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-emerald-500 flex items-center justify-center shadow-md shadow-cyan-500/20 text-white font-black text-base">
          🀄
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-base font-black text-slate-100 tracking-tight flex items-center gap-1.5">
              Go Mahjong Web
              <span className="text-cyan-400 font-mono text-xs font-normal">
                + Cloudflare Tunnel
              </span>
            </h1>
            <span className="bg-cyan-950 text-cyan-400 border border-cyan-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              网络版
            </span>
          </div>
          <p className="text-[11px] text-slate-400 hidden sm:block">
            纯 Go 打造 · SVG 矢量牌面 · Cloudflare 免局域网全球公网对战
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
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
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden md:inline">{tab.label}</span>
              <span className="md:hidden">
                {tab.id === 'visual'
                  ? '对局'
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
                      ? 'bg-cyan-900 text-cyan-200'
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
    </header>
  );
};

import React from 'react';
import {
  Gamepad2,
  Terminal,
  FolderCode,
  BookOpen,
  Sparkles,
  Github,
} from 'lucide-react';

export type ActiveTab = 'visual' | 'terminal' | 'code' | 'guide';

interface NavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    {
      id: 'visual' as ActiveTab,
      label: '可视化网页麻将',
      icon: Gamepad2,
      badge: '实战对局',
    },
    {
      id: 'terminal' as ActiveTab,
      label: 'Termux 终端模拟器',
      icon: Terminal,
      badge: 'TUI',
    },
    {
      id: 'code' as ActiveTab,
      label: 'Go 源码树与一键导出',
      icon: FolderCode,
      badge: 'ZIP下载',
    },
    {
      id: 'guide' as ActiveTab,
      label: 'Termux 部署指南',
      icon: BookOpen,
      badge: '全教程',
    },
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 px-3 sm:px-6 py-2.5 flex items-center justify-between flex-shrink-0 select-none">
      {/* Brand */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-600 to-cyan-500 flex items-center justify-center shadow-md shadow-emerald-500/20 text-white font-black text-base">
          🀄
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-base font-black text-slate-100 tracking-tight flex items-center gap-1.5">
              Go Mahjong
              <span className="text-emerald-400 font-mono text-xs font-normal">
                @Termux
              </span>
            </h1>
            <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              v1.0.0
            </span>
          </div>
          <p className="text-[11px] text-slate-400 hidden sm:block">
            纯 Go 打造 · 终端 TUI 与 网页 双模式麻将
          </p>
        </div>
      </div>

      {/* Tabs */}
      <nav className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden md:inline">{tab.label}</span>
              <span className="md:hidden">
                {tab.id === 'visual'
                  ? '网页'
                  : tab.id === 'terminal'
                  ? '终端'
                  : tab.id === 'code'
                  ? '源码'
                  : '指南'}
              </span>
            </button>
          );
        })}
      </nav>
    </header>
  );
};

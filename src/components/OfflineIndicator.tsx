import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-3 left-3 z-50 flex items-center gap-2 rounded-xl bg-amber-600/95 backdrop-blur-md px-3.5 py-2 text-xs font-bold text-white shadow-xl border border-amber-400/40 animate-pulse">
      <WifiOff className="w-4 h-4" />
      <span>离线模式 — 已启用本地单机离线缓存对战</span>
    </div>
  );
};

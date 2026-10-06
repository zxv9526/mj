import React, { useState } from 'react';
import { Suit, Tile } from '../types/mahjong';

interface TileViewProps {
  tile?: Tile;
  isBack?: boolean;
  size?: 'sm' | 'md' | 'lg';
  isSelected?: boolean;
  isHighlight?: boolean;
  onClick?: () => void;
  indexLabel?: number;
  customSvgUrl?: string; // Optional user-uploaded SVG Data URL or static URL
}

export const TileView: React.FC<TileViewProps> = ({
  tile,
  isBack = false,
  size = 'md',
  isSelected = false,
  isHighlight = false,
  onClick,
  indexLabel,
  customSvgUrl,
}) => {
  const [svgFailed, setSvgFailed] = useState(false);

  const sizeClasses = {
    sm: 'w-7 h-9 text-xs',
    md: 'w-9 h-12 text-sm',
    lg: 'w-11 h-15 text-base sm:w-12 sm:h-16',
  }[size];

  if (isBack || !tile) {
    return (
      <div
        className={`${sizeClasses} bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-md border border-emerald-400/50 shadow-md flex items-center justify-center flex-shrink-0 relative overflow-hidden`}
      >
        {customSvgUrl && !svgFailed ? (
          <img
            src={customSvgUrl}
            alt="Back"
            className="w-full h-full object-contain p-0.5"
            onError={() => setSvgFailed(true)}
          />
        ) : (
          <div className="absolute inset-1 border border-emerald-400/20 rounded-xs bg-emerald-700/60 flex items-center justify-center">
            <span className="text-[10px] text-emerald-200/60 font-mono font-bold">🀄</span>
          </div>
        )}
      </div>
    );
  }

  const { suit, name, emoji, code } = tile;

  let textColor = 'text-slate-900';
  if (suit === Suit.Wan) {
    textColor = 'text-red-700';
  } else if (suit === Suit.Tong) {
    textColor = 'text-sky-700';
  } else if (suit === Suit.Tiao) {
    textColor = 'text-emerald-700';
  } else if (suit === Suit.Zi) {
    if (tile.type === 35) textColor = 'text-red-600';
    else if (tile.type === 36) textColor = 'text-emerald-600';
    else textColor = 'text-amber-700';
  }

  // Check if we have an active custom SVG (either passed directly or trying static path)
  const targetSvg = customSvgUrl || `/static/tiles/${code}.svg`;

  return (
    <div className="flex flex-col items-center flex-shrink-0 group select-none">
      {indexLabel !== undefined && (
        <span className="text-[10px] text-slate-400 font-mono mb-1 transition-colors group-hover:text-amber-300">
          [{indexLabel}]
        </span>
      )}
      <button
        type="button"
        onClick={onClick}
        className={`
          ${sizeClasses}
          relative bg-gradient-to-b from-white via-amber-50 to-amber-100/90
          rounded-md shadow-[0_3px_6px_rgba(0,0,0,0.35),0_1px_2px_rgba(0,0,0,0.2)]
          border border-amber-200/80
          flex flex-col items-center justify-between p-1 select-none transition-all duration-150
          ${onClick ? 'cursor-pointer hover:-translate-y-2 hover:shadow-lg hover:border-amber-400 active:translate-y-0' : 'cursor-default'}
          ${isSelected ? '-translate-y-3 ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-900 shadow-amber-400/30 shadow-lg' : ''}
          ${isHighlight ? 'ring-2 ring-emerald-400' : ''}
        `}
      >
        {customSvgUrl && !svgFailed ? (
          /* Render User-Provided SVG */
          <div className="w-full h-full flex items-center justify-center p-0.5">
            <img
              src={targetSvg}
              alt={name}
              className="w-full h-full object-contain pointer-events-none"
              onError={() => setSvgFailed(true)}
            />
          </div>
        ) : (
          /* Built-in Vector/Emoji Renderer */
          <>
            <span className="w-full text-left font-mono font-bold text-[9px] leading-none opacity-60 px-0.5">
              {code}
            </span>

            <span className="text-xl sm:text-2xl leading-none my-auto select-none filter drop-shadow-xs">
              {emoji}
            </span>

            <span
              className={`font-black tracking-tighter leading-none text-center ${textColor} ${
                size === 'lg' ? 'text-xs' : 'text-[10px]'
              }`}
            >
              {name}
            </span>
          </>
        )}
      </button>
    </div>
  );
};

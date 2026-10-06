import React, { useState } from 'react';
import JSZip from 'jszip';
import {
  FolderOpen,
  UploadCloud,
  CheckCircle2,
  FileCode,
  Copy,
  Check,
  Download,
  Sparkles,
  Info,
  Layers,
  Image as ImageIcon,
  RotateCcw,
} from 'lucide-react';

export interface SvgTileItem {
  code: string;
  name: string;
  category: 'wan' | 'tong' | 'tiao' | 'zi' | 'back';
  filename: string;
}

export const ALL_SVG_TILES: SvgTileItem[] = [
  // Wan
  { code: '1m', name: '一万', category: 'wan', filename: '1m.svg' },
  { code: '2m', name: '二万', category: 'wan', filename: '2m.svg' },
  { code: '3m', name: '三万', category: 'wan', filename: '3m.svg' },
  { code: '4m', name: '四万', category: 'wan', filename: '4m.svg' },
  { code: '5m', name: '五万', category: 'wan', filename: '5m.svg' },
  { code: '6m', name: '六万', category: 'wan', filename: '6m.svg' },
  { code: '7m', name: '七万', category: 'wan', filename: '7m.svg' },
  { code: '8m', name: '八万', category: 'wan', filename: '8m.svg' },
  { code: '9m', name: '九万', category: 'wan', filename: '9m.svg' },
  // Tong
  { code: '1p', name: '一筒', category: 'tong', filename: '1p.svg' },
  { code: '2p', name: '二筒', category: 'tong', filename: '2p.svg' },
  { code: '3p', name: '三筒', category: 'tong', filename: '3p.svg' },
  { code: '4p', name: '四筒', category: 'tong', filename: '4p.svg' },
  { code: '5p', name: '五筒', category: 'tong', filename: '5p.svg' },
  { code: '6p', name: '六筒', category: 'tong', filename: '6p.svg' },
  { code: '7p', name: '七筒', category: 'tong', filename: '7p.svg' },
  { code: '8p', name: '八筒', category: 'tong', filename: '8p.svg' },
  { code: '9p', name: '九筒', category: 'tong', filename: '9p.svg' },
  // Tiao
  { code: '1s', name: '一条', category: 'tiao', filename: '1s.svg' },
  { code: '2s', name: '二条', category: 'tiao', filename: '2s.svg' },
  { code: '3s', name: '三条', category: 'tiao', filename: '3s.svg' },
  { code: '4s', name: '四条', category: 'tiao', filename: '4s.svg' },
  { code: '5s', name: '五条', category: 'tiao', filename: '5s.svg' },
  { code: '6s', name: '六条', category: 'tiao', filename: '6s.svg' },
  { code: '7s', name: '七条', category: 'tiao', filename: '7s.svg' },
  { code: '8s', name: '八条', category: 'tiao', filename: '8s.svg' },
  { code: '9s', name: '九条', category: 'tiao', filename: '9s.svg' },
  // Zi
  { code: '1z', name: '东风', category: 'zi', filename: '1z.svg' },
  { code: '2z', name: '南风', category: 'zi', filename: '2z.svg' },
  { code: '3z', name: '西风', category: 'zi', filename: '3z.svg' },
  { code: '4z', name: '北风', category: 'zi', filename: '4z.svg' },
  { code: '5z', name: '红中', category: 'zi', filename: '5z.svg' },
  { code: '6z', name: '发财', category: 'zi', filename: '6z.svg' },
  { code: '7z', name: '白板', category: 'zi', filename: '7z.svg' },
  // Back
  { code: 'back', name: '牌背贴图', category: 'back', filename: 'back.svg' },
];

interface SvgManagerProps {
  customSvgMap: Record<string, string>;
  onSvgUploaded: (map: Record<string, string>) => void;
}

export const SvgManager: React.FC<SvgManagerProps> = ({
  customSvgMap,
  onSvgUploaded,
}) => {
  const [copiedPath, setCopiedPath] = useState(false);
  const [copiedGit, setCopiedGit] = useState(false);
  const [filterCat, setFilterCat] = useState<'all' | 'wan' | 'tong' | 'tiao' | 'zi' | 'back'>('all');

  const standardPath = 'web/static/tiles/';
  const fullPath = 'go-mahjong/web/static/tiles/';

  const handleCopy = (text: string, isGit = false) => {
    navigator.clipboard.writeText(text);
    if (isGit) {
      setCopiedGit(true);
      setTimeout(() => setCopiedGit(false), 2000);
    } else {
      setCopiedPath(true);
      setTimeout(() => setCopiedPath(false), 2000);
    }
  };

  // Upload SVG handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newMap = { ...customSvgMap };
    Array.from(files).forEach(file => {
      if (file.name.endsWith('.svg') || file.type.includes('svg')) {
        const reader = new FileReader();
        reader.onload = evt => {
          const content = evt.target?.result as string;
          // Match by filename: e.g. "1m.svg" -> "1m", "一万.svg" -> "1m"
          const baseName = file.name.replace(/\.svg$/i, '').toLowerCase();
          const matchedItem = ALL_SVG_TILES.find(
            t => t.code.toLowerCase() === baseName || t.name === baseName || t.filename.toLowerCase() === file.name.toLowerCase()
          );

          if (matchedItem) {
            newMap[matchedItem.code] = content;
          } else {
            // Also store by pure code if matching
            newMap[baseName] = content;
          }
          onSvgUploaded({ ...newMap });
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const handleClearAll = () => {
    onSvgUploaded({});
  };

  // Download all SVGs as ZIP
  const handleDownloadZip = async () => {
    const zip = new JSZip();
    const folder = zip.folder('web/static/tiles')!;

    // Include existing uploaded or generate fallback sample
    ALL_SVG_TILES.forEach(t => {
      const dataUrl = customSvgMap[t.code];
      if (dataUrl && dataUrl.startsWith('data:image/svg+xml')) {
        const svgContent = decodeURIComponent(dataUrl.split(',')[1]);
        folder.file(t.filename, svgContent);
      } else {
        // Fallback sample SVG
        const sampleSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 96" width="72" height="96">
  <rect width="70" height="94" x="1" y="1" rx="8" fill="#fffdfa" stroke="#cbd5e1" stroke-width="2"/>
  <text x="36" y="55" font-size="28" font-weight="bold" text-anchor="middle" fill="#0f172a">${t.name}</text>
  <text x="8" y="20" font-size="12" font-family="monospace" fill="#64748b">${t.code}</text>
</svg>`;
        folder.file(t.filename, sampleSvg);
      }
    });

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mahjong-tiles-svg.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const filteredTiles = ALL_SVG_TILES.filter(
    t => filterCat === 'all' || t.category === filterCat
  );

  const uploadedCount = Object.keys(customSvgMap).length;

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 rounded-xl overflow-y-auto border border-slate-800 shadow-2xl p-4 sm:p-6 space-y-6">
      {/* Target Directory Location Card */}
      <div className="bg-gradient-to-r from-cyan-950 via-slate-900 to-emerald-950 border border-cyan-700/50 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/30">
              <FolderOpen className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] bg-cyan-950 text-cyan-400 font-bold px-2 py-0.5 rounded-full border border-cyan-800">
                标准存放位置
              </span>
              <h2 className="text-base sm:text-lg font-black text-slate-100 mt-0.5">
                SVG 牌面图片存放目录
              </h2>
            </div>
          </div>

          <button
            onClick={() => handleCopy(fullPath)}
            className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs px-3.5 py-2 rounded-lg shadow-lg shadow-cyan-600/30 transition-all cursor-pointer font-mono"
          >
            {copiedPath ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>已复制路径</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>一键复制目录路径</span>
              </>
            )}
          </button>
        </div>

        {/* Path Display Box */}
        <div className="bg-[#090d16] p-3.5 rounded-xl border border-cyan-800/60 font-mono text-xs sm:text-sm text-cyan-300 flex items-center justify-between select-all">
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="text-slate-500">$</span>
            <span className="font-bold text-emerald-400">项目根目录/</span>
            <span className="font-black text-cyan-300 underline decoration-cyan-500/50 underline-offset-4">
              web/static/tiles/
            </span>
            <span className="text-slate-400">*.svg</span>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          💡 <strong className="text-slate-100">原理解释：</strong>Go 程序中已经配置了静态资源服务路由{' '}
          <code className="text-emerald-400 font-mono">/static/</code> 映射到本地的{' '}
          <code className="text-cyan-400 font-mono">web/static/</code> 文件夹。
          因此，只要你把 SVG 文件放到 <code className="text-amber-300 font-mono">web/static/tiles/</code> 目录下，
          网页端在手机或公网访问时，就会自动加载你的精美高清 SVG 牌面！
        </p>
      </div>

      {/* Upload & Live Preview Toolbar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-emerald-400" />
              本地 SVG 实时预览与热替换测试
              <span className="text-xs font-normal text-slate-400">
                (已加载: <strong className="text-emerald-400">{uploadedCount}</strong> / 35 张)
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              你可以先在浏览器里批量拖入或选择你的 SVG 文件，页面和麻将牌桌将立即生效预览！
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-2 rounded-lg shadow-md shadow-emerald-600/30 transition-all cursor-pointer">
              <UploadCloud className="w-4 h-4" />
              <span>选择/批量上传 SVG</span>
              <input
                type="file"
                multiple
                accept=".svg,image/svg+xml"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <button
              onClick={handleDownloadZip}
              className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-3 py-2 rounded-lg border border-slate-700 transition-colors"
              title="下载完整 SVG 模板工程包"
            >
              <Download className="w-4 h-4" />
              <span>下载模板 ZIP</span>
            </button>

            {uploadedCount > 0 && (
              <button
                onClick={handleClearAll}
                className="flex items-center gap-1 text-slate-400 hover:text-red-400 text-xs px-2 py-2 rounded hover:bg-slate-800 transition-colors"
                title="清空当前预览"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                重置
              </button>
            )}
          </div>
        </div>

        {/* Filter Categories */}
        <div className="flex flex-wrap gap-1.5 border-t border-slate-800 pt-3">
          {[
            { id: 'all', label: '全部 (35)' },
            { id: 'wan', label: '万子 (1m~9m)' },
            { id: 'tong', label: '筒子 (1p~9p)' },
            { id: 'tiao', label: '条子 (1s~9s)' },
            { id: 'zi', label: '字牌 (东南西北中发白)' },
            { id: 'back', label: '牌背 (back.svg)' },
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setFilterCat(cat.id as typeof filterCat)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                filterCat === cat.id
                  ? 'bg-cyan-600 text-white font-bold'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of All 35 SVG Tiles with Specifications */}
      <div className="space-y-3">
        <div className="flex justify-between items-center text-xs text-slate-400">
          <span>文件规格对照表 (将你的 SVG 按下方标准文件名命名即可):</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-2.5">
          {filteredTiles.map(tile => {
            const hasCustom = Boolean(customSvgMap[tile.code]);
            const svgSrc = customSvgMap[tile.code];

            return (
              <div
                key={tile.code}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-between text-center transition-all ${
                  hasCustom
                    ? 'bg-emerald-950/40 border-emerald-500/60 shadow-xs'
                    : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* SVG Image Preview or Placeholder */}
                <div className="w-12 h-16 bg-white/95 rounded-md border border-slate-200 flex items-center justify-center p-1 shadow-sm mb-2 relative overflow-hidden">
                  {hasCustom ? (
                    <img
                      src={svgSrc}
                      alt={tile.name}
                      className="w-full h-full object-contain"
                    />
                  ) : tile.code === 'back' ? (
                    <div className="w-full h-full bg-emerald-800 rounded flex items-center justify-center text-xs text-emerald-200 font-bold">
                      背
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center">
                      <span className="text-[9px] text-slate-400 font-mono">{tile.code}</span>
                      <span className="text-base font-black text-slate-800 leading-none mt-1">
                        {tile.name}
                      </span>
                    </div>
                  )}

                  {hasCustom && (
                    <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
                  )}
                </div>

                {/* Name & Required File Name */}
                <div className="w-full">
                  <div className="font-bold text-xs text-slate-200 truncate">
                    {tile.name}
                  </div>
                  <div className="font-mono text-[11px] text-cyan-400 bg-slate-950/80 px-1 py-0.5 rounded border border-slate-800 mt-1 select-all font-semibold">
                    {tile.filename}
                  </div>
                </div>

                <div className="mt-1.5 text-[10px]">
                  {hasCustom ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                      <CheckCircle2 className="w-3 h-3" /> 已替换
                    </span>
                  ) : (
                    <span className="text-slate-500">内置矢量</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Git Push Cheat Sheet for SVG Assets */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex justify-between items-center">
          <h4 className="text-xs sm:text-sm font-bold text-slate-200 flex items-center gap-2">
            <FileCode className="w-4 h-4 text-cyan-400" />
            在 GitHub 仓库中提交你的 SVG 图片步骤
          </h4>
          <button
            onClick={() =>
              handleCopy(
                `cp /path/to/your/svgs/*.svg go-mahjong/web/static/tiles/\ngit add web/static/tiles/*.svg\ngit commit -m "feat: 添加自定义 SVG 麻将牌素材"\ngit push origin main`,
                true
              )
            }
            className="flex items-center gap-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded transition-colors font-mono cursor-pointer"
          >
            {copiedGit ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">已复制</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>复制 Git 命令</span>
              </>
            )}
          </button>
        </div>

        <div className="bg-[#0d1117] p-3 rounded-lg border border-slate-800 font-mono text-xs text-emerald-400 overflow-x-auto whitespace-pre">
{`# 1. 将你的 SVG 图片放入项目目录
cp /path/to/your/svgs/*.svg go-mahjong/web/static/tiles/

# 2. 提交到 Git 仓库
git add web/static/tiles/*.svg
git commit -m "feat: 添加自定义 SVG 麻将牌素材"

# 3. 推送到 GitHub
git push origin main`}
        </div>
      </div>
    </div>
  );
};

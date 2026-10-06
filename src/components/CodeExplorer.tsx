import React, { useState } from 'react';
import JSZip from 'jszip';
import { GO_PROJECT_FILES, ProjectFile } from '../data/goCodeFiles';
import {
  FolderGit2,
  Download,
  Copy,
  Check,
  FileCode2,
  FileText,
  Terminal,
  Settings,
  Github,
  CheckCircle2,
  ExternalLink,
  Code2,
} from 'lucide-react';

export const CodeExplorer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<ProjectFile>(GO_PROJECT_FILES[1]); // main.go default
  const [copied, setCopied] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [githubUser, setGithubUser] = useState('zxv9526');
  const [githubRepo, setGithubRepo] = useState('termux-mahjong');
  const [copiedGitCmd, setCopiedGitCmd] = useState<string | null>(null);

  // Copy current file code
  const handleCopyFile = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 1-Click ZIP Download
  const handleDownloadZip = async () => {
    try {
      setIsZipping(true);
      const zip = new JSZip();
      const rootFolder = zip.folder(githubRepo || 'termux-mahjong')!;

      GO_PROJECT_FILES.forEach(file => {
        rootFolder.file(file.path, file.content);
      });

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${githubRepo || 'termux-mahjong'}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to create ZIP', err);
    } finally {
      setIsZipping(false);
    }
  };

  const copySnippet = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedGitCmd(id);
    setTimeout(() => setCopiedGitCmd(null), 2000);
  };

  const getFileIcon = (category: ProjectFile['category']) => {
    switch (category) {
      case 'go':
        return <FileCode2 className="w-4 h-4 text-cyan-400" />;
      case 'script':
        return <Terminal className="w-4 h-4 text-emerald-400" />;
      case 'docs':
        return <FileText className="w-4 h-4 text-blue-400" />;
      case 'config':
        return <Settings className="w-4 h-4 text-amber-400" />;
    }
  };

  const gitPushScript = `# 1. 进入下载解压后的代码目录 (或本地目录)
cd ${githubRepo}

# 2. 初始化 Git 仓库
git init

# 3. 添加所有文件并提交
git add .
git commit -m "feat: 初次提交 Go 麻将游戏源码"

# 4. 关联 GitHub 远程仓库并推送到 main 分支
git branch -M main
git remote add origin https://github.com/${githubUser}/${githubRepo}.git
git push -u origin main`;

  const termuxPullScript = `# 1. 在 Termux 中一键克隆你的仓库
git clone https://github.com/${githubUser}/${githubRepo}.git
cd ${githubRepo}

# 2. 赋予脚本执行权限并全自动部署
chmod +x termux_setup.sh
./termux_setup.sh

# 3. 运行麻将游戏！
mahjong`;

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
      {/* Top Banner & Quick Actions */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FolderGit2 className="w-5 h-5 text-cyan-400" />
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              Go 源码工程目录树
              <span className="text-[11px] bg-cyan-950 text-cyan-400 border border-cyan-800 px-2 py-0.5 rounded-full font-mono">
                {GO_PROJECT_FILES.length} 个核心文件
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              包含完整算法引擎、TUI终端渲染、内嵌HTTP移动网页服务与自动化脚本
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadZip}
            disabled={isZipping}
            className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs px-3.5 py-2 rounded-lg shadow-lg shadow-cyan-600/30 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            {isZipping ? '打包中...' : '一键下载完整源码 ZIP'}
          </button>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Sidebar: File Tree */}
        <div className="w-full md:w-64 bg-slate-900/60 border-r border-slate-800 flex flex-col flex-shrink-0 overflow-y-auto">
          <div className="p-3 border-b border-slate-800/80 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            工程结构 (go-mahjong)
          </div>
          <div className="p-2 space-y-1">
            {GO_PROJECT_FILES.map(file => {
              const isActive = selectedFile.path === file.path;
              return (
                <button
                  key={file.path}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-mono transition-all text-left ${
                    isActive
                      ? 'bg-cyan-950/80 text-cyan-300 font-bold border border-cyan-700/60 shadow-xs'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {getFileIcon(file.category)}
                  <span className="truncate flex-1">{file.path}</span>
                </button>
              );
            })}
          </div>

          {/* GitHub Config Section in Sidebar */}
          <div className="mt-auto p-3 border-t border-slate-800 bg-slate-950/50">
            <div className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5 mb-2">
              <Github className="w-3.5 h-3.5 text-slate-400" />
              配置你的 GitHub 仓库信息
            </div>
            <div className="space-y-1.5 text-xs">
              <div>
                <label className="text-[10px] text-slate-400">GitHub 用户名:</label>
                <input
                  type="text"
                  value={githubUser}
                  onChange={e => setGithubUser(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-xs focus:outline-cyan-500"
                  placeholder="用户名"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400">仓库名称:</label>
                <input
                  type="text"
                  value={githubRepo}
                  onChange={e => setGithubRepo(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-xs focus:outline-cyan-500"
                  placeholder="仓库名"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Content: Code Viewer & GitHub Steps */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
          {/* File Header Bar */}
          <div className="bg-slate-900/80 px-4 py-2 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-cyan-400" />
              <span className="font-mono text-xs font-bold text-slate-200">
                {selectedFile.path}
              </span>
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                ({selectedFile.description})
              </span>
            </div>

            <button
              onClick={handleCopyFile}
              className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-2.5 py-1 rounded transition-colors font-mono"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">已复制</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>复制代码</span>
                </>
              )}
            </button>
          </div>

          {/* Syntax Code Display */}
          <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed bg-[#0d1117] text-slate-200">
            <pre className="overflow-x-auto whitespace-pre">
              <code>{selectedFile.content}</code>
            </pre>
          </div>

          {/* Bottom Accordion: Git Push & Termux Pull Instant Commands */}
          <div className="bg-slate-900 border-t border-slate-800 p-3 sm:p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <Github className="w-4 h-4 text-white" />
                推送到 GitHub 仓库与 Termux 部署命令 (根据上方用户名实时生成)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Step 1: Git Push */}
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 relative group">
                <div className="flex justify-between items-center text-[11px] text-slate-400 mb-1 font-bold">
                  <span>① 本地提交并推送到 GitHub:</span>
                  <button
                    onClick={() => copySnippet(gitPushScript, 'push')}
                    className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-mono text-[10px]"
                  >
                    {copiedGitCmd === 'push' ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    复制命令
                  </button>
                </div>
                <pre className="text-[11px] text-emerald-400 font-mono overflow-x-auto whitespace-pre p-1 bg-slate-900/60 rounded">
                  {gitPushScript}
                </pre>
              </div>

              {/* Step 2: Termux Clone */}
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 relative group">
                <div className="flex justify-between items-center text-[11px] text-slate-400 mb-1 font-bold">
                  <span>② 在手机 Termux 中克隆并开玩:</span>
                  <button
                    onClick={() => copySnippet(termuxPullScript, 'pull')}
                    className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-mono text-[10px]"
                  >
                    {copiedGitCmd === 'pull' ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    复制命令
                  </button>
                </div>
                <pre className="text-[11px] text-cyan-400 font-mono overflow-x-auto whitespace-pre p-1 bg-slate-900/60 rounded">
                  {termuxPullScript}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

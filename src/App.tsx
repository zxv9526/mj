/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Navbar, ActiveTab } from './components/Navbar';
import { LobbyView } from './components/LobbyView';
import { VisualBoard } from './components/VisualBoard';
import { SvgManager } from './components/SvgManager';
import { CloudflareTunnelGuide } from './components/CloudflareTunnelGuide';
import { CodeExplorer } from './components/CodeExplorer';
import { TermuxGuide } from './components/TermuxGuide';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('lobby');
  const [customSvgMap, setCustomSvgMap] = useState<Record<string, string>>({});

  const uploadedSvgCount = Object.keys(customSvgMap).length;

  const handleStartGameFromLobby = (_rule: 'GB' | 'SICHUAN', _roomName: string) => {
    setActiveTab('visual');
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Header Navigation */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        uploadedSvgCount={uploadedSvgCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 p-2 sm:p-4 overflow-hidden">
        {activeTab === 'lobby' && (
          <LobbyView
            onStartGame={handleStartGameFromLobby}
            onNavigateTab={setActiveTab}
            uploadedSvgCount={uploadedSvgCount}
          />
        )}
        {activeTab === 'visual' && (
          <VisualBoard
            customSvgMap={customSvgMap}
            onBackToLobby={() => setActiveTab('lobby')}
          />
        )}
        {activeTab === 'svg' && (
          <SvgManager
            customSvgMap={customSvgMap}
            onSvgUploaded={setCustomSvgMap}
          />
        )}
        {activeTab === 'tunnel' && <CloudflareTunnelGuide />}
        {activeTab === 'code' && <CodeExplorer />}
        {activeTab === 'guide' && <TermuxGuide />}
      </main>
    </div>
  );
}

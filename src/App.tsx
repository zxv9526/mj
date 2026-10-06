/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Navbar, ActiveTab } from './components/Navbar';
import { VisualBoard } from './components/VisualBoard';
import { TerminalSim } from './components/TerminalSim';
import { CodeExplorer } from './components/CodeExplorer';
import { TermuxGuide } from './components/TermuxGuide';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('visual');

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Header Navigation */}
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content Area */}
      <main className="flex-1 p-2 sm:p-4 overflow-hidden">
        {activeTab === 'visual' && <VisualBoard />}
        {activeTab === 'terminal' && <TerminalSim />}
        {activeTab === 'code' && <CodeExplorer />}
        {activeTab === 'guide' && <TermuxGuide />}
      </main>
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { StudioViewMode } from './types';
import { FigmaTopBar } from './components/figma/FigmaTopBar';
import { FigmaCanvas } from './components/figma/FigmaCanvas';
import { ChurchSystemApp } from './components/church/ChurchSystemApp';
import { DesignSystemView } from './components/figma/DesignSystemView';
import { InspectDevMode } from './components/figma/InspectDevMode';
import { INITIAL_COMMENTS } from './data/mockData';

export default function App() {
  const [viewMode, setViewMode] = useState<StudioViewMode>('prototype');
  const [zoom, setZoom] = useState<number>(75);
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [isCommenting, setIsCommenting] = useState<boolean>(false);
  const [commentCount, setCommentCount] = useState<number>(INITIAL_COMMENTS.length);

  return (
    <div className="w-screen h-screen flex flex-col bg-[#141414] overflow-hidden text-slate-100 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Figma Toolbar & Mode Selector */}
      <FigmaTopBar
        viewMode={viewMode}
        onSetViewMode={setViewMode}
        zoom={zoom}
        onZoomChange={setZoom}
        showGrid={showGrid}
        onToggleGrid={() => setShowGrid(!showGrid)}
        commentCount={commentCount}
        isCommenting={isCommenting}
        onToggleCommenting={() => setIsCommenting(!isCommenting)}
      />

      {/* Main Workspace Area */}
      <main className="flex-1 w-full h-[calc(100vh-3rem)] overflow-hidden relative">
        {viewMode === 'figma-canvas' && (
          <FigmaCanvas
            zoom={zoom}
            showGrid={showGrid}
            isCommenting={isCommenting}
            onCommentsChange={setCommentCount}
          />
        )}

        {viewMode === 'prototype' && (
          <div className="w-full h-full">
            <ChurchSystemApp />
          </div>
        )}

        {viewMode === 'design-system' && (
          <DesignSystemView />
        )}

        {viewMode === 'inspect-mode' && (
          <InspectDevMode />
        )}
      </main>
    </div>
  );
}


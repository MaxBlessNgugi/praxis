import React from 'react';
import { 
  Play, 
  Layout, 
  Palette, 
  Code2, 
  Grid3X3, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  MessageSquare, 
  Share2, 
  Sliders, 
  Eye, 
  Layers,
  ChevronDown
} from 'lucide-react';
import { StudioViewMode } from '../../types';

interface FigmaTopBarProps {
  viewMode: StudioViewMode;
  onSetViewMode: (mode: StudioViewMode) => void;
  zoom: number;
  onZoomChange: (z: number) => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  commentCount: number;
  isCommenting: boolean;
  onToggleCommenting: () => void;
}

export const FigmaTopBar: React.FC<FigmaTopBarProps> = ({
  viewMode,
  onSetViewMode,
  zoom,
  onZoomChange,
  showGrid,
  onToggleGrid,
  commentCount,
  isCommenting,
  onToggleCommenting,
}) => {
  return (
    <header 
      id="figma-studio-header"
      className="h-12 bg-[#1e1e1e] border-b border-[#2c2c2c] px-3 flex items-center justify-between select-none z-50 text-slate-300 text-xs shadow-md"
    >
      {/* Left: Figma Brand & File Title */}
      <div className="flex items-center gap-3">
        {/* Figma Colorful Icon Mark */}
        <div className="flex items-center gap-1.5 px-1.5 py-1 rounded bg-[#2c2c2c] text-white hover:bg-[#383838] transition-colors cursor-pointer">
          <div className="grid grid-cols-2 gap-0.5 w-4 h-5">
            <span className="w-1.5 h-1.5 rounded-l-full bg-[#F24E1E]"></span>
            <span className="w-1.5 h-1.5 rounded-r-full bg-[#FF7262]"></span>
            <span className="w-1.5 h-1.5 rounded-l-full bg-[#A259FF]"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#1ABCFE]"></span>
            <span className="w-1.5 h-1.5 rounded-l-full bg-[#0ACF83]"></span>
          </div>
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </div>

        <div className="flex items-center gap-2">
          <span className="font-semibold text-white tracking-tight text-xs sm:text-sm">
            Praxis Church OS
          </span>
          <span className="text-[10px] font-mono text-[#fe932c] bg-[#fe932c]/10 border border-[#fe932c]/30 px-1.5 py-0.5 rounded">
            Members Register & Sacraments v3.4
          </span>
        </div>
      </div>

      {/* Center: View Mode Switcher Pills */}
      <div className="flex items-center gap-1 bg-[#141414] p-1 rounded-lg border border-[#2c2c2c]">
        <button
          id="mode-figma-canvas"
          onClick={() => onSetViewMode('figma-canvas')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
            viewMode === 'figma-canvas'
              ? 'bg-[#2c2c2c] text-white shadow-sm font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#202020]'
          }`}
        >
          <Layout className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden sm:inline">Figma Canvas & Artboards</span>
          <span className="sm:hidden">Canvas</span>
        </button>

        <button
          id="mode-prototype"
          onClick={() => onSetViewMode('prototype')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
            viewMode === 'prototype'
              ? 'bg-[#0ACF83] text-slate-950 shadow-sm font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#202020]'
          }`}
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span className="hidden sm:inline">Live App Prototype</span>
          <span className="sm:hidden">Live</span>
        </button>

        <button
          id="mode-design-system"
          onClick={() => onSetViewMode('design-system')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
            viewMode === 'design-system'
              ? 'bg-[#2c2c2c] text-white shadow-sm font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#202020]'
          }`}
        >
          <Palette className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Design Tokens & Specs</span>
          <span className="sm:hidden">Tokens</span>
        </button>

        <button
          id="mode-inspect"
          onClick={() => onSetViewMode('inspect-mode')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
            viewMode === 'inspect-mode'
              ? 'bg-[#2c2c2c] text-emerald-400 shadow-sm font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#202020]'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Dev Mode & Code</span>
          <span className="sm:hidden">Dev</span>
        </button>
      </div>

      {/* Right: Canvas Controls, Grid, Zoom, Comments */}
      <div className="flex items-center gap-2">
        {/* Toggle 8px grid */}
        <button
          onClick={onToggleGrid}
          title={showGrid ? 'Hide 8px layout grid' : 'Show 8px layout grid'}
          className={`p-1.5 rounded hover:bg-[#2c2c2c] transition-colors cursor-pointer ${
            showGrid ? 'text-indigo-400 bg-[#2c2c2c]' : 'text-slate-400'
          }`}
        >
          <Grid3X3 className="w-3.5 h-3.5" />
        </button>

        {/* Toggle Comment Pinning */}
        <button
          onClick={onToggleCommenting}
          title={isCommenting ? 'Exit comment mode' : 'Add comment pin on canvas'}
          className={`flex items-center gap-1 px-2 py-1 rounded hover:bg-[#2c2c2c] transition-colors cursor-pointer ${
            isCommenting ? 'text-amber-400 bg-[#2c2c2c]' : 'text-slate-400'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span className="text-[10px] font-mono">{commentCount}</span>
        </button>

        {/* Zoom Controls */}
        <div className="hidden md:flex items-center gap-1 bg-[#141414] px-1 py-0.5 rounded border border-[#2c2c2c]">
          <button
            onClick={() => onZoomChange(Math.max(25, zoom - 15))}
            className="p-1 hover:text-white text-slate-400 cursor-pointer"
            title="Zoom out"
          >
            <ZoomOut className="w-3 h-3" />
          </button>
          <span className="font-mono text-[11px] text-slate-300 w-10 text-center">{zoom}%</span>
          <button
            onClick={() => onZoomChange(Math.min(150, zoom + 15))}
            className="p-1 hover:text-white text-slate-400 cursor-pointer"
            title="Zoom in"
          >
            <ZoomIn className="w-3 h-3" />
          </button>
        </div>

        {/* 100% Reset */}
        <button
          onClick={() => onZoomChange(100)}
          className="hidden lg:inline-block text-[11px] text-slate-400 hover:text-white px-2 py-1 rounded bg-[#2c2c2c] cursor-pointer"
        >
          Reset 100%
        </button>
      </div>
    </header>
  );
};

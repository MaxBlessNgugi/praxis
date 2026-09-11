import React, { useState } from 'react';
import { 
  Monitor, 
  Tablet, 
  Smartphone, 
  MessageSquare, 
  Check, 
  Send, 
  X,
  Layers,
  Sparkles,
  Maximize2
} from 'lucide-react';
import { ChurchSystemApp } from '../church/ChurchSystemApp';
import { MembersSubTab, CanvasComment } from '../../types';

interface FigmaCanvasProps {
  zoom: number;
  showGrid: boolean;
  isCommenting: boolean;
  onCommentsChange?: (count: number) => void;
}

const INITIAL_CHURCH_COMMENTS: CanvasComment[] = [
  {
    id: 'comm-1',
    x: 420,
    y: 110,
    frame: 'Desktop 1: Find Christian',
    author: 'Elder Carolyn Wright',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    text: 'The 4 top metric cards clearly separate Communicants from Inquirers and Youth. Matches Session 2024 reporting criteria.',
    time: '2h ago',
    resolved: false,
  },
  {
    id: 'comm-2',
    x: 1850,
    y: 130,
    frame: 'Desktop 2: Add Christian',
    author: 'Pastor Michael Vance',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    text: 'The 3-column intake layout lets the parish secretary register personal identity, household linkage, and signed covenant vows without multi-screen pagination.',
    time: '4h ago',
    resolved: false,
  },
  {
    id: 'comm-3',
    x: 3280,
    y: 160,
    frame: 'Desktop 3: Delete Christian',
    author: 'Diocesan Chancellor',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    text: 'Canon 4.12 strict guard requires the 30-day soft-delete grace vault before permanent purge. One-click restore button works great.',
    time: '1d ago',
    resolved: true,
  },
  {
    id: 'comm-4',
    x: 4700,
    y: 120,
    frame: 'Desktop 5: Ministries Chartering',
    author: 'Deaconess Clara Oswald',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    text: 'Departmental chartering cards show verified session sanction status, active leadership terms, and volunteer swap workflows.',
    time: '30m ago',
    resolved: false,
  },
  {
    id: 'comm-5',
    x: 6150,
    y: 140,
    frame: 'Desktop 6: Giving & Stewardship',
    author: 'Treasurer Arthur Miller',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    text: 'Sunday plate count dual-custody verification with tamper bag seals satisfies diocesan audit mandates. Capital campaign and deacon alms panels look great.',
    time: '15m ago',
    resolved: false,
  },
  {
    id: 'comm-6',
    x: 7600,
    y: 130,
    frame: 'Desktop 7: Reports & Certificates',
    author: 'Clerk Eleanor Campbell',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    text: 'Watermarked baptism and wedding certificate generator with canonical registry ledger numbers is flawless. Instant PDF print preview works with ecclesiastical signatures.',
    time: '10m ago',
    resolved: false,
  },
  {
    id: 'comm-7',
    x: 9050,
    y: 120,
    frame: 'Desktop 8: Governance & Sessions',
    author: 'Elder Marcus Brody',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    text: 'Quorum tracking, session resolutions voting bar, and the canonic bylaws repository make council governance seamless and audit-ready.',
    time: '8m ago',
    resolved: false,
  },
  {
    id: 'comm-8',
    x: 10500,
    y: 140,
    frame: 'Desktop 9: Admin & Security',
    author: 'Security Officer Tyler Reed',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    text: '8-role permission matrix, 30-day dual-key soft delete vault, and read-only cryptographic financial audit log guarantee presbytery compliance.',
    time: '5m ago',
    resolved: false,
  },
];

export const FigmaCanvas: React.FC<FigmaCanvasProps> = ({
  zoom,
  showGrid,
  isCommenting,
  onCommentsChange,
}) => {
  const [comments, setComments] = useState<CanvasComment[]>(INITIAL_CHURCH_COMMENTS);
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);
  const [newCommentCoords, setNewCommentCoords] = useState<{ x: number; y: number } | null>(null);
  const [newCommentText, setNewCommentText] = useState('');
  const [activeBoardFilter, setActiveBoardFilter] = useState<'all' | MembersSubTab | 'ministries' | 'finances' | 'reports-certs' | 'governance' | 'admin-portal'>('all');
  const [selectedBoard, setSelectedBoard] = useState<string>('board-find');

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isCommenting) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left) / (zoom / 100));
    const y = Math.round((e.clientY - rect.top) / (zoom / 100));
    setNewCommentCoords({ x, y });
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !newCommentCoords) return;

    const newComment: CanvasComment = {
      id: `comm-${Date.now()}`,
      x: newCommentCoords.x,
      y: newCommentCoords.y,
      frame: 'Artboard',
      author: 'Rev. Reviewer (You)',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      text: newCommentText.trim(),
      time: 'Just now',
      resolved: false,
    };

    const updated = [...comments, newComment];
    setComments(updated);
    if (onCommentsChange) onCommentsChange(updated.length);
    setNewCommentText('');
    setNewCommentCoords(null);
  };

  const handleToggleResolve = (id: string) => {
    setComments(
      comments.map((c) => (c.id === id ? { ...c, resolved: !c.resolved } : c))
    );
  };

  return (
    <div 
      id="figma-canvas-viewport"
      className="relative w-full h-[calc(100vh-3rem)] overflow-auto bg-[#181615] select-none cursor-default"
      onClick={handleCanvasClick}
    >
      {/* 8px Layout Grid Overlay */}
      {showGrid && (
        <div 
          className="absolute inset-0 pointer-events-none z-10 opacity-25"
          style={{
            backgroundImage: `radial-gradient(#fe932c 1px, transparent 1px)`,
            backgroundSize: `${8 * (zoom / 100)}px ${8 * (zoom / 100)}px`,
          }}
        />
      )}

      {/* Floating Canvas Sub-navigation / Artboard Filter */}
      <div className="fixed top-14 left-1/2 -translate-x-1/2 z-30 bg-[#262320]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#3e3934] shadow-2xl flex items-center gap-1.5 text-xs">
        <span className="text-[#a69c96] font-mono text-[11px] mr-1 hidden md:inline">Artboard:</span>
        <button
          onClick={() => setActiveBoardFilter('all')}
          className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
            activeBoardFilter === 'all'
              ? 'bg-[#9b2f00] text-white shadow-sm font-bold'
              : 'text-[#c7bbb5] hover:text-white hover:bg-[#332f2b]'
          }`}
        >
          All 10 Screens Side-by-Side
        </button>
        <button
          onClick={() => setActiveBoardFilter('home-dashboard')}
          className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
            activeBoardFilter === 'home-dashboard'
              ? 'bg-[#9b2f00] text-white shadow-sm font-bold'
              : 'text-[#c7bbb5] hover:text-white hover:bg-[#332f2b]'
          }`}
        >
          0. Home Dashboard
        </button>
        <button
          onClick={() => setActiveBoardFilter('find-christian')}
          className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
            activeBoardFilter === 'find-christian'
              ? 'bg-[#9b2f00] text-white shadow-sm font-bold'
              : 'text-[#c7bbb5] hover:text-white hover:bg-[#332f2b]'
          }`}
        >
          1. Find Christian
        </button>
        <button
          onClick={() => setActiveBoardFilter('add-new-christian')}
          className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
            activeBoardFilter === 'add-new-christian'
              ? 'bg-[#9b2f00] text-white shadow-sm font-bold'
              : 'text-[#c7bbb5] hover:text-white hover:bg-[#332f2b]'
          }`}
        >
          2. Add Christian
        </button>
        <button
          onClick={() => setActiveBoardFilter('delete-christian')}
          className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
            activeBoardFilter === 'delete-christian'
              ? 'bg-[#9b2f00] text-white shadow-sm font-bold'
              : 'text-[#c7bbb5] hover:text-white hover:bg-[#332f2b]'
          }`}
        >
          3. Delete Christian
        </button>
        <button
          onClick={() => setActiveBoardFilter('family-unit')}
          className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
            activeBoardFilter === 'family-unit'
              ? 'bg-[#9b2f00] text-white shadow-sm font-bold'
              : 'text-[#c7bbb5] hover:text-white hover:bg-[#332f2b]'
          }`}
        >
          4. Family Unit
        </button>
        <button
          onClick={() => setActiveBoardFilter('ministries')}
          className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
            activeBoardFilter === 'ministries'
              ? 'bg-[#9b2f00] text-white shadow-sm font-bold'
              : 'text-[#c7bbb5] hover:text-white hover:bg-[#332f2b]'
          }`}
        >
          5. Ministries & Groups
        </button>
        <button
          onClick={() => setActiveBoardFilter('finances')}
          className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
            activeBoardFilter === 'finances'
              ? 'bg-[#9b2f00] text-white shadow-sm font-bold'
              : 'text-[#c7bbb5] hover:text-white hover:bg-[#332f2b]'
          }`}
        >
          6. Giving & Stewardship
        </button>
        <button
          onClick={() => setActiveBoardFilter('reports-certs')}
          className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
            activeBoardFilter === 'reports-certs'
              ? 'bg-[#9b2f00] text-white shadow-sm font-bold'
              : 'text-[#c7bbb5] hover:text-white hover:bg-[#332f2b]'
          }`}
        >
          7. Reports & Certs
        </button>
        <button
          onClick={() => setActiveBoardFilter('governance')}
          className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
            activeBoardFilter === 'governance'
              ? 'bg-[#9b2f00] text-white shadow-sm font-bold'
              : 'text-[#c7bbb5] hover:text-white hover:bg-[#332f2b]'
          }`}
        >
          8. Governance
        </button>
        <button
          onClick={() => setActiveBoardFilter('admin-portal')}
          className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
            activeBoardFilter === 'admin-portal'
              ? 'bg-[#9b2f00] text-white shadow-sm font-bold'
              : 'text-[#c7bbb5] hover:text-white hover:bg-[#332f2b]'
          }`}
        >
          9. Admin & Security
        </button>
      </div>

      {/* Rulers / Canvas Scale Wrapper */}
      <div 
        className="min-w-[17000px] min-h-[2600px] p-16 pt-24 transition-transform duration-100 origin-top-left flex gap-20 items-start"
        style={{
          transform: `scale(${zoom / 100})`,
        }}
      >
        {/* ARTBOARD 0: Home Panel / Cloud Dashboard (1440 x 900) */}
        {(activeBoardFilter === 'all' || activeBoardFilter === 'home-dashboard') && (
          <div 
            className="flex flex-col gap-3 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedBoard('board-home');
            }}
          >
            <div className="flex items-center justify-between text-stone-400 text-xs px-1">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-[#c2410c]" />
                <span className="font-semibold text-stone-200">Screen 0: Home Panel · Cloud Dashboard</span>
                <span className="font-mono text-[10px] text-stone-500">1440 × 900</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#2c1d18] text-[#ff8c42] border border-[#c2410c]/40">
                Live Cloud Synced & Sticky Quick Actions
              </span>
            </div>

            <div 
              id="artboard-home-dashboard"
              className={`w-[1440px] h-[900px] rounded-xl overflow-hidden border shadow-2xl bg-[#fff8f5] relative ${
                selectedBoard === 'board-home'
                  ? 'border-[#9b2f00] ring-4 ring-[#9b2f00]/30'
                  : 'border-[#38332f]'
              }`}
            >
              <ChurchSystemApp initialTab="home" />
            </div>
          </div>
        )}

        {/* ARTBOARD 1: Find Christian (1440 x 900) */}
        {(activeBoardFilter === 'all' || activeBoardFilter === 'find-christian') && (
          <div 
            className="flex flex-col gap-3 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedBoard('board-find');
            }}
          >
            <div className="flex items-center justify-between text-stone-400 text-xs px-1">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-[#fe932c]" />
                <span className="font-semibold text-stone-200">Screen 1: Find Christian · Parish Roll Census</span>
                <span className="font-mono text-[10px] text-stone-500">1440 × 900</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#2c2825] text-[#fe932c] border border-[#fe932c]/30">
                Active Mockup · Warm Ember
              </span>
            </div>

            <div 
              id="artboard-find-christian"
              className={`w-[1440px] h-[900px] rounded-xl overflow-hidden border shadow-2xl bg-[#fff8f5] relative ${
                selectedBoard === 'board-find'
                  ? 'border-[#9b2f00] ring-4 ring-[#9b2f00]/30'
                  : 'border-[#38332f]'
              }`}
            >
              <ChurchSystemApp initialSubTab="find-christian" />
            </div>
          </div>
        )}

        {/* ARTBOARD 2: Add New Christian (1440 x 900) */}
        {(activeBoardFilter === 'all' || activeBoardFilter === 'add-new-christian') && (
          <div 
            className="flex flex-col gap-3 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedBoard('board-add');
            }}
          >
            <div className="flex items-center justify-between text-stone-400 text-xs px-1">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-[#fe932c]" />
                <span className="font-semibold text-stone-200">Screen 2: Add New Christian · Sacramental Intake</span>
                <span className="font-mono text-[10px] text-stone-500">1440 × 900</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#2c2825] text-stone-300">
                3-Column Form Architecture
              </span>
            </div>

            <div 
              id="artboard-add-christian"
              className={`w-[1440px] h-[900px] rounded-xl overflow-hidden border shadow-2xl bg-[#fff8f5] relative ${
                selectedBoard === 'board-add'
                  ? 'border-[#9b2f00] ring-4 ring-[#9b2f00]/30'
                  : 'border-[#38332f]'
              }`}
            >
              <ChurchSystemApp initialSubTab="add-new-christian" />
            </div>
          </div>
        )}

        {/* ARTBOARD 3: Delete Christian (1440 x 900) */}
        {(activeBoardFilter === 'all' || activeBoardFilter === 'delete-christian') && (
          <div 
            className="flex flex-col gap-3 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedBoard('board-delete');
            }}
          >
            <div className="flex items-center justify-between text-stone-400 text-xs px-1">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-[#ba1a1a]" />
                <span className="font-semibold text-stone-200">Screen 3: Delete Christian · 30-Day Canonical Vault</span>
                <span className="font-mono text-[10px] text-stone-500">1440 × 900</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#351515] text-[#ffdad6] border border-[#ba1a1a]/40">
                Canon 4.12 Retention Guard
              </span>
            </div>

            <div 
              id="artboard-delete-christian"
              className={`w-[1440px] h-[900px] rounded-xl overflow-hidden border shadow-2xl bg-[#fff8f5] relative ${
                selectedBoard === 'board-delete'
                  ? 'border-[#9b2f00] ring-4 ring-[#9b2f00]/30'
                  : 'border-[#38332f]'
              }`}
            >
              <ChurchSystemApp initialSubTab="delete-christian" />
            </div>
          </div>
        )}

        {/* ARTBOARD 4: Family Unit (1440 x 900) */}
        {(activeBoardFilter === 'all' || activeBoardFilter === 'family-unit') && (
          <div 
            className="flex flex-col gap-3 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedBoard('board-family');
            }}
          >
            <div className="flex items-center justify-between text-stone-400 text-xs px-1">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-[#006243]" />
                <span className="font-semibold text-stone-200">Screen 4: Family Unit · Household & Dependents Registry</span>
                <span className="font-mono text-[10px] text-stone-500">1440 × 900</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#102920] text-[#85f8c4] border border-[#006243]/40">
                Covenant Households
              </span>
            </div>

            <div 
              id="artboard-family-unit"
              className={`w-[1440px] h-[900px] rounded-xl overflow-hidden border shadow-2xl bg-[#fff8f5] relative ${
                selectedBoard === 'board-family'
                  ? 'border-[#9b2f00] ring-4 ring-[#9b2f00]/30'
                  : 'border-[#38332f]'
              }`}
            >
              <ChurchSystemApp initialSubTab="family-unit" />
            </div>
          </div>
        )}

        {/* ARTBOARD 5: Ministries & Groups (1440 x 900) */}
        {(activeBoardFilter === 'all' || activeBoardFilter === 'ministries') && (
          <div 
            className="flex flex-col gap-3 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedBoard('board-ministries');
            }}
          >
            <div className="flex items-center justify-between text-stone-400 text-xs px-1">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-[#fe932c]" />
                <span className="font-semibold text-stone-200">Screen 5: Ministries & Groups · Departments, Leadership & Volunteers</span>
                <span className="font-mono text-[10px] text-stone-500">1440 × 900</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#2c2825] text-[#fe932c] border border-[#fe932c]/30">
                3 Operational Sub-Panels
              </span>
            </div>

            <div 
              id="artboard-ministries"
              className={`w-[1440px] h-[900px] rounded-xl overflow-hidden border shadow-2xl bg-[#fff8f5] relative ${
                selectedBoard === 'board-ministries'
                  ? 'border-[#9b2f00] ring-4 ring-[#9b2f00]/30'
                  : 'border-[#38332f]'
              }`}
            >
              <ChurchSystemApp initialTab="ministries-groups" />
            </div>
          </div>
        )}

        {/* ARTBOARD 6: Giving & Stewardship (1440 x 900) */}
        {(activeBoardFilter === 'all' || activeBoardFilter === 'finances') && (
          <div 
            className="flex flex-col gap-3 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedBoard('board-finances');
            }}
          >
            <div className="flex items-center justify-between text-stone-400 text-xs px-1">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-[#006243]" />
                <span className="font-semibold text-stone-200">Screen 6: Giving & Stewardship · Tithes, Offerings, Projects & Welfare</span>
                <span className="font-mono text-[10px] text-stone-500">1440 × 900</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#102920] text-[#85f8c4] border border-[#006243]/40">
                5 Treasury Sub-Panels
              </span>
            </div>

            <div 
              id="artboard-finances"
              className={`w-[1440px] h-[900px] rounded-xl overflow-hidden border shadow-2xl bg-[#fff8f5] relative ${
                selectedBoard === 'board-finances'
                  ? 'border-[#9b2f00] ring-4 ring-[#9b2f00]/30'
                  : 'border-[#38332f]'
              }`}
            >
              <ChurchSystemApp initialTab="giving-stewardship" />
            </div>
          </div>
        )}

        {/* ARTBOARD 7: Reports & Certificates (1440 x 900) */}
        {(activeBoardFilter === 'all' || activeBoardFilter === 'reports-certs') && (
          <div 
            className="flex flex-col gap-3 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedBoard('board-reports-certs');
            }}
          >
            <div className="flex items-center justify-between text-stone-400 text-xs px-1">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-[#c2410c]" />
                <span className="font-semibold text-stone-200">Screen 7: Reports & Certificates · Formal Parish Certificates, Financial Reports & AGM Dossier</span>
                <span className="font-mono text-[10px] text-stone-500">1440 × 900</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#2c1d18] text-[#ff8c42] border border-[#c2410c]/40">
                Watermarked PDF & Ledger Sealing
              </span>
            </div>

            <div 
              id="artboard-reports-certs"
              className={`w-[1440px] h-[900px] rounded-xl overflow-hidden border shadow-2xl bg-[#fff8f5] relative ${
                selectedBoard === 'board-reports-certs'
                  ? 'border-[#9b2f00] ring-4 ring-[#9b2f00]/30'
                  : 'border-[#38332f]'
              }`}
            >
              <ChurchSystemApp initialTab="reports-certs" />
            </div>
          </div>
        )}

        {/* ARTBOARD 8: Governance & Sessions (1440 x 900) */}
        {(activeBoardFilter === 'all' || activeBoardFilter === 'governance') && (
          <div 
            className="flex flex-col gap-3 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedBoard('board-governance');
            }}
          >
            <div className="flex items-center justify-between text-stone-400 text-xs px-1">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-[#006243]" />
                <span className="font-semibold text-stone-200">Screen 8: Governance & Sessions · Council Minutes, Legislative Tracker & Canonic Bylaws</span>
                <span className="font-mono text-[10px] text-stone-500">1440 × 900</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#102920] text-[#85f8c4] border border-[#006243]/40">
                Council & Session Docket
              </span>
            </div>

            <div 
              id="artboard-governance"
              className={`w-[1440px] h-[900px] rounded-xl overflow-hidden border shadow-2xl bg-[#fff8f5] relative ${
                selectedBoard === 'board-governance'
                  ? 'border-[#9b2f00] ring-4 ring-[#9b2f00]/30'
                  : 'border-[#38332f]'
              }`}
            >
              <ChurchSystemApp initialTab="governance" />
            </div>
          </div>
        )}

        {/* ARTBOARD 9: Admin & System Security (1440 x 900) */}
        {(activeBoardFilter === 'all' || activeBoardFilter === 'admin-portal') && (
          <div 
            className="flex flex-col gap-3 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedBoard('board-admin-portal');
            }}
          >
            <div className="flex items-center justify-between text-stone-400 text-xs px-1">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-[#904d00]" />
                <span className="font-semibold text-stone-200">Screen 9: Admin & System Security · 8 Roles RBAC Matrix, 30-Day Trash Vault & Finance Audit</span>
                <span className="font-mono text-[10px] text-stone-500">1440 × 900</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#2c2014] text-[#ffdcc3] border border-[#904d00]/40">
                Merkle Hash Verified & MFA
              </span>
            </div>

            <div 
              id="artboard-admin-portal"
              className={`w-[1440px] h-[900px] rounded-xl overflow-hidden border shadow-2xl bg-[#fff8f5] relative ${
                selectedBoard === 'board-admin-portal'
                  ? 'border-[#9b2f00] ring-4 ring-[#9b2f00]/30'
                  : 'border-[#38332f]'
              }`}
            >
              <ChurchSystemApp initialTab="admin-portal" />
            </div>
          </div>
        )}

        {/* ARTBOARD 5: Tablet Frame (834 x 1194 iPad Pro) */}
        {activeBoardFilter === 'all' && (
          <div className="flex flex-col gap-3 shrink-0">
            <div className="flex items-center justify-between text-stone-400 text-xs px-1">
              <div className="flex items-center gap-2">
                <Tablet className="w-4 h-4 text-[#fe932c]" />
                <span className="font-semibold text-stone-200">Tablet Frame: iPad Pro</span>
                <span className="font-mono text-[10px] text-stone-500">834 × 1194</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#2c2825] text-stone-400">
                Touch Responsive
              </span>
            </div>

            <div 
              id="artboard-tablet"
              className="w-[834px] h-[1194px] rounded-2xl overflow-hidden border border-[#38332f] shadow-2xl bg-[#fff8f5] relative"
            >
              <ChurchSystemApp initialSubTab="find-christian" compactMode />
            </div>
          </div>
        )}

        {/* ARTBOARD 6: Mobile Frame (390 x 844 iPhone 15) */}
        {activeBoardFilter === 'all' && (
          <div className="flex flex-col gap-3 shrink-0">
            <div className="flex items-center justify-between text-stone-400 text-xs px-1">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#fe932c]" />
                <span className="font-semibold text-stone-200">Mobile Frame: iPhone 15</span>
                <span className="font-mono text-[10px] text-stone-500">390 × 844</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#2c2825] text-stone-400">
                Pastor On-The-Go
              </span>
            </div>

            <div 
              id="artboard-mobile"
              className="w-[390px] h-[844px] rounded-3xl overflow-hidden border-4 border-stone-800 shadow-2xl bg-[#fff8f5] relative"
            >
              {/* Dynamic Island */}
              <div className="h-6 bg-stone-950 flex items-center justify-center">
                <div className="w-20 h-3 bg-black rounded-full"></div>
              </div>
              <div className="h-[calc(844px-24px)] overflow-y-auto">
                <ChurchSystemApp initialSubTab="find-christian" compactMode />
              </div>
            </div>
          </div>
        )}

        {/* Canvas Comments Pins */}
        {comments.map((comment) => (
          <div
            key={comment.id}
            style={{ left: `${comment.x}px`, top: `${comment.y}px` }}
            className="absolute z-40"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedCommentId(selectedCommentId === comment.id ? null : comment.id);
            }}
          >
            {/* Comment Pin Badge */}
            <div 
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-xl cursor-pointer border-2 transition-transform hover:scale-110 ${
                comment.resolved
                  ? 'bg-stone-700 border-stone-500 text-stone-300'
                  : 'bg-[#9b2f00] border-white text-white'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
            </div>

            {/* Comment Card Popover */}
            {selectedCommentId === comment.id && (
              <div 
                className="absolute left-9 top-0 w-80 bg-[#262320] border border-[#443e39] rounded-xl shadow-2xl p-4 z-50 text-xs animate-in fade-in"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <img src={comment.avatar} alt={comment.author} className="w-6 h-6 rounded-full object-cover border border-[#9b2f00]" />
                    <span className="font-semibold text-white">{comment.author}</span>
                  </div>
                  <span className="text-[10px] text-stone-400">{comment.time}</span>
                </div>

                <div className="text-[10px] font-mono text-[#fe932c] mb-1.5">{comment.frame}</div>
                <p className="text-stone-200 text-xs mb-3 leading-relaxed">{comment.text}</p>

                <div className="flex items-center justify-between pt-2.5 border-t border-[#3a3530]">
                  <button
                    onClick={() => handleToggleResolve(comment.id)}
                    className="flex items-center gap-1 text-[11px] text-[#fe932c] hover:text-[#ffb77d] cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {comment.resolved ? 'Reopen' : 'Resolve'}
                  </button>
                  <button
                    onClick={() => setSelectedCommentId(null)}
                    className="text-[11px] text-stone-400 hover:text-white cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* New Comment Creator Box */}
        {newCommentCoords && (
          <div
            style={{ left: `${newCommentCoords.x}px`, top: `${newCommentCoords.y}px` }}
            className="absolute z-50 w-76 bg-[#262320] border border-[#9b2f00] rounded-xl shadow-2xl p-3.5 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-[#fe932c]" /> Drop Design Note
              </span>
              <button onClick={() => setNewCommentCoords(null)} className="text-stone-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <form onSubmit={handleAddComment}>
              <textarea
                placeholder="Type your design feedback or parish rule review note..."
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                rows={3}
                autoFocus
                className="w-full bg-[#181615] border border-[#3e3934] rounded-lg p-2.5 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-[#9b2f00] mb-2"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setNewCommentCoords(null)}
                  className="px-2.5 py-1 text-stone-400 hover:text-white text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-[#9b2f00] hover:bg-[#c2410c] text-white font-semibold rounded-md text-xs flex items-center gap-1 cursor-pointer shadow-sm"
                >
                  <Send className="w-3 h-3" /> Post Note
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Floating Canvas Helper Pill */}
      <div className="fixed bottom-4 left-6 z-30 bg-[#262320]/90 border border-[#3e3934] backdrop-blur-md px-3.5 py-2 rounded-xl text-xs text-stone-300 flex items-center gap-3 shadow-xl">
        <span className="flex items-center gap-1.5 font-medium">
          <span className="w-2 h-2 rounded-full bg-[#fe932c]"></span>
          Praxis Church OS Artboards
        </span>
        <span className="text-stone-600">|</span>
        <span>Drag to pan canvas • {zoom}% zoom</span>
        {isCommenting && (
          <span className="text-[#fe932c] font-semibold bg-[#fe932c]/10 px-2 py-0.5 rounded border border-[#fe932c]/30">
            Click anywhere on artboards to drop comment pin
          </span>
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { 
  Palette, 
  Type, 
  Layers, 
  Box, 
  Copy, 
  Check, 
  Sparkles, 
  Sliders, 
  Church,
  Droplets,
  HeartHandshake,
  ShieldCheck
} from 'lucide-react';
import { COLOR_TOKENS, TYPOGRAPHY_TOKENS, SPACING_TOKENS, SHADOW_TOKENS } from '../../data/designTokens';

export const DesignSystemView: React.FC = () => {
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [switchState, setSwitchState] = useState(true);
  const [inputVal, setInputVal] = useState('Members Register Verification');
  const [activeTab, setActiveTab] = useState<'colors' | 'typography' | 'components' | 'spacing'>('colors');

  const copyToClipboard = (text: string, tokenName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(tokenName);
    setTimeout(() => setCopiedToken(null), 1500);
  };

  return (
    <div className="w-full h-[calc(100vh-3rem)] overflow-y-auto bg-[#181615] text-[#eee7e3] p-6 sm:p-10">
      <div className="max-w-6xl mx-auto space-y-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#3e3934]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-[#9b2f00]/20 text-[#fe932c] border border-[#9b2f00]/30">
                Figma Design Tokens & UI Kit
              </span>
              <span className="text-xs text-[#a69c96]">• Warm Ember Palette & Church Typography</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-['Plus_Jakarta_Sans',sans-serif]">
              Praxis Church OS — Warm Ember Design System
            </h1>
            <p className="text-xs sm:text-sm text-[#a69c96] mt-1 max-w-2xl">
              High-fidelity foundational tokens, membership registers, official notice banners, and optical spacing rules calibrated for church management and church assemblies.
            </p>
          </div>

          {/* Quick Category Pills */}
          <div className="flex items-center gap-1.5 bg-[#262320] p-1.5 rounded-xl border border-[#3e3934] text-xs shrink-0">
            {(['colors', 'typography', 'components', 'spacing'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg capitalize font-medium transition-colors cursor-pointer ${
                  activeTab === tab
                    ? 'bg-[#9b2f00] text-white shadow-sm font-bold'
                    : 'text-[#a69c96] hover:text-white hover:bg-[#332f2b]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* SECTION 1: COLOR PALETTE TOKENS */}
        {(activeTab === 'colors' || activeTab === 'components') && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Palette className="w-5 h-5 text-[#fe932c]" />
                  Color Palettes & Semantic Roles (Warm Ember)
                </h2>
                <p className="text-xs text-[#a69c96]">Click any token swatch to copy its Hex code or Tailwind utility class.</p>
              </div>
            </div>

            {Object.entries(COLOR_TOKENS).map(([groupName, tokens]) => (
              <div key={groupName} className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#fe932c] font-mono">
                  {groupName} Tokens
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {tokens.map((token) => (
                    <div
                      key={token.name}
                      onClick={() => copyToClipboard(token.hex, token.name)}
                      className="group p-3 rounded-xl bg-[#262320] border border-[#3e3934] hover:border-[#fe932c]/50 transition-all cursor-pointer flex flex-col justify-between"
                    >
                      <div
                        className="w-full h-14 rounded-lg mb-3 shadow-inner flex items-center justify-center font-mono text-[10px] relative transition-transform group-hover:scale-102"
                        style={{ backgroundColor: token.hex }}
                      >
                        {copiedToken === token.name && (
                          <span className={`px-2 py-0.5 rounded shadow text-[10px] font-bold ${token.contrastWhite ? 'bg-black text-white' : 'bg-white text-black'}`}>
                            Copied!
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-xs font-semibold text-stone-200">
                          <span className="truncate">{token.name}</span>
                          <span className="font-mono text-[10px] text-stone-400">{token.hex}</span>
                        </div>
                        <span className="text-[10px] text-[#a69c96] block mt-0.5 truncate">{token.role}</span>
                        <code className="text-[10px] font-mono text-[#fe932c] block mt-1 truncate">
                          {token.tailwindClass.split(' ')[0]}
                        </code>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}

        {/* SECTION 2: TYPOGRAPHY HIERARCHY */}
        {(activeTab === 'typography' || activeTab === 'components') && (
          <section className="space-y-6 pt-6 border-t border-[#3e3934]">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Type className="w-5 h-5 text-[#fe932c]" />
                Typography Scale & Font Hierarchies
              </h2>
              <p className="text-xs text-[#a69c96]">
                Paired display typography with Plus Jakarta Sans and Inter for baseline readability and archival dignity.
              </p>
            </div>

            <div className="bg-[#262320] border border-[#3e3934] rounded-2xl overflow-hidden divide-y divide-[#3e3934]/70 shadow-lg">
              {TYPOGRAPHY_TOKENS.map((item) => (
                <div key={item.level} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#2c2825] transition-colors">
                  <div className="w-64 shrink-0">
                    <span className="font-mono text-xs font-semibold text-[#fe932c] block">{item.level}</span>
                    <span className="text-[11px] text-[#a69c96] font-mono">
                      {item.size} • {item.weight}
                    </span>
                    <code className="text-[10px] text-stone-500 font-mono block mt-1">{item.tailwind}</code>
                  </div>

                  <div className="flex-1">
                    <p className={`${item.tailwind} text-stone-100`}>
                      {item.sample}
                    </p>
                  </div>

                  <button
                    onClick={() => copyToClipboard(item.tailwind, item.level)}
                    className="shrink-0 p-2 text-stone-400 hover:text-white hover:bg-[#332f2b] rounded-lg transition-colors cursor-pointer"
                    title="Copy Tailwind utility classes"
                  >
                    {copiedToken === item.level ? <Check className="w-4 h-4 text-[#85f8c4]" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* SECTION 3: ATOMIC COMPONENTS & INTERACTIVE SPECIMENS */}
        {(activeTab === 'components') && (
          <section className="space-y-6 pt-6 border-t border-[#3e3934]">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Box className="w-5 h-5 text-[#fe932c]" />
                Atomic Component Specimens
              </h2>
              <p className="text-xs text-[#a69c96]">Church membership pills, membership buttons, and official notices.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Button Hierarchy */}
              <div className="p-6 rounded-2xl bg-[#262320] border border-[#3e3934] space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 font-mono">
                  Buttons & Actions
                </h3>
                <div className="flex flex-wrap gap-3 items-center">
                  <button className="px-4 py-2 rounded-lg bg-[#9b2f00] hover:bg-[#c2410c] text-white text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer">
                    <ShieldCheck className="w-3.5 h-3.5" /> Consecrate & Enroll
                  </button>
                  <button className="px-4 py-2 rounded-lg bg-[#ffdcc3] hover:bg-[#ffb77d] text-[#2f1500] text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer">
                    <Droplets className="w-3.5 h-3.5" /> Record Baptism
                  </button>
                  <button className="px-4 py-2 rounded-lg bg-[#332f2b] text-[#eee7e3] hover:bg-[#3e3934] text-xs font-semibold cursor-pointer">
                    Cancel Entry
                  </button>
                </div>
              </div>

              {/* Status Pills */}
              <div className="p-6 rounded-2xl bg-[#262320] border border-[#3e3934] space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 font-mono">
                  Church Status Badges
                </h3>
                <div className="flex flex-wrap gap-2.5 items-center">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#9b2f00] text-white">
                    <Church className="w-3 h-3" /> Member
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#102920] text-[#85f8c4] border border-[#006243]/40">
                    <Droplets className="w-3 h-3" /> Baptized Believer
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#351515] text-[#ffdad6] border border-[#ba1a1a]/40">
                    <HeartHandshake className="w-3 h-3" /> Homebound Care
                  </span>
                </div>
              </div>

              {/* Form Input Elements */}
              <div className="p-6 rounded-2xl bg-[#262320] border border-[#3e3934] space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 font-mono">
                  Input Fields & Controls
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-stone-300 mb-1">Search or Verification Input</label>
                    <input
                      type="text"
                      value={inputVal}
                      onChange={(e) => setInputVal(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-lg bg-[#181615] border border-[#3e3934] text-xs text-stone-100 focus:outline-none focus:border-[#9b2f00] focus:ring-2 focus:ring-[#9b2f00]/20"
                    />
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-stone-300 font-medium">Council Archival Mode Toggle</span>
                    <button
                      onClick={() => setSwitchState(!switchState)}
                      className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                        switchState ? 'bg-[#9b2f00]' : 'bg-stone-700'
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                          switchState ? 'left-6' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Elevation & Shadow previews */}
              <div className="p-6 rounded-2xl bg-[#262320] border border-[#3e3934] space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 font-mono">
                  Elevation Shadows & Depths
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {SHADOW_TOKENS.map((shadow) => (
                    <div
                      key={shadow.name}
                      className={`p-3.5 rounded-xl bg-[#181615] border border-[#3e3934] ${shadow.tailwind} flex flex-col justify-between`}
                    >
                      <span className="text-xs font-semibold text-stone-200">{shadow.name}</span>
                      <code className="text-[10px] font-mono text-[#fe932c] block mt-2">{shadow.tailwind}</code>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* SECTION 4: SPACING GRID (8-PT SYSTEM) */}
        {(activeTab === 'spacing') && (
          <section className="space-y-6 pt-6 border-t border-[#3e3934]">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#fe932c]" />
                8-Point Rhythmic Layout Grid
              </h2>
              <p className="text-xs text-[#a69c96]">Multiples of 8px ensure optical alignment across cards, headers, and container gutters.</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {SPACING_TOKENS.map((sp) => (
                <div key={sp.token} className="p-4 rounded-xl bg-[#262320] border border-[#3e3934] text-center space-y-2">
                  <div className="flex items-center justify-center h-12">
                    <div 
                      className="bg-[#fe932c] rounded" 
                      style={{ width: sp.value, height: sp.value, minWidth: '4px', minHeight: '4px' }} 
                    />
                  </div>
                  <span className="font-mono text-sm font-bold text-white block">{sp.value}</span>
                  <span className="text-[11px] font-mono text-[#fe932c] block">{sp.tailwind}</span>
                  <p className="text-[10px] text-[#a69c96] leading-tight">{sp.useCase}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

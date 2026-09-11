import React, { useState } from 'react';
import { 
  Code2, 
  Copy, 
  Check, 
  Box, 
  Sliders, 
  Sparkles, 
  Eye, 
  FileCode, 
  Layers,
  ChevronRight
} from 'lucide-react';
import { SAMPLE_INSPECTABLE_ELEMENTS } from '../../data/designTokens';
import { InspectedElementInfo } from '../../types';

export const InspectDevMode: React.FC = () => {
  const [selectedElement, setSelectedElement] = useState<InspectedElementInfo>(SAMPLE_INSPECTABLE_ELEMENTS[0]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const reactSnippet = `// ${selectedElement.name}.tsx
import React from 'react';

export const ${selectedElement.name}: React.FC = () => {
  return (
    <div className="${selectedElement.tailwindClasses}">
      {/* Content */}
    </div>
  );
};`;

  return (
    <div className="w-full h-[calc(100vh-3rem)] overflow-hidden bg-[#0d121f] text-slate-100 flex flex-col md:flex-row">
      {/* Left Sidebar: Selectable Component Roster */}
      <div className="w-full md:w-80 border-r border-slate-800 bg-[#090d16] flex flex-col h-full shrink-0">
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>Figma Dev Mode Inspector</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Select an atomic UI component to inspect tokens and copy code</p>
        </div>

        <div className="p-3 space-y-1 overflow-y-auto flex-1">
          <span className="text-[10px] font-mono text-slate-500 uppercase px-2 py-1 block">Inspectable Layers</span>
          {SAMPLE_INSPECTABLE_ELEMENTS.map((elem) => (
            <button
              key={elem.id}
              onClick={() => setSelectedElement(elem)}
              className={`w-full text-left p-2.5 rounded-xl text-xs transition-colors flex items-center justify-between cursor-pointer ${
                selectedElement.id === elem.id
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-300 hover:bg-slate-800/60 border border-transparent'
              }`}
            >
              <div>
                <span className="font-semibold block">{elem.name}</span>
                <span className="text-[10px] text-slate-400 font-mono">{elem.category}</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            </button>
          ))}
        </div>
      </div>

      {/* Center/Right: Code, Box Model & CSS Properties */}
      <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
        {/* Component Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/40">
                Ready for Production
              </span>
              <span className="text-xs text-slate-400 font-mono">{selectedElement.category}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {selectedElement.name}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
              W: {selectedElement.dimensions.width}px × H: {selectedElement.dimensions.height}px
            </span>
          </div>
        </div>

        {/* Box Model Diagram */}
        <div className="p-6 rounded-2xl bg-[#0e1628] border border-slate-800 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-2">
            <Box className="w-4 h-4 text-indigo-400" />
            Figma Box Model & Dimensions
          </h3>

          {/* Graphical Box Model */}
          <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 text-center font-mono text-xs">
            {/* Margin layer */}
            <div className="border border-dashed border-amber-500/40 p-3 rounded-lg bg-amber-950/10">
              <span className="text-[10px] text-amber-400 block mb-2 uppercase">margin: 0px</span>

              {/* Border layer */}
              <div className="border border-indigo-500/40 p-3 rounded-lg bg-indigo-950/20">
                <span className="text-[10px] text-indigo-400 block mb-2 uppercase">border: 1px (slate-800)</span>

                {/* Padding layer */}
                <div className="border border-emerald-500/40 p-3 rounded-lg bg-emerald-950/20">
                  <span className="text-[10px] text-emerald-400 block mb-2 uppercase">
                    padding: {selectedElement.cssProps.padding}
                  </span>

                  {/* Content layer */}
                  <div className="bg-slate-900 border border-slate-700 p-4 rounded text-slate-200 font-bold">
                    {selectedElement.dimensions.width} × {selectedElement.dimensions.height}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tailwind Utility Classes Block */}
        <div className="p-6 rounded-2xl bg-[#0e1628] border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-2">
              <Code2 className="w-4 h-4 text-indigo-400" />
              Tailwind CSS Utility Classes
            </h3>
            <button
              onClick={() => copyToClipboard(selectedElement.tailwindClasses, 'classes')}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              {copiedKey === 'classes' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'classes' ? 'Copied' : 'Copy Classes'}</span>
            </button>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-indigo-300 break-words leading-relaxed select-all">
            {selectedElement.tailwindClasses}
          </div>
        </div>

        {/* CSS Properties Table */}
        <div className="p-6 rounded-2xl bg-[#0e1628] border border-slate-800 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-400" />
            Computed CSS Properties
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 font-mono">
              <thead className="bg-slate-900/80 text-[10px] text-slate-500 uppercase border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-4">CSS Property</th>
                  <th className="py-2.5 px-4">Value</th>
                  <th className="py-2.5 px-4 text-right">Copy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {Object.entries(selectedElement.cssProps).map(([prop, val]) => (
                  <tr key={prop} className="hover:bg-slate-900/40">
                    <td className="py-2 px-4 text-indigo-400">{prop}</td>
                    <td className="py-2 px-4 text-slate-200">{val}</td>
                    <td className="py-2 px-4 text-right">
                      <button
                        onClick={() => copyToClipboard(`${prop}: ${val};`, prop)}
                        className="text-slate-500 hover:text-white p-1"
                      >
                        {copiedKey === prop ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* React Component Snippet */}
        <div className="p-6 rounded-2xl bg-[#0e1628] border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-2">
              <FileCode className="w-4 h-4 text-indigo-400" />
              React Component Code
            </h3>
            <button
              onClick={() => copyToClipboard(reactSnippet, 'snippet')}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white rounded-lg transition-colors cursor-pointer shadow-md shadow-indigo-950"
            >
              {copiedKey === 'snippet' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'snippet' ? 'Copied Snippet' : 'Copy TSX'}</span>
            </button>
          </div>

          <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
            <code>{reactSnippet}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};

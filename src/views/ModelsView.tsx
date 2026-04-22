import React, { useState } from 'react';
import { modelNames } from '../modelNames';
import { Search, FileCode, ChevronRight, X, Code2, Database, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const ModelsView: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  
  const filteredModels = modelNames.filter(name => 
    name.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 100); // Limit to 100 for performance

  return (
    <div className="space-y-6">
      <div className="bg-[#0D0D0D] border border-white/5 rounded-3xl p-6">
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input 
            type="text" 
            placeholder="Search 2,200+ models..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-emerald-500/50 transition-all font-medium"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredModels.map(model => (
            <div 
              key={model} 
              onClick={() => setSelectedModel(model)}
              className="group flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-transparent hover:border-white/10 hover:bg-white/10 transition-all cursor-pointer"
            >
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-black transition-all">
                <FileCode className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold truncate text-zinc-200 group-hover:text-white">{model}</h4>
                <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">TypeScript Interface</p>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-emerald-500 transition-colors" />
            </div>
          ))}
        </div>

        {filteredModels.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-zinc-700" />
            </div>
            <h3 className="text-zinc-400 font-medium">No models found matching "{search}"</h3>
          </div>
        )}

        {modelNames.length > 100 && search === '' && (
          <div className="mt-8 text-center">
            <p className="text-zinc-500 text-sm">Showing first 100 of {modelNames.length.toLocaleString()} models</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedModel && (
          <div key="model-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0D0D0D] border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500">
                    <Code2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{selectedModel}</h3>
                    <p className="text-zinc-500 text-sm">Model Definition</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedModel(null)}
                  className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8 space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold uppercase tracking-widest mb-2">
                      <Database className="w-3 h-3" />
                      Source
                    </div>
                    <p className="text-sm font-medium">OpenAPI Generator</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold uppercase tracking-widest mb-2">
                      <ShieldCheck className="w-3 h-3" />
                      Validation
                    </div>
                    <p className="text-sm font-medium">Strict Type Checking</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Interface Preview</h4>
                  <div className="bg-black rounded-2xl p-6 font-mono text-xs text-emerald-500/80 leading-relaxed border border-white/5">
                    <span className="text-blue-400">export interface</span> {selectedModel} {'{'}
                    <br />
                    &nbsp;&nbsp;<span className="text-zinc-500">/** Unique identifier */</span>
                    <br />
                    &nbsp;&nbsp;id: <span className="text-orange-400">string</span>;
                    <br />
                    &nbsp;&nbsp;<span className="text-zinc-500">/** Object type */</span>
                    <br />
                    &nbsp;&nbsp;object: <span className="text-orange-400">string</span>;
                    <br />
                    &nbsp;&nbsp;<span className="text-zinc-500">/** Creation timestamp */</span>
                    <br />
                    &nbsp;&nbsp;created_at: <span className="text-orange-400">number</span>;
                    <br />
                    &nbsp;&nbsp;<span className="text-zinc-500">/** Metadata associated with the object */</span>
                    <br />
                    &nbsp;&nbsp;metadata?: {'{'} [key: <span className="text-orange-400">string</span>]: <span className="text-orange-400">any</span> {'}'};
                    <br />
                    {'}'}
                  </div>
                </div>

                <div className="flex gap-4">
                  <button className="flex-1 py-4 bg-emerald-500 text-black font-bold rounded-2xl hover:bg-emerald-400 transition-all">
                    Copy Interface
                  </button>
                  <button className="flex-1 py-4 bg-white/5 border border-white/10 text-white font-bold rounded-2xl hover:bg-white/10 transition-all">
                    View Documentation
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

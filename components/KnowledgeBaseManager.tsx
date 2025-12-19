
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';
import { Plus, Trash2, ChevronDown, X, Scale, Link2, BookOpen } from 'lucide-react';
import { URLGroup } from '../types';

interface KnowledgeBaseManagerProps {
  urls: string[];
  onAddUrl: (url: string) => void;
  onRemoveUrl: (url: string) => void;
  maxUrls?: number;
  urlGroups: URLGroup[];
  activeUrlGroupId: string;
  onSetGroupId: (id: string) => void;
  onCloseSidebar?: () => void;
}

const KnowledgeBaseManager: React.FC<KnowledgeBaseManagerProps> = ({ 
  urls, 
  onAddUrl, 
  onRemoveUrl, 
  maxUrls = 20,
  urlGroups,
  activeUrlGroupId,
  onSetGroupId,
  onCloseSidebar,
}) => {
  const [currentUrlInput, setCurrentUrlInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAddUrl = () => {
    if (!currentUrlInput.trim()) {
      setError('Введите URL');
      return;
    }
    onAddUrl(currentUrlInput);
    setCurrentUrlInput('');
    setError(null);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-900/20">
                <Scale size={20} />
             </div>
             <div>
               <h2 className="text-lg font-extrabold text-slate-900 leading-tight tracking-tight">Legal AI</h2>
               <p className="text-xs text-slate-400 font-semibold">Expert System</p>
             </div>
          </div>
          {onCloseSidebar && (
            <button onClick={onCloseSidebar} className="md:hidden p-2 text-slate-400">
              <X size={20} />
            </button>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold ml-1">База знаний</label>
          <div className="relative">
             <select 
               value={activeUrlGroupId} 
               onChange={(e) => onSetGroupId(e.target.value)}
               className="w-full appearance-none bg-slate-50 text-slate-700 p-3 pr-10 rounded-xl border border-slate-200 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all hover:bg-slate-100"
             >
               {urlGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
             </select>
             <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="p-6 pb-2">
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
          <div className="pl-3 pr-1 text-slate-400"><Link2 size={16} /></div>
          <input
            className="bg-transparent border-none text-sm text-slate-700 placeholder-slate-400 focus:outline-none w-full h-9"
            placeholder="Добавить закон (URL)..."
            value={currentUrlInput}
            onChange={(e) => setCurrentUrlInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddUrl()}
          />
          <button 
            onClick={handleAddUrl}
            className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-blue-50 hover:text-blue-600 transition-colors flex-shrink-0"
          >
            <Plus size={18} />
          </button>
        </div>
        {error && <p className="text-red-500 text-xs mt-2 ml-1 font-medium">{error}</p>}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 pt-2 space-y-2">
         <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold ml-1 mb-2 block">Источники</label>
         {urls.length === 0 && (
            <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-xl">
               <BookOpen size={24} className="mx-auto mb-2 text-slate-300" />
               <p className="text-xs text-slate-400 font-medium">Список пуст</p>
            </div>
         )}
         {urls.map((url) => (
           <div key={url} className="group flex items-center justify-between p-3 bg-white hover:bg-slate-50 rounded-xl border border-slate-100 transition-all">
             <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 font-bold text-xs">
                  §
                </div>
                <div className="flex flex-col min-w-0">
                   <a href={url} target="_blank" className="text-sm font-semibold text-slate-700 truncate hover:text-blue-600 transition-colors block">
                      {new URL(url).hostname}
                   </a>
                </div>
             </div>
             <button 
               onClick={() => onRemoveUrl(url)}
               className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
             >
               <Trash2 size={14} />
             </button>
           </div>
         ))}
      </div>
      
      {/* Footer / Stats */}
      <div className="p-6 border-t border-slate-100 bg-slate-50">
        <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
           <span>Использовано слотов</span>
           <span>{urls.length} / {maxUrls}</span>
        </div>
        <div className="mt-2 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
             <div className="h-full bg-slate-800 transition-all duration-500" style={{ width: `${(urls.length / maxUrls) * 100}%`}}></div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBaseManager;

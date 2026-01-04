import React, { useState } from 'react';
import { XIcon, DatabaseIcon } from './Icons';

interface DbSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (url: string, key: string) => void;
  currentUrl?: string;
  currentKey?: string;
}

const DbSettingsModal: React.FC<DbSettingsModalProps> = ({ isOpen, onClose, onSave, currentUrl, currentKey }) => {
  const [url, setUrl] = useState(currentUrl || '');
  const [key, setKey] = useState(currentKey || '');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-300">
        <div className="px-8 pt-8 pb-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500 rounded-xl text-white">
              <DatabaseIcon className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Vault Connectivity</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
            <XIcon />
          </button>
        </div>

        <div className="p-8">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
            Link your board to a Supabase project for multi-device synchronization and robust cloud persistence.
          </p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Project URL</label>
              <input
                type="text"
                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-white placeholder:text-slate-500 font-medium"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://xyz.supabase.co"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Anon Public Key</label>
              <input
                type="password"
                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-white placeholder:text-slate-500 font-medium"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              />
            </div>
          </div>

          <div className="mt-8 flex gap-3">
            <button
              onClick={() => { setUrl(''); setKey(''); }}
              className="px-4 py-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 font-black text-[10px] uppercase tracking-widest transition-colors flex-1"
            >
              Clear
            </button>
            <button
              onClick={() => onSave(url, key)}
              className="px-4 py-4 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 font-black text-[10px] uppercase tracking-widest transition-all shadow-lg flex-1"
            >
              Sync to Cloud
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DbSettingsModal;
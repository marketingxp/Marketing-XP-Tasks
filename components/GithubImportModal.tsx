
import React, { useState } from 'react';
import { XIcon, GithubIcon } from './Icons';
import { GoogleGenAI, Type } from "@google/genai";
import { Service, Column, Task } from '../types';

interface GithubImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (tasks: Task[]) => void;
  services: Service[];
  columns: Column[];
}

const GithubImportModal: React.FC<GithubImportModalProps> = ({ isOpen, onClose, onImport, services, columns }) => {
  const [repo, setRepo] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  if (!isOpen) return null;

  const handlePull = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repo.includes('/')) return alert("Please use owner/repository format.");

    setLoading(true);
    setStatus('Contacting GitHub Pulse...');

    try {
      // 1. Fetch Issues
      const res = await fetch(`https://api.github.com/repos/${repo}/issues?state=open&per_page=10`);
      if (!res.ok) throw new Error("Repository not found or private.");
      const issues = await res.json();
      
      if (issues.length === 0) {
        setLoading(false);
        setStatus('No open issues found.');
        return;
      }

      setStatus(`Fetched ${issues.length} issues. Initializing AI Triage...`);

      // 2. AI Triage with Gemini
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `
        I have fetched ${issues.length} GitHub issues from ${repo}. 
        I need you to triage them into a Marketing Kanban board.
        
        Available Marketing Services (Categories): ${services.map(s => s.name).join(', ')}
        Available Workflow Columns (Stages): ${columns.map(c => c.title + " (id: " + c.id + ")").join(', ')}
        
        Issues Data: ${JSON.stringify(issues.map((i: any) => ({ id: i.id, title: i.title, body: i.body?.substring(0, 200) })))}
        
        Assign each issue a "category" from the Services list and a "columnId" from the Columns list. 
        Also assign a "priority" (High, Medium, Low).
      `;

      const triageResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.NUMBER },
                category: { type: Type.STRING },
                columnId: { type: Type.STRING },
                priority: { type: Type.STRING }
              },
              required: ['id', 'category', 'columnId', 'priority']
            }
          }
        }
      });

      const triageMap = JSON.parse(triageResponse.text);

      // 3. Map to Board Tasks
      const newTasks: Task[] = issues.map((issue: any) => {
        const triage = triageMap.find((t: any) => t.id === issue.id) || {
          category: services[0]?.name || 'SEO',
          columnId: 'backlog',
          priority: 'Medium'
        };

        return {
          id: `gh-${issue.id}`,
          title: `[GH] ${issue.title}`,
          description: issue.body || 'Pulled from GitHub pulse.',
          category: triage.category,
          priority: triage.priority,
          columnId: triage.columnId,
          dueDate: issue.milestone?.due_on?.split('T')[0],
          githubUrl: issue.html_url
        };
      });

      onImport(newTasks);
      onClose();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
      setStatus('');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-300">
        <div className="px-8 pt-8 pb-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-950 rounded-xl text-white">
              <GithubIcon className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">GitHub Pulse</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
            <XIcon />
          </button>
        </div>

        <form onSubmit={handlePull} className="p-8">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
            Sync your marketing repository issues. Our AI will automatically categorize them into your workflow using live triage logic.
          </p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Repository Path</label>
              <input
                required
                disabled={loading}
                type="text"
                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white placeholder:text-slate-500 font-medium"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                placeholder="facebook/react"
              />
            </div>
          </div>

          {status && (
            <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-blue-500 uppercase tracking-widest">
              <div className="w-1 h-1 rounded-full bg-blue-500" />
              {status}
            </div>
          )}

          <div className="mt-8 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 font-black text-[10px] uppercase tracking-widest transition-colors"
            >
              Discard
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-4 bg-slate-950 dark:bg-blue-600 text-white rounded-2xl hover:bg-slate-900 dark:hover:bg-blue-700 font-black text-[10px] uppercase tracking-widest transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : "Authorize Pull"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GithubImportModal;

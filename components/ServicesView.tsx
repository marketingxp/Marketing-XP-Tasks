
import React, { useState } from 'react';
import { Service } from '../types';
import { PlusIcon, TrashIcon, EditIcon } from './Icons';
import { SERVICE_COLOR_MAP } from '../constants';

interface ServicesViewProps {
  services: Service[];
  onAddService: (service: Omit<Service, 'id'>) => void;
  onUpdateService: (service: Service) => void;
  onDeleteService: (id: string) => void;
}

const ServicesView: React.FC<ServicesViewProps> = ({ services, onAddService, onUpdateService, onDeleteService }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState('blue');
  const [description, setDescription] = useState('');

  const resetForm = () => {
    setName('');
    setColor('blue');
    setDescription('');
    setIsAdding(false);
    setEditingId(null);
  };

  const handleEdit = (svc: Service) => {
    setEditingId(svc.id);
    setName(svc.name);
    setColor(svc.color);
    setDescription(svc.description || '');
    setIsAdding(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingId) {
      onUpdateService({ id: editingId, name, color, description });
    } else {
      onAddService({ name, color, description });
    }
    resetForm();
  };

  const colorOptions = Object.keys(SERVICE_COLOR_MAP);

  return (
    <div className="p-6 max-w-5xl mx-auto w-full">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Agency Services</h2>
          <p className="text-slate-500 dark:text-slate-400">Define the marketing services and categories your agency offers.</p>
        </div>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold transition-all shadow-lg shadow-blue-500/20"
          >
            <PlusIcon className="w-4 h-4" />
            Add Service
          </button>
        )}
      </div>

      {isAdding && (
        <div className="mb-8 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 animate-in fade-in slide-in-from-top-4 duration-200">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Service Name</label>
                <input
                  required
                  type="text"
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Content Strategy"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Color Theme</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {colorOptions.map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setColor(opt)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${color === opt ? 'border-blue-500 scale-110 shadow-lg' : 'border-transparent scale-100'} ${SERVICE_COLOR_MAP[opt].split(' ')[0]}`}
                      title={opt}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Short Description</label>
              <input
                type="text"
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. SEO, blog posts and copywriting"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <button 
                type="button" 
                onClick={resetForm}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold shadow-lg shadow-blue-500/20"
              >
                {editingId ? 'Update Service' : 'Create Service'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map(svc => (
          <div key={svc.id} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-4">
              <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full border ${SERVICE_COLOR_MAP[svc.color]}`}>
                {svc.name}
              </span>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleEdit(svc)} className="p-1.5 text-slate-400 hover:text-blue-500 transition-colors"><EditIcon className="w-4 h-4" /></button>
                <button onClick={() => onDeleteService(svc.id)} className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"><TrashIcon className="w-4 h-4" /></button>
              </div>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{svc.name}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed min-h-[32px]">
              {svc.description || 'No description provided.'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ServicesView;

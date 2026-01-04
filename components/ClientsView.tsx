
import React, { useState, useRef, useEffect } from 'react';
import { Client, Task } from '../types';
import { PlusIcon, TrashIcon, KeyIcon, EditIcon } from './Icons';

interface ClientsViewProps {
  clients: Client[];
  tasks: Task[];
  onAddClient: (name: string, industry: string, password?: string, logo?: string, email?: string) => void;
  onUpdateClient: (client: Client) => void;
  onDeleteClient: (id: string) => void;
  globalLogo?: string;
  onUpdateGlobalLogo?: (logo: string | undefined) => void;
}

const ClientsView: React.FC<ClientsViewProps> = ({ 
  clients, 
  tasks, 
  onAddClient, 
  onUpdateClient, 
  onDeleteClient,
  globalLogo,
  onUpdateGlobalLogo
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [newName, setNewName] = useState('');
  const [newIndustry, setNewIndustry] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPin, setNewPin] = useState('');
  const [newLogo, setNewLogo] = useState<string | undefined>();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const globalLogoInputRef = useRef<HTMLInputElement>(null);

  // Sync state when editing a client
  useEffect(() => {
    if (editingClient) {
      setNewName(editingClient.name);
      setNewIndustry(editingClient.industry || '');
      setNewEmail(editingClient.email || '');
      setNewPin(editingClient.password || '');
      setNewLogo(editingClient.logo);
      setIsAdding(true);
    } else {
      resetForm();
    }
  }, [editingClient]);

  const resetForm = () => {
    setNewName('');
    setNewIndustry('');
    setNewEmail('');
    setNewPin('');
    setNewLogo(undefined);
  };

  const generateRandomPin = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      if (editingClient) {
        onUpdateClient({
          ...editingClient,
          name: newName,
          industry: newIndustry,
          email: newEmail,
          password: newPin || generateRandomPin(),
          logo: newLogo
        });
        setEditingClient(null);
      } else {
        const finalPin = /^\d{6}$/.test(newPin) ? newPin : generateRandomPin();
        onAddClient(newName, newIndustry, finalPin, newLogo, newEmail);
      }
      resetForm();
      setIsAdding(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGlobalLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUpdateGlobalLogo) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdateGlobalLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setNewPin(val);
  };

  const getClientTaskCount = (clientId: string) => {
    return tasks.filter(t => t.clientId === clientId).length;
  };

  return (
    <div className="p-6 max-w-5xl mx-auto w-full">
      {/* Global Branding Section */}
      <div className="mb-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div 
              className="w-24 h-16 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center p-2 cursor-pointer hover:border-blue-500 transition-all group overflow-hidden"
              onClick={() => globalLogoInputRef.current?.click()}
            >
              <img src={globalLogo || "./assets/logo.png"} className="max-h-full max-w-full object-contain" alt="Current Logo" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-[10px] text-white font-bold uppercase pointer-events-none">
                Update
              </div>
              <input type="file" ref={globalLogoInputRef} onChange={handleGlobalLogoUpload} className="hidden" accept="image/*" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Global Branding</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Set the logo displayed on the login gateway and main dashboard.</p>
            </div>
          </div>
          {globalLogo && (
             <button 
              onClick={() => onUpdateGlobalLogo && onUpdateGlobalLogo(undefined)}
              className="text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 transition-colors"
             >
               Reset to Default
             </button>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Client Portfolio</h2>
          <p className="text-slate-500 dark:text-slate-400">Manage your active marketing accounts, logos, and secure 6-digit access PINs</p>
        </div>
        {!isAdding && (
          <button 
            onClick={() => { resetForm(); setEditingClient(null); setIsAdding(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold transition-all shadow-lg shadow-blue-500/20"
          >
            <PlusIcon className="w-4 h-4" />
            Add Client
          </button>
        )}
      </div>

      {isAdding && (
        <div className="mb-8 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 animate-in fade-in slide-in-from-top-4 duration-200">
          <form onSubmit={handleSave} className="space-y-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2">
              {editingClient ? `Editing ${editingClient.name}` : 'Create New Account'}
            </h3>
            <div className="flex flex-col md:flex-row items-start gap-6">
              <div 
                onClick={() => logoInputRef.current?.click()}
                className="w-24 h-24 flex-shrink-0 rounded-2xl bg-slate-100 dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition-all overflow-hidden group relative"
              >
                {newLogo ? (
                  <>
                    <img src={newLogo} className="w-full h-full object-contain p-2" alt="Preview" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                       <span className="text-[10px] text-white font-bold uppercase">Change</span>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-2">
                    <PlusIcon className="w-6 h-6 mx-auto text-slate-400 group-hover:text-blue-500" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase mt-1">Logo</span>
                  </div>
                )}
                <input type="file" ref={logoInputRef} onChange={handleLogoUpload} className="hidden" accept="image/*" />
              </div>

              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Client Name</label>
                  <input
                    autoFocus
                    type="text"
                    required
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Acme Corp"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Contact Email (for Notifications)</label>
                  <input
                    type="email"
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="client@company.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Industry</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                    value={newIndustry}
                    onChange={(e) => setNewIndustry(e.target.value)}
                    placeholder="e.g. SaaS"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Portal Access PIN (6 Digits)</label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 dark:text-white font-mono"
                      value={newPin}
                      onChange={handlePinChange}
                      placeholder="Auto-generated if blank"
                    />
                    <button 
                      type="button"
                      onClick={() => setNewPin(generateRandomPin())}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-blue-500 hover:text-blue-600 transition-colors"
                    >
                      Randomize
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 justify-end pt-4 border-t border-slate-50 dark:border-slate-700">
              <button 
                type="button"
                onClick={() => { setIsAdding(false); setEditingClient(null); resetForm(); }}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold transition-colors shadow-lg shadow-blue-500/20"
              >
                {editingClient ? 'Update Account' : 'Save Client'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clients.map(client => (
          <div key={client.id} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-black/5 overflow-hidden"
                style={{ backgroundColor: client.color }}
              >
                {client.logo ? (
                  <img src={client.logo} className="w-full h-full object-contain p-1.5 bg-white" alt={client.name} />
                ) : (
                  client.name.charAt(0)
                )}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => setEditingClient(client)}
                  className="p-2 text-slate-400 hover:text-blue-500 transition-colors"
                  title="Edit client"
                >
                  <EditIcon className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => onDeleteClient(client.id)}
                  className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                  title="Delete client"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{client.name}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 truncate" title={client.email}>{client.email || 'No email set'}</p>
            <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-600 mb-4">{client.industry || 'General'}</p>
            
            <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col gap-1.5">
              <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Portal Access PIN</span>
              <div className="flex items-center gap-2">
                <KeyIcon className="w-3.5 h-3.5 text-blue-500" />
                <code className="text-sm font-mono font-bold text-blue-600 dark:text-blue-400 select-all tracking-widest">
                  {client.password}
                </code>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-700">
              <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Active Tasks</div>
              <div className="px-3 py-1 bg-slate-100 dark:bg-slate-900 rounded-full text-xs font-black text-slate-700 dark:text-slate-300">
                {getClientTaskCount(client.id)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClientsView;

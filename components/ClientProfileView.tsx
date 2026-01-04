
import React, { useState, useRef } from 'react';
import { Client } from '../types';
import { PlusIcon } from './Icons';

interface ClientProfileViewProps {
  client: Client;
  onUpdateClient: (client: Client) => void;
}

const ClientProfileView: React.FC<ClientProfileViewProps> = ({ client, onUpdateClient }) => {
  const [name, setName] = useState(client.name);
  const [email, setEmail] = useState(client.email || '');
  const [logo, setLogo] = useState(client.logo);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateClient({
      ...client,
      name,
      email,
      logo
    });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto w-full flex flex-col items-center">
      <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">My Profile</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">Update your company details and logo for the dashboard.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col items-center gap-4 mb-6">
            <div 
              onClick={() => logoInputRef.current?.click()}
              className="w-32 h-32 rounded-3xl bg-slate-50 dark:bg-slate-950 border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center cursor-pointer hover:border-blue-500 transition-all overflow-hidden group relative shadow-inner"
            >
              {logo ? (
                <>
                  <img src={logo} className="w-full h-full object-contain p-4" alt="Company Logo" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <span className="text-[10px] text-white font-black uppercase tracking-widest">Change Logo</span>
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <PlusIcon className="w-8 h-8 mx-auto text-slate-300" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 block">Add Logo</span>
                </div>
              )}
              <input type="file" ref={logoInputRef} onChange={handleLogoUpload} className="hidden" accept="image/*" />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Company Logo</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Company Name</label>
              <input
                type="text"
                required
                className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Contact Email</label>
              <input
                type="email"
                required
                className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="pt-6">
            <button 
              type="submit"
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-[0.98]"
            >
              Save Profile Changes
            </button>
          </div>
        </form>
      </div>
      
      <div className="mt-8 p-6 bg-slate-900/5 dark:bg-slate-50/5 rounded-2xl border border-slate-200 dark:border-slate-800 text-center w-full max-w-2xl">
        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Account Information</p>
        <p className="text-xs text-slate-500 mt-2">To change your secure portal PIN, please contact your agency account manager.</p>
      </div>
    </div>
  );
};

export default ClientProfileView;

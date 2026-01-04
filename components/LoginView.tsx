
import React, { useState } from 'react';
import DarkVeil from './DarkVeil';
import { ShieldIcon, KeyIcon } from './Icons';
import { fetchBoardFromSupabase } from '../supabase';

interface LoginViewProps {
  onAuthenticated: (username: string, role: 'admin' | 'client', clientId?: string) => void;
  logo?: string;
}

const LoginView: React.FC<LoginViewProps> = ({ onAuthenticated, logo }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'admin' | 'client'>('client');
  
  // Manager Credentials
  const [managerUsername, setManagerUsername] = useState('');
  const [managerPin, setManagerPin] = useState('');
  
  // Client Credentials
  const [clientEmail, setClientEmail] = useState('');
  const [clientPin, setClientPin] = useState('');

  // Required Manager Credentials
  const VALID_MANAGER_USER = 'matt';
  const VALID_MANAGER_PIN = '106621';

  const handleAdminAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Artificial delay for "decrypting" feel
    await new Promise(resolve => setTimeout(resolve, 800));

    if (managerUsername.toLowerCase() === VALID_MANAGER_USER && managerPin === VALID_MANAGER_PIN) {
      onAuthenticated(VALID_MANAGER_USER, "admin");
    } else {
      setError("Security Alert: Invalid Manager Credentials.");
      setLoading(false);
    }
  };

  const handleClientAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const inputEmail = clientEmail.trim().toLowerCase();
    const inputPin = clientPin.trim();
    
    if (!inputEmail || inputPin.length !== 6) {
      setError("Please provide a valid email and 6-digit PIN.");
      setLoading(false);
      return;
    }
    
    // 1. Check local cache first for fast login
    let clientsList: any[] = [];
    try {
      const saved = localStorage.getItem('marketing_xp_board_v1');
      if (saved) {
        clientsList = JSON.parse(saved).clients || [];
      }
    } catch (e) {}

    let client = clientsList.find((c: any) => 
      c.email?.toLowerCase() === inputEmail && c.password === inputPin
    );

    // 2. If not found locally, attempt a Cloud Handshake
    if (!client) {
      try {
        const remoteData = await fetchBoardFromSupabase();
        if (remoteData && remoteData.clients) {
          // Update local cache so the dashboard is hydrated immediately after login
          localStorage.setItem('marketing_xp_board_v1', JSON.stringify(remoteData));
          client = remoteData.clients.find((c: any) => 
            c.email?.toLowerCase() === inputEmail && c.password === inputPin
          );
        }
      } catch (err: any) {
        console.error("Cloud Auth Failure:", err.message || err);
      }
    }

    if (client) {
      // Small delay for UX transition
      setTimeout(() => {
        onAuthenticated(client.name, "client", client.id);
        setLoading(false);
      }, 600);
    } else {
      setError("Unauthorized: Credentials not recognized in the vault.");
      setLoading(false);
    }
  };

  const handleClientPinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setClientPin(val);
  };

  const toggleMode = () => {
    setMode(mode === 'client' ? 'admin' : 'client');
    setError(null);
  };

  return (
    <div className="fixed inset-0 bg-slate-950 selection:bg-blue-500/30 overflow-y-auto custom-scrollbar">
      {/* Dynamic Background - stays fixed */}
      <div className="fixed inset-0 z-0 opacity-60 pointer-events-none">
        <DarkVeil 
          hueShift={-10}
          noiseIntensity={0.02}
          scanlineIntensity={0.1}
          speed={1.5}
          warpAmount={0.05}
        />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md my-auto">
          <div className="absolute -inset-0.5 bg-gradient-to-b from-blue-500/20 to-slate-800/10 rounded-[2.2rem] blur-md opacity-50" />
          
          <div className="relative bg-slate-900/90 backdrop-blur-3xl border border-slate-800 rounded-[2.5rem] p-6 sm:p-10 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-700">
            {/* Logo Section */}
            <div className="flex justify-center mb-6 sm:mb-10">
              <div className="relative">
                <div className="absolute -inset-6 bg-blue-500/10 rounded-full blur-2xl animate-pulse"></div>
                <div className="w-40 sm:w-56 h-10 sm:h-14 flex items-center justify-center relative z-10 overflow-hidden">
                  <img src={logo || "./assets/logo.png"} className="h-full w-auto object-contain" alt="Logo" />
                </div>
              </div>
            </div>

            {/* Header Text */}
            <div className="text-center mb-8 sm:mb-12">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-2">
                {mode === 'client' ? 'Client Portal' : 'Command Center'}
              </h1>
              <div className="flex items-center justify-center gap-3">
                <span className={`w-1 h-1 rounded-full ${mode === 'client' ? 'bg-blue-500' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]'}`} />
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em]">
                  {mode === 'client' ? 'Authorized Client' : 'Agency Principal'}
                </p>
                <span className={`w-1 h-1 rounded-full ${mode === 'client' ? 'bg-blue-500' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]'}`} />
              </div>
            </div>

            {error && (
              <div className="mb-8 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-[11px] font-bold text-center animate-in slide-in-from-top-2 flex items-center justify-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                {error}
              </div>
            )}

            {mode === 'admin' ? (
              <form onSubmit={handleAdminAuth} className="space-y-6 sm:space-y-8">
                <div className="space-y-4">
                  <div className="group">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3 ml-1 group-focus-within:text-blue-500 transition-colors">
                      Manager ID
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="Enter Admin Name"
                      className="w-full px-6 py-4 bg-slate-950/60 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none text-white placeholder:text-slate-800 transition-all text-base font-bold shadow-inner"
                      value={managerUsername}
                      onChange={(e) => setManagerUsername(e.target.value)}
                    />
                  </div>
                  
                  <div className="group">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3 ml-1 group-focus-within:text-blue-500 transition-colors">
                      Command PIN
                    </label>
                    <input
                      required
                      type="password"
                      maxLength={6}
                      placeholder="••••••"
                      className="w-full px-6 py-4 bg-slate-950/60 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none text-white placeholder:text-slate-800 transition-all text-lg font-bold shadow-inner tracking-[1em] text-center"
                      value={managerPin}
                      onChange={(e) => setManagerPin(e.target.value)}
                    />
                  </div>
                  
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-5 sm:py-6 mt-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] transition-all shadow-xl shadow-blue-900/40 flex items-center justify-center gap-3 active:scale-[0.98]"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <ShieldIcon className="w-4 h-4" />
                        <span>Initialize Session</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleClientAuth} className="space-y-6 sm:space-y-8">
                <div className="space-y-4">
                  <div className="group">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3 ml-1 group-focus-within:text-blue-500 transition-colors">
                      Account Email
                    </label>
                    <input
                      required
                      type="email"
                      placeholder="client@company.com"
                      className="w-full px-6 py-4 bg-slate-950/60 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none text-white placeholder:text-slate-800 transition-all text-base font-bold shadow-inner"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                    />
                  </div>
                  
                  <div className="group">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3 ml-1 group-focus-within:text-blue-500 transition-colors">
                      Secret PIN
                    </label>
                    <div className="relative">
                      <input
                        required
                        type="text"
                        inputMode="numeric"
                        placeholder="000000"
                        className="w-full px-6 py-4 bg-slate-950/60 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none text-white placeholder:text-slate-800 transition-all font-mono text-lg font-bold shadow-inner tracking-[0.8em] text-center pl-12"
                        value={clientPin}
                        onChange={handleClientPinChange}
                      />
                      <KeyIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700 pointer-events-none" />
                    </div>
                  </div>
                </div>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-5 sm:py-6 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] transition-all shadow-xl shadow-blue-900/40 active:scale-[0.98] flex items-center justify-center gap-3"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : "Access Workspace"}
                </button>
              </form>
            )}

            <div className="mt-10 pt-8 border-t border-slate-800/60 flex flex-col items-center gap-6">
               <button 
                onClick={toggleMode}
                className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-blue-400 transition-all flex items-center gap-2 group py-2"
               >
                 <ShieldIcon className={`w-3.5 h-3.5 opacity-30 group-hover:opacity-100 ${mode === 'admin' ? 'text-blue-500 opacity-100' : ''}`} />
                 {mode === 'client' ? 'Switch to Manager Mode' : 'Back to Client Portal'}
               </button>
               
               <p className="text-[9px] text-slate-700 font-bold italic leading-relaxed text-center max-w-[240px]">
                 SECURE CLOUD-SYNC ENABLED. ACCESS IS LOGGED AND ENCRYPTED WITHIN MARKETING XP VAULT.
               </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginView;

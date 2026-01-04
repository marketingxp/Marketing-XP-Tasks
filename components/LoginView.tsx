
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 selection:bg-blue-500/30 relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0 opacity-60">
        <DarkVeil 
          hueShift={-10}
          noiseIntensity={0.02}
          scanlineIntensity={0.1}
          speed={1.5}
          warpAmount={0.05}
        />
      </div>

      {/* Top Right Manager Access */}
      <div className="absolute top-6 right-6 z-20">
        <button 
          onClick={() => {
            setMode(mode === 'client' ? 'admin' : 'client');
            setError(null);
          }}
          className="px-4 py-2 bg-slate-900/50 hover:bg-slate-800/80 backdrop-blur-md border border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-blue-400 transition-all flex items-center gap-2 group"
        >
          <ShieldIcon className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100" />
          {mode === 'client' ? 'Manager Access' : 'Return to Portal'}
        </button>
      </div>

      <div className="absolute inset-0 bg-slate-950/40 pointer-events-none z-[1]" />
      
      <div className="w-full max-w-md relative z-10">
        <div className="absolute -inset-0.5 bg-gradient-to-b from-blue-500/10 to-slate-800/10 rounded-[2.2rem] blur-sm opacity-50" />
        
        <div className="relative bg-slate-900/80 backdrop-blur-2xl border border-slate-800 rounded-[2rem] p-8 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-700">
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="absolute -inset-4 bg-blue-500/10 rounded-full blur-xl animate-pulse"></div>
              <div className="w-48 h-12 flex items-center justify-center relative z-10 overflow-hidden">
                <img src={logo || "./assets/logo.png"} className="h-full w-auto object-contain" alt="Logo" />
              </div>
            </div>
          </div>

          <div className="text-center mb-10">
            <h1 className="text-xl font-bold text-white tracking-tight mb-2">
              {mode === 'client' ? 'Client Portal' : 'Agency Control Center'}
            </h1>
            <div className="flex items-center justify-center gap-2">
              <span className={`w-1 h-1 rounded-full ${mode === 'client' ? 'bg-blue-500' : 'bg-rose-500'}`} />
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em]">
                {mode === 'client' ? 'Secure Login' : 'System Administration'}
              </p>
              <span className={`w-1 h-1 rounded-full ${mode === 'client' ? 'bg-blue-500' : 'bg-rose-500'}`} />
            </div>
          </div>

          {error && (
            <div className="mb-6 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-[11px] font-bold text-center animate-in slide-in-from-top-2">
              {error}
            </div>
          )}

          {mode === 'admin' ? (
            <form onSubmit={handleAdminAuth} className="space-y-5">
              <div className="space-y-4">
                <div className="group">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1 group-focus-within:text-blue-500 transition-colors">
                    Admin ID
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="Enter Username"
                    className="w-full px-5 py-3.5 bg-slate-950/50 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none text-white placeholder:text-slate-700 transition-all text-sm font-medium shadow-inner"
                    value={managerUsername}
                    onChange={(e) => setManagerUsername(e.target.value)}
                  />
                </div>
                
                <div className="group">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1 group-focus-within:text-blue-500 transition-colors">
                    Passkey
                  </label>
                  <input
                    required
                    type="password"
                    maxLength={6}
                    placeholder="Enter 6-digit PIN"
                    className="w-full px-5 py-3.5 bg-slate-950/50 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none text-white placeholder:text-slate-700 transition-all text-sm font-medium shadow-inner tracking-widest"
                    value={managerPin}
                    onChange={(e) => setManagerPin(e.target.value)}
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 mt-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-2xl font-extrabold text-sm transition-all shadow-xl shadow-blue-900/40 flex items-center justify-center gap-3 active:scale-[0.98]"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : "Initialize Master Session"}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleClientAuth} className="space-y-5">
              <div className="space-y-4">
                <div className="group">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1 group-focus-within:text-blue-500 transition-colors">
                    Account Email
                  </label>
                  <input
                    required
                    type="email"
                    placeholder="client@company.com"
                    className="w-full px-5 py-3.5 bg-slate-950/50 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none text-white placeholder:text-slate-700 transition-all text-sm font-medium shadow-inner"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                  />
                </div>
                
                <div className="group">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1 group-focus-within:text-blue-500 transition-colors">
                    Portal Access PIN
                  </label>
                  <div className="relative">
                    <input
                      required
                      type="text"
                      inputMode="numeric"
                      placeholder="Enter your 6-digit PIN"
                      className="w-full px-5 py-3.5 bg-slate-950/50 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none text-white placeholder:text-slate-700 transition-all font-mono text-sm shadow-inner tracking-[0.5em] text-center"
                      value={clientPin}
                      onChange={handleClientPinChange}
                    />
                    <KeyIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700 pointer-events-none" />
                  </div>
                </div>
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-2xl font-extrabold text-sm transition-all shadow-xl shadow-blue-900/40 active:scale-[0.98] flex items-center justify-center gap-3"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>Verifying Identity...</span>
                  </>
                ) : "Access Dashboard"}
              </button>
              
              <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4 text-center">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
                  Confidential View Only Access
                </p>
              </div>
            </form>
          )}

          <div className="mt-8 pt-6 border-t border-slate-800/50 text-center">
             <p className="text-[9px] text-slate-600 font-medium italic leading-relaxed">
               Secure cloud-linked session. Data is encrypted and managed via the agency vault.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginView;

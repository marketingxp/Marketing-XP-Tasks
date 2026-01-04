
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { BoardData } from './types';

export interface SupabaseConfig {
  url: string;
  key: string;
}

// Default credentials for the Marketing XP project
const AUTO_URL = "https://lvuhcyhsyghezfvqdopp.supabase.co";
const AUTO_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2dWhjeWhzeWdoZXpmdnFkb3BwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzMzMTcwMSwiZXhwIjoyMDgyOTA3NzAxfQ.86VAm2r53ArZ0sGYppYz7o_04zEjTYCJnaYEFvODxpg";

const ENV_URL = (process.env as any).SUPABASE_URL || AUTO_URL;
const ENV_KEY = (process.env as any).SUPABASE_SERVICE_ROLE_KEY || (process.env as any).SUPABASE_ANON_KEY || AUTO_KEY;

let supabase: SupabaseClient | null = null;
let realtimeChannel: RealtimeChannel | null = null;

if (ENV_URL && ENV_KEY) {
  try {
    supabase = createClient(ENV_URL, ENV_KEY, {
      auth: { persistSession: false }
    });
    console.log("Supabase: Vault connection initialized.");
  } catch (e) {
    console.error("Supabase: Critical init failure.", e);
  }
}

export const initSupabase = (config: SupabaseConfig) => {
  if (!config.url || !config.key) return null;
  supabase = createClient(config.url, config.key, {
    auth: { persistSession: false }
  });
  return supabase;
};

export const getSupabase = () => supabase;

export const isAutoConnected = () => !!(ENV_URL && ENV_KEY);

/**
 * Dispatches an email via Supabase Edge Function.
 * Uses direct fetch for precise header control to avoid CORS "Failed to fetch" errors.
 */
export const dispatchEmailNotification = async (payload: {
  from: string;
  to: string;
  subject: string;
  html: string;
  resendKey: string;
}) => {
  // Use the correct function name: send-resend-email
  const targetUrl = `${ENV_URL}/functions/v1/rapid-function`;
  
  try {
    console.log("Email Dispatch: Contacting Edge Gateway...");
    
    const response = await fetch(targetUrl, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
        'apikey': ENV_KEY,
        'Authorization': `Bearer ${ENV_KEY}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Edge Function Error (${response.status}):`, errorText);
      return false;
    }

    const data = await response.json();
    if (data && data.id) {
      console.log("Email Dispatch: Delivered to Resend. ID:", data.id);
      return true;
    }

    console.warn("Email Dispatch: Partial success, no delivery ID found.", data);
    return false;
  } catch (e: any) {
    console.error("Email Dispatch: Critical network failure.", e.message);
    return false;
  }
};

export const syncBoardToSupabase = async (data: BoardData, username: string) => {
  const client = getSupabase();
  if (!client) return;

  const { error } = await client
    .from('agency_vault')
    .upsert({ 
      id: 'main_board', 
      content: data,
      updated_at: new Date().toISOString(),
      last_modified_by: username
    }, { onConflict: 'id' });

  if (error) {
    console.error("Sync Error:", error.message);
    throw error;
  }
};

export const fetchBoardFromSupabase = async (): Promise<BoardData | null> => {
  const client = getSupabase();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('agency_vault')
      .select('content')
      .eq('id', 'main_board')
      .maybeSingle();

    if (error) throw error;
    return data?.content as BoardData || null;
  } catch (err: any) {
    console.error("Fetch Error:", err.message);
    return null;
  }
};

export const subscribeToBoardChanges = (onUpdate: (data: BoardData) => void) => {
  const client = getSupabase();
  if (!client) return null;

  if (realtimeChannel) realtimeChannel.unsubscribe();

  realtimeChannel = client
    .channel('public:agency_vault')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'agency_vault', filter: 'id=eq.main_board' },
      (payload) => {
        if (payload.new && payload.new.content) {
          onUpdate(payload.new.content as BoardData);
        }
      }
    )
    .subscribe();

  return realtimeChannel;
};

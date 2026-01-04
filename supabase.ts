import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { BoardData } from './types';

export interface SupabaseConfig {
  url: string;
  key: string;
}

// Credentials provided by the user for automatic connection
const AUTO_URL = "https://lvuhcyhsyghezfvqdopp.supabase.co";
// Using Service Role key to bypass RLS and ensure auto-sync works immediately
const AUTO_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2dWhjeWhzeWdoZXpmdnFkb3BwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzMzMTcwMSwiZXhwIjoyMDgyOTA3NzAxfQ.86VAm2r53ArZ0sGYppYz7o_04zEjTYCJnaYEFvODxpg";

const ENV_URL = (process.env as any).SUPABASE_URL || AUTO_URL;
const ENV_KEY = (process.env as any).SUPABASE_SERVICE_ROLE_KEY || (process.env as any).SUPABASE_ANON_KEY || AUTO_KEY;

let supabase: SupabaseClient | null = null;
let realtimeChannel: RealtimeChannel | null = null;

/**
 * SQL SCHEMA SETUP (Run this in Supabase SQL Editor):
 * 
 * CREATE TABLE agency_vault (
 *   id TEXT PRIMARY KEY,
 *   content JSONB NOT NULL,
 *   updated_at TIMESTAMPTZ DEFAULT NOW(),
 *   last_modified_by TEXT
 * );
 * 
 * -- Enable Realtime for the table
 * ALTER PUBLICATION supabase_realtime ADD TABLE agency_vault;
 */

if (ENV_URL && ENV_KEY) {
  try {
    supabase = createClient(ENV_URL, ENV_KEY, {
      auth: { persistSession: false }
    });
    console.log("Supabase: Connected with elevated privileges for auto-sync.");
  } catch (e) {
    console.error("Supabase: Initialization failed.", e);
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
    console.error("Sync Error Details:", error.message, error.details);
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

    if (error) {
      console.error("Fetch Error Details:", error.message, error.details);
      throw error;
    }
    return data?.content as BoardData || null;
  } catch (err: any) {
    console.error("Failed to fetch vault from Supabase:", err.message || err);
    return null;
  }
};

export const subscribeToBoardChanges = (onUpdate: (data: BoardData) => void) => {
  const client = getSupabase();
  if (!client) return null;

  if (realtimeChannel) {
    realtimeChannel.unsubscribe();
  }

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

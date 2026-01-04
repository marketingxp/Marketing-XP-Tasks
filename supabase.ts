
/* 
IMPORTANT: To fix the "Failed to send a request" error, you MUST update your 
Supabase Edge Function (send-resend-email) with this code to handle CORS:

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { from, to, subject, html, resendKey } = await req.json()
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${resendKey}` },
      body: JSON.stringify({ from, to, subject, html }),
    })
    const data = await res.json()
    return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  }
})
*/

import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { BoardData, AppNotification } from './types';

export interface SupabaseConfig {
  url: string;
  key: string;
}

// Credentials provided for the Marketing XP project
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
 * Direct fetch is used to ensure maximum control over CORS and headers.
 */
export const dispatchEmailNotification = async (payload: {
  from: string;
  to: string;
  subject: string;
  html: string;
  resendKey: string;
}) => {
  const targetUrl = `${ENV_URL}/functions/v1/send-resend-email`;
  
  try {
    console.log("Email Dispatch: Attempting delivery...");
    
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
      console.error(`Edge Function Rejected Request (${response.status}):`, errorText);
      return false;
    }

    const data = await response.json();
    if (data && data.id) {
      console.log("Email Dispatch: Success. ID:", data.id);
      return true;
    }

    console.warn("Email Dispatch: Partial success (no ID returned).", data);
    return false;
  } catch (e: any) {
    console.error("Email Dispatch: Transport-level failure.", e.message);
    console.error("Diagnostic: If this is 'Failed to fetch', ensure the Edge Function has CORS headers and the URL is correct.");
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

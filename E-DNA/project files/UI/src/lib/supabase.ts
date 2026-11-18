// ========================================================
// DEEPDRISHTI SUPABASE CLIENT CONFIGURATION
// Safe client initialization adhering to strict security practices:
// - Uses public anon publishable key exclusively
// - Never exposes service-role keys
// - Gracefully detects missing configuration without breaking the app
// ========================================================

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

// Resolve environment variables across Vite and Node.js testing environments
const getEnvVar = (key: string): string | undefined => {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    const val = (import.meta as any).env[key];
    if (typeof val === 'string' && val.trim().length > 0) return val.trim();
  }
  const proc = (globalThis as any).process;
  if (proc && proc.env) {
    const val = proc.env[key];
    if (typeof val === 'string' && val.trim().length > 0) return val.trim();
  }
  return undefined;
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL') || getEnvVar('SUPABASE_URL');
const supabaseAnonKey =
  getEnvVar('VITE_SUPABASE_ANON_KEY') ||
  getEnvVar('VITE_SUPABASE_PUBLISHABLE_KEY') ||
  getEnvVar('SUPABASE_PUBLISHABLE_KEY');

export interface SupabaseConfigStatus {
  isConfigured: boolean;
  urlProvided: boolean;
  keyProvided: boolean;
  mode: 'supabase' | 'local';
}

/**
 * Check whether valid Supabase credentials are configured in environment
 */
export function isSupabaseConfigured(): boolean {
  if (!supabaseUrl || !supabaseAnonKey) return false;
  try {
    const parsed = new URL(supabaseUrl);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function getSupabaseConfigStatus(): SupabaseConfigStatus {
  const isConfigured = isSupabaseConfigured();
  return {
    isConfigured,
    urlProvided: Boolean(supabaseUrl),
    keyProvided: Boolean(supabaseAnonKey),
    mode: isConfigured ? 'supabase' : 'local',
  };
}

let clientInstance: SupabaseClient | null = null;

if (isSupabaseConfigured()) {
  try {
    clientInstance = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: typeof window !== 'undefined',
        autoRefreshToken: typeof window !== 'undefined',
        detectSessionInUrl: typeof window !== 'undefined',
      },
    });
  } catch (err) {
    console.warn('DeepDrishti: Failed to initialize Supabase client; falling back to local mode.', err);
    clientInstance = null;
  }
}

/**
 * The public Supabase client instance, or null if running in Local Mode.
 */
export const supabase: SupabaseClient | null = clientInstance;

/**
 * Accessor for the active client instance
 */
export function getSupabaseClient(): SupabaseClient | null {
  return supabase;
}

/**
 * Format raw technical errors from Supabase into human-readable, domain-appropriate messages
 */
export function formatSupabaseError(err: any): string {
  if (!err) return 'Unknown database error occurred.';
  const msg = typeof err === 'string' ? err : err.message || err.error_description || String(err);
  const lower = msg.toLowerCase();

  if (lower.includes('schema cache') || lower.includes('pgrst205') || lower.includes('could not find the table')) {
    return 'Database schema not initialized. Please execute supabase/migrations/001_initial_schema.sql in your Supabase SQL Editor to create tables.';
  }
  if (lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('network error')) {
    return 'Connection unavailable. Please verify your network connection and Supabase URL.';
  }
  if (lower.includes('jwt') || lower.includes('not authenticated') || lower.includes('auth')) {
    return 'Authentication required. Please sign in to perform this operation.';
  }
  if (lower.includes('row-level security') || lower.includes('permission denied')) {
    return 'Permission denied. Row-Level Security rejected this operation for the current researcher account.';
  }
  if (lower.includes('unique constraint') || lower.includes('duplicate key')) {
    return 'Database constraint violation. An expedition, sample, or ASV with this identifier already exists.';
  }
  if (lower.includes('foreign key') || lower.includes('violates foreign key')) {
    return 'Database integrity violation. Referenced record does not exist.';
  }
  if (!isSupabaseConfigured()) {
    return 'Invalid environment configuration. Cloud persistence requires valid VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.';
  }

  return `Database operation error: ${msg}`;
}

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

function isValidUrl(url: string): boolean {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

/**
 * Supabase client — returns null if credentials are missing/invalid so the
 * app can still build and run without Supabase configured.
 */
export const supabase: SupabaseClient | null =
    supabaseUrl && supabaseAnonKey && isValidUrl(supabaseUrl)
        ? createClient(supabaseUrl, supabaseAnonKey)
        : null;

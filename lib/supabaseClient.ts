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
 * Browser-safe Supabase client for auth operations.
 * Returns null if credentials are missing so the app can still build/run.
 */
export const supabaseBrowser: SupabaseClient | null =
    supabaseUrl && supabaseAnonKey && isValidUrl(supabaseUrl)
        ? createClient(supabaseUrl, supabaseAnonKey)
        : null;

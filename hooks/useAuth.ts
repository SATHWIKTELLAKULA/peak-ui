"use client";

import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabaseClient";

export function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!supabaseBrowser) {
            setLoading(false);
            return;
        }

        // Get initial session
        supabaseBrowser.auth.getSession().then(({ data }) => {
            setUser(data.session?.user ?? null);
            setLoading(false);
        });

        // Listen for changes
        const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    return { user, loading, isLoggedIn: !!user };
}

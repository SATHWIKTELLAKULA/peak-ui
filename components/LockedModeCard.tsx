"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Lock, Loader2, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";

function GoogleIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z" fill="#34A853" />
            <path d="M5.84 14.09A6.68 6.68 0 0 1 5.5 12c0-.72.13-1.43.34-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.93l3.66-2.84Z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z" fill="#EA4335" />
        </svg>
    );
}

function GitHubIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12Z" />
        </svg>
    );
}

export default function LockedModeCard() {
    const [loading, setLoading] = useState<"google" | "github" | null>(null);
    const [toast, setToast] = useState("");

    useEffect(() => {
        // Check for error params in URL (redirect back from OAuth)
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        if (params.get("error")) {
            setToast("Login cancelled. Feel free to explore Flash mode!");
            setTimeout(() => setToast(""), 6000);
        }
    }, []);

    const handleOAuth = async (provider: "google" | "github") => {
        if (!supabaseBrowser) return;
        setLoading(provider);
        await supabaseBrowser.auth.signInWithOAuth({
            provider,
            options: { redirectTo: `${window.location.origin}/` },
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl mx-auto rounded-3xl p-6 md:p-8 relative overflow-hidden border border-white/5 bg-black/40 backdrop-blur-xl"
        >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5 pointer-events-none" />

            <div className="flex flex-col items-center text-center relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-4 border border-white/10 shadow-[0_0_30px_rgba(124,58,237,0.15)]">
                    <Lock className="w-6 h-6 text-indigo-400" />
                </div>

                <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60 mb-2">
                    Unlock Premium Intelligence
                </h3>

                <p className="text-sm text-white/40 max-w-sm mb-8 leading-relaxed">
                    Sign in to access Pro Reasoning, Code Engineering, and Director Mode. Your journey effectively starts here.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
                    <button
                        onClick={() => handleOAuth("google")}
                        disabled={loading !== null}
                        className="flex-1 flex items-center justify-center gap-2.5 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                        {loading === "google" ? <Loader2 className="w-4 h-4 animate-spin text-indigo-400" /> : <GoogleIcon className="w-4 h-4" />}
                        <span className="text-sm font-medium text-white/90">{loading === "google" ? "Authenticating..." : "Google"}</span>
                    </button>

                    <button
                        onClick={() => handleOAuth("github")}
                        disabled={loading !== null}
                        className="flex-1 flex items-center justify-center gap-2.5 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                        {loading === "github" ? <Loader2 className="w-4 h-4 animate-spin text-indigo-400" /> : <GitHubIcon className="w-4 h-4 text-white/80" />}
                        <span className="text-sm font-medium text-white/90">{loading === "github" ? "Authenticating..." : "GitHub"}</span>
                    </button>
                </div>

                <AnimatePresence>
                    {toast && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute bottom-4 bg-red-500/10 border border-red-500/20 text-red-200 px-4 py-2 rounded-full text-xs flex items-center gap-2 backdrop-blur-md"
                        >
                            <AlertCircle className="w-3 h-3" />
                            {toast}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}

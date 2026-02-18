"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Lock, ShieldCheck } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabaseClient";

type Tab = "login" | "signup";

/* ── Inline SVG icons for Google & GitHub ── */
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

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
    const [tab, setTab] = useState<Tab>("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);
    const [oauthLoading, setOauthLoading] = useState<"google" | "github" | null>(null);
    const [showPrivacy, setShowPrivacy] = useState(false);

    /* ── Email / Password submit ── */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabaseBrowser) {
            setError("Auth is not configured. Add Supabase credentials to .env.local");
            return;
        }
        if (!email.trim() || !password.trim()) {
            setError("Email and password are required.");
            return;
        }

        setLoading(true);
        setError("");
        setSuccess("");

        try {
            if (tab === "signup") {
                const { error: signUpError } = await supabaseBrowser.auth.signUp({
                    email: email.trim(),
                    password,
                });
                if (signUpError) {
                    setError(signUpError.message);
                } else {
                    setSuccess("Account created! Check your email to confirm.");
                    setEmail("");
                    setPassword("");
                }
            } else {
                const { error: loginError } = await supabaseBrowser.auth.signInWithPassword({
                    email: email.trim(),
                    password,
                });
                if (loginError) {
                    setError(loginError.message);
                } else {
                    onClose();
                }
            }
        } catch {
            setError("An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    };

    /* ── OAuth (Google / GitHub) ── */
    const handleOAuth = async (provider: "google" | "github") => {
        if (!supabaseBrowser) {
            setError("Auth is not configured. Add Supabase credentials to .env.local");
            return;
        }

        setOauthLoading(provider);
        setError("");

        try {
            const { error: oauthError } = await supabaseBrowser.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: `${window.location.origin}/`,
                },
            });
            if (oauthError) {
                setError(oauthError.message);
                setOauthLoading(null);
            }
            // On success the browser redirects — spinner stays visible during the warp jump
        } catch {
            setError("Failed to start OAuth flow.");
            setOauthLoading(null);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    >
                        <div
                            className="pointer-events-auto w-full max-w-sm rounded-3xl p-6 relative"
                            style={{
                                background: "rgba(10, 10, 30, 0.85)",
                                backdropFilter: "blur(40px) saturate(1.5)",
                                WebkitBackdropFilter: "blur(40px) saturate(1.5)",
                                border: "1px solid rgba(168, 85, 247, 0.25)",
                                boxShadow: "0 0 60px rgba(168, 85, 247, 0.1), inset 0 0 30px rgba(0,0,0,0.3)",
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Close */}
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 text-[rgba(238,238,255,0.3)] hover:text-white transition-colors cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            {/* Tabs */}
                            <div className="flex gap-1 mb-5 p-1 rounded-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)]">
                                {(["login", "signup"] as Tab[]).map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => { setTab(t); setError(""); setSuccess(""); }}
                                        className={`
                                            flex-1 py-2 rounded-full text-sm font-medium
                                            transition-all duration-300 cursor-pointer
                                            ${tab === t
                                                ? "bg-[rgba(168,85,247,0.15)] text-[#a855f7] border border-[rgba(168,85,247,0.3)]"
                                                : "text-[rgba(238,238,255,0.35)] border border-transparent hover:text-[rgba(238,238,255,0.6)]"
                                            }
                                        `}
                                    >
                                        {t === "login" ? "Log In" : "Sign Up"}
                                    </button>
                                ))}
                            </div>

                            {/* ── Social Login Buttons ── */}
                            <div className="space-y-2.5 mb-5">
                                {/* Google */}
                                <motion.button
                                    onClick={() => handleOAuth("google")}
                                    disabled={oauthLoading !== null}
                                    className="
                                        w-full flex items-center justify-center gap-3 py-3 rounded-xl
                                        text-sm font-medium cursor-pointer
                                        transition-all duration-300
                                        disabled:opacity-50 disabled:cursor-not-allowed
                                    "
                                    style={{
                                        background: "rgba(255, 255, 255, 0.04)",
                                        backdropFilter: "blur(16px)",
                                        WebkitBackdropFilter: "blur(16px)",
                                        border: "1px solid rgba(255, 255, 255, 0.08)",
                                        color: "#eeeeff",
                                    }}
                                    whileHover={{
                                        scale: 1.02,
                                        borderColor: "rgba(66, 133, 244, 0.4)",
                                        boxShadow: "0 0 24px rgba(66, 133, 244, 0.12)",
                                    }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    {oauthLoading === "google" ? (
                                        <Loader2 className="w-5 h-5 animate-spin text-[#4285F4]" />
                                    ) : (
                                        <GoogleIcon className="w-5 h-5" />
                                    )}
                                    <span>{oauthLoading === "google" ? "Authenticating..." : "Continue with Google"}</span>
                                </motion.button>

                                {/* GitHub */}
                                <motion.button
                                    onClick={() => handleOAuth("github")}
                                    disabled={oauthLoading !== null}
                                    className="
                                        w-full flex items-center justify-center gap-3 py-3 rounded-xl
                                        text-sm font-medium cursor-pointer
                                        transition-all duration-300
                                        disabled:opacity-50 disabled:cursor-not-allowed
                                    "
                                    style={{
                                        background: "rgba(255, 255, 255, 0.04)",
                                        backdropFilter: "blur(16px)",
                                        WebkitBackdropFilter: "blur(16px)",
                                        border: "1px solid rgba(255, 255, 255, 0.08)",
                                        color: "#eeeeff",
                                    }}
                                    whileHover={{
                                        scale: 1.02,
                                        borderColor: "rgba(168, 85, 247, 0.35)",
                                        boxShadow: "0 0 24px rgba(168, 85, 247, 0.1)",
                                    }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    {oauthLoading === "github" ? (
                                        <Loader2 className="w-5 h-5 animate-spin text-[#a855f7]" />
                                    ) : (
                                        <GitHubIcon className="w-5 h-5 text-[rgba(238,238,255,0.7)]" />
                                    )}
                                    <span>{oauthLoading === "github" ? "Authenticating..." : "Continue with GitHub"}</span>
                                </motion.button>
                            </div>

                            {/* ── Divider ── */}
                            <div className="flex items-center gap-3 mb-5">
                                <div className="flex-1 h-px bg-[rgba(255,255,255,0.06)]" />
                                <span className="text-[10px] text-[rgba(238,238,255,0.2)] uppercase tracking-widest">or</span>
                                <div className="flex-1 h-px bg-[rgba(255,255,255,0.06)]" />
                            </div>

                            {/* ── Email / Password Form ── */}
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-xs text-[rgba(238,238,255,0.35)] mb-1.5 uppercase tracking-wider">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="
                                            w-full px-4 py-3 rounded-xl
                                            bg-[rgba(255,255,255,0.03)]
                                            border border-[rgba(255,255,255,0.06)]
                                            text-[#eeeeff] text-sm
                                            placeholder:text-[rgba(238,238,255,0.2)]
                                            outline-none
                                            focus:border-[rgba(168,85,247,0.4)]
                                            transition-colors duration-300
                                        "
                                        placeholder="you@example.com"
                                        autoComplete="email"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-[rgba(238,238,255,0.35)] mb-1.5 uppercase tracking-wider">
                                        Password
                                    </label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="
                                            w-full px-4 py-3 rounded-xl
                                            bg-[rgba(255,255,255,0.03)]
                                            border border-[rgba(255,255,255,0.06)]
                                            text-[#eeeeff] text-sm
                                            placeholder:text-[rgba(238,238,255,0.2)]
                                            outline-none
                                            focus:border-[rgba(168,85,247,0.4)]
                                            transition-colors duration-300
                                        "
                                        placeholder="••••••••"
                                        autoComplete={tab === "signup" ? "new-password" : "current-password"}
                                    />
                                </div>

                                {error && (
                                    <p className="text-xs text-red-400/80 bg-[rgba(239,68,68,0.08)] px-3 py-2 rounded-xl">
                                        {error}
                                    </p>
                                )}
                                {success && (
                                    <p className="text-xs text-emerald-400/80 bg-[rgba(16,185,129,0.08)] px-3 py-2 rounded-xl">
                                        {success}
                                    </p>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="
                                        w-full py-3 rounded-xl
                                        bg-gradient-to-r from-[#7c3aed] to-[#a855f7]
                                        text-white text-sm font-semibold
                                        hover:opacity-90 active:scale-[0.98]
                                        transition-all duration-200
                                        disabled:opacity-50 disabled:cursor-not-allowed
                                        cursor-pointer
                                    "
                                >
                                    {loading ? "Please wait..." : tab === "login" ? "Log In" : "Create Account"}
                                </button>

                                {/* Trust & Privacy Elements */}
                                <div className="mt-6 pt-0 border-t border-white/5 flex flex-col items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowPrivacy(!showPrivacy)}
                                        className="text-[10px] text-zinc-500 hover:text-zinc-300 underline underline-offset-2 transition-colors cursor-pointer flex items-center gap-1.5"
                                    >
                                        <ShieldCheck className="w-3 h-3" />
                                        Your Privacy
                                    </button>

                                    <AnimatePresence>
                                        {showPrivacy && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="w-full text-[10px] text-zinc-400 bg-white/5 rounded-lg p-3 text-center leading-relaxed overflow-hidden"
                                            >
                                                We only use your name & photo to personalize your experience. We do not sell your data.
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <p className="text-[9px] text-zinc-700 font-bold uppercase tracking-widest flex items-center gap-1.5 opacity-60">
                                        <Lock className="w-2.5 h-2.5" />
                                        Secured by Supabase & OAuth 2.0
                                    </p>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

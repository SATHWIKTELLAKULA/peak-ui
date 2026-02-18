"use client";

import { User } from "@supabase/supabase-js";
import { LogIn, LogOut } from "lucide-react";
import { motion } from "framer-motion";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

interface AuthButtonProps {
    onSignInClick: () => void;
}

export default function AuthButton({ onSignInClick }: AuthButtonProps) {
    const { user } = useAuth();

    const handleSignOut = async () => {
        if (!supabaseBrowser) return;
        await supabaseBrowser.auth.signOut();
    };

    /* Extract avatar URL from user metadata (Google/GitHub provide this) */
    const avatarUrl =
        user?.user_metadata?.avatar_url ||
        user?.user_metadata?.picture ||
        null;

    const displayName =
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        user?.email ||
        "User";

    if (user) {
        return (
            <motion.div
                className="flex items-center gap-2"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
            >
                {/* Profile Picture */}
                {avatarUrl ? (
                    <div
                        className="relative w-7 h-7 rounded-full overflow-hidden flex-shrink-0"
                        style={{
                            border: "1.5px solid rgba(168, 85, 247, 0.4)",
                            boxShadow: "0 0 12px rgba(168, 85, 247, 0.15)",
                        }}
                    >
                        <img
                            src={avatarUrl}
                            alt={displayName}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                        />
                    </div>
                ) : (
                    /* Fallback: initials avatar */
                    <div
                        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-[#a855f7]"
                        style={{
                            background: "rgba(168, 85, 247, 0.1)",
                            border: "1.5px solid rgba(168, 85, 247, 0.3)",
                        }}
                    >
                        {(displayName[0] || "U").toUpperCase()}
                    </div>
                )}

                {/* Name / Email */}
                <span className="text-xs text-[rgba(238,238,255,0.45)] max-w-[100px] truncate hidden sm:block font-medium">
                    {displayName}
                </span>

                {/* Sign Out Button */}
                <button
                    onClick={handleSignOut}
                    className="
                        flex items-center gap-1.5 px-3 py-2 rounded-full
                        bg-[rgba(255,255,255,0.03)]
                        border border-[rgba(255,255,255,0.06)]
                        text-[rgba(238,238,255,0.4)]
                        hover:text-[#eeeeff]
                        hover:border-[rgba(168,85,247,0.3)]
                        transition-all duration-300
                        text-xs font-medium cursor-pointer
                    "
                >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="text-xs">Sign Out</span>
                </button>
            </motion.div>
        );
    }

    return (
        <motion.button
            onClick={onSignInClick}
            className="
                flex items-center gap-1.5 px-3 py-2 rounded-full
                bg-[rgba(255,255,255,0.03)]
                border border-[rgba(255,255,255,0.06)]
                text-[rgba(238,238,255,0.4)]
                hover:text-[#eeeeff]
                hover:border-[rgba(168,85,247,0.3)]
                hover:bg-[rgba(168,85,247,0.06)]
                transition-all duration-300
                text-xs font-medium cursor-pointer
            "
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
        >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
        </motion.button>
    );
}

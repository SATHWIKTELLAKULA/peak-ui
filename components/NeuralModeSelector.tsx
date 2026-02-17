"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Zap, Brain, Palette, Lock, Image as ImageIcon, Eye, Clapperboard, Sparkles, Terminal } from "lucide-react";
import { useSettings, NeuralMode, CreativeSubMode } from "@/contexts/SettingsContext";
import { useState, useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { playInteractionSound } from "@/utils/audioManager";

const MODES: {
    id: NeuralMode;
    label: string;
    icon: typeof Zap;
    emoji: string;
    description: string;
    color: string;
    glowColor: string;
    requiresAuth: boolean;
}[] = [
        {
            id: "flash",
            label: "Flash",
            icon: Zap,
            emoji: "⚡",
            description: "Instant answers",
            color: "#06b6d4",
            glowColor: "rgba(6,182,212,0.25)",
            requiresAuth: false,
        },
        {
            id: "pro",
            label: "Pro",
            icon: Brain,
            emoji: "🧠",
            description: "Deep reasoning",
            color: "#7c3aed",
            glowColor: "rgba(124,58,237,0.25)",
            requiresAuth: false,
        },
        {
            id: "code",
            label: "Code",
            icon: Terminal,
            emoji: "💻",
            description: "Engineering",
            color: "#10b981",
            glowColor: "rgba(16,185,129,0.25)",
            requiresAuth: false,
        },
        {
            id: "creative",
            label: "Creative",
            icon: Palette,
            emoji: "🎨",
            description: "Multimedia Creation",
            color: "#ec4899",
            glowColor: "rgba(236,72,153,0.25)",
            requiresAuth: false,
        },
    ];

const SUBMODES: {
    id: CreativeSubMode;
    label: string;
    icon: typeof ImageIcon; // Generic type
    emoji: string;
}[] = [
        { id: "visualize", label: "Visualize", icon: ImageIcon, emoji: "🖼️" },
        { id: "analyze", label: "Analyze", icon: Eye, emoji: "👁️" },
        { id: "director", label: "Director", icon: Clapperboard, emoji: "🎬" },
    ];

export default function NeuralModeSelector() {
    const { neuralMode, setNeuralMode, creativeSubMode, setCreativeSubMode, videoQuality, setVideoQuality } = useSettings();
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);

    useEffect(() => {
        if (!supabaseBrowser) return;
        supabaseBrowser.auth.getSession().then(({ data }) => {
            setIsLoggedIn(!!data.session?.user);
        });
        const { data: listener } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
            setIsLoggedIn(!!session?.user);
        });
        return () => listener.subscription.unsubscribe();
    }, []);

    const handleSelect = (mode: typeof MODES[number]) => {
        if (mode.requiresAuth && !isLoggedIn) {
            setShowTooltip(true);
            setTimeout(() => setShowTooltip(false), 2500);
            return;
        }
        setNeuralMode(mode.id);
        playInteractionSound("click");
    };

    return (
        <div className="flex flex-col items-center gap-4 w-full max-w-2xl mx-auto mb-6">
            <p
                className="text-[10px] font-bold tracking-[0.25em] uppercase text-[rgba(238,238,255,0.2)]"
                style={{ fontFamily: "var(--font-orbitron), sans-serif" }}
            >
                Neural Mode
            </p>

            <div className="relative p-[1px] rounded-2xl bg-gradient-to-b from-white/20 via-white/5 to-transparent w-full">
                <div className="flex flex-col md:flex-row items-center justify-between gap-2 p-1.5 rounded-[calc(1rem-1px)] bg-black/80 backdrop-blur-xl relative w-full md:w-auto">
                    {MODES.map((mode) => {
                        const Icon = mode.icon;
                        const isSelected = neuralMode === mode.id;
                        const isLocked = mode.requiresAuth && !isLoggedIn;

                        return (
                            <motion.button
                                key={mode.id}
                                type="button"
                                onClick={() => handleSelect(mode)}
                                className={`
                                relative flex items-center justify-center gap-3 px-4 py-3 md:py-2 rounded-xl
                                text-sm md:text-xs font-medium cursor-pointer w-full md:w-auto flex-1
                                min-h-[48px] md:min-h-[auto]
                                transition-colors duration-200
                                ${isSelected
                                        ? "text-white"
                                        : isLocked
                                            ? "text-[rgba(238,238,255,0.15)]"
                                            : "text-[rgba(238,238,255,0.35)] hover:text-[rgba(238,238,255,0.55)]"
                                    }
                            `}
                                animate={{
                                    background: isSelected ? `${mode.glowColor}` : "transparent",
                                    boxShadow: isSelected
                                        ? `0 0 20px ${mode.glowColor}, inset 0 0 12px rgba(255,255,255,0.05)`
                                        : "none",
                                }}
                                transition={{ duration: 0.3 }}
                                whileHover={!isSelected ? { scale: 1.02 } : {}}
                                whileTap={{ scale: 0.95 }}
                            >
                                <span className="text-lg md:text-sm">{mode.emoji}</span>
                                <Icon className="w-5 h-5 md:w-3.5 md:h-3.5" style={isSelected ? { color: mode.color, filter: `drop-shadow(0 0 6px ${mode.color})` } : {}} />
                                <span>{mode.label}</span>

                                {/* PRO badge */}
                                {mode.requiresAuth && (
                                    <span
                                        className="text-[10px] md:text-[8px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider ml-auto md:ml-0"
                                        style={{
                                            background: isSelected ? "rgba(255,255,255,0.15)" : "rgba(124,58,237,0.15)",
                                            color: isSelected ? "#fff" : "#7c3aed",
                                            border: `1px solid ${isSelected ? "rgba(255,255,255,0.2)" : "rgba(124,58,237,0.25)"}`,
                                        }}
                                    >
                                        {isLocked ? <Lock className="w-3 h-3 md:w-2.5 md:h-2.5 inline" /> : "PRO"}
                                    </span>
                                )}
                            </motion.button>
                        );
                    })}

                    {/* Auth tooltip */}
                    {showTooltip && (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="absolute -bottom-12 left-1/2 -translate-x-1/2 whitespace-nowrap
                            px-4 py-2 rounded-lg text-xs font-medium
                            bg-[rgba(124,58,237,0.15)] border border-[rgba(124,58,237,0.3)]
                            text-[#a78bfa] backdrop-blur-xl z-20 shadow-xl"
                        >
                            🔒 Login to unlock Pro Mode
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Creative Hub Sub-Menu */}
            <AnimatePresence>
                {neuralMode === "creative" && (
                    <motion.div
                        initial={{ opacity: 0, height: 0, y: -10 }}
                        animate={{ opacity: 1, height: "auto", y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -10 }}
                        className="flex items-center gap-2 overflow-hidden"
                    >
                        {SUBMODES.map((sub) => {
                            const Icon = sub.icon;
                            const isActive = creativeSubMode === sub.id;
                            return (
                                <motion.button
                                    key={sub.id}
                                    onClick={() => {
                                        setCreativeSubMode(sub.id);
                                        playInteractionSound("click");
                                    }}
                                    className={`
                                        flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border
                                        transition-all duration-300
                                        ${isActive
                                            ? "bg-pink-500/20 border-pink-500/40 text-pink-200 shadow-[0_0_15px_rgba(236,72,153,0.3)]"
                                            : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white/70"
                                        }
                                    `}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <span>{sub.emoji}</span>
                                    <span>{sub.label}</span>
                                </motion.button>
                            );
                        })}

                        {/* HQ Toggle for Director Mode */}
                        {creativeSubMode === "director" && (
                            <motion.button
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                onClick={() => {
                                    setVideoQuality(videoQuality === "hq" ? "standard" : "hq");
                                    playInteractionSound("click");
                                }}
                                className={`
                                    flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ml-auto
                                    transition-all duration-300 uppercase tracking-wider
                                    ${videoQuality === "hq"
                                        ? "bg-purple-500/20 border-purple-500/40 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                                        : "bg-white/5 border-white/10 text-white/30 hover:bg-white/10 hover:text-white/50"
                                    }
                                `}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <span className={videoQuality === "hq" ? "animate-pulse" : ""}>HQ</span>
                                {videoQuality === "hq" && <Sparkles className="w-3 h-3" />}
                            </motion.button>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Mode description */}
            <motion.p
                key={neuralMode}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[11px] text-[rgba(238,238,255,0.2)]"
            >
                {MODES.find((m) => m.id === neuralMode)?.description}
            </motion.p>
        </div>
    );
}

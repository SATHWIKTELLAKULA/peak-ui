"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Palette, MessageSquare, Volume2, Globe, Cpu } from "lucide-react";
import { useSettings, BgPreset, ResponseLength, VoiceGender, Language, CelestialTheme } from "@/contexts/SettingsContext";
import { playInteractionSound } from "@/utils/audioManager";

const BG_PRESETS: { key: BgPreset; name: string; desc: string; colors: string[] }[] = [
    {
        key: "nebula-core",
        name: "Nebula Core",
        desc: "Swirling cosmic clouds",
        colors: ["#7c3aed", "#6366f1", "#a855f7"],
    },
    {
        key: "black-hole",
        name: "Black Hole Horizon",
        desc: "Dark & mysterious",
        colors: ["#0f0f1a", "#1a1a2e", "#f97316"],
    },
    {
        key: "supernova",
        name: "Supernova Burst",
        desc: "Energetic cosmic explosion",
        colors: ["#f97316", "#eab308", "#ef4444"],
    },
];

interface SettingsDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SettingsDrawer({ isOpen, onClose }: SettingsDrawerProps) {
    const { bgPreset, setBgPreset, responseLength, setResponseLength, voiceGender, setVoiceGender, language, setLanguage, celestialTheme, setCelestialTheme } = useSettings();

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />

                    {/* Drawer */}
                    <motion.aside
                        className="fixed top-0 right-0 h-full w-80 sm:w-96 z-50 overflow-y-auto"
                        style={{
                            background: "rgba(5, 5, 10, 0.6)",
                            backdropFilter: "blur(40px) saturate(1.8)",
                            WebkitBackdropFilter: "blur(40px) saturate(1.8)",
                            borderLeft: "1px solid rgba(255, 255, 255, 0.1)",
                            boxShadow: "-20px 0 60px rgba(0,0,0,0.8), -1px 0 0 rgba(255,255,255,0.1)",
                        }}
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    >
                        <div className="p-6 space-y-8">
                            {/* Header */}
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-[#eeeeff] tracking-tight">Settings</h2>
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-xl text-[rgba(238,238,255,0.3)] hover:text-white hover:bg-[rgba(255,255,255,0.05)] transition-all cursor-pointer"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* ── Background Presets ── */}
                            <section>
                                <div className="flex items-center gap-2 mb-4">
                                    <Palette className="w-4 h-4 text-[#a855f7]" />
                                    <h3 className="text-sm font-semibold text-[rgba(238,238,255,0.5)] uppercase tracking-wider">
                                        Background
                                    </h3>
                                </div>
                                <div className="space-y-2">
                                    {BG_PRESETS.map((preset) => (
                                        <motion.button
                                            key={preset.key}
                                            onClick={() => setBgPreset(preset.key)}
                                            className={`
                                                w-full flex items-center gap-3 p-3 rounded-2xl
                                                transition-all duration-300 text-left cursor-pointer
                                                ${bgPreset === preset.key
                                                    ? "bg-[rgba(168,85,247,0.1)] border border-[rgba(168,85,247,0.3)]"
                                                    : "bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] hover:border-[rgba(168,85,247,0.15)]"
                                                }
                                            `}
                                            whileHover={{ scale: 1.01 }}
                                            whileTap={{ scale: 0.99 }}
                                        >
                                            {/* Color preview */}
                                            <div className="flex -space-x-1.5 flex-shrink-0">
                                                {preset.colors.map((c, i) => (
                                                    <div
                                                        key={i}
                                                        className="w-5 h-5 rounded-full border-2 border-[rgba(0,0,0,0.3)]"
                                                        style={{ backgroundColor: c }}
                                                    />
                                                ))}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-[#eeeeff]">{preset.name}</p>
                                                <p className="text-xs text-[rgba(238,238,255,0.3)]">{preset.desc}</p>
                                            </div>
                                            {bgPreset === preset.key && (
                                                <div className="ml-auto w-2 h-2 rounded-full bg-[#a855f7]" />
                                            )}
                                        </motion.button>
                                    ))}
                                </div>
                            </section>

                            {/* ── Holographic Core Theme ── */}
                            <section>
                                <div className="flex items-center gap-2 mb-4">
                                    <Cpu className="w-4 h-4 text-[#a855f7]" />
                                    <h3 className="text-sm font-semibold text-[rgba(238,238,255,0.5)] uppercase tracking-wider">
                                        Holographic Core
                                    </h3>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { id: "neural", label: "Neural Net", icon: "🌐" },
                                        { id: "galaxy", label: "Spiral Galaxy", icon: "🌌" },
                                        { id: "planet", label: "Tactical Planet", icon: "🌍" },
                                        { id: "sun", label: "Stellar Core", icon: "☀️" },
                                    ].map((theme) => (
                                        <button
                                            key={theme.id}
                                            onClick={() => {
                                                setCelestialTheme(theme.id as CelestialTheme);
                                                playInteractionSound("hologram");
                                            }}
                                            className={`
                                                flex items-center gap-2 py-2.5 px-3 rounded-xl text-sm font-medium
                                                transition-all duration-300 cursor-pointer
                                                ${celestialTheme === theme.id
                                                    ? "bg-[rgba(168,85,247,0.15)] text-[#a855f7] border border-[rgba(168,85,247,0.3)]"
                                                    : "bg-[rgba(255,255,255,0.02)] text-[rgba(238,238,255,0.35)] border border-[rgba(255,255,255,0.04)] hover:text-[rgba(238,238,255,0.6)]"
                                                }
                                            `}
                                        >
                                            <span className="text-base">{theme.icon}</span>
                                            {theme.label}
                                        </button>
                                    ))}
                                </div>
                            </section>

                            {/* ── AI Response Length ── */}
                            <section>
                                <div className="flex items-center gap-2 mb-4">
                                    <MessageSquare className="w-4 h-4 text-[#a855f7]" />
                                    <h3 className="text-sm font-semibold text-[rgba(238,238,255,0.5)] uppercase tracking-wider">
                                        AI Response Length
                                    </h3>
                                </div>
                                <div className="flex gap-2">
                                    {(["concise", "detailed"] as ResponseLength[]).map((opt) => (
                                        <button
                                            key={opt}
                                            onClick={() => setResponseLength(opt)}
                                            className={`
                                                flex-1 py-2.5 rounded-xl text-sm font-medium
                                                transition-all duration-300 cursor-pointer capitalize
                                                ${responseLength === opt
                                                    ? "bg-[rgba(168,85,247,0.15)] text-[#a855f7] border border-[rgba(168,85,247,0.3)]"
                                                    : "bg-[rgba(255,255,255,0.02)] text-[rgba(238,238,255,0.35)] border border-[rgba(255,255,255,0.04)] hover:text-[rgba(238,238,255,0.6)]"
                                                }
                                            `}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </section>

                            {/* ── Language ── */}
                            <section>
                                <div className="flex items-center gap-2 mb-4">
                                    <Globe className="w-4 h-4 text-[#a855f7]" />
                                    <h3 className="text-sm font-semibold text-[rgba(238,238,255,0.5)] uppercase tracking-wider">
                                        Language & Region
                                    </h3>
                                </div>
                                <div className="flex gap-2">
                                    {(["en", "te", "hi"] as Language[]).map((lang) => (
                                        <button
                                            key={lang}
                                            onClick={() => setLanguage(lang)}
                                            className={`
                                                flex-1 py-2.5 rounded-xl text-sm font-medium
                                                transition-all duration-300 cursor-pointer capitalize
                                                ${language === lang
                                                    ? "bg-[rgba(168,85,247,0.15)] text-[#a855f7] border border-[rgba(168,85,247,0.3)]"
                                                    : "bg-[rgba(255,255,255,0.02)] text-[rgba(238,238,255,0.35)] border border-[rgba(255,255,255,0.04)] hover:text-[rgba(238,238,255,0.6)]"
                                                }
                                            `}
                                        >
                                            {lang === "en" ? "English" : lang === "te" ? "Telugu" : "Hindi"}
                                        </button>
                                    ))}
                                </div>
                            </section>

                            {/* ── Voice Selection ── */}
                            <section>
                                <div className="flex items-center gap-2 mb-4">
                                    <Volume2 className="w-4 h-4 text-[#a855f7]" />
                                    <h3 className="text-sm font-semibold text-[rgba(238,238,255,0.5)] uppercase tracking-wider">
                                        Voice
                                    </h3>
                                </div>
                                <div className="flex gap-2">
                                    {(["male", "female"] as VoiceGender[]).map((opt) => (
                                        <button
                                            key={opt}
                                            onClick={() => setVoiceGender(opt)}
                                            className={`
                                                flex-1 py-2.5 rounded-xl text-sm font-medium
                                                transition-all duration-300 cursor-pointer capitalize
                                                ${voiceGender === opt
                                                    ? "bg-[rgba(168,85,247,0.15)] text-[#a855f7] border border-[rgba(168,85,247,0.3)]"
                                                    : "bg-[rgba(255,255,255,0.02)] text-[rgba(238,238,255,0.35)] border border-[rgba(255,255,255,0.04)] hover:text-[rgba(238,238,255,0.6)]"
                                                }
                                            `}
                                        >
                                            {opt === "male" ? "Male Voice" : "Female Voice"}
                                        </button>
                                    ))}
                                </div>
                            </section>
                        </div>
                    </motion.aside>
                </>
            )}
        </AnimatePresence>
    );
}

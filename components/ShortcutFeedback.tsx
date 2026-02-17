"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Command, CornerDownLeft, ArrowLeft, ArrowRight, X } from "lucide-react";

export type ShortcutKey = "ctrl+k" | "enter" | "esc" | "left" | "right";

export default function ShortcutFeedback() {
    const [activeKey, setActiveKey] = useState<{ key: ShortcutKey; label: string } | null>(null);

    useEffect(() => {
        const handleShortcut = (e: CustomEvent<{ key: ShortcutKey; label: string }>) => {
            setActiveKey(e.detail);
            setTimeout(() => setActiveKey(null), 800);
        };

        window.addEventListener("peak-shortcut" as any, handleShortcut as any);
        return () => window.removeEventListener("peak-shortcut" as any, handleShortcut as any);
    }, []);

    return (
        <AnimatePresence>
            {activeKey && (
                <motion.div
                    className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2 rounded-xl bg-[rgba(16,16,24,0.8)] border border-[rgba(255,255,255,0.08)] backdrop-blur-md shadow-2xl"
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                >
                    <div className="flex items-center gap-1.5 text-[#eeeeff] font-mono text-sm font-medium">
                        {activeKey.key === "ctrl+k" && (
                            <>
                                <Command className="w-3.5 h-3.5 text-[#a855f7]" />
                                <span>K</span>
                            </>
                        )}
                        {activeKey.key === "enter" && (
                            <>
                                <span>Run</span>
                                <CornerDownLeft className="w-3.5 h-3.5 text-[#a855f7]" />
                            </>
                        )}
                        {activeKey.key === "esc" && (
                            <>
                                <span>Esc</span>
                                <X className="w-3.5 h-3.5 text-red-400" />
                            </>
                        )}
                        {activeKey.key === "left" && <ArrowLeft className="w-4 h-4 text-[#06b6d4]" />}
                        {activeKey.key === "right" && <ArrowRight className="w-4 h-4 text-[#ec4899]" />}

                        {(activeKey.key === "left" || activeKey.key === "right") && (
                            <span className="opacity-70 ml-1">{activeKey.label}</span>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

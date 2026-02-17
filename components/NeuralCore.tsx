"use client";

import { motion } from "framer-motion";

export default function NeuralCore({ isTyping = false }: { isTyping?: boolean }) {
    const duration = isTyping ? 3 : 10; // 3x speedup approximately

    return (
        <div className="relative flex items-center justify-center w-full h-full">
            {/* Core Glow - Breathing */}
            <motion.div
                className="absolute w-32 h-32 rounded-full bg-[radial-gradient(circle,var(--accent-glow)_0%,transparent_70%)] blur-[40px]"
                animate={{ scale: [1, 1.2, 1], opacity: [0.6, 0.9, 0.6] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Inner Ring - Clockwise */}
            <motion.svg
                className="absolute w-44 h-44 text-[var(--accent-primary)] opacity-60"
                viewBox="0 0 100 100"
                fill="none"
                animate={{ rotate: 360 }}
                transition={{ duration: duration, repeat: Infinity, ease: "linear" }}
            >
                <circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="0.5" strokeDasharray="10 15" strokeOpacity="0.5" />
                <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="0.2" strokeDasharray="4 4" />
            </motion.svg>

            {/* Outer Ring - Counter-Clockwise */}
            <motion.svg
                className="absolute w-64 h-64 text-[var(--accent-primary)] opacity-30"
                viewBox="0 0 100 100"
                fill="none"
                animate={{ rotate: -360 }}
                transition={{ duration: duration * 1.5, repeat: Infinity, ease: "linear" }}
            >
                <circle cx="50" cy="50" r="49" stroke="currentColor" strokeWidth="0.3" strokeDasharray="20 20" />
                <path d="M50 1 A49 49 0 0 1 99 50" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
            </motion.svg>

            {/* Floating Data Points */}
            <motion.div
                className="absolute w-2 h-2 bg-white rounded-full shadow-[0_0_10px_white]"
                animate={{ rotate: 360, x: [0, 60, 0], y: [0, -60, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
            />
        </div>
    );
}

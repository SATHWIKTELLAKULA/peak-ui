"use client";

import { motion } from "framer-motion";

export default function Footer() {
    return (
        <motion.footer
            // Relative position to ensure it sits at the bottom of the document flow
            className="w-full relative py-8 flex flex-col items-center justify-center pointer-events-none z-50 overflow-hidden"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 0.4 }}
            viewport={{ once: false, margin: "-50px" }}
            transition={{ duration: 1 }}
        >
            <GlitchText />
        </motion.footer>
    );
}

function GlitchText() {
    return (
        <div className="relative group">
            <p
                className="text-[10px] sm:text-xs font-mono tracking-[0.3em] text-[#a1a1aa] uppercase select-none relative z-10"
                style={{
                    textShadow: "0 0 5px rgba(255,255,255,0.2)"
                }}
            >
                // SYSTEM ARCHITECT: SATHWIK TELLAKULA // CLEARANCE LEVEL: 01
            </p>

            {/* Red Shift Layer */}
            <motion.p
                className="absolute inset-0 text-[10px] sm:text-xs font-mono tracking-[0.3em] text-red-500/50 uppercase select-none mix-blend-screen z-0"
                animate={{
                    x: [-1, 1, -2, 0],
                    opacity: [0, 0.5, 0]
                }}
                transition={{
                    duration: 0.2,
                    repeat: Infinity,
                    repeatDelay: 5, // Glitch every 5 seconds
                    ease: "linear"
                }}
            >
                 // SYSTEM ARCHITECT: SATHWIK TELLAKULA // CLEARANCE LEVEL: 01
            </motion.p>

            {/* Cyan Shift Layer */}
            <motion.p
                className="absolute inset-0 text-[10px] sm:text-xs font-mono tracking-[0.3em] text-cyan-500/50 uppercase select-none mix-blend-screen z-0"
                animate={{
                    x: [1, -1, 2, 0],
                    opacity: [0, 0.5, 0]
                }}
                transition={{
                    duration: 0.2,
                    repeat: Infinity,
                    repeatDelay: 5,
                    delay: 0.05,
                    ease: "linear"
                }}
            >
                 // SYSTEM ARCHITECT: SATHWIK TELLAKULA // CLEARANCE LEVEL: 01
            </motion.p>
        </div>
    );
}

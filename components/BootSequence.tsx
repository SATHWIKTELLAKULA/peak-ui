"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ── AAA Specs ── */
const PARTICLE_COUNT = 400;
const DURATION_WARP = 2500; // 2.5s
const TIME_SLAM = 2800; // 2.8s
const TIME_GLITCH = 2800; // Starts at slam
const TIME_UI_FADE = 3500; // 3.5s

interface Particle {
    x: number;
    y: number;
    z: number;
    angle: number;
}

export default function BootSequence({ onComplete }: { onComplete?: () => void }) {
    const [showIntro, setShowIntro] = useState(true);
    const [terminalLines, setTerminalLines] = useState<string[]>([]);
    const [flash, setFlash] = useState(false);
    const [glitchActive, setGlitchActive] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rafRef = useRef<number>(0);

    // Session Guard
    useEffect(() => {
        if (sessionStorage.getItem("introPlayed")) {
            setShowIntro(false);
            if (onComplete) onComplete();
        }
    }, [onComplete]);

    // Timeline
    useEffect(() => {
        if (!showIntro) return;

        const startTime = performance.now();
        const ctx = canvasRef.current?.getContext("2d");

        // Initialize Particles
        const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, () => ({
            x: (Math.random() - 0.5) * window.innerWidth,
            y: (Math.random() - 0.5) * window.innerHeight,
            z: Math.random() * 2000 + 100, // Z depth
            angle: Math.random() * Math.PI * 2
        }));

        const animate = (time: number) => {
            if (!ctx) return;
            const elapsed = time - startTime;
            const width = window.innerWidth;
            const height = window.innerHeight;
            const cx = width / 2;
            const cy = height / 2;

            // Clear
            ctx.fillStyle = "#000";
            ctx.fillRect(0, 0, width, height);

            // Warp Physics
            if (elapsed < TIME_SLAM) {
                // Exponential velocity: e^(t)
                // Normalize t (0 to 1) over DURATION_WARP
                const progress = Math.min(1, elapsed / DURATION_WARP);
                const velocity = 20 + Math.pow(progress, 3) * 1500; // 20 -> 1520 speed

                ctx.lineWidth = 2;
                ctx.lineCap = "round";

                particles.forEach(p => {
                    // Move towards camera
                    p.z -= velocity * 0.16; // delta time approx 16ms

                    if (p.z <= 1) {
                        p.z = 2000;
                        p.x = (Math.random() - 0.5) * width;
                        p.y = (Math.random() - 0.5) * height;
                    }

                    // Perspective Projection
                    const scale = 500 / p.z;
                    const x2d = cx + p.x * scale;
                    const y2d = cy + p.y * scale;

                    // Trail / Blur
                    // Previous position based on velocity
                    const prevScale = 500 / (p.z + velocity * 0.5); // Stretch factor
                    const prevX = cx + p.x * prevScale;
                    const prevY = cy + p.y * prevScale;

                    // Color - Blue/Violet to White at high speed
                    const alpha = Math.min(1, (2000 - p.z) / 1000);
                    const colorVal = Math.min(255, 100 + velocity * 0.5);

                    ctx.strokeStyle = `rgba(${colorVal}, ${colorVal}, 255, ${alpha})`;
                    ctx.beginPath();
                    ctx.moveTo(prevX, prevY);
                    ctx.lineTo(x2d, y2d);
                    ctx.stroke();
                });
            } else {
                // Frozen state just before flash (optional)
                // We don't verify what happens here as particles just stop updating
            }

            if (elapsed < TIME_UI_FADE + 1000) {
                rafRef.current = requestAnimationFrame(animate);
            }
        };

        rafRef.current = requestAnimationFrame(animate);

        // Terminal Sequence
        const lines = [
            { text: "> BOOTING PEAK_AI_CORE...", time: 500 },
            { text: "> BYPASSING MAINFRAME...", time: 1200 },
            { text: "> SATHWIK_PROTOCOL: ENGAGED.", time: 2000 }
        ];

        lines.forEach(line => {
            setTimeout(() => {
                setTerminalLines(prev => [...prev, line.text]);
            }, line.time);
        });

        // Slam & Flash
        setTimeout(() => {
            setFlash(true);
            setGlitchActive(true);
        }, TIME_SLAM);

        // UI Fade In / End
        setTimeout(() => {
            setShowIntro(false);
            sessionStorage.setItem("introPlayed", "true");
            if (onComplete) onComplete();
        }, TIME_UI_FADE);

        return () => cancelAnimationFrame(rafRef.current);
    }, [showIntro, onComplete]);

    if (!isMounted || !showIntro) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-[100] bg-black overflow-hidden font-mono"
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
            >
                {/* 1. Warp Drive Canvas */}
                <canvas
                    ref={canvasRef}
                    width={typeof window !== "undefined" ? window.innerWidth : 1920}
                    height={typeof window !== "undefined" ? window.innerHeight : 1080}
                    className="absolute inset-0"
                />

                {/* 2. Terminal Boot Text */}
                <div className="absolute bottom-8 left-8 flex flex-col gap-1 z-10 mix-blend-screen">
                    {terminalLines.map((line, i) => (
                        <motion.span
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="text-xs sm:text-sm font-bold text-green-500 tracking-wider"
                            style={{ textShadow: "0 0 5px rgba(34, 197, 94, 0.8)" }}
                        >
                            {line}
                        </motion.span>
                    ))}
                </div>

                {/* 3. White Flash Slam */}
                <AnimatePresence>
                    {flash && (
                        <motion.div
                            className="absolute inset-0 bg-white z-20 pointer-events-none"
                            initial={{ opacity: 1 }}
                            animate={{ opacity: 0 }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                        />
                    )}
                </AnimatePresence>

                {/* 4. Glitch Reveal */}
                <AnimatePresence>
                    {glitchActive && (
                        <motion.div
                            className="absolute inset-0 z-30 flex flex-col items-center justify-center pointer-events-none"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }} // Quick appear
                        >
                            {/* Glitch Logic: Rapid CSS keyframes or just stylized rendering */}
                            <div className="relative group">
                                <motion.div
                                    className="relative z-10 flex flex-col items-center"
                                    animate={{
                                        x: [-2, 2, -1, 0],
                                        y: [1, -1, 0],
                                        filter: ["hue-rotate(0deg)", "hue-rotate(90deg)", "hue-rotate(0deg)"]
                                    }}
                                    transition={{ duration: 0.3, ease: "linear" }}
                                >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src="/icon.png" alt="Peak AI" className="w-24 h-24 mb-6 drop-shadow-[0_0_30px_rgba(6,182,212,0.6)]" />

                                    <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tighter"
                                        style={{ fontFamily: "var(--font-orbitron), sans-serif", letterSpacing: "0.1em" }}>
                                        PEAK AI
                                    </h1>
                                    <p className="mt-2 text-sm text-cyan-400 tracking-[0.4em] font-medium"
                                        style={{ textShadow: "0 0 10px rgba(6,182,212,0.8)" }}>
                                        DEVELOPED BY SATHWIK
                                    </p>
                                </motion.div>

                                {/* Red/Cyan Glitch Layers */}
                                <div className="absolute inset-0 z-0 opacity-50 translate-x-[2px] text-red-500 mix-blend-screen flex flex-col items-center">
                                    <div className="w-24 h-24 mb-6" /> {/* Spacer */}
                                    <h1 className="text-4xl md:text-5xl font-bold tracking-tighter" style={{ fontFamily: "var(--font-orbitron), sans-serif", letterSpacing: "0.1em" }}>PEAK AI</h1>
                                    <p className="mt-2 text-sm tracking-[0.4em] font-medium">DEVELOPED BY SATHWIK</p>
                                </div>
                                <div className="absolute inset-0 z-0 opacity-50 -translate-x-[2px] text-cyan-500 mix-blend-screen flex flex-col items-center">
                                    <div className="w-24 h-24 mb-6" /> {/* Spacer */}
                                    <h1 className="text-4xl md:text-5xl font-bold tracking-tighter" style={{ fontFamily: "var(--font-orbitron), sans-serif", letterSpacing: "0.1em" }}>PEAK AI</h1>
                                    <p className="mt-2 text-sm tracking-[0.4em] font-medium">DEVELOPED BY SATHWIK</p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

            </motion.div>
        </AnimatePresence>
    );
}

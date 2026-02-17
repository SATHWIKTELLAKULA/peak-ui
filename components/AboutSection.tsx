
"use client";

import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring, useMotionTemplate } from "framer-motion";
import { playInteractionSound } from "@/utils/audioManager";
import { Zap, Shield, Cpu, Globe } from "lucide-react";
import { useSettings, CelestialTheme } from "@/contexts/SettingsContext";
import NeuralCore from "./NeuralCore";
import InterviewerMode from "./InterviewerMode";

// IMAGES Removed for Year 2199 Overhaul
// const THEME_IMAGES: Record<CelestialTheme, string> = {
//     neural: neuralImg.src,
//     galaxy: galaxyImg.src,
//     planet: planetImg.src,
//     sun: sunImg.src,
// };

const SKILLS = [
    { label: "Next.js", angle: 0 },
    { label: "Groq", angle: 60 },
    { label: "Supabase", angle: 120 },
    { label: "Data Science", angle: 180 },
    { label: "TypeScript", angle: 240 },
    { label: "Neural Nets", angle: 300 },
];

export default function AboutSection({ isTyping = false }: { isTyping?: boolean }) {
    const { celestialTheme } = useSettings();
    const sectionRef = useRef<HTMLElement>(null);
    const [mounted, setMounted] = useState(false);
    const [showInterviewer, setShowInterviewer] = useState(false);
    const [bootGlow, setBootGlow] = useState(false);

    useEffect(() => {
        const handleBoot = () => {
            setBootGlow(true);
            setTimeout(() => setBootGlow(false), 2000); // Pulse for 2s
        };
        window.addEventListener("peak-boot", handleBoot);
        return () => window.removeEventListener("peak-boot", handleBoot);
    }, []);

    /* Mouse Parallax Logic - Moved to Top for Hydration Safety */
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const mouseX = useSpring(x, { stiffness: 100, damping: 20 });
    const mouseY = useSpring(y, { stiffness: 100, damping: 20 });

    const rotateX = useTransform(mouseY, [-300, 300], [5, -5]); // Tilt X based on Y axis
    const rotateY = useTransform(mouseX, [-300, 300], [-5, 5]); // Tilt Y based on X axis

    // Core Parallax (Opposite shift for depth)
    const coreX = useTransform(mouseX, [-300, 300], [-15, 15]);
    const coreY = useTransform(mouseY, [-300, 300], [-15, 15]);

    /* Hydration Guard */
    useEffect(() => {
        setMounted(true);
    }, []);

    /* Mouse tracking for orb light shift */
    // useEffect(() => { // Removed
    //     const handleMouse = (e: MouseEvent) => {
    //         setMousePos({
    //             x: e.clientX / window.innerWidth,
    //             y: e.clientY / window.innerHeight,
    //         });
    //     };
    //     window.addEventListener("mousemove", handleMouse);
    //     return () => window.removeEventListener("mousemove", handleMouse);
    // }, []);

    /* Slow orbit rotation */
    // useEffect(() => { // Removed
    //     let frame: number;
    //     let angle = 0;
    //     const spin = () => {
    //         angle += 0.15;
    //         setOrbAngle(angle);
    //         frame = requestAnimationFrame(spin);
    //     };
    //     spin();
    //     return () => cancelAnimationFrame(frame);
    // }, []);

    // const orbShiftX = (mousePos.x - 0.5) * 30; // Removed
    // const orbShiftY = (mousePos.y - 0.5) * 30; // Removed

    if (!mounted) {
        return (
            <section className="relative w-full max-w-4xl mx-auto px-4 py-24 flex flex-col items-center text-center opacity-0 transition-opacity duration-300">
                <div className="w-64 h-64 mb-12 rounded-full border border-[rgba(168,85,247,0.1)]" />
                <div className="h-12 w-3/4 bg-[rgba(255,255,255,0.02)] rounded-lg mb-4 shimmer-preload" />
                <div className="h-4 w-1/2 bg-[rgba(255,255,255,0.02)] rounded mb-8" />
            </section>
        );
    }



    function handleMouseMove(event: React.MouseEvent<HTMLElement>) {
        const rect = event.currentTarget.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        x.set(event.clientX - centerX);
        y.set(event.clientY - centerY);
    }

    function handleMouseLeave() {
        x.set(0);
        y.set(0);
    }

    return (
        <section
            ref={sectionRef}
            id="about"
            className="relative w-full max-w-5xl mx-auto py-20 px-4 flex flex-col items-center"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ type: "spring", stiffness: 60, damping: 18 }}
                style={{ rotateX, rotateY, perspective: 1000, transformStyle: "preserve-3d" }}
                onViewportEnter={() => playInteractionSound("hologram", 0.4)}
                className="w-full max-w-4xl flex flex-col items-center text-center" // Added for proper layout
            >
                {/* ── Central Glowing Orb ── */}
                <motion.div
                    className="relative w-64 h-64 mb-12 flex items-center justify-center"
                    style={{ x: coreX, y: coreY, z: 30 }}
                >
                    <div className="absolute inset-0 bg-transparent rounded-full shadow-[0_0_80px_var(--accent-glow)] opacity-50 blur-2xl animate-pulse" />
                    <NeuralCore isTyping={isTyping} />
                </motion.div>

                {/* ── Orbiting Skills Removed ── */}
                {/* ── AAA Interactive 3D Card ── */}
                <TiltCard>
                    <div className="relative z-10 grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-8 items-center h-full">

                        {/* Left Column: Text Content */}
                        <div className="flex flex-col gap-6 order-2 md:order-1">
                            {/* Header */}
                            <div className="flex flex-col gap-1">
                                {/* Scramble Title */}
                                <ScrambleText
                                    text="SATHWIK TELLAKULA"
                                    className="text-2xl sm:text-4xl font-bold tracking-tight text-[#eeeeff]"
                                    fontFamily="var(--font-orbitron), sans-serif"
                                />
                                {/* Scramble Subtitle */}
                                <ScrambleText
                                    text="TECHNICAL ARCHITECT · VISIONARY ENGINEER"
                                    className="text-xs sm:text-sm font-medium tracking-[0.2em] uppercase text-[#a855f7]"
                                    delay={0.5}
                                />
                            </div>

                            {/* Bio Text with Floating Badges */}
                            <motion.div
                                className="text-base sm:text-lg text-gray-300 leading-relaxed sm:leading-loose font-light"
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true }}
                                variants={{
                                    hidden: { opacity: 0 },
                                    visible: {
                                        opacity: 1,
                                        transition: { staggerChildren: 0.1, delayChildren: 0.8 }
                                    }
                                }}
                            >
                                <motion.span variants={fadeInWord}>Sathwik is a Technical Architect and Visionary Engineer focused on the frontier of </motion.span>
                                <SkillBadge color="cyan">Artificial Intelligence</SkillBadge>
                                <motion.span variants={fadeInWord}>. By mastering the synergy between </motion.span>
                                <SkillBadge color="violet">High-Velocity Inference</SkillBadge>
                                <motion.span variants={fadeInWord}> and </motion.span>
                                <SkillBadge color="violet">Neural Interfaces</SkillBadge>
                                <motion.span variants={fadeInWord}>, he builds digital ecosystems that redefine the human-AI experience. He is the sole architect of Peak AI.</motion.span>
                            </motion.div>
                        </div>


                        {/* Right Column: Cinematic 4K Parallax Window (Replaced with Neural Pulse Core) */}
                        <div className="relative w-full flex items-center justify-center order-1 md:order-2">
                            <div className="relative w-full h-80 rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex items-center justify-center bg-black/50">
                                <NeuralCore isTyping={isTyping} />

                                {/* Inner Shadow */}
                                <div className="absolute inset-0 pointer-events-none z-20 shadow-[inset_0_0_50px_rgba(0,0,0,0.8)]" />
                            </div>
                        </div>

                    </div>
                </TiltCard>
            </motion.div>

            {/* ── Architect Signature (Level 10 Authentication Badge) ── */}
            <motion.div
                className="mt-32 w-full text-center relative group flex flex-col items-center justify-center p-8"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5, duration: 1 }}
            >
                <div
                    className="relative inline-flex flex-col items-center justify-center p-8 backdrop-blur-md bg-black/40 border border-cyan-500/30 overflow-hidden transition-all duration-500"
                    style={{
                        clipPath: "polygon(10% 0, 100% 0, 100% 90%, 90% 100%, 0 100%, 0 10%)",
                        boxShadow: bootGlow ? "0 0 60px cyan, inset 0 0 20px cyan" : "none",
                        borderColor: bootGlow ? "#0ff" : "rgba(6,182,212,0.3)"
                    }}
                >
                    {/* Corner Accents (L-Brackets) */}
                    <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-cyan-400 drop-shadow-[0_0_10px_#0ff]" />
                    <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-cyan-400 drop-shadow-[0_0_10px_#0ff]" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-cyan-400 drop-shadow-[0_0_10px_#0ff]" />
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-cyan-400 drop-shadow-[0_0_10px_#0ff]" />

                    {/* Scanning Beam */}
                    <motion.div
                        className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-white to-transparent opacity-50 z-20"
                        animate={{ top: ["0%", "100%"] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    />

                    {/* Metadata: Top Left [AUTHENTICATED] */}
                    <div className="absolute top-2 left-2 px-1 bg-green-900/40 border border-green-500/30 flex items-center gap-1">
                        <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse" />
                        <span className="text-[8px] font-mono tracking-widest text-green-400">AUTHENTICATED</span>
                    </div>

                    {/* Lead Architect Sub-Header */}
                    <span className="text-[10px] md:text-xs font-mono font-semibold tracking-[0.4em] text-cyan-400/70 select-none mb-1 md:mb-2">
                        DEVELOPED BY
                    </span>

                    {/* Main Name */}
                    <h2 className="text-xl sm:text-3xl md:text-5xl font-mono font-bold tracking-[0.2em] md:tracking-[0.4em] select-none text-white drop-shadow-[0_0_15px_rgba(0,255,255,0.6)] z-10 mb-2 md:mb-4 px-2 md:px-4 text-center">
                        SATHWIK TELLAKULA
                    </h2>

                    {/* Metadata: Bottom Right [SECURE_LINK] */}
                    <div className="absolute bottom-2 right-2 px-1 bg-amber-900/40 border border-amber-500/30 flex items-center gap-1">
                        <div className="w-1 h-1 bg-amber-400 rounded-full animate-[ping_1s_infinite]" />
                        <span className="text-[8px] font-mono tracking-widest text-amber-400">SECURE_LINK_ESTABLISHED</span>
                    </div>
                </div>
            </motion.div>

            {/* ── Neural Calibration Trigger Removed (Signature Pure) ── */}
            <InterviewerMode isOpen={showInterviewer} onClose={() => setShowInterviewer(false)} />
        </section>
    );
}

function TiltCard({ children }: { children: React.ReactNode }) {
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    // Smooth physics for tilt
    const mouseX = useSpring(x, { stiffness: 150, damping: 15 });
    const mouseY = useSpring(y, { stiffness: 150, damping: 15 });

    const rotateX = useTransform(mouseY, [-100, 100], [10, -10]); // Reverse for "magnetic" feel
    const rotateY = useTransform(mouseX, [-100, 100], [-10, 10]);

    function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
        const rect = event.currentTarget.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const cursorX = event.clientX - rect.left;
        const cursorY = event.clientY - rect.top;
        const xPct = cursorX / width - 0.5;
        const yPct = cursorY / height - 0.5;
        x.set(xPct * 200);
        y.set(yPct * 200);
    }

    function handleMouseLeave() {
        x.set(0);
        y.set(0);
    }

    return (
        <motion.div
            style={{
                rotateX,
                rotateY,
                transformStyle: "preserve-3d",
            }}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 50, damping: 15 }}
            className="relative w-full max-w-3xl mx-auto mt-8 perspective-1000 group"
        >
            <div className="relative p-[1px] rounded-3xl bg-gradient-to-b from-white/20 via-white/5 to-transparent shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-all duration-500 ease-out">
                <div
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    className="relative p-8 md:p-12 h-full w-full bg-black/80 backdrop-blur-2xl rounded-[calc(1.5rem-1px)] overflow-hidden"
                >
                    {/* Spotlight Overlay */}
                    <Spotlight x={x} y={y} />

                    {/* Holographic Scanline Overlay */}
                    <div
                        className="absolute inset-0 pointer-events-none z-0 opacity-20"
                        style={{
                            background: "repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(255,255,255,0.03) 1px, rgba(255,255,255,0.03) 2px)"
                        }}
                    />
                    {/* Accent Line */}
                    <div className="absolute left-0 top-8 bottom-8 w-1 bg-gradient-to-b from-transparent via-violet-500 to-transparent opacity-80" />

                    {children}
                </div>
            </div>
        </motion.div>
    );
}

function Spotlight({ x, y }: { x: any, y: any }) {
    const mouseX = useTransform(x, [-100, 100], ["0%", "100%"]);
    const mouseY = useTransform(y, [-100, 100], ["0%", "100%"]);

    return (
        <motion.div
            className="absolute inset-0 pointer-events-none z-0 mix-blend-soft-light"
            style={{
                background: useMotionTemplate`radial-gradient(600px circle at ${mouseX} ${mouseY}, rgba(139, 92, 246, 0.15), transparent 40%)`
            }}
        />
    );
}

function SkillBadge({ children }: { children: string, color?: "cyan" | "violet" }) {
    return (
        <motion.span
            className="inline-block px-3 py-1 mx-1 rounded-full text-sm font-semibold cursor-default border"
            style={{
                backgroundColor: "rgba(255, 255, 255, 0.03)",
                borderColor: "var(--accent-primary)",
                color: "var(--accent-primary)",
                boxShadow: "0 0 10px var(--accent-glow)"
            }}
            whileHover={{
                scale: 1.1,
                y: -2,
                boxShadow: "0 0 20px var(--accent-glow), inset 0 0 10px var(--accent-glow)"
            }}
            variants={fadeInWord}
        >
            {children}
        </motion.span>
    );
}

const fadeInWord = {
    hidden: { opacity: 0, y: 5 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
};

function ScrambleText({ text, className, fontFamily, delay = 0 }: { text: string, className?: string, fontFamily?: string, delay?: number }) {
    const [display, setDisplay] = useState("");
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&";

    useEffect(() => {
        let iteration = 0;
        let interval: any;
        const startDelay = setTimeout(() => {
            interval = setInterval(() => {
                setDisplay(text.split("").map((letter, index) => {
                    if (index < iteration) return text[index];
                    return chars[Math.floor(Math.random() * chars.length)];
                }).join(""));

                if (iteration >= text.length) clearInterval(interval);
                iteration += 1 / 2; // Speed
            }, 30);
        }, delay * 1000);

        return () => { clearTimeout(startDelay); clearInterval(interval); };
    }, [text, delay]);

    return (
        <motion.h2 className={className} style={{ fontFamily }} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
            {display || text.split("").map(() => chars[Math.floor(Math.random() * chars.length)]).join("")}
        </motion.h2>
    );
}


"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, Cpu, Shield, Activity, FileText } from "lucide-react";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Mock AI for UI Demo if no API Key, but setup for real API
const MOCK_QUESTIONS = [
    "Q1: In a high-latency neural network environment, how do you optimize gradient descent for real-time inference?",
    "Q2: Explain the architectural trade-offs between monolithic kernel structures and micro-service based cortical nodes.",
    "Q3: How would you secure a quantum-entangled database against a temporal injection attack?"
];

export default function InterviewerMode({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [dragActive, setDragActive] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<"idle" | "scanning" | "analyzing" | "interview" | "results">("idle");
    const [questions, setQuestions] = useState<string[]>([]);
    const [answers, setAnswers] = useState<{ [key: number]: string }>({});
    const [scores, setScores] = useState<{ syncRate: number; logic: number } | null>(null);
    const [currentQ, setCurrentQ] = useState(0);

    // Neural Scan Logic
    const [scanProgress, setScanProgress] = useState(0);
    const [scanStatusText, setScanStatusText] = useState("READING_NEURAL_STAMP...");

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setStatus("scanning");
        setScanProgress(0);

        // Neural Scan Progress
        const duration = 3000;
        const interval = 50;
        const steps = duration / interval;
        let step = 0;

        const timer = setInterval(() => {
            step++;
            const progress = (step / steps) * 100;
            setScanProgress(progress);

            if (progress < 30) setScanStatusText("READING_NEURAL_STAMP...");
            else if (progress < 60) setScanStatusText("PARSING_SKILL_LOGIC...");
            else setScanStatusText("GENERATING_QUESTIONS...");

            if (step >= steps) {
                clearInterval(timer);
                setStatus("interview");
                generateQuestions();
            }
        }, interval);
    };

    const generateQuestions = () => {
        setQuestions(MOCK_QUESTIONS);
        setCurrentQ(0);
    };

    const submitAnswer = () => {
        if (currentQ < questions.length - 1) {
            setCurrentQ(currentQ + 1);
        } else {
            setStatus("results");
            // Mock Scoring
            setScores({ syncRate: 88, logic: 92 });
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    {/* Drawer Panel */}
                    <motion.div
                        className="w-full max-w-2xl h-full bg-black/90 border-l border-cyan-500/30 shadow-2xl overflow-y-auto relative flex flex-col"
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-cyan-500/20 flex justify-between items-center bg-cyan-950/10">
                            <div className="flex items-center gap-3">
                                <Cpu className={`w-6 h-6 text-cyan-400 ${status === "scanning" ? "animate-spin" : "animate-pulse"}`} />
                                <h2 className="text-xl font-mono font-bold text-cyan-100 tracking-[0.2em]">NEURAL CALIBRATION</h2>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 p-8 flex flex-col items-center justify-center">

                            {/* PHASE: IDLE (Upload) */}
                            {status === "idle" && (
                                <div
                                    className={`w-full max-w-lg aspect-video rounded-xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center gap-4 cursor-pointer group relative overflow-hidden
                                        ${dragActive ? "border-cyan-400 bg-cyan-500/10 scale-[1.02]" : "border-cyan-500/30 hover:border-cyan-400/60 bg-black/20"}`}
                                    onDragEnter={handleDrag}
                                    onDragLeave={handleDrag}
                                    onDragOver={handleDrag}
                                    onDrop={handleDrop}
                                >
                                    <input
                                        type="file"
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        onChange={(e) => e.target.files && setFile(e.target.files[0])}
                                    />

                                    {/* Holographic Grid BG */}
                                    <div className="absolute inset-0 opacity-10 pointer-events-none"
                                        style={{ backgroundImage: "linear-gradient(cyan 1px, transparent 1px), linear-gradient(90deg, cyan 1px, transparent 1px)", backgroundSize: "20px 20px" }}
                                    />

                                    <div className="relative z-10 flex flex-col items-center">
                                        {file ? (
                                            <>
                                                <FileText className="w-12 h-12 text-cyan-400 mb-2" />
                                                <span className="font-mono text-cyan-200">{file.name}</span>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleUpload(); }}
                                                    className="mt-4 px-6 py-2 bg-cyan-600/20 border border-cyan-400/50 rounded hover:bg-cyan-500/30 text-cyan-100 font-mono text-xs tracking-widest uppercase transition-all"
                                                >
                                                    Initialize Scan
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="w-12 h-12 text-cyan-500/50 group-hover:text-cyan-400 transition-colors" />
                                                <span className="font-mono text-sm text-cyan-300/70 tracking-widest mt-2">[UPLINK_RESUME_DATA]</span>
                                                <span className="text-[10px] text-cyan-500/50 mt-1 uppercase">STUDENT NEURAL RESUME (PDF / TXT SUPPORTED)</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* PHASE: NEURAL SCAN */}
                            {status === "scanning" && (
                                <div className="w-full max-w-md flex flex-col items-center gap-6">
                                    <Cpu className="w-16 h-16 text-cyan-400 animate-pulse" />
                                    <div className="w-full space-y-2">
                                        <div className="flex justify-between font-mono text-[10px] text-cyan-500/70 tracking-widest">
                                            <span className="animate-pulse">{scanStatusText}</span>
                                            <span>{Math.round(scanProgress)}%</span>
                                        </div>
                                        {/* Progress Bar (Cyan theme for this modal mode to match existing style, or Amber? User asked "Amber glow" in request, but this file is Cyan themed. I should probably stick to Cyan for consistency within THIS component, or switch to Amber. The request said "Add a 'Neural Scan' Progress Bar to Interviewer Mode... using... amber glow". I'll use Amber here too to honor request exactly). */}
                                        <div className="w-full h-2 bg-cyan-900/30 rounded-full overflow-hidden border border-cyan-500/30 shadow-[0_0_15px_rgba(245,158,11,0.5)]">
                                            <motion.div
                                                className="h-full bg-amber-500 shadow-[0_0_10px_#f59e0b]"
                                                style={{ width: `${scanProgress}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* PHASE: INTERVIEW */}
                            {status === "interview" && (
                                <div className="w-full max-w-xl flex flex-col gap-6">
                                    {/* AI Question */}
                                    <motion.div
                                        className="p-6 bg-cyan-950/30 border border-cyan-500/30 rounded-lg relative"
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        key={currentQ}
                                    >
                                        <div className="absolute -top-3 left-4 px-2 bg-black text-[10px] font-mono text-cyan-400 border border-cyan-500/30">
                                            SR_TECH_LEAD_2199
                                        </div>
                                        <p className="font-mono text-cyan-100/90 leading-relaxed text-sm md:text-base">
                                            {questions[currentQ]}
                                        </p>
                                    </motion.div>

                                    {/* User Answer */}
                                    <textarea
                                        className="w-full h-32 bg-black/40 border border-gray-700 focus:border-cyan-500/50 rounded-lg p-4 font-mono text-sm text-gray-300 focus:outline-none resize-none"
                                        placeholder="// Input your response..."
                                        value={answers[currentQ] || ""}
                                        onChange={(e) => setAnswers({ ...answers, [currentQ]: e.target.value })}
                                    />

                                    <button
                                        onClick={submitAnswer}
                                        className="self-end px-6 py-2 bg-cyan-600/20 border border-cyan-500/30 hover:bg-cyan-500/30 text-cyan-200 font-mono text-xs uppercase tracking-widest transition-all"
                                    >
                                        {currentQ < questions.length - 1 ? "Transmit Response" : "Finalize Calibration"}
                                    </button>
                                </div>
                            )}

                            {/* PHASE: RESULTS */}
                            {status === "results" && scores && (
                                <div className="w-full max-w-lg grid grid-cols-2 gap-4">
                                    <div className="p-6 bg-black/40 border border-cyan-500/30 rounded-lg flex flex-col items-center gap-2">
                                        <Activity className="w-8 h-8 text-cyan-400" />
                                        <span className="text-[10px] text-cyan-500 uppercase tracking-widest">Sync Rate</span>
                                        <span className="text-4xl font-mono font-bold text-white">{scores.syncRate}%</span>
                                    </div>
                                    <div className="p-6 bg-black/40 border border-cyan-500/30 rounded-lg flex flex-col items-center gap-2">
                                        <Shield className="w-8 h-8 text-violet-400" />
                                        <span className="text-[10px] text-violet-500 uppercase tracking-widest">Architect Logic</span>
                                        <span className="text-4xl font-mono font-bold text-white">{scores.logic}%</span>
                                    </div>
                                    <div className="col-span-2 text-center mt-6">
                                        <p className="font-mono text-cyan-200/60 text-sm">"Candidate displays promising neural architecture. Recommended for Phase 2."</p>
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* Footer - Level 10 Badge Style */}
                        <div className="p-6 border-t border-cyan-500/20 bg-black/40 flex justify-center">
                            <div
                                className="relative inline-flex flex-col items-center justify-center px-8 py-2 border border-cyan-500/20 overflow-hidden bg-black/60"
                                style={{ clipPath: "polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)" }}
                            >
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                    <span className="text-[8px] font-mono tracking-[0.2em] text-cyan-400/70">SYSTEM_ACTIVE</span>
                                </div>
                                <span className="text-[10px] font-mono font-bold tracking-[0.3em] text-cyan-100 mt-1" style={{ textShadow: "0 0 10px rgba(0, 255, 255, 0.5)" }}>
                                    DEVELOPED BY SATHWIK TELLAKULA
                                </span>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

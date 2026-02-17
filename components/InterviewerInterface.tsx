
"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, FileText, Upload, Cpu, Activity, Play, Square, Settings, RefreshCw } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { playInteractionSound } from "@/utils/audioManager";

// Web Speech API Types (if not available in lib)
interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start: () => void;
    stop: () => void;
    onresult: (event: SpeechRecognitionEvent) => void;
    onend: () => void;
    onerror: (event: any) => void;
}
interface SpeechRecognitionEvent {
    results: SpeechRecognitionResultList;
}
interface SpeechRecognitionResultList {
    [index: number]: SpeechRecognitionResult;
    length: number;
}
interface SpeechRecognitionResult {
    [index: number]: SpeechRecognitionAlternative;
    isFinal: boolean;
}
interface SpeechRecognitionAlternative {
    transcript: string;
}

declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

export default function InterviewerInterface() {
    const [status, setStatus] = useState<"idle" | "listening" | "processing" | "speaking" | "scanning" | "interview">("idle");
    const [mode, setMode] = useState<"manual" | "auto">("auto");
    const [transcript, setTranscript] = useState("");
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Interview Logic
    const [isScanning, setIsScanning] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);
    const [scanStatusText, setScanStatusText] = useState("READING_NEURAL_STAMP...");
    const [questions, setQuestions] = useState<string[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

    // Audio Visualization (Simulated for Reactive feel)
    const [audioLevel, setAudioLevel] = useState(0);

    // Init Speech Recognition
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = "en-IN"; // User requested support for en-IN

            recognition.onresult = (event: SpeechRecognitionEvent) => {
                const current = event.results[event.results.length - 1][0].transcript;
                setTranscript(current);
                setAudioLevel(Math.random() * 100); // Simulate audio reactivity on result

                if (mode === "auto") {
                    // Reset silence timer on speech
                    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
                    silenceTimerRef.current = setTimeout(() => {
                        stopListening();
                    }, 2000); // 2s silence trigger
                }
            };

            recognition.onend = () => {
                if (status === "listening" && mode === "manual") {
                    // unexpected stop in manual mode, restart? Or just let be.
                    // recognitionRef.current?.start(); 
                } else {
                    if (status === "listening") {
                        setStatus("processing");
                        // Mock AI Processing or Real Answer Evaluation
                        setTimeout(() => setStatus("interview"), 2000); // Return to interview state
                    }
                }
            };

            recognitionRef.current = recognition;
        }
    }, [mode, status]);

    const startListening = () => {
        setStatus("listening");
        recognitionRef.current?.start();
    };

    const stopListening = () => {
        setStatus("processing");
        recognitionRef.current?.stop();
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        // Trigger AI Evaluation here...
        setTimeout(() => {
            setStatus("interview");
            // Move to next question logic could be here
        }, 2000);
    };

    // File Upload & Neural Scan Logic
    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            setResumeFile(file);
            startNeuralScan(file);
        }
    };

    const startNeuralScan = async (file: File) => {
        setIsScanning(true);
        setStatus("scanning");
        setScanProgress(0);

        // Simulating 3s Scan
        const duration = 3000;
        const interval = 50;
        const steps = duration / interval;
        let step = 0;

        const timer = setInterval(() => {
            step++;
            const progress = (step / steps) * 100;
            setScanProgress(progress);

            // Status Text Cycle
            if (progress < 30) setScanStatusText("READING_NEURAL_STAMP...");
            else if (progress < 60) setScanStatusText("PARSING_SKILL_LOGIC...");
            else setScanStatusText("GENERATING_QUESTIONS...");

            if (step >= steps) {
                clearInterval(timer);
                setIsScanning(false);
                setStatus("interview");
                generateQuestions(file);
            }
        }, interval);
    };

    const generateQuestions = async (file: File) => {
        // Mock Questions for now (Real API calls would go here using GoogleGenerativeAI)
        // If we had API key, we would read file text and prompt Gemini.
        // For UI demo, we use hardcoded mock.
        setQuestions([
            "Evaluate the architectural trade-offs between monolithic kernel structures and micro-service based cortical nodes.",
            "In a high-latency neural network environment, how do you optimize gradient descent for real-time inference?",
            "How would you secure a quantum-entangled database against a temporal injection attack?"
        ]);
        setCurrentQuestionIndex(0);
    };

    return (
        <div className="w-full max-w-3xl mx-auto flex flex-col gap-6">

            {/* ── Main Interface Card ── */}
            <motion.div
                className="relative p-[1px] rounded-2xl bg-gradient-to-b from-amber-500/20 via-amber-500/5 to-transparent backdrop-blur-xl"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="bg-black/80 rounded-[calc(1rem-1px)] p-6 md:p-8 flex flex-col items-center gap-6 relative overflow-hidden min-h-[400px]">

                    {/* Status Header */}
                    <div className="w-full flex flex-col md:flex-row justify-between items-center gap-4 border-b border-amber-500/10 pb-4">
                        <div className="flex items-center gap-3">
                            <Cpu className={`w-5 h-5 ${status === 'processing' || isScanning ? 'text-amber-400 animate-spin' : 'text-amber-500/50'}`} />
                            <span className="font-mono text-xs uppercase tracking-[0.2em] text-amber-100/60">
                                {status === "idle" ? "SYSTEM_READY" : status === "scanning" ? "NEURAL_SCAN_ACTIVE" : status === "listening" ? "LISTENING..." : status === "interview" ? "INTERVIEW_SESSION_ACTIVE" : "NEURAL_PROCESSING"}
                            </span>
                        </div>
                        {/* Mode Toggle */}
                        <div className="relative z-[100] flex items-center gap-2 bg-white/5 rounded-full p-1 pointer-events-auto">
                            <button
                                onClick={() => { setMode("manual"); playInteractionSound("click"); }}
                                className={`px-4 py-2 md:px-3 md:py-1 rounded-full text-xs md:text-[10px] font-mono tracking-wider transition-all cursor-pointer min-h-[44px] md:min-h-[auto] flex items-center justify-center ${mode === "manual" ? "bg-amber-500/20 text-amber-300" : "text-gray-500 hover:text-amber-200"}`}
                            >
                                MANUAL
                            </button>
                            <button
                                onClick={() => { setMode("auto"); playInteractionSound("click"); }}
                                className={`px-4 py-2 md:px-3 md:py-1 rounded-full text-xs md:text-[10px] font-mono tracking-wider transition-all cursor-pointer min-h-[44px] md:min-h-[auto] flex items-center justify-center ${mode === "auto" ? "bg-amber-500/20 text-amber-300" : "text-gray-500 hover:text-amber-200"}`}
                            >
                                AUTO-SYNC
                            </button>
                        </div>
                    </div>

                    {/* ── Content Switcher ── */}
                    <AnimatePresence mode="wait">

                        {/* PHASE 1: Resume Uplink (Idle) */}
                        {!resumeFile && !isScanning && status === "idle" && (
                            <motion.div
                                key="upload"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="w-full flex-1 flex flex-col items-center justify-center"
                            >
                                <div
                                    className="w-full h-48 border-2 border-dashed border-amber-500/20 rounded-xl flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-amber-500/40 hover:bg-amber-500/5 transition-all group"
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={handleDrop}
                                >
                                    <Upload className="w-12 h-12 text-amber-500/40 group-hover:text-amber-400 transition-colors" />
                                    <span className="font-mono text-sm text-amber-200/60 tracking-widest">[UPLINK_RESUME_DATA]</span>
                                    <span className="text-[10px] text-amber-500/30 font-mono tracking-wider">STUDENT NEURAL RESUME (PDF / TXT SUPPORTED)</span>
                                </div>
                            </motion.div>
                        )}

                        {/* PHASE 2: Neural Scan Progress */}
                        {isScanning && (
                            <motion.div
                                key="scanning"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="w-full flex-1 flex flex-col items-center justify-center gap-6"
                            >
                                <Cpu className="w-16 h-16 text-amber-400 animate-pulse" />
                                <div className="w-full max-w-md space-y-2">
                                    <div className="flex justify-between font-mono text-[10px] text-amber-500/70 tracking-widest">
                                        <span className="animate-pulse">{scanStatusText}</span>
                                        <span>{Math.round(scanProgress)}%</span>
                                    </div>
                                    <div className="w-full h-2 bg-amber-900/30 rounded-full overflow-hidden border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                                        <motion.div
                                            className="h-full bg-amber-500 shadow-[0_0_10px_#f59e0b]"
                                            style={{ width: `${scanProgress}%` }}
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* PHASE 3: Interview (Questions + Mic) */}
                        {status === "interview" || status === "listening" || status === "processing" && questions.length > 0 ? (
                            <motion.div
                                key="interview"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="w-full flex-1 flex flex-col items-center justify-between"
                            >
                                {/* Question Card */}
                                <div className="w-full p-6 bg-amber-950/20 border border-amber-500/30 rounded-lg relative mb-8">
                                    <div className="absolute -top-3 left-4 px-2 bg-black text-[10px] font-mono text-amber-400 border border-amber-500/30 tracking-widest">
                                        SR_TECH_LEAD_2199 // Q{currentQuestionIndex + 1}
                                    </div>
                                    <p className="font-mono text-amber-100/90 leading-relaxed text-sm md:text-lg">
                                        {questions[currentQuestionIndex]}
                                    </p>
                                </div>

                                {/* Voice Controls */}
                                <div className="relative w-full flex flex-col items-center justify-center py-4">
                                    {/* Thinking Ring Animation */}
                                    {status === "processing" && (
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none -top-10">
                                            <div className="w-40 h-40 rounded-full border border-amber-500/30 animate-[ping_2s_infinite]" />
                                            <div className="w-32 h-32 rounded-full border border-amber-400/20 animate-[spin_3s_linear_infinite]" />
                                        </div>
                                    )}

                                    {/* Mic Button */}
                                    <motion.button
                                        onClick={status === "listening" ? stopListening : startListening}
                                        className={`
                                            relative w-20 h-20 rounded-full flex items-center justify-center border-2 
                                            transition-all duration-300 z-10
                                            ${status === "listening"
                                                ? "bg-red-500/20 border-red-500 text-red-100 shadow-[0_0_30px_rgba(239,68,68,0.4)]"
                                                : "bg-amber-500/10 border-amber-500/50 text-amber-100 hover:bg-amber-500/20 hover:border-amber-400 hover:shadow-[0_0_20px_rgba(245,158,11,0.3)]"}
                                        `}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        {status === "listening" ? (
                                            <Square className="w-8 h-8 fill-current" />
                                        ) : (
                                            <Mic className="w-8 h-8" />
                                        )}
                                    </motion.button>

                                    {/* Waveform Visualization */}
                                    <div className="h-12 flex items-center gap-1 mt-8">
                                        {[...Array(12)].map((_, i) => (
                                            <motion.div
                                                key={i}
                                                className={`w-1 bg-amber-500/50 rounded-full`}
                                                animate={{
                                                    height: status === "listening" ? [10, Math.random() * 40 + 10, 10] : 4,
                                                    opacity: status === "listening" ? 1 : 0.3
                                                }}
                                                transition={{ duration: 0.2, repeat: Infinity, delay: i * 0.05 }}
                                            />
                                        ))}
                                    </div>

                                    {/* Transcript Echo */}
                                    <div className="mt-4 h-6 text-center w-full">
                                        <AnimatePresence mode="wait">
                                            {transcript && (
                                                <motion.p
                                                    key="transcript"
                                                    className="font-mono text-xs text-amber-200/50 tracking-wide truncate max-w-full px-4"
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0 }}
                                                >
                                                    "{transcript}"
                                                </motion.p>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </motion.div>
                        ) : null}

                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
}

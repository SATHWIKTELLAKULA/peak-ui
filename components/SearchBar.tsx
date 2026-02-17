import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Sparkles, ArrowRight, Mic, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useSettings } from "@/contexts/SettingsContext";
import { playInteractionSound } from "@/utils/audioManager";

const PLACEHOLDER_QUERIES = [
    "What is quantum entanglement?",
    "How does photosynthesis work?",
    "Explain neural networks simply...",
    "Why is the sky blue?",
    "What are black holes made of?",
];

// Extend Window for Web Speech API types
interface SpeechRecognitionEvent {
    results: {
        [index: number]: {
            [index: number]: {
                transcript: string;
            };
        };
    };
}

export default function SearchBar({ onTyping }: { onTyping?: (typing: boolean) => void }) {
    const [query, setQuery] = useState("");
    const [placeholderIndex, setPlaceholderIndex] = useState(0);
    const [isFocused, setIsFocused] = useState(false);
    const [isAnimatingPlaceholder, setIsAnimatingPlaceholder] = useState(true);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [isListening, setIsListening] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<ReturnType<typeof createSpeechRecognition> | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null); // For multimodal upload
    const router = useRouter();
    const { neuralMode } = useSettings();

    const isActive = isFocused || query.length > 0;

    useEffect(() => {
        if (!isAnimatingPlaceholder) return;
        const interval = setInterval(() => {
            setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDER_QUERIES.length);
        }, 3000);
        return () => clearInterval(interval);
    }, [isAnimatingPlaceholder]);

    const handleFocus = useCallback(() => {
        if (!isFocused) {
            playInteractionSound("click");
        }
        setIsFocused(true);
        setIsAnimatingPlaceholder(false);
    }, [isFocused]);

    const handleBlur = useCallback(() => {
        setIsFocused(false);
        if (onTyping) onTyping(false);
        if (!query) setIsAnimatingPlaceholder(true);
    }, [query, onTyping]);

    const handleSubmit = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();
            if (!query.trim()) return;

            const targetUrl = `/search?q=${encodeURIComponent(query.trim())}`;

            playInteractionSound("ignition");
            router.push(targetUrl);
        },
        [query, router]
    );

    const searchWith = useCallback(
        (text: string) => {
            if (!text.trim()) return;

            const targetUrl = `/search?q=${encodeURIComponent(text.trim())}`;

            setQuery(text);
            playInteractionSound("ignition");
            router.push(targetUrl);
        },
        [router]
    );

    const toggleVoice = useCallback(() => {
        if (isListening && recognitionRef.current) {
            recognitionRef.current.stop();
            setIsListening(false);
            return;
        }
        const recognition = createSpeechRecognition();
        if (!recognition) { alert("Voice search is not supported in this browser."); return; }
        recognitionRef.current = recognition;
        recognition.lang = "en-US";
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        recognition.onresult = (event: SpeechRecognitionEvent) => {
            const transcript = event.results[0][0].transcript;
            setIsListening(false);
            searchWith(transcript);
        };
        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);
        recognition.start();
        setIsListening(true);
    }, [isListening, searchWith]);

    useEffect(() => {
        return () => { recognitionRef.current?.stop(); };
    }, []);

    useEffect(() => {
        const handleShortcut = (e: CustomEvent) => {
            if (e.detail?.key === "ctrl+k") {
                inputRef.current?.focus();
                setQuery(""); // "clears any current text" per user request
                setIsFocused(true);
            }
        };
        window.addEventListener("peak-shortcut" as any, handleShortcut as any);
        return () => window.removeEventListener("peak-shortcut" as any, handleShortcut as any);
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            setMousePos({ x, y });
        }
    };

    const handleMouseLeave = () => {
        setMousePos({ x: 0, y: 0 });
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
        playInteractionSound("click");
    };

    return (
        <motion.form
            layout
            onSubmit={handleSubmit}
            className="relative w-full max-w-3xl mx-auto"
            animate={{ scale: isFocused ? 1.02 : 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            {/* Ambient Conic Border - Rotating */}
            <div className="absolute -inset-0.5 rounded-full overflow-hidden">
                <motion.div
                    className="absolute inset-[-50%]"
                    style={{
                        background: "conic-gradient(from 0deg, transparent 0deg, var(--accent-primary) 90deg, transparent 180deg)",
                        opacity: isFocused ? 1 : 0.3,
                    }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                />
            </div>

            <motion.div
                layout
                ref={containerRef}
                className="relative flex items-center gap-4 rounded-full px-8 py-6 bg-black"
                style={{
                    background: "rgba(0,0,0,0.8)",
                    backdropFilter: "blur(24px) saturate(1.8)",
                    WebkitBackdropFilter: "blur(24px) saturate(1.8)",
                    boxShadow: isFocused
                        ? "0 0 40px -5px rgba(99,102,241,0.4), inset 0 0 20px -5px rgba(99,102,241,0.2)"
                        : "0 8px 32px rgba(0,0,0,0.5)",
                }}
            >


                {/* Magnetic Search Icon */}
                <motion.div
                    animate={{
                        color: isActive ? "var(--accent-primary)" : "rgba(238,238,255,0.4)",
                        x: mousePos.x * 0.1,
                        y: mousePos.y * 0.1,
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                    <Search className="w-6 h-6 flex-shrink-0" />
                </motion.div>

                {/* Creative Mode Upload Button */}
                <AnimatePresence>
                    {neuralMode === "creative" && (
                        <motion.button
                            type="button"
                            initial={{ width: 0, opacity: 0, scale: 0 }}
                            animate={{ width: "auto", opacity: 1, scale: 1 }}
                            exit={{ width: 0, opacity: 0, scale: 0 }}
                            onClick={handleUploadClick}
                            className="flex items-center justify-center w-8 h-8 rounded-full bg-pink-500/10 border border-pink-500/30 text-pink-400 hover:bg-pink-500/20 hover:text-pink-300 transition-colors mr-2 flex-shrink-0"
                            title="Upload Image/Video"
                        >
                            <Plus className="w-5 h-5" />
                            <input ref={fileInputRef} type="file" className="hidden" accept="image/*,video/*" />
                        </motion.button>
                    )}
                </AnimatePresence>

                {/* Input */}
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        if (onTyping) {
                            onTyping(true);
                            // Debounce reset
                            setTimeout(() => onTyping(false), 1000);
                        }
                    }}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    placeholder={isListening ? "Listening..." : PLACEHOLDER_QUERIES[placeholderIndex]}
                    className="flex-1 bg-transparent border-none outline-none text-[#ffffff] text-xl font-medium tracking-wide
                        placeholder:text-[rgba(238,238,255,0.25)] placeholder:font-light placeholder:transition-opacity placeholder:duration-500 z-10"
                    autoComplete="off"
                    spellCheck="false"
                />

                {/* Right Actions */}
                <div className="flex items-center gap-3 flex-shrink-0 z-10">
                    {/* Enter Hint */}
                    <AnimatePresence>
                        {query.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 h-full rounded-md bg-white/5 border border-white/10 text-xs text-white/50 font-mono select-none pointer-events-none"
                            >
                                <span className="text-white/70">↵</span>
                                <span>Enter</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Mic Button - Magnetic */}
                    <motion.button
                        type="button"
                        onClick={toggleVoice}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer ${isListening
                            ? "bg-red-500/20 border border-red-500/40 text-red-400 mic-pulse shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                            : "bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 hover:border-white/20"
                            }`}
                        aria-label={isListening ? "Stop listening" : "Voice search"}
                    >
                        <Mic className="w-5 h-5" />
                    </motion.button>

                    {/* Submit Button - Magnetic */}
                    <AnimatePresence>
                        {query && (
                            <motion.button
                                type="submit"
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.5, opacity: 0 }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4f8fff] to-[#8b5cf6] relative overflow-hidden
                                    flex items-center justify-center shadow-[0_0_30px_rgba(139,92,246,0.4)] cursor-pointer group"
                            >
                                <motion.div
                                    className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity"
                                />
                                <ArrowRight className="w-5 h-5 text-white" />
                            </motion.button>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>

            {/* Ambient Base Glow */}
            <motion.div
                className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-[90%] h-12 rounded-[100%] blur-[60px] pointer-events-none -z-10"
                animate={{
                    background: isActive ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.02)",
                    opacity: isActive ? 0.6 : 0.2,
                    scale: isActive ? 1.2 : 1,
                }}
                transition={{ duration: 0.8 }}
            />
        </motion.form>
    );
}

/** Factory function for cross-browser SpeechRecognition */
function createSpeechRecognition() {
    if (typeof window === "undefined") return null;
    const SpeechRecognition =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return null;
    return new SpeechRecognition();
}

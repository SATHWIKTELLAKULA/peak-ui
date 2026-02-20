"use client";

import { useState, useEffect, useRef, useCallback, Suspense, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Script from "next/script";
import { useChat } from "@ai-sdk/react";
import {
    ArrowLeft, Sparkles, Search, Loader2, AlertCircle, RefreshCw,
    Settings, Volume2, VolumeX, Pin, PinOff, Copy, Check,
    Mic, MicOff, SendHorizonal, Save, Download, Paperclip, X, FileText, ImageIcon, Globe
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

import RateLimitHandler from "@/components/RateLimitHandler";
import AuthButton from "@/components/AuthButton";
import AuthModal from "@/components/AuthModal";
import SettingsDrawer from "@/components/SettingsDrawer";
import EntitiesSidebar from "@/components/EntitiesSidebar";
import DeepDiveToolbar from "@/components/DeepDiveToolbar";
import SkeletonLoader from "@/components/SkeletonLoader";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { readFileAsBase64, uploadFileToSupabase, Attachment } from "@/utils/fileUpload";
import { useSettings } from "@/contexts/SettingsContext";
import type { NeuralMode } from "@/contexts/SettingsContext";
import ResponseToggle from "@/components/ResponseToggle";
import NeuralCore from "@/components/NeuralCore";
import LockedModeCard from "@/components/LockedModeCard";
import { useAuth } from "@/hooks/useAuth";

/** Session cache key prefix */
const CACHE_PREFIX = "peak_search_";

/* ── Animation variants ── */
const materialize = {
    hidden: { opacity: 0, y: 40, filter: "blur(12px)" },
    visible: (i: number) => ({
        opacity: 1, y: 0, filter: "blur(0px)",
        transition: { delay: i * 0.12, type: "spring" as const, stiffness: 80, damping: 14, mass: 0.9 },
    }),
    exit: { opacity: 0, y: -20, filter: "blur(6px)", transition: { duration: 0.3 } },
};

/* ── Staggered Content Variants ── */
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.2
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 15, filter: "blur(4px)" },
    visible: {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        transition: { duration: 0.5, ease: "easeOut" as const }
    }
};

const scrollyVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.6, ease: "easeOut" as const }
    }
};

/* ── Code block with copy button ── */
function CodeBlock({ children, className }: { children: string; className?: string }) {
    const [copied, setCopied] = useState(false);
    const lang = className?.replace("language-", "") || "";

    const handleCopy = () => {
        navigator.clipboard.writeText(children).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <motion.div variants={itemVariants} className="relative group my-4">
            {lang && (
                <span className="absolute top-2 left-3 text-[9px] uppercase tracking-wider text-[rgba(168,85,247,0.4)] font-mono">
                    {lang}
                </span>
            )}
            <button
                onClick={handleCopy}
                className="
                    absolute top-2 right-2 p-1.5 rounded-lg
                    bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)]
                    text-[rgba(238,238,255,0.3)] hover:text-[#a855f7]
                    opacity-0 group-hover:opacity-100
                    transition-all duration-200 cursor-pointer z-10
                "
                title={copied ? "Copied!" : "Copy code"}
            >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <pre className="bg-[rgba(255,255,255,0.025)] border border-[rgba(255,255,255,0.05)] rounded-xl p-4 pt-7 overflow-x-auto text-sm">
                <code className="text-[rgba(238,238,255,0.65)] font-mono text-xs">{children}</code>
            </pre>
        </motion.div>
    );
}

/* ── Conversation message type ── */
interface ChatMessage {
    role: "user" | "assistant";
    content: string | any[];
}

/* ═══════════════════════════════════════════════════
   Main Search Results Component
   ═══════════════════════════════════════════════════ */
function SearchResultsContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { responseLength, voiceGender, neuralMode, creativeSubMode, language, videoQuality } = useSettings();
    const query = searchParams.get("q") || "";

    // Clear only invalid/empty cache entries on mount
    useEffect(() => {
        // Cleanup empty cache entries
        Object.keys(sessionStorage).forEach(key => {
            if (key.startsWith(CACHE_PREFIX)) {
                const val = sessionStorage.getItem(key);
                if (!val || val.length < 20 || val === "{}") {
                    sessionStorage.removeItem(key);
                }
            }
        });
    }, [query]);

    const { isLoggedIn, loading: authLoading } = useAuth();
    const [isLocked, setIsLocked] = useState(false);

    // Auth Check for Premium Modes
    useEffect(() => {
        if (!authLoading && !isLoggedIn && neuralMode !== "flash") {
            setIsLocked(true);
        } else {
            setIsLocked(false);
        }
    }, [isLoggedIn, authLoading, neuralMode]);

    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState("");
    const [showRateLimit, setShowRateLimit] = useState(false);
    const [authOpen, setAuthOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);

    const [isLoading, setIsLoading] = useState(() => !!query);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [answer, setAnswer] = useState("");
    const [explanationAnswer, setExplanationAnswer] = useState("");

    // Missing State Re-declarations
    const [viewMode, setViewMode] = useState<"direct" | "detailed" | "explanation">("detailed");
    const [directAnswer, setDirectAnswer] = useState("");
    const [detailedAnswer, setDetailedAnswer] = useState("");
    const [progress, setProgress] = useState(0);
    const [isMediaLoaded, setIsMediaLoaded] = useState(false);
    const [followUp, setFollowUp] = useState("");
    const [followUpLoading, setFollowUpLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const [isPinned, setIsPinned] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
    const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
    const [isListening, setIsListening] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognitionRef = useRef<any>(null);
    const lastFetchedQuery = useRef<string | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    const [followUpAttachment, setFollowUpAttachment] = useState<Attachment | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isGrounded, setIsGrounded] = useState(false);

    // Derived State
    const chatHistory = messages.slice(2);

    /* ── Effects & Helpers ── */

    // Reset media loading state when answer changes to a new image/video
    useEffect(() => {
        if (answer.startsWith("IMAGE_DATA:") || answer.startsWith("VIDEO_DATA:")) {
            setIsMediaLoaded(false);
        }
    }, [answer]);

    // Reset progress on new search
    useEffect(() => {
        if (!query) setProgress(0);
    }, [query]);

    // Simulate progress for Director Mode
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isLoading && neuralMode === "creative" && creativeSubMode === "director") {
            setProgress(0);
            interval = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 90) return prev;
                    return prev + 0.3; // 0.3% per 100ms -> 3% per sec -> 90% in 30s
                });
            }, 100);
        }
        return () => clearInterval(interval);
    }, [isLoading, neuralMode, creativeSubMode, query]);

    // Snap to 100% when media is loaded
    useEffect(() => {
        if (isMediaLoaded) {
            setProgress(100);
            const timeout = setTimeout(() => setProgress(0), 1000); // Fade out after 1s
            return () => clearTimeout(timeout);
        }
    }, [isMediaLoaded]);

    /* ── Pre-load speech voices ── */
    useEffect(() => {
        const synth = window.speechSynthesis;
        if (!synth) return;
        const loadVoices = () => { voicesRef.current = synth.getVoices(); };
        loadVoices();
        synth.addEventListener("voiceschanged", loadVoices);
        return () => synth.removeEventListener("voiceschanged", loadVoices);
    }, []);

    /* ── Stop speech on query change / unmount ── */
    useEffect(() => {
        return () => {
            window.speechSynthesis?.cancel();
            setIsSpeaking(false);
        };
    }, [query]);

    /* ── Check pin state ── */
    useEffect(() => {
        try {
            const pinned = JSON.parse(localStorage.getItem("peak_pinned_answers") || "[]");
            setIsPinned(pinned.some((p: { query: string }) => p.query === query));
        } catch { /* */ }
    }, [query]);

    /* ── Increment search counter ── */
    const incrementSearchCount = useCallback(() => {
        try {
            const current = parseInt(localStorage.getItem("peak_search_count") || "0", 10);
            localStorage.setItem("peak_search_count", String(current + 1));
        } catch { /* */ }
    }, []);

    /* ── Toggle speech ── */
    const toggleSpeech = () => {
        const synth = window.speechSynthesis;
        if (!synth) return;
        if (synth.speaking || isSpeaking) {
            synth.cancel();
            setIsSpeaking(false);
            return;
        }
        if (!answer) return;
        synth.cancel();

        const plainText = answer
            .replace(/```[\s\S]*?```/g, " code block ")
            .replace(/`[^`]+`/g, "")
            .replace(/[#*_~>\-|]/g, "")
            .replace(/\[(.+?)\]\(.+?\)/g, "$1")
            .replace(/\n+/g, ". ")
            .trim();

        if (!plainText) return;

        const utter = new SpeechSynthesisUtterance(plainText);
        utter.rate = 1;
        utter.pitch = 1;

        const voices = voicesRef.current.length > 0 ? voicesRef.current : synth.getVoices();

        let preferredVoice = null;
        const targetLang = language === 'te' ? 'te-IN' : language === 'hi' ? 'hi-IN' : 'en-US';

        // Explicitly set language on utterance first - CRITICAL for engine switch
        utter.lang = targetLang;

        if (voices.length > 0) {
            preferredVoice = voices.find(v => v.lang === targetLang);
            if (!preferredVoice && (language === 'en' || !language)) {
                preferredVoice = voices.find(v => v.lang === 'en-IN');
                if (!preferredVoice) {
                    preferredVoice = voices.find((v) => {
                        const name = v.name.toLowerCase();
                        if (voiceGender === "female") {
                            return name.includes("female") || name.includes("zira") || name.includes("samantha") || name.includes("google uk english female");
                        }
                        return name.includes("male") || name.includes("david") || name.includes("google uk english male");
                    });
                }
            }
            if (!preferredVoice) {
                preferredVoice = voices.find(v => v.lang.startsWith(language === 'te' ? 'te' : language === 'hi' ? 'hi' : 'en'));
            }
            utter.voice = preferredVoice || voices.find(v => v.default) || voices[0];
        }
        utter.onend = () => setIsSpeaking(false);
        utter.onerror = (ev) => { setIsSpeaking(false); };
        utteranceRef.current = utter;
        setIsSpeaking(true);
        synth.speak(utter);
    };

    /* ── Continuous voice listening ── */
    const toggleListening = () => {
        if (isListening && recognitionRef.current) {
            recognitionRef.current.stop();
            setIsListening(false);
            return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const w = window as any;
        const SpeechRecognitionAPI = w.SpeechRecognition || w.webkitSpeechRecognition;
        if (!SpeechRecognitionAPI) return;

        const recognition = new SpeechRecognitionAPI();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = "en-US";

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
            const transcript = event.results[event.results.length - 1][0].transcript.trim();
            if (transcript) {
                setFollowUp(transcript);
                // Auto-submit after voice input
                handleFollowUpSubmit(transcript);
            }
        };

        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => {
            // Restart if still in listening mode
            if (isListening) {
                try { recognition.start(); } catch { setIsListening(false); }
            }
        };

        recognitionRef.current = recognition;
        recognition.start();
        setIsListening(true);
    };

    /* ── Pin/Unpin answer ── */
    const togglePin = () => {
        try {
            const pinned = JSON.parse(localStorage.getItem("peak_pinned_answers") || "[]");
            if (isPinned) {
                const updated = pinned.filter((p: { query: string }) => p.query !== query);
                localStorage.setItem("peak_pinned_answers", JSON.stringify(updated));
                setIsPinned(false);
            } else {
                pinned.push({
                    id: Date.now().toString(),
                    query,
                    answer: answer.substring(0, 500),
                    pinnedAt: new Date().toISOString(),
                });
                localStorage.setItem("peak_pinned_answers", JSON.stringify(pinned));
                setIsPinned(true);
            }
        } catch { /* */ }
    };

    /* ── Media Download Helper ── */
    const handleDownload = async (url: string, filename: string) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = blobUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);
        } catch (err) {
            console.error("Download failed:", err);
            window.open(url, "_blank");
        }
    };

    /* ── Fetch Answer (Full Response) ── */
    const fetchAnswer = async (q: string) => {
        if (!q.trim()) return;

        // Gate check
        if (neuralMode !== "flash" && !isLoggedIn) {
            if (!supabaseBrowser) {
                setIsLocked(true);
                setIsLoading(false);
                return;
            }
            const { data: { session } } = await supabaseBrowser.auth.getSession();
            if (!session?.user) {
                setIsLocked(true);
                setIsLoading(false);
                return;
            }
        }

        // Start Data Hum
        import("@/utils/audioManager").then(m => m.startHum());

        window.speechSynthesis?.cancel();
        setIsSpeaking(false);
        setError("");

        // Reset View State
        setAnswer("");
        setDirectAnswer("");
        setDetailedAnswer("");
        setExplanationAnswer("");
        setViewMode("detailed");
        setIsGrounded(false);
        setIsMediaLoaded(false);
        setIsLoading(true);

        try {
            const content = q.trim();
            const response = await fetch("/api/search", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [{ role: "user", content }],
                    mode: neuralMode,
                    lang: language,
                    quality: videoQuality,
                    length: responseLength
                }),
                signal: abortRef.current?.signal
            });

            if (response.status === 429) {
                setShowRateLimit(true);
                throw new Error("Rate limit reached");
            }

            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();
            const fullText = data.text || "";

            setAnswer(fullText);

            // Process Answer sections
            if (fullText.includes("[DETAILED]")) {
                const parts = fullText.split("[DETAILED]");
                const quickPart = parts[0].replace(/\[QUICK\]/g, "").trim();
                let remainingPart = parts[1];

                if (remainingPart.includes("[EXPLANATION]")) {
                    const explParts = remainingPart.split("[EXPLANATION]");
                    setDetailedAnswer(explParts[0].trim());
                    setExplanationAnswer(explParts[1].trim());
                } else {
                    setDetailedAnswer(remainingPart.trim());
                    setExplanationAnswer("");
                }
                setDirectAnswer(quickPart);
            } else {
                setDirectAnswer(fullText.replace("[QUICK]", "").trim().slice(0, 200) + "...");
                setDetailedAnswer(fullText);
                setExplanationAnswer("");
            }

            // Update Messages History
            setMessages(prev => [
                ...prev,
                { role: 'user', content },
                { role: 'assistant', content: fullText }
            ]);

            incrementSearchCount();

        } catch (err: any) {
            if (err.name !== 'AbortError') {
                setError("Peak AI is currently refining your search. Please try again.");
                console.error(err);
            }
        } finally {
            setIsLoading(false);
            import("@/utils/audioManager").then(m => m.stopHum());
        }
    };

    useEffect(() => {
        if (!query) return;
        if (lastFetchedQuery.current === query) {
            return;
        }
        lastFetchedQuery.current = query;
        fetchAnswer(query);

        return () => {
            abortRef.current?.abort();
            lastFetchedQuery.current = null;
        };
    }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        return () => { import("@/utils/audioManager").then(m => m.stopHum()); };
    }, []);

    const handleManualRetry = () => {
        lastFetchedQuery.current = null;
        try { sessionStorage.removeItem(CACHE_PREFIX + query.trim().toLowerCase()); } catch { /* */ }
        fetchAnswer(query);
    };

    const handleFollowUpSubmit = async (overrideText?: string) => {
        const text = overrideText || followUp;
        if ((!text.trim() && !followUpAttachment)) return;

        setFollowUp("");
        let content = text.trim();
        if (followUpAttachment) {
            content += `\n\n[Attached File: ${followUpAttachment.url}]`;
            setFollowUpAttachment(null);
        }

        const newUserMsg: ChatMessage = { role: 'user', content };
        const updatedMessages = [...messages, newUserMsg];
        setMessages(updatedMessages);
        setFollowUpLoading(true);

        try {
            const response = await fetch("/api/search", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: updatedMessages,
                    mode: neuralMode,
                    lang: language,
                    quality: videoQuality,
                    length: responseLength
                }),
            });

            if (!response.ok) throw new Error("Network response was not ok");
            const data = await response.json();
            const fullText = data.text || "";

            setMessages(prev => [...prev, { role: 'assistant', content: fullText }]);
            incrementSearchCount();

            setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);

        } catch (err) {
            console.error(err);
        } finally {
            setFollowUpLoading(false);
        }
    };

    // Memoize markdown components to prevent re-rendering flashing (Jumpy fix)
    const markdownComponents = useMemo(() => ({
        p: ({ children }: any) => (
            <p className="animate-fade-in-text mb-4 last:mb-0 leading-relaxed text-[rgba(238,238,255,0.7)] text-sm md:text-base">
                {children}
            </p>
        ),
        li: ({ children }: any) => (
            <li className="animate-fade-in-text mb-2 last:mb-0 text-[rgba(238,238,255,0.7)] text-sm md:text-base">
                {children}
            </li>
        ),
        h1: ({ children }: any) => (
            <h1 className="animate-fade-in-text text-xl md:text-2xl font-bold mb-4 mt-6 text-[#eeeeff] first:mt-0 font-orbitron tracking-wide">
                {children}
            </h1>
        ),
        h2: ({ children }: any) => (
            <h2 className="animate-fade-in-text text-lg md:text-xl font-semibold mb-3 mt-5 text-[#eeeeff] border-b border-white/5 pb-2">
                {children}
            </h2>
        ),
        h3: ({ children }: any) => (
            <h3 className="animate-fade-in-text text-base md:text-lg font-medium mb-2 mt-4 text-[rgba(238,238,255,0.9)]">
                {children}
            </h3>
        ),
        code({ className, children, ...props }: any) {
            const isBlock = className?.startsWith("language-") || String(children).includes("\n");
            if (isBlock) {
                return (
                    <div className="animate-fade-in-text my-4 rounded-xl overflow-hidden border border-white/10 shadow-lg">
                        <CodeBlock className={className}>{String(children).replace(/\n$/, "")}</CodeBlock>
                    </div>
                );
            }
            return <code className={`${className} bg-white/10 px-1.5 py-0.5 rounded text-[#a855f7] text-sm font-mono`} {...props}>{children}</code>;
        },
        a({ href, children }: any) {
            return <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#4f8fff] hover:text-[#8b5cf6] underline underline-offset-4 transition-colors">{children}</a>;
        },
    }), []);

    const showContent = answer && !isLoading;
    // Only show empty message if we have NO query, or if we have a query but finished loading with no result/error
    const showEmpty = (!query) || (query && !answer && !isLoading && !isStreaming && !error);

    return (
        <>
            <RateLimitHandler isVisible={showRateLimit} onDismiss={() => setShowRateLimit(false)} />
            <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
            <SettingsDrawer isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

            <motion.main
                className="relative z-10 min-h-screen flex flex-col items-center px-4 py-8 sm:py-12 overflow-x-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
            >
                {/* ===== Top Bar ===== */}
                <motion.div
                    className="w-full max-w-5xl flex items-center gap-4 mb-8"
                    custom={0} variants={materialize} initial="hidden" animate="visible"
                >
                    <button
                        onClick={() => router.push("/")}
                        className="group flex items-center gap-2 px-4 py-2.5 rounded-full
                            bg-[rgba(255,255,255,0.025)] border border-[rgba(255,255,255,0.05)]
                            backdrop-blur-xl text-[rgba(238,238,255,0.45)]
                            hover:text-[#eeeeff] hover:bg-[rgba(255,255,255,0.05)]
                            hover:border-[rgba(139,92,246,0.3)]
                            transition-all duration-300 cursor-pointer"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform duration-300" />
                        <span className="text-sm font-medium">Back</span>
                    </button>

                    <button onClick={() => router.push("/")} className="flex items-center gap-2 cursor-pointer ml-auto">
                        <Image
                            src="/icon.png" alt="Peak AI" width={28} height={28}
                            priority
                            style={{ filter: "drop-shadow(0 0 20px rgba(168, 85, 247, 1))", mixBlendMode: "plus-lighter" as const }}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                        <span className="text-gradient text-xl font-bold tracking-tight" style={{ mixBlendMode: "plus-lighter" as const }}>
                            Peak
                        </span>
                    </button>

                    <div className="flex items-center gap-2 ml-4">
                        <AuthButton onSignInClick={() => setAuthOpen(true)} />
                        <motion.button
                            onClick={() => router.push("/workspace")}
                            className="p-2 rounded-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]
                                text-[rgba(238,238,255,0.4)] hover:text-[#eeeeff] hover:border-[rgba(168,85,247,0.3)]
                                transition-all duration-300 cursor-pointer hidden sm:block"
                            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                            title="My Workspace"
                        >
                            <Sparkles className="w-4 h-4" />
                        </motion.button>
                        <motion.button
                            onClick={() => setSettingsOpen(true)}
                            className="p-2 rounded-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]
                                text-[rgba(238,238,255,0.4)] hover:text-[#eeeeff] hover:border-[rgba(168,85,247,0.3)]
                                transition-all duration-300 cursor-pointer"
                            whileHover={{ scale: 1.1, rotate: 45 }} whileTap={{ scale: 0.9 }}
                        >
                            <Settings className="w-4 h-4" />
                        </motion.button>
                    </div>
                </motion.div>

                {/* ===== Locked or Main Content ===== */}
                {isLocked ? (
                    <div className="w-full flex-1 flex flex-col items-center justify-center mt-20 relative z-20">
                        <LockedModeCard />
                    </div>
                ) : (
                    <>
                        {/* ===== Query Display ===== */}
                        <motion.div className="w-full max-w-5xl mb-8" custom={1} variants={materialize} initial="hidden" animate="visible">
                            <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-[rgba(255,255,255,0.025)] border border-[rgba(255,255,255,0.05)] backdrop-blur-xl">
                                <Search className="w-4 h-4 text-[rgba(238,238,255,0.2)] flex-shrink-0" />
                                <span className="text-[#eeeeff] text-base font-light truncate">{query}</span>
                                <Sparkles className="w-4 h-4 text-[#8b5cf6] opacity-60 flex-shrink-0 ml-auto" />
                            </div>
                        </motion.div>

                        {/* ===== Main Content Area (Answer + Sidebar) ===== */}
                        <motion.div
                            className="w-full max-w-5xl flex flex-col lg:flex-row gap-6"
                            custom={2} variants={materialize} initial="hidden" animate="visible"
                        >
                            {/* Main Answer Column */}
                            <div className="flex-1 min-w-0">
                                <motion.div
                                    layout // Fluid layout animation
                                    className={`relative glass-strong p-8 sm:p-10 rounded-3xl overflow-hidden min-h-[200px] transition-all duration-500 ${error ? "border border-red-500/30 shadow-[0_0_40px_rgba(239,68,68,0.15)] bg-[rgba(239,68,68,0.02)]" : ""}`}
                                    variants={containerVariants}
                                    initial="hidden"
                                    animate="visible"
                                >
                                    {/* Decorative glows */}
                                    <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-[rgba(139,92,246,0.08)] blur-3xl pointer-events-none" />
                                    <div className="absolute -bottom-20 -left-20 w-40 h-40 rounded-full bg-[rgba(79,143,255,0.06)] blur-3xl pointer-events-none" />

                                    {/* Header */}
                                    <motion.div layout className="flex items-center gap-2 mb-6 relative z-10">
                                        <div className={`w-8 h-8 rounded-xl bg-gradient-to-br from-[#4f8fff] to-[#8b5cf6] flex items-center justify-center shadow-lg transition-shadow duration-300 ${isSpeaking ? "shadow-[0_0_20px_rgba(139,92,246,0.5)] animate-pulse" : "shadow-[rgba(139,92,246,0.2)]"}`}>
                                            <Sparkles className="w-4 h-4 text-white" />
                                        </div>
                                        <h2 className="text-sm font-semibold text-[rgba(238,238,255,0.5)] tracking-wide uppercase">AI Answer</h2>

                                        {/* Action buttons */}
                                        {answer && !isLoading && (
                                            <div className="flex items-center gap-1 ml-2">
                                                <motion.button onClick={toggleSpeech}
                                                    className={`p-1.5 rounded-lg cursor-pointer transition-all duration-300 ${isSpeaking ? "bg-[rgba(139,92,246,0.15)] text-[#a855f7]" : "bg-[rgba(255,255,255,0.03)] text-[rgba(238,238,255,0.3)] hover:text-[#a855f7]"}`}
                                                    whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                                    title={isSpeaking ? "Stop reading" : "Read aloud"}>
                                                    {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                                                </motion.button>
                                                <motion.button onClick={togglePin}
                                                    className={`p-1.5 rounded-lg cursor-pointer transition-all duration-300 ${isPinned ? "bg-[rgba(168,85,247,0.15)] text-[#a855f7]" : "bg-[rgba(255,255,255,0.03)] text-[rgba(238,238,255,0.3)] hover:text-[#a855f7]"}`}
                                                    whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                                    title={isPinned ? "Unpin" : "Pin answer"}>
                                                    {isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                                                </motion.button>
                                            </div>
                                        )}

                                        {isStreaming && (
                                            <span className="ml-auto flex items-center gap-1.5 text-xs text-[rgba(238,238,255,0.25)]">
                                                <span className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6] animate-pulse" />
                                                Streaming
                                            </span>
                                        )}
                                    </motion.div>

                                    {/* Director Mode Progress Bar */}
                                    <AnimatePresence>
                                        {neuralMode === "creative" && creativeSubMode === "director" && progress > 0 && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                                                animate={{ opacity: 1, height: "auto", marginBottom: 32 }}
                                                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                                className="w-full max-w-xl mx-auto overflow-hidden"
                                            >
                                                <div className="flex justify-between text-[10px] uppercase tracking-widest text-[#a855f7] mb-2 font-semibold">
                                                    <span>Rendering Cinema</span>
                                                    <span>{Math.round(progress)}%</span>
                                                </div>
                                                <div className="h-1 w-full bg-[#a855f7]/10 rounded-full overflow-hidden border border-[#a855f7]/20 relative">
                                                    <motion.div
                                                        className="absolute top-0 left-0 h-full bg-[#a855f7] shadow-[0_0_15px_#a855f7]"
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${progress}%` }}
                                                        transition={{ ease: "linear" }}
                                                    />
                                                </div>
                                                <p className="text-center text-[10px] text-white/30 mt-2 font-mono">
                                                    Constructing neural scenes...
                                                </p>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Content */}
                                    <div className="relative z-10 min-h-[100px]">
                                        <AnimatePresence mode="wait">
                                            {isLoading && (
                                                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-64 w-full flex items-center justify-center">
                                                    {/* Neural Pulse Loading State */}
                                                    <div className="scale-75 sm:scale-100">
                                                        <NeuralCore isTyping={true} />
                                                    </div>
                                                    <p className="absolute mt-32 text-xs uppercase tracking-[0.2em] text-[#a855f7] animate-pulse">Processing Data...</p>
                                                </motion.div>
                                            )}

                                            {error && !isLoading && (
                                                <motion.div key="error" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                                    className="flex flex-col items-center justify-center py-12 gap-6 relative z-20">
                                                    <div className="w-16 h-16 rounded-full bg-[rgba(239,68,68,0.1)] flex items-center justify-center border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.15)]">
                                                        <AlertCircle className="w-8 h-8 text-red-400" />
                                                    </div>
                                                    <div className="text-center max-w-sm">
                                                        <h3 className="text-lg font-semibold text-[#eeeeff] mb-2 tracking-wide font-orbitron">Neural Connection Interrupted</h3>
                                                        <p className="text-sm text-red-300/80 leading-relaxed">{error}</p>
                                                    </div>
                                                    <button onClick={handleManualRetry}
                                                        className="group flex items-center gap-2 px-6 py-2.5 rounded-full
                                                    bg-[rgba(239,68,68,0.1)] border border-red-500/30
                                                    text-red-300 hover:text-white hover:bg-red-500/20 hover:border-red-500/50
                                                    transition-all duration-300 text-sm cursor-pointer shadow-lg shadow-red-900/10">
                                                        <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                                                        <span>Re-establish Uplink</span>
                                                    </button>
                                                </motion.div>
                                            )}

                                            {showContent && (
                                                <motion.div key="answer-container"
                                                    layout
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ duration: 0.8, ease: "easeOut" }}
                                                    className="w-full"
                                                >
                                                    {/* Toggle Switcher & Actions */}
                                                    <div className="mb-6 flex flex-wrap justify-center items-center gap-4">
                                                        <ResponseToggle viewData={viewMode} onChange={setViewMode} />

                                                        {isGrounded && (
                                                            <motion.div
                                                                initial={{ opacity: 0, x: -10 }}
                                                                animate={{ opacity: 1, x: 0 }}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[10px] uppercase tracking-wider font-semibold"
                                                            >
                                                                <Globe className="w-3 h-3" />
                                                                <span>Searched the Web</span>
                                                            </motion.div>
                                                        )}

                                                        {/* Download Button for Media */}
                                                        {(answer.startsWith("IMAGE_DATA:") || answer.startsWith("VIDEO_DATA:")) && isMediaLoaded && (
                                                            <motion.button
                                                                initial={{ opacity: 0, scale: 0.8 }}
                                                                animate={{ opacity: 1, scale: 1 }}
                                                                whileHover={{ scale: 1.05 }}
                                                                whileTap={{ scale: 0.95 }}
                                                                onClick={() => {
                                                                    const isVideo = answer.startsWith("VIDEO_DATA:");
                                                                    const url = answer.replace(isVideo ? "VIDEO_DATA:" : "IMAGE_DATA:", "");
                                                                    const ext = isVideo ? "mp4" : "png";
                                                                    handleDownload(url, `peak-ai-gen.${ext}`);
                                                                }}
                                                                className="p-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 transition-colors"
                                                                title="Save Media"
                                                            >
                                                                <Save className="w-4 h-4 text-[#eeeeff]" />
                                                            </motion.button>
                                                        )}
                                                    </div>

                                                    {/* Sliding Content */}
                                                    <AnimatePresence mode="wait">
                                                        {answer.startsWith("IMAGE_DATA:") ? (
                                                            <motion.div
                                                                key="image-result"
                                                                initial={{ opacity: 0, scale: 0.9 }}
                                                                animate={{ opacity: 1, scale: 1 }}
                                                                exit={{ opacity: 0, scale: 0.95 }}
                                                                transition={{ duration: 0.6, ease: "easeOut" }}
                                                                className="w-full max-w-2xl mx-auto rounded-2xl p-3 bg-white/5 backdrop-blur-xl border border-white/15 shadow-2xl"
                                                            >
                                                                <div className="flex justify-center w-full relative min-h-[300px]">
                                                                    {/* Shimmer / Skeleton Loader */}
                                                                    <AnimatePresence>
                                                                        {!isMediaLoaded && (
                                                                            <motion.div
                                                                                key="img-skeleton"
                                                                                initial={{ opacity: 0 }}
                                                                                animate={{ opacity: 1 }}
                                                                                exit={{ opacity: 0 }}
                                                                                className="absolute inset-0 w-full rounded-xl overflow-hidden bg-[rgba(255,255,255,0.05)] border border-white/10"
                                                                            >
                                                                                <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                                                                                <div className="absolute inset-0 flex items-center justify-center">
                                                                                    <Loader2 className="w-8 h-8 text-[#8b5cf6] animate-spin opacity-50" />
                                                                                </div>
                                                                            </motion.div>
                                                                        )}
                                                                    </AnimatePresence>

                                                                    {/* Image */}
                                                                    <motion.img
                                                                        src={answer.replace("IMAGE_DATA:", "")}
                                                                        alt="Generated Visualization"
                                                                        onLoad={() => setIsMediaLoaded(true)}
                                                                        initial={{ opacity: 0, scale: 0.95 }}
                                                                        animate={{
                                                                            opacity: isMediaLoaded ? 1 : 0,
                                                                            scale: isMediaLoaded ? 1 : 0.95
                                                                        }}
                                                                        transition={{ duration: 0.5, ease: "easeOut" }}
                                                                        className="rounded-xl w-full h-auto object-cover relative z-10"
                                                                    />
                                                                </div>
                                                            </motion.div>
                                                        ) : answer.startsWith("VIDEO_DATA:") ? (
                                                            <motion.div
                                                                key="video-result"
                                                                initial={{ opacity: 0, scale: 0.9 }}
                                                                animate={{ opacity: 1, scale: 1 }}
                                                                exit={{ opacity: 0, scale: 0.95 }}
                                                                transition={{ duration: 0.6, ease: "easeOut" }}
                                                                className="w-full max-w-2xl mx-auto rounded-2xl p-3 bg-white/5 backdrop-blur-xl border border-white/15 shadow-2xl"
                                                            >
                                                                <div className="flex justify-center w-full relative min-h-[300px]">
                                                                    {/* Video Shimmer */}
                                                                    <AnimatePresence>
                                                                        {!isMediaLoaded && (
                                                                            <motion.div
                                                                                key="vid-skeleton"
                                                                                initial={{ opacity: 0 }}
                                                                                animate={{ opacity: 1 }}
                                                                                exit={{ opacity: 0 }}
                                                                                className="absolute inset-0 w-full rounded-xl overflow-hidden bg-[rgba(255,255,255,0.05)] border border-white/10"
                                                                            >
                                                                                <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                                                                                <div className="absolute inset-0 flex items-center justify-center flex-col gap-2">
                                                                                    <Loader2 className="w-8 h-8 text-[#8b5cf6] animate-spin opacity-50" />
                                                                                    <span className="text-xs text-[#8b5cf6]/50 tracking-widest uppercase">Rendering Scene...</span>
                                                                                </div>
                                                                            </motion.div>
                                                                        )}
                                                                    </AnimatePresence>

                                                                    {/* Video */}
                                                                    <motion.video
                                                                        src={answer.replace("VIDEO_DATA:", "")}
                                                                        controls
                                                                        autoPlay
                                                                        loop
                                                                        muted
                                                                        onLoadedData={() => setIsMediaLoaded(true)}
                                                                        onCanPlayThrough={() => setIsMediaLoaded(true)}
                                                                        initial={{ opacity: 0, scale: 0.95 }}
                                                                        animate={{
                                                                            opacity: isMediaLoaded ? 1 : 0,
                                                                            scale: isMediaLoaded ? 1 : 0.95
                                                                        }}
                                                                        transition={{ duration: 0.5, ease: "easeOut" }}
                                                                        className="rounded-xl w-full h-auto object-cover relative z-10"
                                                                    />
                                                                </div>
                                                            </motion.div>
                                                        ) : (
                                                            <motion.div
                                                                key={viewMode}
                                                                variants={containerVariants}
                                                                initial="hidden"
                                                                animate="visible"
                                                                exit={{ opacity: 0, filter: "blur(5px)", transition: { duration: 0.2 } }}
                                                                className="prose prose-invert prose-sm max-w-none
                                                            prose-headings:text-[#eeeeff] prose-headings:font-semibold
                                                            prose-p:text-[rgba(238,238,255,0.65)] prose-p:leading-relaxed
                                                            prose-strong:text-[#eeeeff]
                                                            prose-ul:text-[rgba(238,238,255,0.6)]
                                                            prose-ol:text-[rgba(238,238,255,0.6)]
                                                            prose-li:marker:text-[#8b5cf6]
                                                            prose-code:text-[#8b5cf6] prose-code:bg-[rgba(139,92,246,0.1)] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-xs
                                                            prose-a:text-[#4f8fff] prose-a:no-underline hover:prose-a:underline"
                                                            >
                                                                <ReactMarkdown
                                                                    remarkPlugins={[remarkMath, remarkGfm]}
                                                                    rehypePlugins={[rehypeKatex]}
                                                                    components={markdownComponents}
                                                                >
                                                                    {viewMode === "direct"
                                                                        ? directAnswer
                                                                        : viewMode === "explanation"
                                                                            ? explanationAnswer
                                                                            : detailedAnswer}
                                                                </ReactMarkdown>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {isStreaming && (
                                            <span className="animate-cursor-blink ml-0.5 align-middle" />
                                        )}

                                        {!isLoading && !answer && !error && !query && (
                                            <div className="flex items-center justify-center py-12">
                                                <p className="text-sm text-[rgba(238,238,255,0.25)]">No query provided. Go back and search for something.</p>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>

                                {/* Ambient glow */}
                                <div className="mx-auto mt-[-2px] w-3/4 h-12 rounded-full blur-3xl
                            bg-gradient-to-r from-[#8b5cf6]/15 via-[#a855f7]/10 to-[#4f8fff]/15
                            pointer-events-none opacity-60" />

                                {/* ===== Follow-up Chat ===== */}
                                {showContent && (
                                    <motion.div
                                        className="mt-6"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3, type: "spring", stiffness: 80, damping: 14 }}
                                    >
                                        {/* Chat messages */}
                                        {chatHistory.length > 0 && (
                                            <div className="space-y-3 mb-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
                                                {chatHistory.map((msg, i) => (
                                                    <motion.div
                                                        key={i}
                                                        initial={{ opacity: 0, y: 6 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                                                    >
                                                        <div
                                                            className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${msg.role === "user"
                                                                ? "bg-[rgba(168,85,247,0.1)] border border-[rgba(168,85,247,0.2)] text-[rgba(238,238,255,0.7)]"
                                                                : "bg-[rgba(255,255,255,0.025)] border border-[rgba(255,255,255,0.05)] text-[rgba(238,238,255,0.6)]"
                                                                }`}
                                                        >
                                                            {msg.role === "assistant" ? (
                                                                <div className="prose prose-invert prose-sm max-w-none prose-p:text-[rgba(238,238,255,0.6)] prose-p:leading-relaxed prose-strong:text-[#eeeeff] prose-a:text-[#4f8fff]">
                                                                    <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}
                                                                        components={{
                                                                            code({ className, children }) {
                                                                                const isBlock = className?.startsWith("language-") || String(children).includes("\n");
                                                                                if (isBlock) return <CodeBlock className={className}>{String(children).replace(/\n$/, "")}</CodeBlock>;
                                                                                return <code className={className}>{children}</code>;
                                                                            },
                                                                            a({ href, children }) {
                                                                                return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
                                                                            },
                                                                        }}
                                                                    >{typeof msg.content === 'string' ? msg.content : ''}</ReactMarkdown>
                                                                </div>
                                                            ) : (
                                                                // User Message
                                                                <div className="flex flex-col gap-2">
                                                                    {Array.isArray(msg.content) ? (
                                                                        <>
                                                                            {msg.content.map((part, idx) => {
                                                                                if (part.type === 'text') return <span key={idx}>{part.text}</span>;
                                                                                if (part.type === 'image_url') return (
                                                                                    <img key={idx} src={part.image_url.url} alt="Attached" className="max-w-full rounded-lg border border-white/10" />
                                                                                );
                                                                                return null;
                                                                            })}
                                                                        </>
                                                                    ) : (
                                                                        msg.content
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                ))}
                                                <div ref={chatEndRef} />
                                            </div>
                                        )}

                                        {/* Follow-up input */}
                                        <form
                                            onSubmit={(e) => { e.preventDefault(); handleFollowUpSubmit(); }}
                                            className="flex items-center gap-2"
                                        >
                                            <div className="flex-1 flex flex-col gap-2 p-2 rounded-2xl
                                        bg-[rgba(255,255,255,0.025)] border border-[rgba(255,255,255,0.06)]
                                        backdrop-blur-xl focus-within:border-[rgba(168,85,247,0.3)]
                                        transition-all duration-300">

                                                {/* Attachment Preview */}
                                                <AnimatePresence>
                                                    {followUpAttachment && (
                                                        <motion.div
                                                            initial={{ opacity: 0, height: 0 }}
                                                            animate={{ opacity: 1, height: "auto" }}
                                                            exit={{ opacity: 0, height: 0 }}
                                                            className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2"
                                                        >
                                                            <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center overflow-hidden">
                                                                {followUpAttachment.type === "image" && followUpAttachment.base64 ? (
                                                                    <img src={followUpAttachment.base64} alt="Preview" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <FileText className="w-4 h-4 text-indigo-400" />
                                                                )}
                                                            </div>
                                                            <span className="text-xs text-white/70 truncate flex-1">{followUpAttachment.name}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => setFollowUpAttachment(null)}
                                                                className="text-white/40 hover:text-white"
                                                            >
                                                                <X className="w-3.5 h-3.5" />
                                                            </button>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>

                                                <div className="flex items-center gap-2 px-2">
                                                    <input
                                                        type="text"
                                                        value={followUp}
                                                        onChange={(e) => setFollowUp(e.target.value)}
                                                        placeholder="Ask a follow-up question..."
                                                        disabled={followUpLoading}
                                                        className="flex-1 bg-transparent text-sm text-[#eeeeff] placeholder:text-[rgba(238,238,255,0.2)] outline-none disabled:opacity-50 min-h-[24px]"
                                                    />

                                                    {/* Upload Button */}
                                                    <button
                                                        type="button"
                                                        disabled={isUploading || followUpLoading}
                                                        onClick={() => fileInputRef.current?.click()}
                                                        className="text-[rgba(238,238,255,0.25)] hover:text-[#eeeeff] transition-colors"
                                                    >
                                                        {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                                                        <input
                                                            ref={fileInputRef}
                                                            type="file"
                                                            className="hidden"
                                                            accept="image/png, image/jpeg, application/pdf"
                                                            onChange={async (e) => {
                                                                const file = e.target.files?.[0];
                                                                if (!file) return;
                                                                setIsUploading(true);
                                                                try {
                                                                    if (file.type.startsWith("image/")) {
                                                                        const base64 = await readFileAsBase64(file);
                                                                        setFollowUpAttachment({ type: "image", base64, name: file.name });
                                                                    } else if (file.type === "application/pdf") {
                                                                        const url = await uploadFileToSupabase(file);
                                                                        if (url) setFollowUpAttachment({ type: "file", url, name: file.name });
                                                                    }
                                                                } catch (err) { console.error(err); }
                                                                finally { setIsUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
                                                            }}
                                                        />
                                                    </button>

                                                    <motion.button
                                                        type="button"
                                                        onClick={toggleListening}
                                                        className={`p-1.5 rounded-lg cursor-pointer transition-all duration-300 ${isListening
                                                            ? "bg-[rgba(239,68,68,0.1)] text-red-400 mic-pulse"
                                                            : "text-[rgba(238,238,255,0.25)] hover:text-[#a855f7]"
                                                            }`}
                                                        whileTap={{ scale: 0.9 }}
                                                        title={isListening ? "Stop listening" : "Voice command (continuous)"}
                                                    >
                                                        {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                                                    </motion.button>
                                                </div>
                                            </div>
                                            <motion.button
                                                type="submit"
                                                disabled={(!followUp.trim() && !followUpAttachment) || followUpLoading}
                                                className="p-3 rounded-2xl bg-gradient-to-r from-[#7c3aed] to-[#a855f7]
                                            text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer
                                            transition-all duration-200 self-end"
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                            >
                                                {followUpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <SendHorizonal className="w-4 h-4" />}
                                            </motion.button>
                                        </form>
                                    </motion.div>
                                )}
                                {/* ===== Deep Dive Toolbar ===== */}
                                {showContent && !isStreaming && <DeepDiveToolbar query={query} />}
                            </div>

                            {/* ===== Entities Sidebar ===== */}
                            {showContent && <EntitiesSidebar answer={answer} />}
                        </motion.div >

                    </>
                )
                }

                {/* ===== Footer ===== */}
                <motion.footer className="mt-auto pt-12 pb-8 flex flex-col items-center gap-2 text-center"
                    custom={3} variants={materialize} initial="hidden" animate="visible">
                    <p className="neon-credit text-xs font-bold tracking-[0.25em] uppercase text-[#8b5cf6]"
                        style={{ fontFamily: "var(--font-orbitron), sans-serif" }}>
                        Developed by Sathwik
                    </p>
                    <p className="text-[10px] text-[rgba(238,238,255,0.2)] max-w-md leading-relaxed">
                        Data from Groq AI. Peak AI ensures privacy but answers may contain inaccuracies.
                    </p>
                </motion.footer>
            </motion.main >

            {/* Google Programmable Search Engine Implementation */}
            < Script
                src="https://cse.google.com/cse.js?cx=e5ec2e7bcf3e64e49"
                strategy="afterInteractive"
            />

            {/* Hidden styled container for CSE if needed (Google injects its own UI via <div class="gcse-searchresults-only">) */}
        </>
    );
}

export default function SearchResultsPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#030312]" />}>
            <SearchResultsContent />
        </Suspense>
    );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { Sparkles, Zap, Shield, Clock, ArrowRight, Settings, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { supabaseBrowser } from "@/lib/supabaseClient";
import SearchBar from "@/components/SearchBar";
import RateLimitHandler from "@/components/RateLimitHandler";
import AuthButton from "@/components/AuthButton";
import AuthModal from "@/components/AuthModal";
import SettingsDrawer from "@/components/SettingsDrawer";
import AboutSection from "@/components/AboutSection";
import NeuralModeSelector from "@/components/NeuralModeSelector";
import LockedModeCard from "@/components/LockedModeCard";
import { playInteractionSound, playBootSequence } from "@/utils/audioManager";
import dynamic from "next/dynamic";
import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/contexts/SettingsContext";


const BootSequence = dynamic(() => import("@/components/BootSequence"), { ssr: false });

const FEATURES = [
  {
    icon: Sparkles,
    title: "AI Answers",
    description: "Powered by Groq AI. Get intelligent, conversational answers instantly.",
    glowClass: "glow-violet",
    iconColor: "text-[#8b5cf6]",
  },
  {
    icon: Shield,
    title: "Free Forever",
    description: "No subscriptions. No hidden costs. Hosted on Vercel free tier.",
    glowClass: "glow-cyan",
    iconColor: "text-[#06b6d4]",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Optimized for speed. Results in milliseconds, not seconds.",
    glowClass: "glow-blue",
    iconColor: "text-[#4f8fff]",
  },
];

interface HistoryItem {
  id: string;
  query: string;
  answer: string;
  created_at: string;
}

const fadeUp = {
  hidden: { opacity: 0, y: 30, filter: "blur(8px)" },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      delay: i * 0.2, // 0.2s interval
      type: "spring" as const,
      stiffness: 100,
      damping: 20, // Heavy mechanical feel
      mass: 0.8,
    },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1, delayChildren: 0.3 },
  },
};

export default function Home() {
  const [showRateLimit, setShowRateLimit] = useState(false);
  const [recentSearches, setRecentSearches] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [logoExists, setLogoExists] = useState(false);
  const [nebulaExplosion, setNebulaExplosion] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [toast, setToast] = useState("");
  const aboutRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    if (params.get("error")) {
      setToast("Login cancelled. Feel free to explore Flash mode!");
      setTimeout(() => setToast(""), 6000);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const { isLoggedIn, loading: authLoading } = useAuth();
  const { neuralMode } = useSettings();

  // Premium Lock Logic: Flash is free, everything else requires auth
  const isLocked = !authLoading && !isLoggedIn && neuralMode !== "flash";

  useEffect(() => {
    if (authLoading) return;

    if (!isLoggedIn || !supabaseBrowser) {
      setHistoryLoading(false);
      return;
    }

    const fetchHistory = async () => {
      try {
        const { data, error } = await supabaseBrowser!
          .from("searches")
          .select("id, query, answer, created_at")
          .order("created_at", { ascending: false })
          .limit(50);

        if (data && !error) {
          // Client-side unique filter
          const uniqueMap = new Map();
          const uniqueList: HistoryItem[] = [];

          for (const item of data) {
            const normalizedQuery = item.query.trim().toLowerCase();
            if (!uniqueMap.has(normalizedQuery)) {
              uniqueMap.set(normalizedQuery, true);
              uniqueList.push(item);
            }
            if (uniqueList.length >= 5) break;
          }

          setRecentSearches(uniqueList);
        }
      } catch { }
      setHistoryLoading(false);
    };

    fetchHistory();
  }, [isLoggedIn, authLoading]);

  /* Check if logo file exists */
  useEffect(() => {
    const img = new window.Image();
    img.onload = () => setLogoExists(true);
    img.onerror = () => setLogoExists(false);
    img.src = "/icon.png";

    // Play Boot Sequence
    const timer = setTimeout(() => {
      playBootSequence();
      window.dispatchEvent(new CustomEvent("peak-boot"));
    }, 1000); // 1s delay for dramatic effect

    return () => clearTimeout(timer);
  }, []);

  const timeAgo = (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <>
      <RateLimitHandler
        isVisible={showRateLimit}
        onDismiss={() => setShowRateLimit(false)}
      />
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
      <SettingsDrawer isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <motion.main
        className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
      >
        {/* ===== Top Bar: Auth + Settings ===== */}
        <motion.div
          className="fixed top-0 left-0 right-0 z-30 flex items-center justify-end gap-2 px-4 py-3"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 200, damping: 20 }}
        >
          <AuthButton onSignInClick={() => setAuthOpen(true)} />
          <motion.button
            onClick={() => {
              setSettingsOpen(true);
              playInteractionSound("click");
            }}
            className="
              p-2.5 rounded-full
              bg-[rgba(255,255,255,0.03)]
              border border-[rgba(255,255,255,0.06)]
              text-[rgba(238,238,255,0.4)]
              hover:text-[#eeeeff]
              hover:border-[rgba(168,85,247,0.3)]
              hover:bg-[rgba(168,85,247,0.06)]
              transition-all duration-300
              cursor-pointer
            "
            whileHover={{ scale: 1.1, rotate: 45 }}
            whileTap={{ scale: 0.9 }}
          >
            <Settings className="w-4 h-4" />
          </motion.button>
        </motion.div>

        {/* ===== Hero Section ===== */}
        {/* OLED Spotlight */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-indigo-500/20 blur-[120px] rounded-full pointer-events-none" />

        <motion.section
          className="flex flex-col items-center text-center max-w-3xl mx-auto w-full"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          {/* Badge */}
          <motion.div
            custom={0}
            variants={fadeUp}
            className="
              inline-flex items-center gap-2 px-4 py-1.5
              rounded-full
              bg-[rgba(255,255,255,0.025)]
              border border-[rgba(255,255,255,0.05)]
              backdrop-blur-md
              mb-8
            "
          >
            <span className="w-2 h-2 rounded-full bg-[#8b5cf6] animate-pulse" />
            <span className="text-xs font-medium text-zinc-400 tracking-wider uppercase">
              Powered by AI
            </span>
          </motion.div>

          {/* Logo Image (only if file exists) */}
          {logoExists && (
            <motion.div custom={1} variants={fadeUp} className="mb-4">
              <Image
                src="/icon.png"
                alt="Peak AI Logo"
                width={96}
                height={96}
                className="mx-auto"
                style={{
                  filter: "drop-shadow(0 0 20px rgba(168, 85, 247, 1))",
                  mixBlendMode: "plus-lighter" as const,
                }}
                priority
              />
            </motion.div>
          )}

          {/* Logo Text - Index 1 (0.2s) */}
          <motion.h1
            custom={1}
            variants={fadeUp}
            className="
              text-6xl sm:text-7xl md:text-8xl font-bold tracking-tight
              mb-4 text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-300 to-white bg-[length:200%_auto] animate-[text-pan_4s_linear_infinite] drop-shadow-[0_0_15px_var(--accent-glow)]
            "
            style={{ mixBlendMode: "plus-lighter" as const }}
          >
            Peak
          </motion.h1>

          {/* Tagline */}
          <motion.p
            custom={logoExists ? 3 : 2}
            variants={fadeUp}
            className="
              text-lg sm:text-xl text-zinc-400
              font-light max-w-md mx-auto mb-12
              leading-relaxed
            "
          >
            AI-Powered Search.{" "}
            <span className="text-zinc-200 font-normal">Zero Cost.</span>
          </motion.p>

          {/* Neural Mode Selector */}
          <motion.div custom={logoExists ? 4 : 3} variants={fadeUp} className="w-full">
            <NeuralModeSelector />
          </motion.div>

          {/* Search Bar OR Locked Card - Index 2 (0.4s) */}
          <motion.div layout custom={2} variants={fadeUp} className="w-full mb-6 relative z-20">
            <AnimatePresence mode="wait">
              {isLocked ? (
                <motion.div
                  key="locked"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <LockedModeCard />
                </motion.div>
              ) : (
                <motion.div
                  key="search"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <SearchBar onTyping={setIsTyping} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Hint */}
          <motion.p
            layout
            custom={logoExists ? 5 : 4}
            variants={fadeUp}
            className="text-xs text-[rgba(238,238,255,0.15)] mb-20"
          >
            Press{" "}
            <kbd className="px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-[rgba(238,238,255,0.3)] mx-0.5">
              Enter
            </kbd>{" "}
            to search
          </motion.p>
        </motion.section>

        {/* ===== Recent Intelligence ===== */}
        {!historyLoading && recentSearches.length > 0 && (
          <motion.section
            className="w-full max-w-3xl mx-auto mb-16"
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            <motion.div custom={0} variants={fadeUp} className="flex items-center gap-2 mb-4 px-2 justify-center">
              <Clock className="w-4 h-4 text-[rgba(238,238,255,0.25)]" />
              <h2 className="text-sm font-semibold text-[rgba(238,238,255,0.35)] tracking-wide uppercase">
                Recent Intelligence
              </h2>
            </motion.div>

            <div className="flex gap-3 overflow-x-auto pb-4 px-2 scrollbar-hide mask-fade-sides justify-start sm:justify-center">
              {recentSearches.map((item, idx) => (
                <motion.button
                  key={item.id}
                  custom={idx + 1}
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  onClick={() =>
                    router.push(`/search?q=${encodeURIComponent(item.query)}`)
                  }
                  className="
                    flex-shrink-0 group
                    flex items-center gap-3
                    px-5 py-2.5
                    rounded-full
                    bg-[rgba(255,255,255,0.03)]
                    border border-[rgba(255,255,255,0.06)]
                    backdrop-blur-xl
                    hover:bg-[rgba(168,85,247,0.1)]
                    hover:border-[rgba(168,85,247,0.3)]
                    hover:shadow-[0_0_15px_rgba(168,85,247,0.15)]
                    transition-all duration-300
                    cursor-pointer
                    max-w-[200px]
                  "
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="text-sm text-[#eeeeff] font-medium truncate">
                    {item.query}
                  </span>
                  <ArrowRight className="w-3 h-3 text-[rgba(238,238,255,0.2)] group-hover:text-[#a855f7] -ml-1 group-hover:translate-x-0.5 transition-all duration-300" />
                </motion.button>
              ))}
            </div>
          </motion.section>
        )}

        {/* ===== Feature Cards ===== */}
        <motion.section
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto w-full px-2"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          {FEATURES.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                custom={idx}
                variants={fadeUp}
                className="feature-card glass p-6 rounded-2xl cursor-default"
                whileHover={{ scale: 1.03, y: -4 }}
              >
                <div
                  className="
                    w-10 h-10 rounded-xl
                    flex items-center justify-center
                    bg-[rgba(255,255,255,0.025)]
                    border border-[rgba(255,255,255,0.04)]
                    mb-4
                  "
                >
                  <Icon className={`w-5 h-5 ${feature.iconColor}`} />
                </div>
                <h3 className="text-sm font-semibold text-[#eeeeff] mb-1.5">
                  {feature.title}
                </h3>
                <p className="text-xs text-[rgba(238,238,255,0.35)] leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </motion.section>

        <motion.div layout ref={aboutRef} custom={3} variants={fadeUp} initial="hidden" animate="visible" className="w-full">
          <AboutSection isTyping={isTyping} />
        </motion.div>

      </motion.main>

      {/* ===== Boot Sequence Overlay ===== */}
      <BootSequence onComplete={() => { }} />

      {/* ===== Toast Notification ===== */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 20, x: "-50%" }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] bg-red-500/10 border border-red-500/20 text-red-200 px-6 py-3 rounded-full text-sm flex items-center gap-3 backdrop-blur-md shadow-2xl"
          >
            <AlertCircle className="w-4 h-4" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

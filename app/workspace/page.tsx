"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    Search,
    Pin,
    Trash2,
    TrendingUp,
    BookOpen,
    Sparkles,
} from "lucide-react";

interface PinnedAnswer {
    id: string;
    query: string;
    answer: string;
    pinnedAt: string;
}

function getSearchCount(): number {
    try {
        return parseInt(localStorage.getItem("peak_search_count") || "0", 10);
    } catch {
        return 0;
    }
}

function getPinnedAnswers(): PinnedAnswer[] {
    try {
        return JSON.parse(localStorage.getItem("peak_pinned_answers") || "[]");
    } catch {
        return [];
    }
}

function unpinAnswer(id: string) {
    try {
        const pinned = getPinnedAnswers().filter((p) => p.id !== id);
        localStorage.setItem("peak_pinned_answers", JSON.stringify(pinned));
    } catch { /* ignore */ }
}

export default function WorkspacePage() {
    const router = useRouter();
    const [searchCount, setSearchCount] = useState(0);
    const [pinned, setPinned] = useState<PinnedAnswer[]>([]);

    useEffect(() => {
        setSearchCount(getSearchCount());
        setPinned(getPinnedAnswers());
    }, []);

    const handleUnpin = (id: string) => {
        unpinAnswer(id);
        setPinned((prev) => prev.filter((p) => p.id !== id));
    };

    const statCards = [
        {
            icon: TrendingUp,
            label: "Total Searches",
            value: searchCount,
            color: "#4f8fff",
        },
        {
            icon: Pin,
            label: "Pinned Answers",
            value: pinned.length,
            color: "#a855f7",
        },
        {
            icon: BookOpen,
            label: "Knowledge Index",
            value: Math.floor(searchCount * 2.4),
            color: "#06b6d4",
        },
    ];

    return (
        <motion.main
            className="relative z-10 min-h-screen px-4 py-8 sm:py-12 max-w-4xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
        >
            {/* Top bar */}
            <motion.div
                className="flex items-center gap-4 mb-10"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 100, damping: 14 }}
            >
                <button
                    onClick={() => router.push("/")}
                    className="
                        group flex items-center gap-2
                        px-4 py-2.5 rounded-full
                        bg-[rgba(255,255,255,0.025)]
                        border border-[rgba(255,255,255,0.05)]
                        backdrop-blur-xl
                        text-[rgba(238,238,255,0.4)]
                        hover:text-[#eeeeff]
                        hover:border-[rgba(168,85,247,0.3)]
                        transition-all duration-300
                        text-sm font-medium cursor-pointer
                    "
                >
                    <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                    Home
                </button>

                <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#a855f7]" />
                    <h1
                        className="text-lg font-bold tracking-wider text-[#eeeeff] uppercase"
                        style={{ fontFamily: "var(--font-orbitron), sans-serif" }}
                    >
                        My Workspace
                    </h1>
                </div>
            </motion.div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
                {statCards.map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                        <motion.div
                            key={stat.label}
                            className="rounded-2xl p-5 relative overflow-hidden"
                            style={{
                                background: "rgba(10, 10, 30, 0.6)",
                                backdropFilter: "blur(24px)",
                                border: "1px solid rgba(255,255,255,0.06)",
                                boxShadow: `0 0 30px ${stat.color}10`,
                            }}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1, type: "spring", stiffness: 80, damping: 14 }}
                        >
                            <div
                                className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-3xl opacity-20"
                                style={{ background: stat.color }}
                            />
                            <div className="flex items-center gap-3 mb-3">
                                <div
                                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                                    style={{
                                        background: `${stat.color}15`,
                                        border: `1px solid ${stat.color}25`,
                                    }}
                                >
                                    <Icon className="w-4 h-4" style={{ color: stat.color }} />
                                </div>
                                <span className="text-[10px] font-medium uppercase tracking-wider text-[rgba(238,238,255,0.3)]">
                                    {stat.label}
                                </span>
                            </div>
                            <motion.p
                                className="text-3xl font-bold text-[#eeeeff]"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.3 + i * 0.1 }}
                                style={{ fontFamily: "var(--font-orbitron), sans-serif" }}
                            >
                                {stat.value.toLocaleString()}
                            </motion.p>
                        </motion.div>
                    );
                })}
            </div>

            {/* Pinned Answers */}
            <div>
                <h2
                    className="text-xs font-bold tracking-[0.2em] uppercase text-[rgba(168,85,247,0.5)] mb-4 flex items-center gap-2"
                    style={{ fontFamily: "var(--font-orbitron), sans-serif" }}
                >
                    <Pin className="w-3.5 h-3.5" />
                    Pinned Answers
                </h2>

                {pinned.length === 0 ? (
                    <motion.div
                        className="rounded-2xl p-8 text-center"
                        style={{
                            background: "rgba(10, 10, 30, 0.4)",
                            border: "1px solid rgba(255,255,255,0.04)",
                        }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        <Pin className="w-8 h-8 mx-auto mb-3 text-[rgba(238,238,255,0.15)]" />
                        <p className="text-sm text-[rgba(238,238,255,0.25)]">
                            No pinned answers yet. Pin answers from search results to save them here.
                        </p>
                    </motion.div>
                ) : (
                    <div className="space-y-3">
                        {pinned.map((item, i) => (
                            <motion.div
                                key={item.id}
                                className="rounded-2xl p-4 relative group"
                                style={{
                                    background: "rgba(10, 10, 30, 0.5)",
                                    backdropFilter: "blur(16px)",
                                    border: "1px solid rgba(255,255,255,0.05)",
                                }}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <button
                                            onClick={() =>
                                                router.push(`/search?q=${encodeURIComponent(item.query)}`)
                                            }
                                            className="text-sm font-medium text-[#eeeeff] hover:text-[#a855f7] transition-colors cursor-pointer flex items-center gap-2"
                                        >
                                            <Search className="w-3.5 h-3.5 flex-shrink-0" />
                                            {item.query}
                                        </button>
                                        <p className="text-xs text-[rgba(238,238,255,0.3)] mt-1 line-clamp-2">
                                            {item.answer
                                                .replace(/[#*_`~>\-|[\]()]/g, "")
                                                .substring(0, 150)}
                                            ...
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleUnpin(item.id)}
                                        className="
                                            p-2 rounded-lg opacity-0 group-hover:opacity-100
                                            text-[rgba(238,238,255,0.3)] hover:text-red-400
                                            transition-all duration-200 cursor-pointer
                                        "
                                        style={{
                                            background: "rgba(255,255,255,0.03)",
                                            border: "1px solid rgba(255,255,255,0.05)",
                                        }}
                                        title="Unpin"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                <p className="text-[10px] text-[rgba(238,238,255,0.15)] mt-2">
                                    Pinned {new Date(item.pinnedAt).toLocaleDateString()}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </motion.main>
    );
}

"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export default function CreditsTracker() {
    const [credits, setCredits] = useState<{
        openrouter: { remaining: number; total_credits: number; total_usage: number };
        kling: { remaining: number; total: number; used: number };
    } | null>(null);

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchCredits() {
            try {
                const res = await fetch("/api/credits");
                if (res.ok) {
                    const data = await res.json();
                    setCredits(data);
                }
            } catch (e) {
                console.error("Failed to load credits:", e);
            } finally {
                setLoading(false);
            }
        }

        fetchCredits();
        // Refresh every minute to show updates
        const interval = setInterval(fetchCredits, 60000);
        return () => clearInterval(interval);
    }, []);

    if (loading || !credits) return null;

    // OpenRouter (General)
    const orTotal = Math.max(credits.openrouter.total_credits, 1); // Avoid div by 0
    const orRemaining = Math.max(0, credits.openrouter.remaining);
    const orPercent = (orRemaining / orTotal) * 100;
    const orColor = orPercent < 10 ? "#EF4444" : "#A855F7"; // Red if low, Purple normally

    // Kling (Director)
    const klingTotal = Math.max(credits.kling.total, 1);
    const klingRemaining = Math.max(0, credits.kling.remaining);
    const klingPercent = (klingRemaining / klingTotal) * 100;
    const klingColor = klingPercent < 10 ? "#EF4444" : "#F59E0B"; // Red if low, Amber normally

    return (
        <motion.div
            className="w-full mt-6 mb-2 px-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
        >
            <h4
                className="text-[10px] font-bold tracking-[0.2em] uppercase text-[rgba(168,85,247,0.5)] mb-3"
                style={{ fontFamily: "var(--font-orbitron), sans-serif" }}
            >
                Power Core Status
            </h4>

            {/* General AI Core */}
            <div className="mb-4">
                <div className="flex justify-between items-end mb-1.5">
                    <span className="text-[10px] font-medium text-[rgba(238,238,255,0.6)]">
                        Neural Core
                    </span>
                    <span className="text-[9px] font-mono text-[rgba(238,238,255,0.4)]">
                        {orRemaining.toFixed(2)} Credits
                    </span>
                </div>
                <div className="h-1.5 w-full bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden">
                    <motion.div
                        className="h-full rounded-full"
                        style={{ background: orColor, boxShadow: `0 0 10px ${orColor}40` }}
                        initial={{ width: 0 }}
                        animate={{ width: `${orPercent}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                    />
                </div>
            </div>

            {/* Director Core (Kling) */}
            <div>
                <div className="flex justify-between items-end mb-1.5">
                    <span className="text-[10px] font-medium text-[rgba(238,238,255,0.6)]">
                        Director Core
                    </span>
                    <span className="text-[9px] font-mono text-[rgba(238,238,255,0.4)]">
                        {Math.floor(klingRemaining)} / {klingTotal}
                    </span>
                </div>
                <div className="h-1.5 w-full bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden">
                    <motion.div
                        className="h-full rounded-full"
                        style={{ background: klingColor, boxShadow: `0 0 10px ${klingColor}40` }}
                        initial={{ width: 0 }}
                        animate={{ width: `${klingPercent}%` }}
                        transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                    />
                </div>
            </div>

            {/* Empty State Warning (Global) */}
            {(orRemaining <= 0 || klingRemaining <= 0) && (
                <div className="mt-3 p-2 rounded bg-red-500/10 border border-red-500/20 text-center">
                    <p className="text-[9px] text-red-400 font-medium">
                        Power Core Empty. Recharging... Please come back tomorrow!
                    </p>
                </div>
            )}
        </motion.div>
    );
}

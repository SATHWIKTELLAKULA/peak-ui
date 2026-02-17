"use client";

import { useState, useEffect, useCallback } from "react";
import { Snowflake, X } from "lucide-react";

interface RateLimitHandlerProps {
    isVisible: boolean;
    onDismiss: () => void;
    cooldownSeconds?: number;
}

export default function RateLimitHandler({
    isVisible,
    onDismiss,
    cooldownSeconds = 5,
}: RateLimitHandlerProps) {
    const [remaining, setRemaining] = useState(cooldownSeconds);

    useEffect(() => {
        if (!isVisible) {
            setRemaining(cooldownSeconds);
            return;
        }

        setRemaining(cooldownSeconds);

        const interval = setInterval(() => {
            setRemaining((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    onDismiss();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [isVisible, cooldownSeconds, onDismiss]);

    if (!isVisible) return null;

    return (
        <div
            className="
        fixed top-6 left-1/2 -translate-x-1/2 z-50
        rate-limit-toast
      "
        >
            <div
                className="
          flex items-center gap-3 px-6 py-3.5
          rounded-2xl
          bg-[rgba(168,85,247,0.08)]
          backdrop-blur-2xl
          border border-[rgba(168,85,247,0.2)]
          shadow-lg shadow-[rgba(168,85,247,0.1)]
        "
            >
                <Snowflake className="w-5 h-5 text-[#a855f7] animate-pulse flex-shrink-0" />
                <p className="text-sm text-[#f0f0ff] font-medium whitespace-nowrap">
                    Server cooling down, please wait{" "}
                    <span className="text-[#a855f7] font-bold tabular-nums">
                        {remaining}s
                    </span>
                </p>

                {/* Progress bar */}
                <div className="w-16 h-1.5 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-[#a855f7] to-[#4f8fff] transition-all duration-1000 ease-linear"
                        style={{
                            width: `${(remaining / cooldownSeconds) * 100}%`,
                        }}
                    />
                </div>

                <button
                    onClick={onDismiss}
                    className="
            w-6 h-6 rounded-full
            flex items-center justify-center
            text-[rgba(240,240,255,0.3)] hover:text-[rgba(240,240,255,0.7)]
            hover:bg-[rgba(255,255,255,0.05)]
            transition-all duration-200
            flex-shrink-0
          "
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}

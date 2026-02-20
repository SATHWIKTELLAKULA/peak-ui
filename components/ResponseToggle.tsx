"use client";

import { motion } from "framer-motion";
import { Zap, Brain, Lightbulb } from "lucide-react";

interface ResponseToggleProps {
    viewData: "direct" | "detailed" | "explanation";
    onChange: (mode: "direct" | "detailed" | "explanation") => void;
}

export default function ResponseToggle({ viewData, onChange }: ResponseToggleProps) {
    return (
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] backdrop-blur-md mb-6 w-full max-w-full overflow-x-auto scrollbar-hide md:w-fit md:overflow-visible mx-auto flex-nowrap">
            {/* Quick/Direct Tab */}
            <button
                onClick={() => onChange("direct")}
                className={`
                    relative flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-lg text-xs md:text-sm font-medium
                    transition-all duration-300 z-10 flex-shrink-0 whitespace-nowrap
                    ${viewData === "direct" ? "text-white" : "text-[rgba(238,238,255,0.4)] hover:text-[rgba(238,238,255,0.7)]"}
                `}
            >
                {viewData === "direct" && (
                    <motion.div
                        layoutId="toggle-active"
                        className="absolute inset-0 rounded-lg bg-[rgba(168,85,247,0.2)] border border-[rgba(168,85,247,0.3)] shadow-[0_0_15px_rgba(168,85,247,0.15)]"
                        transition={{ duration: 0.3, ease: "backOut" }}
                    />
                )}
                <Zap className={`w-4 h-4 ${viewData === "direct" ? "text-[#a855f7]" : "currentColor"}`} />
                <span className="relative z-10">Quick</span>
            </button>

            {/* Detailed Tab */}
            <button
                onClick={() => onChange("detailed")}
                className={`
                    relative flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-lg text-xs md:text-sm font-medium
                    transition-all duration-300 z-10 flex-shrink-0 whitespace-nowrap
                    ${viewData === "detailed" ? "text-white" : "text-[rgba(238,238,255,0.4)] hover:text-[rgba(238,238,255,0.7)]"}
                `}
            >
                {viewData === "detailed" && (
                    <motion.div
                        layoutId="toggle-active"
                        className="absolute inset-0 rounded-lg bg-[rgba(168,85,247,0.2)] border border-[rgba(168,85,247,0.3)] shadow-[0_0_15px_rgba(168,85,247,0.15)]"
                        transition={{ duration: 0.3, ease: "backOut" }}
                    />
                )}
                <Brain className={`w-4 h-4 ${viewData === "detailed" ? "text-[#a855f7]" : "currentColor"}`} />
                <span className="relative z-10">Detailed</span>
            </button>
            {/* Explanation Tab */}
            <button
                onClick={() => onChange("explanation")}
                className={`
                    relative flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-lg text-xs md:text-sm font-medium
                    transition-all duration-300 z-10 flex-shrink-0 whitespace-nowrap
                    ${viewData === "explanation" ? "text-white" : "text-[rgba(238,238,255,0.4)] hover:text-[rgba(238,238,255,0.7)]"}
                `}
            >
                {viewData === "explanation" && (
                    <motion.div
                        layoutId="toggle-active"
                        className="absolute inset-0 rounded-lg bg-[rgba(168,85,247,0.2)] border border-[rgba(168,85,247,0.3)] shadow-[0_0_15px_rgba(168,85,247,0.15)]"
                        transition={{ duration: 0.3, ease: "backOut" }}
                    />
                )}
                <Lightbulb className={`w-4 h-4 ${viewData === "explanation" ? "text-[#a855f7]" : "currentColor"}`} />
                <span className="relative z-10">Explanation</span>
            </button>
        </div>
    );
}

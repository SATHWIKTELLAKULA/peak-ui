"use client";

import { motion } from "framer-motion";

interface DeepDiveToolbarProps {
    query: string;
}

const TOOLS = [
    {
        label: "Search Google",
        href: (q: string) => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
        hoverColor: "rgba(66,133,244,0.35)",
        hoverBorder: "rgba(66,133,244,0.5)",
        icon: (
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
        ),
    },
    {
        label: "Watch on YouTube",
        href: (q: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
        hoverColor: "rgba(255,0,0,0.25)",
        hoverBorder: "rgba(255,0,0,0.45)",
        icon: (
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
                <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.38.55A3.02 3.02 0 0 0 .5 6.19 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.81 3.02 3.02 0 0 0 2.12 2.14c1.87.55 9.38.55 9.38.55s7.5 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.81z" fill="#FF0000" />
                <path d="M9.75 15.02 15.5 12 9.75 8.98v6.04z" fill="#fff" />
            </svg>
        ),
    },
    {
        label: "Ask ChatGPT",
        href: (q: string) => `https://chatgpt.com/?q=${encodeURIComponent(q)}`,
        hoverColor: "rgba(16,163,127,0.25)",
        hoverBorder: "rgba(16,163,127,0.45)",
        icon: (
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                <path d="M22.28 9.37a6.04 6.04 0 0 0-.52-4.96 6.1 6.1 0 0 0-6.58-2.93A6.04 6.04 0 0 0 10.66 0a6.1 6.1 0 0 0-5.82 4.23 6.04 6.04 0 0 0-4.03 2.93 6.1 6.1 0 0 0 .75 7.15 6.04 6.04 0 0 0 .52 4.96 6.1 6.1 0 0 0 6.58 2.93A6.04 6.04 0 0 0 13.18 24a6.1 6.1 0 0 0 5.82-4.22 6.04 6.04 0 0 0 4.03-2.93 6.1 6.1 0 0 0-.75-7.48zM13.18 22.43a4.56 4.56 0 0 1-2.93-1.06l.15-.08 4.87-2.81a.79.79 0 0 0 .4-.69v-6.87l2.06 1.19a.07.07 0 0 1 .04.06v5.69a4.59 4.59 0 0 1-4.59 4.57zM3.6 18.36a4.56 4.56 0 0 1-.55-3.07l.15.09 4.87 2.81a.79.79 0 0 0 .79 0l5.95-3.44v2.38a.08.08 0 0 1-.03.07l-4.93 2.85a4.59 4.59 0 0 1-6.25-1.69zM2.34 7.89A4.56 4.56 0 0 1 4.72 5.9v.17V12a.79.79 0 0 0 .4.69l5.95 3.44-2.06 1.19a.07.07 0 0 1-.07 0L4.01 14.47a4.59 4.59 0 0 1-1.67-6.58zm17.06 3.97L13.45 8.42l2.06-1.19a.07.07 0 0 1 .07 0l4.93 2.85a4.59 4.59 0 0 1-.71 8.28v-.17V12.3a.79.79 0 0 0-.4-.44zm2.05-3.1-.15-.09-4.87-2.81a.79.79 0 0 0-.79 0L9.69 9.3V6.92a.08.08 0 0 1 .03-.07l4.93-2.85a4.59 4.59 0 0 1 6.8 4.76zM8.57 13.3 6.51 12.1a.07.07 0 0 1-.04-.06V6.35a4.59 4.59 0 0 1 7.52-3.51l-.15.08-4.87 2.81a.79.79 0 0 0-.4.69v6.88zm1.12-2.42L12 9.5l2.31 1.33v2.67L12 14.83l-2.31-1.33v-2.62z" fill="#10A37F" />
            </svg>
        ),
    },
];

export default function DeepDiveToolbar({ query }: DeepDiveToolbarProps) {
    return (
        <motion.div
            className="mt-6"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, type: "spring", stiffness: 80, damping: 16 }}
        >
            <p
                className="text-[10px] font-bold tracking-[0.25em] uppercase text-[rgba(168,85,247,0.4)] mb-3"
                style={{ fontFamily: "var(--font-orbitron), sans-serif" }}
            >
                Deep Dive
            </p>
            <div className="flex flex-wrap gap-3">
                {TOOLS.map((tool) => (
                    <motion.a
                        key={tool.label}
                        href={tool.href(query)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="
                            flex items-center gap-2.5 px-4 py-2.5 rounded-xl
                            text-[13px] font-medium
                            text-[rgba(238,238,255,0.55)]
                            cursor-pointer no-underline
                            transition-all duration-300
                        "
                        style={{
                            background: "rgba(10, 10, 30, 0.5)",
                            backdropFilter: "blur(12px)",
                            WebkitBackdropFilter: "blur(12px)",
                            border: "1px solid rgba(168, 85, 247, 0.15)",
                        }}
                        whileHover={{
                            scale: 1.04,
                            borderColor: tool.hoverBorder,
                            boxShadow: `0 0 20px ${tool.hoverColor}, inset 0 0 12px ${tool.hoverColor}`,
                            color: "#eeeeff",
                        }}
                        whileTap={{ scale: 0.96 }}
                    >
                        {tool.icon}
                        {tool.label}
                    </motion.a>
                ))}
            </div>
        </motion.div>
    );
}

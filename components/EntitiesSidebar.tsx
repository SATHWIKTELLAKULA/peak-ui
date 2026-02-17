"use client";

import { motion } from "framer-motion";
import { Users, MapPin, CalendarDays, Search } from "lucide-react";
import { useRouter } from "next/navigation";

interface Entity {
    text: string;
    type: "person" | "place" | "date";
}

function extractEntities(text: string): Entity[] {
    const entities: Entity[] = [];
    const seen = new Set<string>();

    // Dates — various formats
    const datePatterns = [
        /\b\d{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/gi,
        /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi,
        /\b\d{4}\b/g,
    ];

    for (const pattern of datePatterns) {
        const matches = text.match(pattern);
        if (matches) {
            for (const m of matches) {
                const clean = m.trim();
                if (clean.length >= 4 && !seen.has(clean.toLowerCase())) {
                    // Filter out years that are too old or too futuristic
                    if (/^\d{4}$/.test(clean)) {
                        const yr = parseInt(clean);
                        if (yr < 1800 || yr > 2100) continue;
                    }
                    seen.add(clean.toLowerCase());
                    entities.push({ text: clean, type: "date" });
                }
            }
        }
    }

    // Strip markdown for entity extraction
    const cleanText = text
        .replace(/```[\s\S]*?```/g, "")
        .replace(/`[^`]+`/g, "")
        .replace(/\[(.+?)\]\(.+?\)/g, "$1")
        .replace(/[#*_~>|]/g, "");

    // Proper nouns — capitalized multi-word sequences (likely people/places)
    const properNouns = cleanText.match(
        /\b[A-Z][a-z]+(?:\s+(?:of|the|de|van|al|bin|ibn))?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g
    );

    if (properNouns) {
        for (const name of properNouns) {
            const clean = name.trim();
            if (clean.length < 4) continue;
            if (seen.has(clean.toLowerCase())) continue;
            // Skip common non-entity phrases
            const skip = ["The End", "In The", "On The", "For The", "At The", "AI Answer"];
            if (skip.some((s) => clean.includes(s))) continue;
            seen.add(clean.toLowerCase());

            // Simple heuristic: words with geo-prefixes likely places
            const placeWords = ["City", "State", "Country", "Island", "Mountain", "River", "Ocean", "Lake", "University", "Institute"];
            const isPlace = placeWords.some((w) => clean.includes(w));
            entities.push({ text: clean, type: isPlace ? "place" : "person" });
        }
    }

    return entities.slice(0, 15); // Cap at 15
}

const ICON_MAP = {
    person: Users,
    place: MapPin,
    date: CalendarDays,
};

const LABEL_MAP = {
    person: "People & Topics",
    place: "Places",
    date: "Dates",
};

interface EntitiesSidebarProps {
    answer: string;
}

export default function EntitiesSidebar({ answer }: EntitiesSidebarProps) {
    const router = useRouter();
    const entities = extractEntities(answer);

    if (entities.length === 0) return null;

    const grouped = {
        person: entities.filter((e) => e.type === "person"),
        place: entities.filter((e) => e.type === "place"),
        date: entities.filter((e) => e.type === "date"),
    };

    return (
        <motion.aside
            className="w-full lg:w-64 flex-shrink-0"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring", stiffness: 80, damping: 16, delay: 0.4 }}
        >
            <div
                className="rounded-2xl p-4 sticky top-24"
                style={{
                    background: "rgba(10, 10, 30, 0.6)",
                    backdropFilter: "blur(24px)",
                    WebkitBackdropFilter: "blur(24px)",
                    border: "1px solid rgba(168, 85, 247, 0.12)",
                    boxShadow: "0 0 30px rgba(168,85,247,0.05)",
                }}
            >
                <h3
                    className="text-[10px] font-bold tracking-[0.25em] uppercase text-[rgba(168,85,247,0.6)] mb-3"
                    style={{ fontFamily: "var(--font-orbitron), sans-serif" }}
                >
                    Key Entities
                </h3>

                {(["person", "place", "date"] as const).map((type) => {
                    const items = grouped[type];
                    if (items.length === 0) return null;
                    const Icon = ICON_MAP[type];

                    return (
                        <div key={type} className="mb-3 last:mb-0">
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <Icon className="w-3 h-3 text-[rgba(238,238,255,0.3)]" />
                                <span className="text-[9px] uppercase tracking-wider text-[rgba(238,238,255,0.25)] font-medium">
                                    {LABEL_MAP[type]}
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {items.map((entity) => (
                                    <motion.button
                                        key={entity.text}
                                        onClick={() =>
                                            router.push(`/search?q=${encodeURIComponent(entity.text)}`)
                                        }
                                        className="
                                            flex items-center gap-1 px-2 py-1 rounded-lg
                                            text-[10px] font-medium cursor-pointer
                                            text-[rgba(238,238,255,0.45)]
                                            hover:text-[#a855f7]
                                            transition-all duration-200
                                        "
                                        style={{
                                            background: "rgba(255,255,255,0.03)",
                                            border: "1px solid rgba(255,255,255,0.05)",
                                        }}
                                        whileHover={{
                                            scale: 1.05,
                                            borderColor: "rgba(168,85,247,0.25)",
                                            boxShadow: "0 0 8px rgba(168,85,247,0.1)",
                                        }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <Search className="w-2.5 h-2.5" />
                                        {entity.text}
                                    </motion.button>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </motion.aside>
    );
}

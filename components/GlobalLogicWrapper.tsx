"use client";

import { useGlobalShortcuts } from "@/hooks/useGlobalShortcuts";
import ShortcutFeedback from "@/components/ShortcutFeedback";

export default function GlobalLogicWrapper() {
    useGlobalShortcuts();
    return <ShortcutFeedback />;
}

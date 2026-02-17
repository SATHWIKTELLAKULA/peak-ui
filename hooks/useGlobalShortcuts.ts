import { useEffect } from "react";
import { useSettings, NeuralMode } from "@/contexts/SettingsContext";

const MODES: NeuralMode[] = ["flash", "pro", "creative"];

/**
 * Handles global shortcuts:
 * - Ctrl+K: Focus search (dispatches event, handled by SearchBar)
 * - Esc: Dispatches event (handled by UI)
 * - Arrows: Switches Neural Mode (Global)
 */
export function useGlobalShortcuts() {
    const { neuralMode, setNeuralMode } = useSettings();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // CMD/CTRL + K
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                dispatch("ctrl+k", "Search");
            }

            // ESC
            if (e.key === "Escape") {
                dispatch("esc", "Close");
            }

            // Arrows (Only if not typing in input, or modifier pressed?)
            // User requested: "If Triple-View is active... switch between answer modes"
            // We should avoid conflict with text selection. 
            // We check if target is input/textarea
            const isInput = (e.target as HTMLElement).tagName.match(/INPUT|TEXTAREA|SELECT/);

            if (!isInput) {
                if (e.key === "ArrowRight") {
                    const idx = MODES.indexOf(neuralMode);
                    const next = MODES[(idx + 1) % MODES.length];
                    setNeuralMode(next);
                    dispatch("right", next.toUpperCase());
                }
                if (e.key === "ArrowLeft") {
                    const idx = MODES.indexOf(neuralMode);
                    const prevIndex = (idx - 1 + MODES.length) % MODES.length;
                    const prevMode = MODES[prevIndex];
                    setNeuralMode(prevMode);
                    dispatch("left", prevMode.toUpperCase());
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [neuralMode, setNeuralMode]);
}

function dispatch(key: string, label: string) {
    window.dispatchEvent(new CustomEvent("peak-shortcut", { detail: { key, label } }));
}


"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type BgPreset = "nebula-core" | "black-hole" | "supernova";
export type ResponseLength = "concise" | "detailed";
export type VoiceGender = "male" | "female";
export type NeuralMode = "flash" | "pro" | "creative";
export type CreativeSubMode = "visualize" | "analyze" | "director";
export type VideoQuality = "standard" | "hq";
export type CelestialTheme = "neural" | "galaxy" | "planet" | "sun";
export type GlobalTheme = "void" | "cyber" | "velocity" | "aura" | "quantum";
export type Language = "en" | "te" | "hi";

interface SettingsState {
    bgPreset: BgPreset;
    responseLength: ResponseLength;
    voiceGender: VoiceGender;
    neuralMode: NeuralMode;
    creativeSubMode: CreativeSubMode;
    videoQuality: VideoQuality;
    celestialTheme: CelestialTheme;
    globalTheme: GlobalTheme;
    language: Language;
    setBgPreset: (v: BgPreset) => void;
    setResponseLength: (v: ResponseLength) => void;
    setVoiceGender: (v: VoiceGender) => void;
    setNeuralMode: (v: NeuralMode) => void;
    setCreativeSubMode: (v: CreativeSubMode) => void;
    setVideoQuality: (v: VideoQuality) => void;
    setCelestialTheme: (v: CelestialTheme) => void;
    setGlobalTheme: (v: GlobalTheme) => void;
    setLanguage: (v: Language) => void;
}

const defaults: Omit<SettingsState, "setBgPreset" | "setResponseLength" | "setVoiceGender" | "setNeuralMode" | "setCreativeSubMode" | "setVideoQuality" | "setCelestialTheme" | "setGlobalTheme" | "setLanguage"> = {
    bgPreset: "nebula-core",
    responseLength: "detailed",
    voiceGender: "female",
    neuralMode: "flash",
    creativeSubMode: "visualize",
    videoQuality: "standard",
    celestialTheme: "neural",
    globalTheme: "cyber",
    language: "en",
};

const SettingsContext = createContext<SettingsState>({
    ...defaults,
    setBgPreset: () => { },
    setResponseLength: () => { },
    setVoiceGender: () => { },
    setNeuralMode: () => { },
    setCreativeSubMode: () => { },
    setVideoQuality: () => { },
    setCelestialTheme: () => { },
    setGlobalTheme: () => { },
    setLanguage: () => { },
});

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [bgPreset, setBgPreset] = useState<BgPreset>(defaults.bgPreset);
    const [responseLength, setResponseLength] = useState<ResponseLength>(defaults.responseLength);
    const [voiceGender, setVoiceGender] = useState<VoiceGender>(defaults.voiceGender);
    const [neuralMode, setNeuralMode] = useState<NeuralMode>(defaults.neuralMode);
    const [creativeSubMode, setCreativeSubMode] = useState<CreativeSubMode>(defaults.creativeSubMode);
    const [videoQuality, setVideoQuality] = useState<VideoQuality>(defaults.videoQuality);
    const [celestialTheme, setCelestialTheme] = useState<CelestialTheme>(defaults.celestialTheme);
    const [globalTheme, setGlobalTheme] = useState<GlobalTheme>(defaults.globalTheme);
    const [language, setLanguage] = useState<Language>(defaults.language);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        try {
            const saved = localStorage.getItem("peak-settings");
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.bgPreset) setBgPreset(parsed.bgPreset);
                if (parsed.responseLength) setResponseLength(parsed.responseLength);
                if (parsed.voiceGender) setVoiceGender(parsed.voiceGender);
                if (parsed.neuralMode) setNeuralMode(parsed.neuralMode);
                if (parsed.creativeSubMode) setCreativeSubMode(parsed.creativeSubMode);
                if (parsed.videoQuality) setVideoQuality(parsed.videoQuality);
                if (parsed.celestialTheme) setCelestialTheme(parsed.celestialTheme);
                if (parsed.globalTheme) setGlobalTheme(parsed.globalTheme);
                if (parsed.language) setLanguage(parsed.language);
            }
        } catch { /* ignore */ }
        setLoaded(true);
    }, []);

    useEffect(() => {
        if (!loaded) return;
        try {
            localStorage.setItem(
                "peak-settings",
                JSON.stringify({ bgPreset, responseLength, voiceGender, neuralMode, creativeSubMode, videoQuality, celestialTheme, globalTheme, language })
            );
        } catch { /* ignore */ }
    }, [bgPreset, responseLength, voiceGender, neuralMode, creativeSubMode, videoQuality, celestialTheme, globalTheme, language, loaded]);

    return (
        <SettingsContext.Provider
            value={{ bgPreset, responseLength, voiceGender, neuralMode, creativeSubMode, videoQuality, celestialTheme, globalTheme, language, setBgPreset, setResponseLength, setVoiceGender, setNeuralMode, setCreativeSubMode, setVideoQuality, setCelestialTheme, setGlobalTheme, setLanguage }}
        >
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    return useContext(SettingsContext);
}

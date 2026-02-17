
"use client";

type SoundType = 'click' | 'ignition' | 'hologram' | 'typing';

let humOscillator: OscillatorNode | null = null;
let humGain: GainNode | null = null;
let audioContext: AudioContext | null = null;

export async function playInteractionSound(type: SoundType, customVolume?: number) {
    if (typeof window === 'undefined') return;

    try {
        // Fallback for click if no file exists: Synthesis
        if (type === 'click') {
            const audio = new Audio(`/sounds/${type}.mp3`);

            // Try file first for click
            try {
                if (customVolume) audio.volume = customVolume;
                else {
                    audio.volume = 0.6;
                    audio.playbackRate = 0.9 + Math.random() * 0.2;
                }
                audio.currentTime = 0;
                await audio.play();
                return; // Success
            } catch (e) {
                // Determine if we should fallback to synth
                // console.warn("Click file failed, using synth");
            }
            // If file failed, use synth
            synthClick();
            return;
        }

        const audio = new Audio(`/sounds/${type}.mp3`);

        // Volume Mixing
        if (customVolume !== undefined) {
            audio.volume = Math.min(Math.max(customVolume, 0), 1);
        } else {
            switch (type) {
                case 'hologram':
                    audio.volume = 0.8;
                    break;
                case 'ignition':
                    audio.volume = 1.0;
                    break;
                case 'typing':
                    audio.volume = 0.5;
                    break;
                default:
                    audio.volume = 0.5;
            }
        }

        // Force reset time if playing again
        audio.currentTime = 0;

        await audio.play().catch((err) => {
            // console.warn("Audio play failed", err);
        });
    } catch (error) {
        // ignore
    }
}

// Synthesized Click (Guaranteed to work without files)
function synthClick() {
    if (typeof window === 'undefined') return;
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.05);

        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
    } catch (e) { }
}


export function startHum() {
    if (typeof window === 'undefined') return;
    try {
        if (!audioContext) audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (humOscillator) return;

        humOscillator = audioContext.createOscillator();
        humGain = audioContext.createGain();

        // "Data-processing" Hum
        humOscillator.type = 'sine';
        humOscillator.frequency.setValueAtTime(1200, audioContext.currentTime);

        // Very low volume
        humGain.gain.setValueAtTime(0.015, audioContext.currentTime);

        humOscillator.connect(humGain);
        humGain.connect(audioContext.destination);
        humOscillator.start();
    } catch (e) {
        console.error("Audio Hum Error:", e);
    }
}

export function stopHum() {
    if (humOscillator) {
        try {
            humOscillator.stop();
            humOscillator.disconnect();
            humGain?.disconnect();
        } catch (e) { /* ignore */ }
        humOscillator = null;
        humGain = null;
    }
}

export async function playBootSequence() {
    if (typeof window === 'undefined') return;
    // Priority: Try playing ignition.mp3
    try {
        const audio = new Audio("/sounds/ignition.mp3");
        audio.volume = 1.0;
        await audio.play();
    } catch (e) {
        console.warn("Ignition file missing, using synth fallback");
        // Fallback Synthesis
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const now = ctx.currentTime;

            // 1. Low Frequency Hum (Bootup)
            const bassOsc = ctx.createOscillator();
            const bassGain = ctx.createGain();
            bassOsc.type = 'sawtooth';
            bassOsc.frequency.setValueAtTime(50, now);
            bassOsc.frequency.exponentialRampToValueAtTime(150, now + 1.5);

            bassGain.gain.setValueAtTime(0, now);
            bassGain.gain.linearRampToValueAtTime(0.2, now + 0.5);
            bassGain.gain.exponentialRampToValueAtTime(0.01, now + 1.5);

            bassOsc.connect(bassGain);
            bassGain.connect(ctx.destination);
            bassOsc.start(now);
            bassOsc.stop(now + 1.5);

            // 2. Crisp Digital Ping (Success)
            const pingOsc = ctx.createOscillator();
            const pingGain = ctx.createGain();
            pingOsc.type = 'sine';
            pingOsc.frequency.setValueAtTime(1200, now + 1.0);
            pingOsc.frequency.exponentialRampToValueAtTime(2000, now + 1.1);

            pingGain.gain.setValueAtTime(0, now + 1.0);
            pingGain.gain.linearRampToValueAtTime(0.3, now + 1.05);
            pingGain.gain.exponentialRampToValueAtTime(0.01, now + 1.5);

            pingOsc.connect(pingGain);
            pingGain.connect(ctx.destination);
            pingOsc.start(now + 1.0);
            pingOsc.stop(now + 1.5);

        } catch (err) {
            console.error("Boot Sequence Audio Error", err);
        }
    }
}

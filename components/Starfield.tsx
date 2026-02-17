"use client";

import { useEffect, useRef } from "react";
import { useSettings, BgPreset } from "@/contexts/SettingsContext";

/* ── Colour palettes per background preset ── */
const PALETTES: Record<BgPreset, {
    starColor: string;
    nebulae: { color: string; x: number; y: number; rx: number; ry: number }[];
    starCount: number;
    centerGlow?: { color: string; radius: number; alpha: number };
}> = {
    "nebula-core": {
        starColor: "200, 210, 255",
        starCount: 250,
        nebulae: [
            { color: "139,92,246", x: 0.15, y: 0.2, rx: 300, ry: 200 },
            { color: "79,143,255", x: 0.8, y: 0.75, rx: 350, ry: 250 },
            { color: "168,85,247", x: 0.5, y: 0.5, rx: 400, ry: 180 },
            { color: "59,130,246", x: 0.3, y: 0.85, rx: 250, ry: 180 },
        ],
    },
    "black-hole": {
        starColor: "180, 185, 210",
        starCount: 120,
        nebulae: [
            { color: "40,30,60", x: 0.5, y: 0.5, rx: 350, ry: 350 },
            { color: "80,40,20", x: 0.5, y: 0.5, rx: 200, ry: 200 },
        ],
        centerGlow: { color: "249,115,22", radius: 180, alpha: 0.06 },
    },
    "supernova": {
        starColor: "255, 240, 220",
        starCount: 350,
        nebulae: [
            { color: "249,115,22", x: 0.5, y: 0.45, rx: 400, ry: 350 },
            { color: "234,179,8", x: 0.4, y: 0.55, rx: 300, ry: 280 },
            { color: "239,68,68", x: 0.6, y: 0.4, rx: 250, ry: 200 },
            { color: "255,255,255", x: 0.5, y: 0.5, rx: 150, ry: 150 },
        ],
        centerGlow: { color: "255,200,100", radius: 220, alpha: 0.12 },
    },
};

interface Star {
    baseX: number;
    baseY: number;
    radius: number;
    alpha: number;
    speed: number;
    direction: number;
    depth: number;
}

export default function Starfield() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mouseRef = useRef({ x: 0.5, y: 0.5 });
    const { bgPreset } = useSettings();
    const presetRef = useRef(bgPreset);
    const fadeRef = useRef(1); // for cross-fade

    // Keep preset ref in sync
    useEffect(() => {
        fadeRef.current = 0; // trigger cross-fade
        presetRef.current = bgPreset;
    }, [bgPreset]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let animId: number;
        let time = 0;
        let stars: Star[] = [];

        function resize() {
            canvas!.width = window.innerWidth;
            canvas!.height = window.innerHeight;
        }

        function createStars(count: number) {
            stars = [];
            for (let i = 0; i < count; i++) {
                stars.push({
                    baseX: Math.random() * canvas!.width,
                    baseY: Math.random() * canvas!.height,
                    radius: Math.random() * 1.6 + 0.3,
                    alpha: Math.random(),
                    speed: Math.random() * 0.008 + 0.002,
                    direction: Math.random() > 0.5 ? 1 : -1,
                    depth: Math.random() * 0.8 + 0.2,
                });
            }
        }

        function draw() {
            time++;
            const w = canvas!.width;
            const h = canvas!.height;
            const palette = PALETTES[presetRef.current];

            // Cross-fade alpha
            if (fadeRef.current < 1) {
                fadeRef.current = Math.min(1, fadeRef.current + 0.02);
            }

            ctx!.clearRect(0, 0, w, h);
            ctx!.globalAlpha = fadeRef.current;

            const mx = (mouseRef.current.x - 0.5) * 2;
            const my = (mouseRef.current.y - 0.5) * 2;

            // Recreate stars if count changed
            if (stars.length !== palette.starCount) {
                createStars(palette.starCount);
            }

            // ── Center glow (black hole / supernova) ──
            if (palette.centerGlow) {
                const cg = palette.centerGlow;
                const gx = w / 2 + mx * 10;
                const gy = h / 2 + my * 10;
                const grad = ctx!.createRadialGradient(gx, gy, 0, gx, gy, cg.radius);
                const pulse = cg.alpha + Math.sin(time * 0.005) * (cg.alpha * 0.4);
                grad.addColorStop(0, `rgba(${cg.color}, ${pulse})`);
                grad.addColorStop(1, `rgba(${cg.color}, 0)`);
                ctx!.fillStyle = grad;
                ctx!.beginPath();
                ctx!.arc(gx, gy, cg.radius, 0, Math.PI * 2);
                ctx!.fill();
            }

            // ── Nebula smoke ──
            for (let i = 0; i < palette.nebulae.length; i++) {
                const neb = palette.nebulae[i];
                const driftX = Math.sin(time * 0.0003 + i * 1.5) * 40;
                const driftY = Math.cos(time * 0.0004 + i * 2) * 30;
                const px = neb.x * w + driftX + mx * 15;
                const py = neb.y * h + driftY + my * 15;

                const grad = ctx!.createRadialGradient(px, py, 0, px, py, neb.rx);
                const pulse = 0.06 + Math.sin(time * 0.003 + i) * 0.025;
                grad.addColorStop(0, `rgba(${neb.color}, ${pulse})`);
                grad.addColorStop(0.5, `rgba(${neb.color}, ${pulse * 0.4})`);
                grad.addColorStop(1, `rgba(${neb.color}, 0)`);

                ctx!.fillStyle = grad;
                ctx!.beginPath();
                ctx!.ellipse(px, py, neb.rx, neb.ry, 0, 0, Math.PI * 2);
                ctx!.fill();
            }

            // ── Stars ──
            const PARALLAX_MAX = 25;
            for (const star of stars) {
                star.alpha += star.speed * star.direction;
                if (star.alpha >= 1) { star.alpha = 1; star.direction = -1; }
                else if (star.alpha <= 0.1) { star.alpha = 0.1; star.direction = 1; }

                const px = star.baseX + mx * PARALLAX_MAX * star.depth;
                const py = star.baseY + my * PARALLAX_MAX * star.depth;

                ctx!.beginPath();
                ctx!.arc(px, py, star.radius, 0, Math.PI * 2);
                ctx!.fillStyle = `rgba(${palette.starColor}, ${star.alpha})`;
                ctx!.fill();

                if (star.radius > 1) {
                    ctx!.beginPath();
                    ctx!.arc(px, py, star.radius * 3.5, 0, Math.PI * 2);
                    ctx!.fillStyle = `rgba(${palette.starColor}, ${star.alpha * 0.06})`;
                    ctx!.fill();
                }
            }

            ctx!.globalAlpha = 1;
            animId = requestAnimationFrame(draw);
        }

        function onMouseMove(e: MouseEvent) {
            mouseRef.current.x = e.clientX / window.innerWidth;
            mouseRef.current.y = e.clientY / window.innerHeight;
        }

        resize();
        createStars(PALETTES[presetRef.current].starCount);
        draw();

        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("resize", () => {
            resize();
            createStars(PALETTES[presetRef.current].starCount);
        });

        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener("mousemove", onMouseMove);
        };
    }, []);

    return (
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
            <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
                aria-hidden="true"
            />
        </div>
    );
}

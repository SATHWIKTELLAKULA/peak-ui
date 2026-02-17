"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import * as random from "maath/random/dist/maath-random.cjs";
import { useState, useRef, Suspense } from "react";
import { motion } from "framer-motion";

function StarField(props: any) {
    const ref = useRef<any>(null);
    // 1,500 particles as requested
    const [sphere] = useState(() => random.inSphere(new Float32Array(4500), { radius: 1.2 }));

    useFrame((state, delta) => {
        if (ref.current) {
            // Constant slow rotation
            ref.current.rotation.x -= delta / 20;
            ref.current.rotation.y -= delta / 30;

            // Interactive Parallax Mesh Tilt
            // state.pointer.x/y are normalized (-1 to 1)
            const x = state.pointer.x * 0.2;
            const y = state.pointer.y * 0.2;

            // Lerp rotation towards mouse position for "tilt" effect
            ref.current.rotation.x += (y - ref.current.rotation.x) * 0.02;
            ref.current.rotation.y += (x - ref.current.rotation.y) * 0.02;
        }
    });

    return (
        <group rotation={[0, 0, Math.PI / 4]}>
            <Points ref={ref} positions={sphere} stride={3} frustumCulled={false} {...props}>
                <PointMaterial
                    transparent
                    color="#8b5cf6"
                    size={0.003}
                    sizeAttenuation={true}
                    depthWrite={false}
                    opacity={0.8}
                    blending={2} // AdditiveBlending
                />
            </Points>
        </group>
    );
}

export default function AmbientBackground() {
    return (
        <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none bg-[#030312]">
            {/* Liquid Gradient Layer (Framer Motion) */}
            <motion.div
                className="absolute inset-0 opacity-40"
                style={{
                    background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
                    backgroundSize: "400% 400%",
                }}
                animate={{
                    backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                }}
                transition={{
                    duration: 15,
                    ease: "linear",
                    repeat: Infinity,
                }}
            />

            {/* Floating Orbs for extra depth (optional but recommended for "Liquid" feel) */}
            <motion.div
                className="absolute w-[600px] h-[600px] rounded-full blur-[100px] opacity-20"
                style={{
                    background: "radial-gradient(circle, rgba(76, 29, 149, 0.5) 0%, transparent 70%)",
                    top: "-10%",
                    left: "-10%"
                }}
                animate={{
                    x: [0, 50, -50, 0],
                    y: [0, 50, -50, 0],
                }}
                transition={{ duration: 20, repeat: Infinity, repeatType: "mirror" }}
            />

            {/* R3F WebGL Layer */}
            <div className="absolute inset-0 z-10">
                <Canvas camera={{ position: [0, 0, 1] }} gl={{ antialias: false }} dpr={[1, 2]}>
                    <Suspense fallback={null}>
                        <StarField />
                    </Suspense>
                </Canvas>
            </div>
        </div>
    );
}

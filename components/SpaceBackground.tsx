"use client";

import { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import * as THREE from "three";
import { useMouseParallax } from "@/hooks/useMouseParallax";

function StarField() {
    const ref = useRef<THREE.Points>(null);
    const mouse = useMouseParallax(0.05);

    const positions = useMemo(() => {
        const pos = new Float32Array(300 * 3);
        for (let i = 0; i < 300; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 20;
            pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
            pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
        }
        return pos;
    }, []);

    const speedRef = useRef(20.0);

    useFrame((_, delta) => {
        if (!ref.current) return;

        // Decelerate from Warp Speed (20.0) to Cruise (0.05)
        speedRef.current = THREE.MathUtils.lerp(speedRef.current, 0.02, delta * 3.0);

        ref.current.rotation.y += delta * speedRef.current;
        ref.current.rotation.x += delta * (speedRef.current * 0.5);

        // Parallax tilt (reduced effect)
        ref.current.rotation.x += (mouse.y * 0.15 - ref.current.rotation.x) * 0.02;
        ref.current.rotation.y += (mouse.x * 0.15 - ref.current.rotation.y) * 0.02;

        // Stretch effect (simulate length)
        // Note: Points don't stretch easily, but rotation speed creates the blur perception.
    });

    return (
        <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
            <PointMaterial
                transparent
                color="#7cacff"
                size={0.04}
                sizeAttenuation
                depthWrite={false}
                opacity={0.8}
            />
        </Points>
    );
}

function FloatingOrb({
    position,
    color,
    speed,
    size,
}: {
    position: [number, number, number];
    color: string;
    speed: number;
    size: number;
}) {
    const ref = useRef<THREE.Mesh>(null);
    const mouse = useMouseParallax(0.03);
    const startPos = useMemo(() => new THREE.Vector3(...position), [position]);

    useFrame(({ clock }) => {
        if (!ref.current) return;
        const t = clock.getElapsedTime() * speed;
        ref.current.position.x = startPos.x + Math.sin(t) * 0.5 + mouse.x * 0.3;
        ref.current.position.y =
            startPos.y + Math.cos(t * 0.7) * 0.3 + mouse.y * 0.2;
        ref.current.position.z = startPos.z + Math.sin(t * 0.5) * 0.2;
    });

    return (
        <mesh ref={ref} position={position}>
            <sphereGeometry args={[size, 16, 16]} />
            <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={0.6}
                transparent
                opacity={0.25}
                roughness={0.3}
            />
        </mesh>
    );
}

function Scene() {
    return (
        <>
            <ambientLight intensity={0.1} />
            <pointLight position={[10, 10, 10]} intensity={0.3} color="#4f8fff" />
            <StarField />
            <FloatingOrb position={[-3, 2, -5]} color="#4f8fff" speed={0.3} size={0.8} />
            <FloatingOrb position={[4, -1, -8]} color="#a855f7" speed={0.2} size={1.2} />
            <FloatingOrb position={[-1, -3, -6]} color="#06b6d4" speed={0.25} size={0.6} />
            <FloatingOrb position={[2, 3, -10]} color="#7c3aed" speed={0.15} size={1.0} />
        </>
    );
}

export default function SpaceBackground() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return <div className="fixed inset-0 -z-10 bg-[#050510]" />;

    return (
        <div
            className="fixed inset-0 -z-10"
            style={{ background: "linear-gradient(180deg, #050510 0%, #0a0820 50%, #050510 100%)" }}
        >
            <Canvas
                camera={{ position: [0, 0, 5], fov: 60 }}
                dpr={[1, 1.5]}
                gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
                style={{ pointerEvents: "none" }}
            >
                <Scene />
            </Canvas>
        </div>
    );
}

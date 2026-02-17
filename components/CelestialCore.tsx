"use client";

import { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sphere, Points, PointMaterial } from "@react-three/drei";
import * as THREE from "three";
import { CelestialTheme } from "@/contexts/SettingsContext";

export default function CelestialCore({ theme }: { theme: CelestialTheme }) {
    const [hovered, setHovered] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return <div className="w-full h-full min-h-[250px]" />; // Placeholder to avoid layout shift
    }

    return (
        <div
            className="w-full h-64 md:h-full min-h-[250px] relative cursor-pointer"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <Canvas camera={{ position: [0, 0, 3.5] }} gl={{ alpha: true }}>
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} />

                {theme === 'neural' && <NeuralMesh hovered={hovered} />}
                {theme === 'galaxy' && <GalaxyMesh hovered={hovered} />}
                {theme === 'planet' && <PlanetMesh hovered={hovered} />}
                {theme === 'sun' && <SunMesh hovered={hovered} />}
            </Canvas>
        </div>
    );
}

function NeuralMesh({ hovered }: { hovered: boolean }) {
    const meshRef = useRef<THREE.Mesh>(null!);

    useFrame((state, delta) => {
        if (meshRef.current) {
            const speed = hovered ? 1.5 : 0.5;
            meshRef.current.rotation.y += delta * speed;
            meshRef.current.rotation.x += delta * (speed * 0.3);
        }
    });

    return (
        <Sphere ref={meshRef} args={[1, 16, 16]} scale={1.2}>
            <meshBasicMaterial
                wireframe
                color={hovered ? "#a855f7" : "#06b6d4"}
                transparent
                opacity={0.6}
            />
        </Sphere>
    );
}

function GalaxyMesh({ hovered }: { hovered: boolean }) {
    const meshRef = useRef<THREE.Group>(null!);

    const particles = useMemo(() => {
        const temp = [];
        const count = 3000;
        for (let i = 0; i < count; i++) {
            // Spiral Galaxy Math
            const angle = i * 0.05;
            const radius = 0.1 + (i * 0.0005); // Expanding spiral
            const x = Math.cos(angle) * radius * 5; // Spread out
            const z = Math.sin(angle) * radius * 5;
            const y = (Math.random() - 0.5) * 0.5; // Flat disc
            temp.push(x, y, z);
        }
        return new Float32Array(temp);
    }, []);

    useFrame((state, delta) => {
        if (meshRef.current) {
            const speed = hovered ? 0.6 : 0.2;
            meshRef.current.rotation.y += delta * speed;
        }
    });

    return (
        <group ref={meshRef} rotation={[0.5, 0, 0]}>
            <Points positions={particles} stride={3} frustumCulled={false}>
                <PointMaterial
                    transparent
                    color={hovered ? "#06b6d4" : "#8b5cf6"}
                    size={0.02}
                    sizeAttenuation={true}
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                />
            </Points>
        </group>
    );
}

function PlanetMesh({ hovered }: { hovered: boolean }) {
    const meshRef = useRef<THREE.Group>(null!);

    useFrame((state, delta) => {
        if (meshRef.current) {
            const speed = hovered ? 1.5 : 0.5;
            meshRef.current.rotation.y += delta * speed;
            meshRef.current.rotation.x += delta * (speed * 0.1);
        }
    });

    return (
        <group ref={meshRef}>
            {/* Inner Core */}
            <Sphere args={[0.95, 32, 32]}>
                <meshBasicMaterial color="#000000" />
            </Sphere>
            {/* Outer Grid */}
            <Sphere args={[1.0, 32, 32]}>
                <meshBasicMaterial
                    wireframe
                    color={hovered ? "#10b981" : "#3b82f6"}
                    transparent
                    opacity={0.4}
                />
            </Sphere>
            {/* Atmosphere Glow */}
            <Sphere args={[1.1, 32, 32]}>
                <meshBasicMaterial
                    color={hovered ? "#10b981" : "#3b82f6"}
                    transparent
                    opacity={0.05}
                    side={THREE.BackSide}
                />
            </Sphere>
        </group>
    );
}

function SunMesh({ hovered }: { hovered: boolean }) {
    const meshRef = useRef<THREE.Group>(null!);

    useFrame((state, delta) => {
        if (meshRef.current) {
            const speed = hovered ? 0.8 : 0.2;
            meshRef.current.rotation.y -= delta * speed; // Sun rotates opposite/slowly
        }
    });

    return (
        <group ref={meshRef}>
            <Sphere args={[1, 64, 64]}>
                <meshStandardMaterial
                    emissive={hovered ? "#ff2200" : "#ea580c"}
                    emissiveIntensity={2}
                    color="#000000"
                    roughness={0.4}
                />
            </Sphere>
            <pointLight distance={5} intensity={4} color="#f97316" />
        </group>
    );
}

"use client";

import { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sphere } from "@react-three/drei";
import * as THREE from "three";

export default function NeuralGlobe() {
    const [hovered, setHovered] = useState(false);

    return (
        <div
            className="w-full h-64 md:h-full min-h-[250px] relative cursor-pointer"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <Canvas camera={{ position: [0, 0, 2.5] }} gl={{ alpha: true }}>
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} />
                <GlobeMesh hovered={hovered} />
            </Canvas>
        </div>
    );
}

function GlobeMesh({ hovered }: { hovered: boolean }) {
    const meshRef = useRef<THREE.Mesh>(null!);

    useFrame((state, delta) => {
        if (meshRef.current) {
            // Base rotation speed
            const speed = hovered ? 2.5 : 0.5;
            meshRef.current.rotation.y += delta * speed;
            meshRef.current.rotation.x += delta * (speed * 0.5);
        }
    });

    return (
        <Sphere ref={meshRef} args={[1, 16, 16]} scale={1.1}>
            <meshBasicMaterial
                wireframe
                color={hovered ? "#a855f7" : "#06b6d4"} // Cyan to Violet on hover
                transparent
                opacity={0.6}
            />
        </Sphere>
    );
}

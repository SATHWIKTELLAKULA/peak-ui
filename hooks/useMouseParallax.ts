"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface MousePosition {
  x: number; // -1 to 1
  y: number; // -1 to 1
}

export function useMouseParallax(smoothing = 0.08): MousePosition {
  const [position, setPosition] = useState<MousePosition>({ x: 0, y: 0 });
  const target = useRef<MousePosition>({ x: 0, y: 0 });
  const rafId = useRef<number>(0);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    target.current = {
      x: (e.clientX / window.innerWidth) * 2 - 1,
      y: (e.clientY / window.innerHeight) * 2 - 1,
    };
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    const animate = () => {
      setPosition((prev) => ({
        x: prev.x + (target.current.x - prev.x) * smoothing,
        y: prev.y + (target.current.y - prev.y) * smoothing,
      }));
      rafId.current = requestAnimationFrame(animate);
    };

    rafId.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(rafId.current);
    };
  }, [handleMouseMove, smoothing]);

  return position;
}

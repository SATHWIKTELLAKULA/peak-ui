"use client";

import dynamic from "next/dynamic";

const Starfield = dynamic(
    () => import("@/components/Starfield"),
    { ssr: false }
);

export default function SpaceBackgroundWrapper() {
    return <Starfield />;
}

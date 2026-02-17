"use client";

import dynamic from "next/dynamic";

const AmbientBackground = dynamic(() => import("@/components/AmbientBackground"), {
    ssr: false,
});

export default function BackgroundWrapper() {
    return <AmbientBackground />;
}

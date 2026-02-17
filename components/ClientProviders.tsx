"use client";

import { ReactNode } from "react";
import { SettingsProvider } from "@/contexts/SettingsContext";
import SpaceBackgroundWrapper from "@/components/SpaceBackgroundWrapper";

/**
 * Client-side providers wrapper.
 * Wraps children with SettingsProvider and renders the space background.
 */
export default function ClientProviders({ children }: { children: ReactNode }) {
    return (
        <SettingsProvider>
            <SpaceBackgroundWrapper />
            {children}
        </SettingsProvider>
    );
}

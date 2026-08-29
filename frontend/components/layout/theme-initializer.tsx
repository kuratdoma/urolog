"use client";

import { useEffect } from "react";
import { useSettingsStore } from "@/stores/settings-store";

export function ThemeInitializer() {
    const { darkMode, compactMode } = useSettingsStore();

    useEffect(() => {
        // Handle Dark Mode
        if (darkMode) {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }

        // Handle Compact Mode
        if (compactMode) {
            document.body.classList.add("compact");
        } else {
            document.body.classList.remove("compact");
        }
    }, [darkMode, compactMode]);

    return null;
}

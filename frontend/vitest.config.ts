import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
    plugins: [react()],
    test: {
        environment: "happy-dom",
        globals: true,
        pool: "threads",
        setupFiles: ["./vitest.setup.ts"],
        // Şimdilik yalnızca açıkça test yazılmış alanlar. Kapsam genişledikçe
        // bu desen gevşetilebilir.
        include: ["components/**/*.test.{ts,tsx}", "lib/**/*.test.{ts,tsx}", "hooks/**/*.test.{ts,tsx}"],
    },
    resolve: {
        alias: {
            // tsconfig.json'daki "@/*" -> "./*" eşlemesinin karşılığı.
            "@": path.resolve(__dirname, "."),
        },
    },
});

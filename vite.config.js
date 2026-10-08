import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({ base: "/travel-currency-converter/", build: { sourcemap: false }, plugins: [react()] });

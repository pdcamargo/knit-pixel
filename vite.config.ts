import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // Relative so the build works from any path, e.g. GitHub Pages' /knit-pixel/. Routing is hash-based.
  base: "./",
  plugins: [react(), tailwindcss()],
});

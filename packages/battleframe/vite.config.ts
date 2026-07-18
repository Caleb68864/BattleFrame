import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, "src/battleframe.ts"),
      formats: ["es"],
      fileName: () => "battleframe.js"
    },
    target: "es2022",
    minify: false
  }
});

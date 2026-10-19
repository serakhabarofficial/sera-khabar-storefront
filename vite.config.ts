import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { metaImagesPlugin } from "./vite-plugin-meta-images";
import { merchantSuiteTrackerPlugin } from "./vite-plugin-merchant-suite-tracker";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    metaImagesPlugin(),
    merchantSuiteTrackerPlugin(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  css: {
    postcss: {
      plugins: [],
    },
  },
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js'
      }
    },
    minify: 'esbuild',
    sourcemap: false,
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Ensure proper handling of dynamic imports
    dynamicImportVarsOptions: {
      exclude: []
    }
  },
  preview: {
    port: 3000,
    strictPort: true,
  },
  root: path.resolve(import.meta.dirname, "client"),
  envDir: import.meta.dirname,
  server: {
    // Brand media lives in the Cloudflare R2 bucket sera-khabar-media; vercel.json rewrites /media/* to it in
    // production, and this proxy does the same for the Vite dev server.
    proxy: {
      "/media": {
        target: "https://pub-cfecc6eab1f44552a42789747b613cb7.r2.dev",
        changeOrigin: true,
        rewrite: (url) => url.replace(/^\/media/, ""),
      },
    },
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});

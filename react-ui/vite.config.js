import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const repoName = "seven-stud-hilo-app";
  const pagesBase = `/${repoName}/`;
  // Keep dev server paths simple; apply Pages base to build output only.
  const base = command === "build" ? pagesBase : "/";

  return {
    base,
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        // virtual:pwa-register を使うため HTML への重複注入は不要（injectRegister は null）
        injectRegister: null,
        // PWA assets placed in public/
        includeAssets: ["icon.svg", "favicon.svg"],
        manifest: {
          // NOTE: Keep ASCII to avoid any encoding surprises in some environments.
          name: "Stud Hi-Lo Trainer",
          short_name: "Stud HiLo",
          description: "Seven Card Stud Hi-Lo trainer",
          start_url: pagesBase,
          scope: pagesBase,
          display: "standalone",
          orientation: "portrait-primary",
          theme_color: "#1a0f08",
          background_color: "#120a06",
          lang: "ja",
          icons: [
            {
              // manifest と同じディレクトリ基準（project site 配下でも解決される）
              src: "icon.svg",
              sizes: "any",
              type: "image/svg+xml",
              purpose: "any maskable",
            },
          ],
        },
        workbox: {
          // SPA fallback under project site base
          navigateFallback: `${pagesBase}index.html`,
          // Hashed assets are handled by workbox precache manifest.
          globPatterns: ["**/*.{js,css,html,svg,ico,png,webmanifest}"],
          cleanupOutdatedCaches: true,
        },
      }),
    ],
  };
});

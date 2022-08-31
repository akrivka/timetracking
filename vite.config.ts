import { defineConfig } from "vite";
import mix from "vite-plugin-mix";
import { VitePWA } from "vite-plugin-pwa";
import solidPlugin from "vite-plugin-solid";

export default defineConfig({
  plugins: [
    solidPlugin(),
    mix({ handler: "./src/backend/server.ts" }),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        globPatterns: ["**/*.{js,css}"],
      },
      // mode: "development",
      // devOptions: {
      //   enabled: true,
      // },
    }),
  ],
  build: {
    target: "esnext",
    polyfillDynamicImport: false,
  },
});

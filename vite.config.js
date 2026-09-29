import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";
import vueDevTools from "vite-plugin-vue-devtools";

export default defineConfig({
  server: {
    host: true, // atau bisa juga '0.0.0.0'
    port: 5174,
  },
  plugins: [
    vue(),
    vueDevTools({
      launchEditor: "antigravity-ide",
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

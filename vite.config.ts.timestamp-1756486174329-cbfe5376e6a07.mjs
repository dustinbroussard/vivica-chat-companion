// vite.config.ts
import { defineConfig } from "file:///home/dusitn/Projects/vivica-chat-companion/node_modules/vite/dist/node/index.js";
import react from "file:///home/dusitn/Projects/vivica-chat-companion/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import { VitePWA } from "file:///home/dusitn/Projects/vivica-chat-companion/node_modules/vite-plugin-pwa/dist/index.js";
import { readFileSync } from "fs";
var __vite_injected_original_dirname = "/home/dusitn/Projects/vivica-chat-companion";
var manifest = JSON.parse(
  readFileSync(path.resolve(__vite_injected_original_dirname, "public/manifest.json"), "utf-8")
);
var vite_config_default = defineConfig(({ mode }) => ({
  base: "./",
  server: {
    host: "::",
    port: 8080
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["robots.txt", "icons/*", "uploads/*"],
      manifest,
      workbox: {
        navigateFallback: "offline.html"
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9kdXNpdG4vUHJvamVjdHMvdml2aWNhLWNoYXQtY29tcGFuaW9uXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9kdXNpdG4vUHJvamVjdHMvdml2aWNhLWNoYXQtY29tcGFuaW9uL3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL2R1c2l0bi9Qcm9qZWN0cy92aXZpY2EtY2hhdC1jb21wYW5pb24vdml0ZS5jb25maWcudHNcIjtcbmltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gXCJ2aXRlXCI7XG5pbXBvcnQgcmVhY3QgZnJvbSBcIkB2aXRlanMvcGx1Z2luLXJlYWN0LXN3Y1wiO1xuaW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIjtcbmltcG9ydCB7IFZpdGVQV0EgfSBmcm9tIFwidml0ZS1wbHVnaW4tcHdhXCI7XG5pbXBvcnQgeyByZWFkRmlsZVN5bmMgfSBmcm9tIFwiZnNcIjtcblxuY29uc3QgbWFuaWZlc3QgPSBKU09OLnBhcnNlKFxuICByZWFkRmlsZVN5bmMocGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCJwdWJsaWMvbWFuaWZlc3QuanNvblwiKSwgXCJ1dGYtOFwiKVxuKTtcblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+ICh7XG4gIGJhc2U6ICcuLycsXG4gIHNlcnZlcjoge1xuICAgIGhvc3Q6IFwiOjpcIixcbiAgICBwb3J0OiA4MDgwLFxuICB9LFxuICBwbHVnaW5zOiBbXG4gICAgcmVhY3QoKSxcbiAgICBWaXRlUFdBKHtcbiAgICAgIHJlZ2lzdGVyVHlwZTogJ2F1dG9VcGRhdGUnLFxuICAgICAgaW5jbHVkZUFzc2V0czogWydyb2JvdHMudHh0JywgJ2ljb25zLyonLCAndXBsb2Fkcy8qJ10sXG4gICAgICBtYW5pZmVzdCxcbiAgICAgIHdvcmtib3g6IHtcbiAgICAgICAgbmF2aWdhdGVGYWxsYmFjazogJ29mZmxpbmUuaHRtbCdcbiAgICAgIH1cbiAgICB9KSxcbiAgXSxcbiAgcmVzb2x2ZToge1xuICAgIGFsaWFzOiB7XG4gICAgICBcIkBcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuL3NyY1wiKSxcbiAgICB9LFxuICB9LFxufSkpO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUNBLFNBQVMsb0JBQW9CO0FBQzdCLE9BQU8sV0FBVztBQUNsQixPQUFPLFVBQVU7QUFDakIsU0FBUyxlQUFlO0FBQ3hCLFNBQVMsb0JBQW9CO0FBTDdCLElBQU0sbUNBQW1DO0FBT3pDLElBQU0sV0FBVyxLQUFLO0FBQUEsRUFDcEIsYUFBYSxLQUFLLFFBQVEsa0NBQVcsc0JBQXNCLEdBQUcsT0FBTztBQUN2RTtBQUdBLElBQU8sc0JBQVEsYUFBYSxDQUFDLEVBQUUsS0FBSyxPQUFPO0FBQUEsRUFDekMsTUFBTTtBQUFBLEVBQ04sUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLEVBQ1I7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLE1BQU07QUFBQSxJQUNOLFFBQVE7QUFBQSxNQUNOLGNBQWM7QUFBQSxNQUNkLGVBQWUsQ0FBQyxjQUFjLFdBQVcsV0FBVztBQUFBLE1BQ3BEO0FBQUEsTUFDQSxTQUFTO0FBQUEsUUFDUCxrQkFBa0I7QUFBQSxNQUNwQjtBQUFBLElBQ0YsQ0FBQztBQUFBLEVBQ0g7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLEtBQUssS0FBSyxRQUFRLGtDQUFXLE9BQU87QUFBQSxJQUN0QztBQUFBLEVBQ0Y7QUFDRixFQUFFOyIsCiAgIm5hbWVzIjogW10KfQo=

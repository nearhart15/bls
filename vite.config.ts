import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";
import {NodePackageImporter} from "sass-embedded";

const DEV_CONNECT = "connect-src 'self' https://bls.bindul.name https://*.google-analytics.com https://*.analytics.google.com";
const DEV_CONNECT_WITH_HMR = DEV_CONNECT + " ws://localhost:* ws://127.0.0.1:*";

export default defineConfig(({command}) => ({
  base: "/bls/",
  plugins: [
    react(),
    {
      name: "bls-dev-csp",
      transformIndexHtml(html) {
        return command === "serve" ? html.replace(DEV_CONNECT, DEV_CONNECT_WITH_HMR) : html;
      },
    },
  ],
  build: {
    minify: true,
    sourcemap: false,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "apexcharts",
              test: /node_modules\/(react-apexcharts|apexcharts)/,
            },
          ],
        },
      },
    },
  },
  server: {
    host: "127.0.0.1",
    strictPort: true,
    cors: false,
    allowedHosts: ["localhost", "127.0.0.1"],
    fs: {strict: true},
  },
  preview: {
    host: "127.0.0.1",
    strictPort: true,
    cors: false,
    allowedHosts: ["localhost", "127.0.0.1"],
  },
  css: {
    preprocessorOptions: {
      scss: {
        importers: [new NodePackageImporter()],
        loadPaths: ["./node_modules/"],
        silenceDeprecations: [
          "import",
          "color-functions",
          "global-builtin",
          "if-function",
        ],
      },
    },
  },
}));

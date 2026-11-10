import {copyRuntimeAssets} from "./scripts/public-assets.ts";
import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";
import {NodePackageImporter} from "sass-embedded";

const DEV_CONNECT = "connect-src 'self' https://bls.bindul.name https://*.google-analytics.com https://*.analytics.google.com";
const DEV_CONNECT_WITH_HMR = DEV_CONNECT + " ws://localhost:* ws://127.0.0.1:*";

const localServerOptions = {
    host: "127.0.0.1",
    strictPort: true,
    cors: false,
    allowedHosts: ["localhost", "127.0.0.1"],
};

export default defineConfig(({command}) => ({
  base: "/bls/",
  plugins: [
    react(),
    {name:"bls-runtime-assets",closeBundle(){if(command === "build")copyRuntimeAssets();}},
    {
      name: "bls-dev-csp",
      transformIndexHtml(html) {
        if (command !== "serve") return html;
        return html
          .replace(DEV_CONNECT, DEV_CONNECT_WITH_HMR)
          .replace("; upgrade-insecure-requests", "");
      },
    },
  ],
  build: {
    copyPublicDir: false,
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
    ...localServerOptions,
    fs: {strict: true},
  },
  preview: localServerOptions,
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

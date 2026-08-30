import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import {NodePackageImporter} from "sass-embedded";

// https://vite.dev/config/
export default defineConfig({
  // Required for GitHub Pages project site: https://nearhart15.github.io/bls/
  base: '/bls/',
  plugins: [react()],
  build: {
    minify: true,
    rolldownOptions : {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'react-bootstrap-icons',
              test: /node_modules\/react-bootstrap-icons/
            },
            {
              name: 'apexcharts',
              test: /node_modules\/(react-apexcharts|apexcharts)/
            }
          ]
        }
      }
    },
  },
  // Silence Sass deprecation warnings. See note below.
  css: {
    preprocessorOptions: {
      scss: {
          // includePaths: ['./node_modules/'],
          // See https://github.com/twbs/bootstrap/issues/40962
          // See https://github.com/twbs/bootstrap/issues/41915
          importers: [new NodePackageImporter()],
          loadPaths: ['./node_modules/'],
          silenceDeprecations: [
              'import',
              //'mixed-decls',
              'color-functions',
              'global-builtin',
              'if-function',
          ],
      },
    },
  },
})

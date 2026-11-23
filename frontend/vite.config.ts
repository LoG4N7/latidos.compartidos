import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

// Plugin to strip 'crossorigin' from script and link tags in index.html
// Samsung One UI 6 WebView strictly enforces CORS on local assets if crossorigin is present
const removeCrossOriginPlugin = () => {
  return {
    name: 'remove-crossorigin',
    transformIndexHtml(html: string) {
      return html
        .replace(/\s+crossorigin(?:="[^"]*")?/gi, '')
        .replace(/\s+crossorigin/gi, '');
    }
  };
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), removeCrossOriginPlugin()],
  base: './',
  build: {
    target: ['chrome89', 'es2020'],
    chunkSizeWarningLimit: 1000
  },
  server: {
    host: true, // enables access from smartphone on the same local WiFi
    port: 5173
  }
});

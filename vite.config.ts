import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

import { appVersion } from './config/appVersion';

export default defineConfig({
  plugins: [react()],
  define: {
    // Single source of truth for the displayed app version — cannot drift from package.json.
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  server: {
    port: 5173,
    strictPort: false,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          motion: ['framer-motion'],
          drag: ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
          supabase: ['@supabase/supabase-js'],
          query: ['@tanstack/react-query'],
        },
      },
    },
  },
});

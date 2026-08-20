// Kept for reference only — this tool is built by the root vite.config.ts as one
// entry of the widget-hub multi-page app. Tailwind comes from the root
// postcss.config.js (@tailwindcss/postcss), not from a per-tool plugin.
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
});

import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Multi-page Vite app — each sub-tool is a separate HTML entry point
export default defineConfig({
    plugins: [react()],
    server: {
        port: 3000,
        open: true,
    },
    build: {
        rollupOptions: {
            input: {
                // Dashboard homepage
                main: path.resolve(__dirname, 'index.html'),
                // Sub-tools
                patternGenerator: path.resolve(__dirname, 'diy-pattern-generator/index.html'),
                imageResizer: path.resolve(__dirname, 'image-ultra-resizer/index.html'),
                collageStudio: path.resolve(__dirname, 'collage-studio/index.html'),
            },
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, '.'),
        },
    },
});

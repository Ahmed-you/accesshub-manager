import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { networkInterfaces } from 'node:os';
import {
    defineConfig
} from 'vite';
import tailwindcss from "@tailwindcss/vite";

function getDevServerHost() {
    if (process.env.VITE_DEV_SERVER_HOST) {
        return process.env.VITE_DEV_SERVER_HOST;
    }

    for (const entries of Object.values(networkInterfaces())) {
        for (const entry of entries ?? []) {
            if (entry.family === 'IPv4' && !entry.internal && !entry.address.startsWith('10.')) {
                return entry.address;
            }
        }
    }

    return 'localhost';
}

const devServerHost = getDevServerHost();

export default defineConfig({
    server: {
        host: '0.0.0.0',
        port: 5173,
        strictPort: true,
        hmr: {
            host: devServerHost,
        },
    },
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            ssr: 'resources/js/ssr.jsx',
            refresh: true,
        }),
        react(),
        tailwindcss(),
    ],
    esbuild: {
        jsx: 'automatic',
    },
});

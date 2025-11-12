import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.REDIS_HOST': JSON.stringify(env.REDIS_HOST),
        'process.env.REDIS_PORT': JSON.stringify(env.REDIS_PORT),
        'process.env.REDIS_PASSWORD': JSON.stringify(env.REDIS_PASSWORD),
      },
      resolve: {
        alias: {
          // FIX: `__dirname` is not available in ESM modules.
          // Using `.` resolves to the current working directory, which is the project root where vite.config.ts is located.
          '@': path.resolve('.'),
        }
      }
    };
});
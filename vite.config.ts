import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    base: '/',
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    server: {
      host: true, 
      port: 5173,
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
    }
  };
});
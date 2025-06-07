import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    
    // GitHub Pages 部署時的基礎路徑
    // 使用 spentsimul 倉庫，所以 base 路徑是 '/spentsimul/'
    const base = mode === 'production' ? '/spentsimul/' : '/';
    
    return {
      base: base,
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      server: {
        host: true,   // 允許區網訪問
        port: 5173    // 可自訂端口
      },
      build: {
        outDir: 'dist',
        assetsDir: 'assets',
        sourcemap: false
      }
    };
});

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 載入 .env 檔案中的環境變數
  // process.cwd() 會取得專案的根目錄
  const env = loadEnv(mode, process.cwd(), '');

  return {
    // ==================================================================
    // 核心設定 (Core Configuration)
    // ==================================================================

    /**
     * React 專案必要的 Vite 外掛。
     */
    plugins: [react()],

    /**
     * 【非常重要】部署的基礎路徑。
     * 因為你的倉庫是 `dooyts.github.io` (使用者/組織頁面)，
     * 它會被部署到根網域 `https://dooyts.github.io/`，
     * 所以 base 必須設定為 '/'。
     * 如果是部署到一般倉庫 (例如 `dooyts/my-project`)，則應設為 `'/my-project/'`。
     */
    base: '/',

    /**
     * 在客戶端程式碼中定義全域變數。
     * 這會將 .env 檔案中的 GEMINI_API_KEY 安全地注入到你的應用程式中。
     * 在你的 React 元件中，你可以透過 `process.env.GEMINI_API_KEY` 來存取它。
     * 
     * ⚠️ 安全警告：在客戶端公開 API Key 有風險。請確保這個 Key 的權限有嚴格限制，
     * 例如只允許從你的 GitHub Pages 網域發出請求。
     */
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },

    // ==================================================================
    // 開發伺服器設定 (Development Server)
    // ==================================================================

    server: {
      // 允許透過 IP 位址訪問，方便在手機等其他裝置上測試
      host: true, 
      port: 5173,
    },

    // ==================================================================
    // 建置設定 (Build Configuration)
    // ==================================================================

    build: {
      // 輸出的資料夾名稱，預設就是 'dist'
      outDir: 'dist',

      // 靜態資源 (如圖片、CSS、JS) 的子目錄，預設就是 'assets'
      assetsDir: 'assets',

      // 關閉 source map 以減小最終檔案大小，適合正式部署
      sourcemap: false,
      
      // 您的自訂 Rollup 設定，這些設定通常是 Vite 的預設行為，
      // 但保留它們也沒問題，可以確保檔案命名格式的一致性。
      rollupOptions: {
        output: {
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]'
        }
      }
    }
  };
});
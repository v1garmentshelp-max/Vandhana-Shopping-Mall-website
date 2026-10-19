import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig(({ mode }) => {
  const configured = String(process.env.VITE_API_BASE || loadEnv(mode, process.cwd(), 'VITE_').VITE_API_BASE || '').trim();
  if (configured) {
    let url: URL;
    try { url = new URL(configured); }
    catch { throw new Error('VITE_API_BASE must be the full V1 Garments backend URL, for example https://vandhana-shopping-mall-backend.vercel.app'); }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || !/^(?:\/api)*\/?$/i.test(url.pathname)) {
      throw new Error('VITE_API_BASE must contain only the backend origin, optionally followed by /api. Do not include credentials, query parameters or an endpoint path.');
    }
  }
  return { plugins: [react(), tailwindcss()] };
});

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  base: '/out-of-stock/',
  server: {
    port: 5173
  }
});

import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // Development server configuration
  server: {
    port: 3000,
    host: true,
    open: true,
    cors: true,
  },

  // Build configuration
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'esnext',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
        },
      },
    },
  },

  // Path resolution
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@styles': resolve(__dirname, 'src/styles'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@types': resolve(__dirname, 'src/types'),
    },
  },

  // CSS configuration
  css: {
    devSourcemap: true,
  },

  // Environment variables
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },

  // Preview server configuration
  preview: {
    port: 3000,
    host: true,
  },

  // Optimization
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
});

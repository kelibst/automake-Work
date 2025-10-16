import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync } from 'fs';

// Plugin to copy manifest and icons after build
const copyPublicPlugin = () => ({
  name: 'copy-public',
  closeBundle() {
    const publicFiles = [
      { src: 'public/manifest.json', dest: 'dist/manifest.json' },
    ];

    // Create icons directory
    if (!existsSync('dist/icons')) {
      mkdirSync('dist/icons', { recursive: true });
    }

    // Copy files
    publicFiles.forEach(({ src, dest }) => {
      if (existsSync(src)) {
        copyFileSync(src, dest);
        console.log(`Copied ${src} → ${dest}`);
      }
    });

    // Move sidepanel.html from nested dir to root
    const nestedHtml = 'dist/src/sidepanel/index.html';
    const rootHtml = 'dist/sidepanel.html';
    if (existsSync(nestedHtml)) {
      copyFileSync(nestedHtml, rootHtml);
      console.log(`Moved ${nestedHtml} → ${rootHtml}`);
    }

    // Copy icons
    ['16', '48', '128'].forEach(size => {
      const src = `public/icons/icon-${size}.png`;
      const dest = `dist/icons/icon-${size}.png`;
      if (existsSync(src)) {
        copyFileSync(src, dest);
      }
    });
  }
});

export default defineConfig({
  plugins: [react(), copyPublicPlugin()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        sidepanel: resolve(__dirname, 'src/sidepanel/index.html'),
        background: resolve(__dirname, 'src/background/service-worker.js'),
        content: resolve(__dirname, 'src/content/inject.js'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          // Keep background and content scripts at root
          if (chunkInfo.name === 'background') return 'background.js';
          if (chunkInfo.name === 'content') return 'content.js';
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          // Keep sidepanel.html at root
          if (assetInfo.name === 'index.html') return 'sidepanel.html';
          return 'assets/[name]-[hash].[ext]';
        },
      },
    },
    sourcemap: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});

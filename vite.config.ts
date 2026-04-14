import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Increase chunk size warning limit to 1500kb (reasonable for modern web apps with many dependencies)
    chunkSizeWarningLimit: 1500,
    
    // Enable source maps for production debugging (hidden from users)
    sourcemap: mode === 'production' ? 'hidden' : true,
    
    // Minification settings
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: true,
      },
    },
    
    // Rollup options for advanced chunking
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks(id) {
          // Core React dependencies - DO NOT SEPARATE
          // Keep React in main vendor bundle to avoid loading order issues
          // if (id.includes('node_modules/react/') || 
          //     id.includes('node_modules/react-dom/') || 
          //     id.includes('node_modules/react-router-dom/')) {
          //   return 'react-vendor';
          // }
          
          // Radix UI components (all UI primitives)
          if (id.includes('@radix-ui/')) {
            return 'radix-ui';
          }
          
          // Supabase client
          if (id.includes('@supabase/')) {
            return 'supabase';
          }
          
          // Data fetching and state management
          if (id.includes('@tanstack/react-query') || 
              id.includes('zustand')) {
            return 'state-management';
          }
          
          // Charting library
          if (id.includes('recharts')) {
            return 'charts';
          }
          
          // PDF and Canvas libraries (heavy, rarely used)
          if (id.includes('jspdf') || id.includes('html2canvas')) {
            return 'pdf-export';
          }
          
          // Don't separate react-dnd to avoid loading order issues
          // Let it be included with vendor to ensure React is available
          // if (id.includes('react-dnd')) {
          //   return 'dnd';
          // }
          
          // Form handling
          if (id.includes('react-hook-form') || 
              id.includes('@hookform/') || 
              id.includes('zod')) {
            return 'forms';
          }
          
          // Date utilities
          if (id.includes('date-fns')) {
            return 'date-utils';
          }
          
          // All other vendor dependencies
          if (id.includes('node_modules/')) {
            return 'vendor';
          }
        },
        
        // Better chunk naming for production
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
          return `assets/js/[name]-[hash].js`;
        },
        
        // Better entry file naming
        entryFileNames: 'assets/js/[name]-[hash].js',
        
        // Asset file naming
        assetFileNames: (assetInfo) => {
          const extType = assetInfo.name?.split('.').pop() || 'asset';
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
            return `assets/images/[name]-[hash][extname]`;
          }
          if (/woff|woff2|eot|ttf|otf/i.test(extType)) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          if (extType === 'css') {
            return `assets/css/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
      },
    },
    
    // CSS code splitting
    cssCodeSplit: true,
    
    // Enable module preload polyfill
    modulePreload: {
      polyfill: true,
    },
    
    // Report compressed size
    reportCompressedSize: false, // Disable to speed up builds
  },
  
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router',
      '@tanstack/react-query',
      'zustand',
      '@supabase/supabase-js',
      '@supabase/postgrest-js',
      '@supabase/auth-js',
      '@supabase/realtime-js',
      '@supabase/storage-js',
      '@supabase/functions-js',
      'react-dnd',
      'react-dnd-html5-backend',
    ],
  },
}));

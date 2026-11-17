import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dirname=path.dirname(fileURLToPath(import.meta.url));
export default defineConfig({
  root:path.resolve(dirname,'frontend'),
  base:'/react/',
  plugins:[react()],
  build:{outDir:path.resolve(dirname,'www/react'),emptyOutDir:true,manifest:true,target:'es2022'},
  server:{port:5173,host:'0.0.0.0',proxy:{'/api':'http://localhost:3000','/assets':'http://localhost:3000','/index.html':'http://localhost:3000','/manifest.webmanifest':'http://localhost:3000'}}
});

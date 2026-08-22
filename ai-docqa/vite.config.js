 import { defineConfig } from 'vite' 
 import react from '@vitejs/plugin-react' 
 
 export default 
 defineConfig({ base: '/ai-document-qa/', plugins: [react()], })
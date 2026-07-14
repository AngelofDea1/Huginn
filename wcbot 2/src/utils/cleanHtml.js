import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const cleanFile = (filePath) => {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  let html = fs.readFileSync(filePath, 'utf8');

  // Strip Next.js hydration payload script blocks
  // 1. Remove all self.__next_f.push scripts
  html = html.replace(/<script>self\.__next_f\.push[\s\S]*?<\/script>/g, '');
  html = html.replace(/<script>\(self\.__next_f=[\s\S]*?<\/script>/g, '');
  
  // 2. Remove script tags referencing Next static chunks
  html = html.replace(/<script src="\/_next\/static\/chunks\/[\s\S]*?<\/script>/g, '');
  html = html.replace(/<link rel="preload" as="script"[\s\S]*?\/>/g, '');
  
  // 3. Remove metadata templates and bailout templates
  html = html.replace(/<template data-dgst="BAILOUT_TO_CLIENT_SIDE_RENDERING"><\/template>/g, '');

  fs.writeFileSync(filePath, html, 'utf8');
  console.log(`Cleaned static page: ${filePath}`);
};

const publicDir = path.join(__dirname, '..', '..', 'public', 'huginn');
cleanFile(path.join(publicDir, 'privacy', 'index.html'));
cleanFile(path.join(publicDir, 'terms', 'index.html'));

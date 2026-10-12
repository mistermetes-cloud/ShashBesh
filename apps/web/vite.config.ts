import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {defineConfig} from 'vite';

const appRoot=dirname(fileURLToPath(import.meta.url));
export default defineConfig(({mode})=>{
 const preview=mode==='cloudflare-preview';
 return {
  resolve:preview?{alias:[
   {find:/packages\/agents\/src\/index(?:\.ts)?$/,replacement:resolve(appRoot,'src/publicPreviewAgents.ts')},
   {find:/packages\/neural\/src\/index(?:\.ts)?$/,replacement:resolve(appRoot,'src/publicPreviewNeural.ts')},
  ]}:undefined,
 };
});

import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {defineConfig} from 'vite';

const appRoot=dirname(fileURLToPath(import.meta.url));
export default defineConfig(({mode,command})=>{
 const preview=mode==='cloudflare-preview';
 // LAN requires an explicit development-only mode; production always disables it.
 const lan=command==='serve'&&mode==='lan-development';
 return {
  build:{rollupOptions:{input:{web:resolve(appRoot,'index.html'),telegram:resolve(appRoot,'telegram/index.html')}}},
  define:{__SHASHBESH_DEV_LAN__:JSON.stringify(lan)},
  resolve:{alias:[
   ...(!lan?[
    {find:/^(?:.*\/)?packages\/lan\/src\/client(?:\.ts)?$/,replacement:resolve(appRoot,'src/disabledNetwork.tsx')},
    {find:/^\.\/(?:WifiScreen|LanPanel)$/,replacement:resolve(appRoot,'src/disabledNetwork.tsx')},
   ]:[]),
   ...(preview?[
   {find:/^(?:.*\/)?packages\/agents\/src\/index(?:\.ts)?$/,replacement:resolve(appRoot,'src/publicPreviewAgents.ts')},
   {find:/^(?:.*\/)?packages\/neural\/src\/index(?:\.ts)?$/,replacement:resolve(appRoot,'src/publicPreviewNeural.ts')},
   ]:[]),
  ]},
 };
});

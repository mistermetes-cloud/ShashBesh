import {defineConfig} from '@playwright/test';
const firefox=process.env.SHASHBESH_TEST_BROWSER==='firefox';
export default defineConfig({testDir:'tests/browser',timeout:180000,expect:{timeout:10000},workers:1,use:{baseURL:'http://127.0.0.1:5173',browserName:firefox?'firefox':'chromium',headless:true,launchOptions:firefox?{}:{executablePath:process.env.SHASHBESH_BROWSER_PATH||undefined}},webServer:{command:'npm run dev',url:'http://127.0.0.1:5173',reuseExistingServer:true,timeout:30000}});

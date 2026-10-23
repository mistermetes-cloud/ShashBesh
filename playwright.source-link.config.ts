import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'tests/browser',testMatch:'source-link.spec.ts',timeout:180000,workers:1,use:{browserName:'firefox',headless:true,locale:'en-US',viewport:{width:390,height:844},hasTouch:true,acceptDownloads:true}});

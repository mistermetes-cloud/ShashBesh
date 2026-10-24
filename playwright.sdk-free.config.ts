import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'tests/browser',testMatch:'sdk-free-telegram.spec.ts',timeout:60000,workers:1,use:{browserName:'firefox',headless:true,locale:'en-US',viewport:{width:390,height:844},hasTouch:true,acceptDownloads:true}});

// SPDX-License-Identifier: GPL-3.0-only
/** Browser-only host adapter for the SDK-free Telegram preview. */
export interface Insets {top:number;right:number;bottom:number;left:number;}
export interface PlatformSnapshot {kind:'web';language?:string;launchParameter?:string;height?:number;insets:Insets;theme:{background?:string;text?:string};}
export interface PlatformAdapter {
    snapshot:()=>PlatformSnapshot;
    mount:(onChange:()=>void)=>()=>void;
    back:(visible:boolean,onBack:()=>void)=>()=>void;
    fullscreen:()=>boolean;
}
export function browserPlatform():PlatformAdapter {
    return {
        snapshot:()=>({kind:'web',insets:{top:0,right:0,bottom:0,left:0},theme:{}}),
        mount:()=>()=>{},
        back:()=>()=>{},
        fullscreen:()=>false,
    };
}

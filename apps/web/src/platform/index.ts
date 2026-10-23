/** Optional host surface. initDataUnsafe is a presentation hint, never an identity. */
export interface TelegramWebApp {
    initDataUnsafe?: {user?:{language_code?:string};start_param?:string};
    colorScheme?:string;
    themeParams?:{bg_color?:string;text_color?:string;button_color?:string};
    viewportStableHeight?:number;
    safeAreaInset?:Partial<Insets>;
    contentSafeAreaInset?:Partial<Insets>;
    ready?:()=>void;
    expand?:()=>void;
    isVersionAtLeast?:(version:string)=>boolean;
    requestFullscreen?:()=>void;
    onEvent?:(name:string,listener:()=>void)=>void;
    offEvent?:(name:string,listener:()=>void)=>void;
    BackButton?:{show:()=>void;hide:()=>void;onClick:(listener:()=>void)=>void;offClick:(listener:()=>void)=>void};
}
export interface Insets {top:number;right:number;bottom:number;left:number;}
export interface PlatformSnapshot {kind:'web'|'telegram';language?:string;launchParameter?:string;height?:number;insets:Insets;theme:{background?:string;text?:string};}
export interface PlatformAdapter {
    snapshot:()=>PlatformSnapshot;
    mount:(onChange:()=>void)=>()=>void;
    back:(visible:boolean,onBack:()=>void)=>()=>void;
    fullscreen:()=>boolean;
}
const attempt=(fn:()=>void)=>{try{fn();return true;}catch{return false;}};
const safeNumber=(n:unknown)=>typeof n==='number'&&Number.isFinite(n)?Math.max(0,Math.min(10000,n)):0;
const color=(value?:string)=>typeof value==='string'&&/^#[\da-f]{6}$/i.test(value)?value:undefined;
export function createPlatformAdapter(tg?:TelegramWebApp):PlatformAdapter {
    let initialized=false;
    const subscribers=new Set<()=>void>();
    const registered:string[]=[];
    const notify=()=>{for(const listener of subscribers)listener();};
    return {
        snapshot(){
            const insets={} as Insets;for(const side of ['top','right','bottom','left'] as const)insets[side]=Math.max(safeNumber(tg?.safeAreaInset?.[side]),safeNumber(tg?.contentSafeAreaInset?.[side]));
            const launch=tg?.initDataUnsafe?.start_param;
            const language=tg?.initDataUnsafe?.user?.language_code;
            return {kind:tg?'telegram':'web',language:typeof language==='string'&&/^[a-z]{2,3}(?:[-_][a-z0-9]{2,8})*$/i.test(language)?language:undefined,launchParameter:typeof launch==='string'&&/^[\w-]{1,512}$/.test(launch)?launch:undefined,height:safeNumber(tg?.viewportStableHeight)||undefined,insets,theme:{background:color(tg?.themeParams?.bg_color),text:color(tg?.themeParams?.text_color)}};
        },
        mount(onChange){
            if(!tg)return()=>{};
            if(!initialized){initialized=true;attempt(()=>tg.ready?.());attempt(()=>tg.expand?.());}
            if(!subscribers.size){
                for(const event of ['themeChanged','viewportChanged','safeAreaChanged','contentSafeAreaChanged','fullscreenChanged'])if(tg.onEvent&&attempt(()=>tg.onEvent!(event,notify)))registered.push(event);
            }
            // A subscription owns its callback even if the caller reuses the same function.
            const listener=()=>onChange();subscribers.add(listener);
            onChange();let disposed=false;
            return()=>{if(disposed)return;disposed=true;subscribers.delete(listener);
                if(!subscribers.size)for(const event of registered.splice(0))attempt(()=>tg.offEvent?.(event,notify));
            };
        },
        back(visible,onBack){
            const button=tg?.BackButton;if(!button)return()=>{};
            if(!visible){attempt(()=>button.hide());return()=>{};}
            attempt(()=>button.onClick(onBack));attempt(()=>button.show());
            return()=>{attempt(()=>button.offClick(onBack));attempt(()=>button.hide());};
        },
        fullscreen(){let requested=false;attempt(()=>{if(tg?.requestFullscreen&&tg.isVersionAtLeast?.('8.0')){tg.requestFullscreen();requested=true;}});return requested;},
    };
}
export function browserPlatform(){
    const host=typeof window==='undefined'?undefined:(window as Window & {Telegram?:{WebApp?:TelegramWebApp}}).Telegram?.WebApp;
    return createPlatformAdapter(host);
}
/** Produces a link only for a configured, future bot/app. Does not grant room access. */
export function invitationLink(appUrl:string,opaqueToken:string){
    const url=new URL(appUrl);if(url.protocol!=='https:'||url.hostname!=='t.me'||!/^\/[\w]+\/[\w]+$/.test(url.pathname)||!/^[-\w]{1,512}$/.test(opaqueToken))throw Error('Invalid invitation link');
    url.search='';url.hash='';url.searchParams.set('startapp',opaqueToken);return url.href;
}

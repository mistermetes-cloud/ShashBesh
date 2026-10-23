import {useEffect,useRef} from 'react';
import type {PlatformAdapter} from './index';
export function usePlatform(platform:PlatformAdapter,backVisible:boolean,onBack:()=>void){
    const backHandler=useRef(onBack);backHandler.current=onBack;
    useEffect(()=>{
        const root=document.documentElement;
        const update=()=>{const value=platform.snapshot();
            root.dataset.platform=value.kind;
            for(const side of ['top','right','bottom','left'] as const)root.style.setProperty(`--host-safe-${side}`,`${value.insets[side]}px`);
            if(value.height)root.style.setProperty('--platform-height',`${value.height}px`);else root.style.removeProperty('--platform-height');
            for(const [key,valueColor]of Object.entries(value.theme)){if(valueColor)root.style.setProperty(`--host-${key}`,valueColor);else root.style.removeProperty(`--host-${key}`);}
        };
        const properties=['--platform-height','--host-background','--host-text',...['top','right','bottom','left'].map(side=>`--host-safe-${side}`)];
        const previous=properties.map(key=>[key,root.style.getPropertyValue(key),root.style.getPropertyPriority(key)]);
        const previousPlatform=root.dataset.platform;
        update();const dispose=platform.mount(update);
        return()=>{dispose();for(const [key,value,priority]of previous){if(value)root.style.setProperty(key,value,priority);else root.style.removeProperty(key);}
            if(previousPlatform===undefined)delete root.dataset.platform;else root.dataset.platform=previousPlatform;
        };
    },[platform]);
    useEffect(()=>platform.back(backVisible,()=>backHandler.current()),[platform,backVisible]);
}

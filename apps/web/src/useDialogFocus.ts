import {useEffect} from 'react';
/** Keep keyboard navigation inside an open dialog and restore its trigger on close. */
export function useDialogFocus(open:boolean,selector:string,onClose:()=>void){
    useEffect(()=>{
        if(!open)return;
        const dialog=document.querySelector<HTMLElement>(selector);if(!dialog)return;
        const previous=document.activeElement as HTMLElement|null;
        const focusable=()=>[...dialog.querySelectorAll<HTMLElement>('button:not(:disabled),select:not(:disabled),input:not(:disabled),textarea:not(:disabled),summary,a[href],[tabindex="0"]')].filter(el=>el.getClientRects().length);
        focusable()[0]?.focus();
        const key=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();onClose();}if(event.key==='Tab'){const items=focusable(),first=items[0],last=items.at(-1);if(!first)return;if(event.shiftKey&&(document.activeElement===first||!dialog.contains(document.activeElement))){event.preventDefault();last?.focus();}else if(!event.shiftKey&&(document.activeElement===last||!dialog.contains(document.activeElement))){event.preventDefault();first.focus();}}};
        dialog.addEventListener('keydown',key);return()=>{dialog.removeEventListener('keydown',key);if(previous?.isConnected)previous.focus();};
    },[open,selector]);
}

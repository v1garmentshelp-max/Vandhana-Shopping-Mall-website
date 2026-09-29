import {useEffect,type DependencyList} from 'react';
import {clearProductResponseCache} from '../services/productsApi';
import {clearHomepageConfigurationCache} from '../services/homepageImagesApi';
import {clearCategoryPreviewCache} from '../services/categoryPreviews';

const listeners=new Set<()=>void>();
let timer:ReturnType<typeof setInterval>|undefined;
let lastRefresh=0;
const refresh=()=>{
 if(document.visibilityState==='hidden'||Date.now()-lastRefresh<3000)return;
 lastRefresh=Date.now();
 clearProductResponseCache();clearHomepageConfigurationCache();clearCategoryPreviewCache();
 listeners.forEach(listener=>listener());
};
function subscribe(listener:()=>void){
 listeners.add(listener);
 if(listeners.size===1){
  timer=setInterval(refresh,20000);
  window.addEventListener('focus',refresh);window.addEventListener('online',refresh);document.addEventListener('visibilitychange',refresh);
 }
 return()=>{
  listeners.delete(listener);
  if(!listeners.size){clearInterval(timer);timer=undefined;window.removeEventListener('focus',refresh);window.removeEventListener('online',refresh);document.removeEventListener('visibilitychange',refresh);}
 };
}
// Initial/route loads may show skeletons. Background updates keep current content visible.
export function useStoreEffect(effect:(refresh:boolean)=>(()=>void)|void,dependencies:DependencyList){
 useEffect(()=>{
  let cleanup=effect(false);
  const stop=subscribe(()=>{cleanup?.();cleanup=effect(true)});
  return()=>{stop();cleanup?.()};
  // The caller supplies the route/filter dependencies, like useEffect.
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },dependencies);
}

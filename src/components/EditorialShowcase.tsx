import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {Link} from 'react-router';
import type {HomepageImageMap} from '../services/homepageImagesApi';
import men from '../assets/editorial/men-layers.png';
import women from '../assets/editorial/women-layers.png';
import kids from '../assets/editorial/kids-layers.png';
import './EditorialShowcase.css';
const artwork={men,women,kids};
export default function EditorialShowcase({page,images}:{page:keyof typeof artwork;images:HomepageImageMap}){
 const ref=useRef<HTMLElement>(null),[spread,setSpread]=useState(true),[failed,setFailed]=useState<string[]>([]);
 const scene=Object.values(images).find(item=>item.page===page&&item.section==='editorial');
 useEffect(()=>{
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  let frame=0;
  const update=()=>{frame=0;const el=ref.current;if(!el)return;const r=el.getBoundingClientRect();if(r.bottom<0||r.top>innerHeight)return;el.style.setProperty('--travel',String(Math.max(-1,Math.min(1,(innerHeight*.5-r.top-r.height*.5)/innerHeight))))};
  const onScroll=()=>{if(!frame)frame=requestAnimationFrame(update)};
  onScroll();window.addEventListener('scroll',onScroll,{passive:true});window.addEventListener('resize',onScroll);
  return()=>{cancelAnimationFrame(frame);window.removeEventListener('scroll',onScroll);window.removeEventListener('resize',onScroll)};
 },[]);
 if(scene?.extra?.enabled===false)return null;
 return <section ref={ref} className={`v1-editorial v1-editorial-${page}`} data-spread={spread} aria-label={`${page} clothing inspiration`}>
  <div className="v1-editorial-copy"><p className="v1-editorial-kicker">V1 / THE STYLE EDIT</p><h2>{page==='men'?'Layers for every day':page==='women'?'Made for your moment':'Little looks. Big joy.'}</h2><p>Clothing for the way you live. Discover your next favourite in our {page} collection.</p><Link to={`/collections?gender=${page[0].toUpperCase()+page.slice(1)}`}>Shop {page} <span aria-hidden="true">↗</span></Link><small>Style inspiration. Available products are shown in the collection.</small></div>
  <div className="v1-editorial-art"><div className="v1-editorial-ring"/>{[0,1,2,3].map((index)=>{
   const remote=String(scene?.extra?.layers?.[index]||'');const valid=/^https:\/\//.test(remote)&&!failed.includes(remote);
   const rect=page==='kids'&&index<2?(index===0?[0,0,650/1254,.5]:[650/1254,0,604/1254,.5]):[index%2*.5,Math.floor(index/2)*.5,.5,.5];
   return <div key={index} className={`v1-editorial-layer layer-${index}`}><div className="v1-editorial-float"><div className="v1-editorial-crop" style={{aspectRatio:rect[2]/rect[3]} as CSSProperties}>{valid?<img src={remote} alt="" loading="lazy" decoding="async" className="v1-editorial-remote" onError={()=>setFailed(f=>[...f,remote])}/>:<img src={artwork[page]} alt="" loading="lazy" decoding="async" style={{position:'absolute',maxWidth:'none',width:`${100/rect[2]}%`,height:`${100/rect[3]}%`,left:`${-100*rect[0]/rect[2]}%`,top:`${-100*rect[1]/rect[3]}%`}}/>}</div></div></div>
  })}<button type="button" className="v1-editorial-control" onClick={()=>setSpread(v=>!v)}>{spread?'Bring layers together':'Spread the layers'} <span aria-hidden="true">↔</span></button></div>
 </section>;
}

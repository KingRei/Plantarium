/* 天象儀 Celestial Simulator — application (requires three.js r128 loaded first) */
'use strict';
/* ══════════════════════════════════════════════════════════
   1. 天文計算引擎(J2000 近似克卜勒根數 + 低精度月球)
   ══════════════════════════════════════════════════════════ */
const DEG = Math.PI/180;
const OBLQ = 23.4393*DEG;
const AU_KM = 149597870.7;
const J2000_MS = Date.UTC(2000,0,1,12,0,0);

function centuries(ms){ return (ms - J2000_MS)/86400000/36525; }
function days(ms){ return (ms - J2000_MS)/86400000; }
function julianDay(ms){ return ms/86400000 + 2440587.5; }
function wrap360(x){ x%=360; return x<0? x+360 : x; }
function wrap180(x){ x=wrap360(x); return x>180? x-360 : x; }

const ELEM = [
 {name:'水星', en:'Mercury', color:0x9fa4ab, size:0.9,
  e0:[0.38709927,0.20563593,7.00497902,252.25032350,77.45779628,48.33076593],
  e1:[0.00000037,0.00001906,-0.00594749,149472.67411175,0.16047689,-0.12534081]},
 {name:'金星', en:'Venus', color:0xe8c66f, size:1.4,
  e0:[0.72333566,0.00677672,3.39467605,181.97909950,131.60246718,76.67984255],
  e1:[0.00000390,-0.00004107,-0.00078890,58517.81538729,0.00268329,-0.27769418]},
 {name:'地球', en:'Earth', color:0x4f8fe6, size:1.5,
  e0:[1.00000261,0.01671123,-0.00001531,100.46457166,102.93768193,0.0],
  e1:[0.00000562,-0.00004392,-0.01294668,35999.37244981,0.32327364,0.0]},
 {name:'火星', en:'Mars', color:0xe0603c, size:1.1,
  e0:[1.52371034,0.09339410,1.84969142,-4.55343205,-23.94362959,49.55953891],
  e1:[0.00001847,0.00007882,-0.00813131,19140.30268499,0.44441088,-0.29257343]},
 {name:'木星', en:'Jupiter', color:0xd8a76a, size:3.2,
  e0:[5.20288700,0.04838624,1.30439695,34.39644051,14.72847983,100.47390909],
  e1:[-0.00011607,-0.00013253,-0.00183714,3034.74612775,0.21252668,0.20469106]},
 {name:'土星', en:'Saturn', color:0xe5c98f, size:2.8,
  e0:[9.53667594,0.05386179,2.48599187,49.95424423,92.59887831,113.66242448],
  e1:[-0.00125060,-0.00050991,0.00193609,1222.49362201,-0.41897216,-0.28867794]},
 {name:'天王星', en:'Uranus', color:0x7fd1e0, size:2.2,
  e0:[19.18916464,0.04725744,0.77263783,313.23810451,170.95427630,74.01692503],
  e1:[-0.00196176,-0.00004397,-0.00242939,428.48202785,0.40805281,0.04240589]},
 {name:'海王星', en:'Neptune', color:0x4f6fe6, size:2.2,
  e0:[30.06992276,0.00859048,1.77004347,-55.12002969,44.96476227,131.78422574],
  e1:[0.00026291,0.00005105,0.00035372,218.45945325,-0.32241464,-0.00508664]},
 {name:'冥王星', en:'Pluto', color:0xb7a08c, size:0.8,
  e0:[39.48211675,0.24882730,17.14001206,238.92903833,224.06891629,110.30393684],
  e1:[-0.00031596,0.00005170,0.00004818,145.20780515,-0.04062942,-0.01183482]}
];
const EARTH_IDX = 2;

function helio(idx, T){
  const p = ELEM[idx];
  const a  = p.e0[0]+p.e1[0]*T,  e  = p.e0[1]+p.e1[1]*T;
  const I  =(p.e0[2]+p.e1[2]*T)*DEG;
  const L  = p.e0[3]+p.e1[3]*T;
  const pe = p.e0[4]+p.e1[4]*T,  Om = p.e0[5]+p.e1[5]*T;
  const w  = (pe-Om)*DEG, O = Om*DEG;
  let M = wrap180(L-pe)*DEG;
  let E = M + e*Math.sin(M);
  for(let k=0;k<8;k++){ E -= (E-e*Math.sin(E)-M)/(1-e*Math.cos(E)); }
  const xp = a*(Math.cos(E)-e), yp = a*Math.sqrt(1-e*e)*Math.sin(E);
  const cw=Math.cos(w),sw=Math.sin(w),cO=Math.cos(O),sO=Math.sin(O),ci=Math.cos(I),si=Math.sin(I);
  return {
    x:(cw*cO - sw*sO*ci)*xp + (-sw*cO - cw*sO*ci)*yp,
    y:(cw*sO + sw*cO*ci)*xp + (-sw*sO + cw*cO*ci)*yp,
    z:(sw*si)*xp + (cw*si)*yp
  };
}
function moonGeo(T){
  const S=x=>Math.sin(wrap360(x)*DEG), C=x=>Math.cos(wrap360(x)*DEG);
  const lam = 218.32 + 481267.881*T
    + 6.29*S(135.0+477198.87*T) - 1.27*S(259.3-413335.36*T)
    + 0.66*S(235.7+890534.22*T) + 0.21*S(269.9+954397.74*T)
    - 0.19*S(357.5+35999.05*T)  - 0.11*S(186.5+966404.03*T);
  const bet = 5.13*S(93.3+483202.02*T) + 0.28*S(228.2+960400.9*T)
    - 0.28*S(318.3+6003.2*T) - 0.17*S(217.6-407332.2*T);
  const par = 0.9508 + 0.0518*C(134.9+477198.85*T) + 0.0095*C(259.2-413335.38*T)
    + 0.0078*C(235.7+890534.23*T) + 0.0028*C(269.9+954397.70*T);
  const distKm = 6378.14/Math.sin(par*DEG);
  const l=wrap360(lam)*DEG, b=bet*DEG, d=distKm/AU_KM;
  return { x:d*Math.cos(b)*Math.cos(l), y:d*Math.cos(b)*Math.sin(l), z:d*Math.sin(b),
           lon:wrap360(lam), distKm };
}
function gmstDeg(ms){
  const d = days(ms), T = d/36525;
  return wrap360(280.46061837 + 360.98564736629*d + 0.000387933*T*T);
}
function eclToEq(v){
  const c=Math.cos(OBLQ), s=Math.sin(OBLQ);
  return {x:v.x, y:v.y*c - v.z*s, z:v.y*s + v.z*c};
}
function eqToEclWorld(v){
  const c=Math.cos(OBLQ), s=Math.sin(OBLQ);
  const ex=v.x, ey=v.y*c+v.z*s, ez=-v.y*s+v.z*c;
  return new THREE.Vector3(ex, ez, -ey);
}
function eclToWorld(v,out){ out=out||new THREE.Vector3(); out.set(v.x, v.z, -v.y); return out; }
function eqUnit(ra,dec){ return new THREE.Vector3(Math.cos(dec)*Math.cos(ra), Math.cos(dec)*Math.sin(ra), Math.sin(dec)); }
function geoEcl(idx, T){
  const e = helio(EARTH_IDX,T);
  if(idx==='sun') return {x:-e.x, y:-e.y, z:-e.z};
  const p = helio(idx,T);
  return {x:p.x-e.x, y:p.y-e.y, z:p.z-e.z};
}
function geoLon(idx,T){ const g=geoEcl(idx,T); return wrap360(Math.atan2(g.y,g.x)/DEG); }
function retroRate(idx,ms){
  return wrap180(geoLon(idx,centuries(ms+43200000))-geoLon(idx,centuries(ms-43200000)));
}
/* 歲差:春分點沿黃道每年退行 50.29″,週期約 25,772 年 */
const PRECESS_DEG_YR = 50.29/3600, YR_MS = 31557600000;
function psiDeg(ms){ return PRECESS_DEG_YR*(ms-J2000_MS)/YR_MS; }
function rotEclZ(g,psiRad){
  const c=Math.cos(psiRad), s=Math.sin(psiRad);
  return {x:g.x*c-g.y*s, y:g.x*s+g.y*c, z:g.z};
}

/* ── 農曆(天文定朔法):月首=朔所在之 UTC+8 民用日;含冬至之月為十一月;
      兩冬至之間有 13 個朔望月時,其後第一個無中氣之月為閏月 ── */
function sunLonDeg(ms){ const g=geoEcl('sun',centuries(ms)); return wrap360(Math.atan2(g.y,g.x)/DEG); }
function moonElongSigned(ms){ return wrap180(moonGeo(centuries(ms)).lon - sunLonDeg(ms)); }
function civilDay(ms){ return Math.floor((ms+28800000)/86400000); } /* UTC+8 */
function civilYear(ms){ return new Date(ms+28800000).getUTCFullYear(); }
function newMoonNear(ms){ /* 最接近 ms(不晚於太多)的朔時刻 */
  const e=wrap360(moonGeo(centuries(ms)).lon - sunLonDeg(ms));
  let t=ms - e/12.19*86400000;
  let a=t-3*86400000, b=t+3*86400000, g=0;
  while(moonElongSigned(a)>0&&g++<5)a-=86400000;
  g=0; while(moonElongSigned(b)<0&&g++<5)b+=86400000;
  for(let k=0;k<42;k++){const m=(a+b)/2;(moonElongSigned(m)<0? a=m : b=m);}
  return (a+b)/2;
}
function solarTermTime(lamDeg, approxMs){ /* 太陽視黃經=lamDeg 的時刻 */
  const f=x=>wrap180(sunLonDeg(x)-lamDeg);
  let a=approxMs-25*86400000, b=approxMs+25*86400000, g=0;
  while(f(a)>0&&g++<4)a-=15*86400000;
  g=0; while(f(b)<0&&g++<4)b+=15*86400000;
  for(let k=0;k<42;k++){const m=(a+b)/2;(f(m)<0? a=m : b=m);}
  return (a+b)/2;
}
function monthStartOnOrBefore(ms){ /* 該民用日所屬農曆月的月首(朔日)時刻 */
  let nm=newMoonNear(ms);
  const nx=newMoonNear(nm+32*86400000);
  return civilDay(nx)<=civilDay(ms)? nx : nm;
}
function chineseDate(ms){
  const Y=civilYear(ms);
  if(Y<1700||Y>2300)return null; /* 超出可靠範圍 */
  const mStart=monthStartOnOrBefore(ms);
  let ws1=solarTermTime(270,Date.UTC(Y-1,11,21)), ws2=solarTermTime(270,Date.UTC(Y,11,21));
  let a=monthStartOnOrBefore(ws1), b=monthStartOnOrBefore(ws2);
  if(civilDay(mStart)<civilDay(a)){
    ws2=ws1; b=a;
    ws1=solarTermTime(270,Date.UTC(Y-2,11,21)); a=monthStartOnOrBefore(ws1);
  }else if(civilDay(mStart)>=civilDay(b)){
    ws1=ws2; a=b;
    ws2=solarTermTime(270,Date.UTC(Y+1,11,21)); b=monthStartOnOrBefore(ws2);
  }
  const starts=[a]; /* 本「歲」的各月首(自十一月起) */
  let t=a;
  for(let i=0;i<14;i++){
    const n=newMoonNear(t+32*86400000);
    if(civilDay(n)>=civilDay(b))break;
    starts.push(n); t=n;
  }
  const L=starts.length; /* 12 或 13 */
  const hasZhong=(t0,t1)=>{ /* 該月(民用日區間)內是否含中氣:
       依官方規則以 UTC+8 民用日歸屬——中氣與次月朔同日時歸次月 */
    const l0=sunLonDeg(t0), span=wrap360(sunLonDeg(t1)-l0);
    const k0=Math.floor(l0/30), k1=Math.floor((l0+span)/30);
    for(let k=k0+1;k<=k1;k++){
      const approx=t0+((k*30-l0)/span)*(t1-t0);
      const tm=solarTermTime(wrap360(k*30),approx);
      if(civilDay(tm)>=civilDay(t0)&&civilDay(tm)<civilDay(t1))return true;
    }
    return false;
  };
  let leapIdx=-1;
  if(L===13){
    for(let i=1;i<L;i++){
      const t1=(i+1<L)? starts[i+1] : b;
      if(!hasZhong(starts[i],t1)){ leapIdx=i; break; }
    }
  }
  let idx=0;
  for(let i=0;i<L;i++){ if(civilDay(starts[i])<=civilDay(ms)) idx=i; }
  let num=11, isLeap=false;
  for(let i=1;i<=idx;i++){
    if(i===leapIdx){ isLeap=true; }
    else{ num=num%12+1; isLeap=false; }
  }
  const day=civilDay(ms)-civilDay(starts[idx])+1;
  const lunarYear=(num>=11)? civilYear(ws1) : civilYear(ws1)+1;
  return {y:lunarYear, m:num, d:day, leap:isLeap};
}
const GAN='甲乙丙丁戊己庚辛壬癸', ZHI='子丑寅卯辰巳午未申酉戌亥';
const GAN_EN=['Jia','Yi','Bing','Ding','Wu','Ji','Geng','Xin','Ren','Gui'];
const ZHI_EN=['Zi','Chou','Yin','Mao','Chen','Si','Wu','Wei','Shen','You','Xu','Hai'];
const CMON=['正','二','三','四','五','六','七','八','九','十','冬','臘'];
const CNUM=['','一','二','三','四','五','六','七','八','九','十'];
function cDayName(d){
  if(d<=10)return '初'+CNUM[d];
  if(d<20)return '十'+CNUM[d-10];
  if(d===20)return '二十';
  if(d<30)return '廿'+CNUM[d-20];
  return '三十';
}
function formatLunar(ms,langK){
  const cd=chineseDate(ms);
  if(!cd)return '—';
  const st=(cd.y-4)%10, br=(cd.y-4)%12;
  const s10=(st+10)%10, b12=(br+12)%12;
  if(langK==='zh')
    return '農曆'+GAN[s10]+ZHI[b12]+'年'+(cd.leap?'閏':'')+CMON[cd.m-1]+'月'+cDayName(cd.d);
  return 'Lunar '+GAN_EN[s10]+'-'+ZHI_EN[b12]+' · '+(cd.leap?'Leap ':'')+'M'+cd.m+' D'+cd.d;
}

/* ══════════════════════════════════════════════════════════
   2. 黃道十二星座:主星 J2000 座標 [RA°, Dec°, 星等] 與連線
   ══════════════════════════════════════════════════════════ */
const ZODIAC = {
 '牡羊座♈':{en:'Aries',s:[[31.79,23.46,2.0],[28.66,20.81,2.6],[28.38,19.29,3.9],[42.50,27.26,3.6]],
   l:[[2,1],[1,0],[0,3]]},
 '金牛座♉':{en:'Taurus',s:[[68.98,16.51,0.9],[81.57,28.61,1.7],[64.95,15.63,3.6],[65.73,17.54,3.8],[67.15,19.18,3.5],[67.17,15.87,3.4],[84.41,21.14,3.0],[60.17,12.49,3.4]],
   l:[[7,2],[2,3],[3,4],[4,1],[2,5],[5,0],[0,6]]},
 '雙子座♊':{en:'Gemini',s:[[113.65,31.89,1.6],[116.33,28.03,1.1],[99.43,16.40,1.9],[100.98,25.13,3.0],[95.74,22.51,2.9],[110.03,21.98,3.5]],
   l:[[0,3],[3,4],[1,5],[5,2],[0,1]]},
 '巨蟹座♋':{en:'Cancer',s:[[124.13,9.19,3.5],[131.17,18.15,3.9],[130.82,21.47,4.7],[134.62,11.86,4.3],[131.67,28.76,4.0]],
   l:[[4,2],[2,1],[1,0],[1,3]]},
 '獅子座♌':{en:'Leo',s:[[152.09,11.97,1.4],[177.26,14.57,2.1],[154.99,19.84,2.0],[168.53,20.52,2.6],[146.46,23.77,3.0],[154.17,23.42,3.4],[151.83,16.76,3.5],[168.56,15.43,3.3],[148.19,26.01,3.9]],
   l:[[0,6],[6,2],[2,5],[5,8],[8,4],[2,3],[3,1],[1,7],[7,0],[7,3]]},
 '處女座♍':{en:'Virgo',s:[[201.30,-11.16,1.0],[190.42,-1.45,2.7],[195.54,10.96,2.8],[193.90,3.40,3.4],[177.67,1.76,3.6],[184.98,-0.67,3.9],[197.49,-5.54,4.4],[203.67,-0.60,3.4]],
   l:[[4,5],[5,1],[1,3],[3,2],[1,6],[6,0],[0,7],[7,3]]},
 '天秤座♎':{en:'Libra',s:[[222.72,-16.04,2.8],[229.25,-9.38,2.6],[233.88,-14.79,3.9],[226.02,-25.28,3.3]],
   l:[[3,0],[0,1],[1,2],[2,0]]},
 '天蠍座♏':{en:'Scorpius',s:[[247.35,-26.43,1.1],[241.36,-19.81,2.6],[240.08,-22.62,2.3],[239.71,-26.11,2.9],[245.30,-25.59,2.9],[248.97,-28.22,2.8],[252.54,-34.29,2.3],[253.08,-38.05,3.0],[253.50,-42.36,3.6],[258.04,-43.24,3.3],[264.33,-43.00,1.9],[266.90,-40.13,3.0],[265.62,-39.03,2.4],[263.40,-37.10,1.6],[262.69,-37.30,2.7]],
   l:[[1,2],[3,2],[2,4],[4,0],[0,5],[5,6],[6,7],[7,8],[8,9],[9,10],[10,11],[11,12],[12,13],[13,14]]},
 '射手座♐':{en:'Sagittarius',s:[[276.04,-34.38,1.85],[275.25,-29.83,2.7],[276.99,-25.42,2.8],[281.41,-26.99,3.2],[283.82,-26.30,2.05],[286.17,-27.67,3.3],[285.65,-29.88,2.6],[271.45,-30.42,3.0]],
   l:[[7,1],[7,0],[1,3],[3,6],[6,0],[0,1],[1,2],[2,3],[3,4],[4,5],[5,6]]},
 '摩羯座♑':{en:'Capricornus',s:[[304.51,-12.54,3.6],[305.25,-14.78,3.1],[311.52,-25.27,4.1],[312.96,-26.92,4.1],[321.67,-22.41,3.7],[326.76,-16.13,2.9],[325.02,-16.66,3.7],[316.49,-17.23,4.1]],
   l:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,0]]},
 '水瓶座♒':{en:'Aquarius',s:[[331.45,-0.32,2.9],[322.89,-5.57,2.9],[335.41,-1.39,3.8],[337.21,-0.02,3.65],[338.84,-0.12,4.0],[311.92,-9.50,3.8],[334.21,-7.78,4.2],[343.15,-7.58,3.7],[342.40,-13.59,4.0],[343.66,-15.82,3.3]],
   l:[[5,1],[1,0],[0,2],[2,3],[3,4],[0,6],[6,7],[7,8],[8,9]]},
 '雙魚座♓':{en:'Pisces',s:[[349.29,3.28,3.7],[351.99,6.38,4.3],[354.99,5.63,4.1],[355.51,1.78,4.5],[351.73,1.26,4.9],[359.83,6.86,4.0],[12.17,7.58,4.4],[18.44,7.89,4.3],[25.36,5.49,4.4],[30.51,2.76,3.8],[26.35,9.16,4.3],[22.87,15.35,3.6],[18.29,24.58,4.7],[17.34,30.09,4.5],[19.87,27.26,4.8]],
   l:[[0,1],[1,2],[2,3],[3,4],[4,0],[2,5],[5,6],[6,7],[7,8],[8,9],[9,10],[10,11],[11,12],[12,14],[14,13]]}
};

/* ══════════════════════════════════════════════════════════
   3. 語系、標籤系統、拖曳/縮放控制
   ══════════════════════════════════════════════════════════ */
let lang='zh';
function T(zh,en){ return lang==='zh'? zh : en; }
function pname(i){ return lang==='zh'? ELEM[i].name : ELEM[i].en; }

const labelsL=[], labelsR=[]; /* {sp, base} 供螢幕等大縮放 */
const labelReg=[];            /* {sp,getText,color,h,bold,base} 供語系切換重繪 */
function paintLabel(text,colorHex,bold){
  const c=document.createElement('canvas'), ctx=c.getContext('2d');
  const px=48, font=(bold?'700 ':'500 ')+px+'px "PingFang TC","Microsoft JhengHei",sans-serif';
  ctx.font=font;
  c.width=Math.ceil(ctx.measureText(text).width)+18; c.height=px+18;
  ctx.font=font; ctx.textBaseline='middle';
  ctx.shadowColor='rgba(0,0,0,.85)'; ctx.shadowBlur=7;
  ctx.fillStyle=colorHex; ctx.fillText(text,9,c.height/2+2);
  const tex=new THREE.CanvasTexture(c); tex.minFilter=THREE.LinearFilter;
  return {tex, w:c.width, h:c.height};
}
function mkLbl(group,getText,colorHex,worldH,bold){
  const p=paintLabel(getText(),colorHex,bold);
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:p.tex,transparent:true,depthWrite:false,depthTest:false}));
  sp.scale.set(worldH*p.w/p.h, worldH, 1);
  sp.renderOrder=10;
  const rec={sp,getText,color:colorHex,h:worldH,bold,base:sp.scale.clone()};
  labelReg.push(rec);
  if(group==='L')labelsL.push(rec);
  else if(group==='R')labelsR.push(rec);
  return sp;
}
function relabelAll(){
  for(const r of labelReg){
    const p=paintLabel(r.getText(),r.color,r.bold);
    const old=r.sp.material.map;
    r.sp.material.map=p.tex; r.sp.material.needsUpdate=true;
    if(old)old.dispose();
    r.base.set(r.h*p.w/p.h, r.h, 1);
    r.sp.scale.copy(r.base);
  }
}
function glowTexture(rgb, ring){
  /* 手工 DataTexture:全圖恆定色相、僅 alpha 變化。行動 GPU 的
     canvas 預乘 alpha 與取樣內插不一致,是「太陽周圍綠點」的元兇;
     恆定 RGB 讓任何內插誤差都只能是同色系,不可能偏綠。 */
  const N=64, data=new Uint8Array(N*N*4);
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){
    const dx=(x+0.5)/N*2-1, dy=(y+0.5)/N*2-1;
    const r=Math.min(1,Math.hypot(dx,dy));
    const a=ring? Math.exp(-Math.pow((r-0.58)/0.14,2)) : Math.pow(1-r,2.4)*1.5;
    const i=(y*N+x)*4;
    data[i]=rgb[0]; data[i+1]=rgb[1]; data[i+2]=rgb[2];
    data[i+3]=Math.round(255*Math.min(1,Math.max(0,a)));
  }
  const tex=new THREE.DataTexture(data,N,N,THREE.RGBAFormat);
  tex.minFilter=THREE.LinearFilter; tex.magFilter=THREE.LinearFilter; tex.needsUpdate=true;
  return tex;
}
function makeGlow(colorInner, colorOuter, worldSize){
  const m=colorOuter.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  const rgb=m? [+m[1],+m[2],+m[3]] : [255,220,160];
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture(rgb,false),
    transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));
  sp.scale.set(worldSize,worldSize,1);
  return sp;
}
function regGlowL(sp){ labelsL.push({sp,base:sp.scale.clone()}); return sp; }
function regGlowR(sp){ labelsR.push({sp,base:sp.scale.clone()}); return sp; }

let invDrag=true, trackMode='off', lockMode='none'; /* 黃道軸置中預設關閉 */
let trackOffset=30*DEG; /* 黃道軸置中時沿黃道往上看的角度(可拖曳調整) */
function attachPinch(el, onPinch, onDrag){
  const pts=new Map(); let lastDist=0;
  el.addEventListener('pointerdown',e=>{
    pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
    el.setPointerCapture(e.pointerId);
    if(pts.size===2){const a=[...pts.values()];lastDist=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);}
  });
  el.addEventListener('pointermove',e=>{
    if(!pts.has(e.pointerId))return;
    const prev=pts.get(e.pointerId);
    const dx=e.clientX-prev.x, dy=e.clientY-prev.y;
    pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pts.size===2){
      const a=[...pts.values()];
      const d=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);
      if(lastDist>0){
        const f=d/lastDist;
        /* 死區 + 阻尼:過濾觸控微顫,避免鎖定模式下畫面忽大忽小 */
        if(Math.abs(f-1)>0.004) onPinch(Math.pow(f,0.85));
      }
      lastDist=d;
    }else if(pts.size===1){
      onDrag(dx,dy);
    }
  });
  const up=e=>{pts.delete(e.pointerId); lastDist=0;};
  el.addEventListener('pointerup',up); el.addEventListener('pointercancel',up);
}
class OrbitDrag{
  constructor(el,cam,target,r){
    this.cam=cam; this.target=target;
    this.theta=0.55; this.phi=1.05; this.r=r;
    this.min=r*0.06; this.max=r*2.2;
    attachPinch(el,
      f=>{ this.r=Math.max(this.min,Math.min(this.max,this.r/f)); this.apply(); },
      (dx,dy)=>{
        this.theta-=dx*0.006; this.phi-=dy*0.006;
        this.phi=Math.max(0.05,Math.min(Math.PI-0.05,this.phi)); this.apply();
      });
    el.addEventListener('wheel',e=>{e.preventDefault();
      this.r=Math.max(this.min,Math.min(this.max,this.r*(1+e.deltaY*0.001))); this.apply();
    },{passive:false});
    this.apply();
  }
  move(f,rgt,dt,boost){ /* 自由飛行:沿視線前後、左右平移(樞紐點跟著移動,
       縮放不再以太陽為中心);步幅與當前距離成正比,任何尺度皆順手 */
    const fwd=new THREE.Vector3().subVectors(this.target,this.cam.position).normalize();
    const rv=new THREE.Vector3().crossVectors(fwd,new THREE.Vector3(0,1,0)).normalize();
    const step=this.r*1.3*dt*(boost||1);
    this.target.addScaledVector(fwd,f*step).addScaledVector(rv,rgt*step);
    this.apply();
  }
  apply(){
    const s=Math.sin(this.phi);
    this.cam.position.set(
      this.target.x + this.r*s*Math.sin(this.theta),
      this.target.y + this.r*Math.cos(this.phi),
      this.target.z + this.r*s*Math.cos(this.theta));
    this.cam.lookAt(this.target);
  }
}
class LookDrag{
  constructor(el,cam,baseFov){
    this.cam=cam; this.baseFov=baseFov;
    this.yaw=Math.PI; this.pitch=0.42;
    attachPinch(el,
      f=>{ this.setFov(this.cam.fov/f); },
      (dx,dy)=>{
        if(lockMode!=='none')return; /* 鎖定天體時視線交由追蹤 */
        if(trackMode!=='off'){ /* 黃道軸置中:垂直拖曳沿黃道調整仰角 */
          const sg=invDrag? -1 : 1;
          trackOffset=Math.max(-0.26,Math.min(1.48,trackOffset+sg*dy*0.0032));
          return;
        }
        const sg=invDrag? -1 : 1;
        this.yaw+=sg*dx*0.0032; this.pitch+=sg*dy*0.0032;
        this.pitch=Math.max(-0.45,Math.min(1.52,this.pitch)); this.apply();
      });
    el.addEventListener('wheel',e=>{e.preventDefault();
      this.setFov(this.cam.fov+e.deltaY*0.05);
    },{passive:false});
    this.apply();
  }
  setFov(f){
    /* 18° = 4.0×;162.2° ≈ 0.10×(超廣角) */
    this.cam.fov=Math.max(18,Math.min(162.2,f));
    this.cam.updateProjectionMatrix();
  }
  get zoom(){ return Math.tan(this.baseFov/2*DEG)/Math.tan(this.cam.fov/2*DEG); }
  syncFromCamera(){ /* 離開追蹤模式時同步視線 */
    const d=new THREE.Vector3(); this.cam.getWorldDirection(d);
    this.pitch=Math.asin(Math.max(-1,Math.min(1,d.y)));
    this.yaw=Math.atan2(d.x,-d.z);
    this.apply();
  }
  apply(){
    const cp=Math.cos(this.pitch);
    this.cam.lookAt(
      this.cam.position.x + cp*Math.sin(this.yaw),
      this.cam.position.y + Math.sin(this.pitch),
      this.cam.position.z - cp*Math.cos(this.yaw));
  }
}
function buildConstellations(parent, radius, toVec, labelH, group, ptScale, stripGlyph){
  const buckets=[[],[],[],[]];
  const linePts=[];
  for(const name in ZODIAC){
    const c=ZODIAC[name];
    const vs=c.s.map(st=>toVec(eqUnit(st[0]*DEG,st[1]*DEG)).multiplyScalar(radius));
    c.s.forEach((st,i)=>{
      const m=st[2];
      const b=m<2?0:m<3?1:m<4?2:3;
      buckets[b].push(vs[i].x,vs[i].y,vs[i].z);
    });
    c.l.forEach(pair=>{ linePts.push(vs[pair[0]],vs[pair[1]]); });
    const cen=new THREE.Vector3();
    vs.forEach(v=>cen.add(v));
    cen.normalize().multiplyScalar(radius);
    const glyph=name.slice(3);
    const getText=stripGlyph
      ? ()=>T(name.slice(0,3), c.en)
      : ()=>T(name, c.en+' '+glyph);
    const lbl=mkLbl(group,getText,'#E3B34C',labelH,false);
    lbl.position.copy(cen); parent.add(lbl);
  }
  const sizes=[4.6,3.4,2.5,1.8].map(s=>s*ptScale);
  buckets.forEach((arr,i)=>{
    if(!arr.length)return;
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(arr,3));
    parent.add(new THREE.Points(g,new THREE.PointsMaterial({
      color:0xdbe4ff,size:sizes[i],sizeAttenuation:false,transparent:true,opacity:i<2?1:0.85})));
  });
  const lg=new THREE.BufferGeometry().setFromPoints(linePts);
  parent.add(new THREE.LineSegments(lg,new THREE.LineBasicMaterial({
    color:0x6a7db3,transparent:true,opacity:0.5})));
}

/* ══════════════════════════════════════════════════════════
   4. 左視窗:日心太陽系
   ══════════════════════════════════════════════════════════ */
const paneL=document.getElementById('paneL');
const rendL=new THREE.WebGLRenderer({antialias:true});
rendL.setPixelRatio(Math.min(devicePixelRatio,2));
paneL.appendChild(rendL.domElement);
const sceneL=new THREE.Scene(); sceneL.background=new THREE.Color(0x070A16);
const camL=new THREE.PerspectiveCamera(45,1,0.1,90000);
const CAM_REF=360;
const ctrlL=new OrbitDrag(rendL.domElement,camL,new THREE.Vector3(0,0,0),CAM_REF);

sceneL.add(new THREE.AmbientLight(0xffffff,0.55));
const sunLight=new THREE.PointLight(0xfff2cc,1.4,0,2); sceneL.add(sunLight);

const SCALE=30, POW=0.42, K_TRUE=323; /* 正確比例:1 AU = 323 顯示單位(尺寸與距離同尺度) */
let trueScale=false;
function mapR(vEclWorld){ /* 顯示用距離映射:壓縮(易讀)或線性(正確比例) */
  const r=vEclWorld.length(); if(r<1e-9)return vEclWorld;
  const rd=trueScale? K_TRUE*r : SCALE*Math.pow(r,POW);
  return vEclWorld.multiplyScalar(rd/r);
}
const SPHERE_R=170;
let sphereScale=1;
/* 真實半徑(km)。正確比例模式為完全單一尺度:太陽 1.50、木星 0.151、
   地球 0.0138、月距 0.83——次像素天體以標記點呈現,可縮放深潛驗證 */
const TRUE_KM=[2440,6052,6371,3390,69911,58232,25362,24622,1188];

const sunMesh=new THREE.Mesh(new THREE.SphereGeometry(5,32,24),
  new THREE.MeshBasicMaterial({color:0xffd75e}));
sceneL.add(sunMesh);
const sunGlow=makeGlow('rgba(255,236,160,1)','rgba(255,180,60,.45)',34);
sunMesh.add(sunGlow);
/* 正確比例時的太陽核心視覺錨點(半透明巨殼中央) */
const sunCore=new THREE.Mesh(new THREE.SphereGeometry(0.8,20,14),
  new THREE.MeshBasicMaterial({color:0xffe9a0}));
sunCore.visible=false; sceneL.add(sunCore);
const sunLbl=mkLbl('L',()=>T('太陽','Sun'),'#ffd75e',7,true); sunLbl.position.set(0,6.5,0); sunMesh.add(sunLbl);
/* 正確比例:行星與月球的位置標記點(真實尺寸多為次像素) */
const markerPts=(()=>{
  const n=ELEM.length+1;
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(n*3),3));
  const cols=[];
  for(const p of ELEM){const c=new THREE.Color(p.color);cols.push(c.r,c.g,c.b);}
  cols.push(0.85,0.87,0.92);
  g.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));
  const pts=new THREE.Points(g,new THREE.PointsMaterial({size:5,sizeAttenuation:false,vertexColors:true,transparent:true,opacity:0.95,depthWrite:false}));
  pts.visible=false; sceneL.add(pts);
  return pts;
})();

const planetMeshes=[], orbitGroup=new THREE.Group(); sceneL.add(orbitGroup);
for(let i=0;i<ELEM.length;i++){
  const p=ELEM[i];
  const m=new THREE.Mesh(new THREE.SphereGeometry(p.size,24,18),
    new THREE.MeshStandardMaterial({color:p.color,roughness:0.7,metalness:0.05}));
  const lbl=mkLbl('L',()=>pname(i),'#'+p.color.toString(16).padStart(6,'0'),6,i===EARTH_IDX);
  lbl.position.set(0,p.size+4.5,0); m.add(lbl);
  /* 環系(多環帶擬真;半徑單位=行星半徑倍數,傾角=各行星赤道面):
     木星=暈環+主環(稀薄);土星=C/B 環、卡西尼縫、A/F 環;
     天王星=數道窄環與最亮的 ε 環(近垂直);海王星=Galle/LeVerrier/Adams */
  const RING_BANDS={
   4:[[1.55,1.70,0x9a8f7c,0.10],[1.72,1.81,0xb8a98c,0.22]],
   5:[[1.24,1.52,0x8a7a5e,0.22],[1.53,1.94,0xd8c294,0.85],[2.03,2.26,0xcdb684,0.55],[2.30,2.34,0xb59f6e,0.28]],
   6:[[1.60,1.63,0x9fc4ce,0.30],[1.72,1.74,0x9fc4ce,0.32],[1.86,1.88,0xa8ccd6,0.35],[1.99,2.05,0xc2e2ea,0.60]],
   7:[[1.68,1.78,0x77879c,0.10],[2.14,2.17,0x8ea6cc,0.20],[2.50,2.55,0x9db4d8,0.30]]
  };
  const RING_TILT={4:0.05,5:0.466,6:1.707,7:0.494};
  if(RING_BANDS[i]){
    const rg=new THREE.Group(); rg.rotation.x=Math.PI/2-RING_TILT[i];
    for(const [ri,ro,col,op] of RING_BANDS[i]){
      rg.add(new THREE.Mesh(new THREE.RingGeometry(p.size*ri,p.size*ro,64),
        new THREE.MeshBasicMaterial({color:col,side:THREE.DoubleSide,transparent:true,opacity:op,depthWrite:false})));
    }
    m.add(rg);
  }
  sceneL.add(m); planetMeshes.push(m);
}
function buildOrbits(){
  while(orbitGroup.children.length){
    const o=orbitGroup.children.pop(); o.geometry.dispose();
  }
  const Tn=centuries(Date.now());
  for(let i=0;i<ELEM.length;i++){
    const pts=[], a=ELEM[i].e0[0], per=Math.pow(a,1.5)*365.25;
    for(let k=0;k<=180;k++){
      const Tk=Tn + (k/180)*per/36525;
      pts.push(mapR(eclToWorld(helio(i,Tk))));
    }
    const g=new THREE.BufferGeometry().setFromPoints(pts);
    orbitGroup.add(new THREE.Line(g,new THREE.LineBasicMaterial({color:ELEM[i].color,transparent:true,opacity:0.32})));
  }
}
buildOrbits();
function applyScaleMode(){
  /* 正確比例=完全單一線性尺度:km × (K_TRUE/AU_KM) → 顯示單位。
     太陽、行星、月球、軌道、月距、影錐全部同尺度,無任何截幅或誇大。 */
  const kSize=K_TRUE/AU_KM;
  let earthF=1, moonF=1;
  for(let i=0;i<ELEM.length;i++){
    const f=trueScale? (TRUE_KM[i]*kSize)/ELEM[i].size : 1;
    planetMeshes[i].scale.setScalar(f);
    if(i===EARTH_IDX)earthF=f;
  }
  sunMesh.scale.setScalar(trueScale? (696000*kSize)/5 : 1); /* 真實比例太陽半徑 1.50 */
  moonF=trueScale? (1737.4*kSize)/0.55 : 1;
  moonMesh.scale.setScalar(moonF);
  moonVisR=trueScale? 384400*kSize : 3.1;   /* 真實月距 0.83(60.3 地球半徑,絕不及金星) */
  /* 影錐:真實幾何長度(地影 ~138 萬 km、月影 ~37.4 萬 km 恰達地球) */
  const uLen=trueScale? (1380000*kSize)/UMBRA_LEN : 1;
  umbraCone.scale.set(earthF,uLen,earthF);
  umbraHalf=UMBRA_LEN*uLen/2;
  const mLen=trueScale? (374000*kSize)/3.6 : 1;
  mShadowCone.scale.set(moonF,mLen,moonF);
  mShadHalf=3.6*mLen/2;
  tidalGroup.scale.setScalar(trueScale? 0.15 : 1);
  /* 天球與宮位帶外推到冥王星軌道之外 */
  sphereScale=trueScale? 110 : 1;
  sphereGroup.scale.setScalar(sphereScale);
  signBelt.scale.setScalar(sphereScale);
  markerPts.visible=trueScale;
  /* 相機:兩種模式各自的縮放範圍與視角狀態,互不影響;
     非正確比例永遠以太陽(原點)為中心 */
  if(trueScale){ ctrlL.min=0.002; ctrlL.max=45000; }
  else{ ctrlL.min=CAM_REF*0.06; ctrlL.max=CAM_REF*2.2; camStateN.tx=0;camStateN.ty=0;camStateN.tz=0; }
  loadCam(trueScale? camStateT : camStateN);
  document.getElementById('flyPad').style.display=trueScale?'grid':'none';
  document.getElementById('flyExtra').style.display=trueScale?'flex':'none';
  observeIdx='none';
  document.getElementById('obsSel').value='none';
  buildOrbits();
}

/* 主要衛星:伽利略四衛(木)、泰坦與瑞亞(土)、崔頓(海,逆行)。
   軌道半徑經壓縮以利辨識(實際為 6~26 個行星半徑),週期與方向真實。 */
const SAT_DEFS={
 4:[[1.9,1.769,0xE8D08A,0.20],[2.4,3.551,0xF0EDE6,0.17],[3.0,7.155,0xBDB6A8,0.26],[3.9,16.689,0x8F8578,0.24]],
 5:[[3.4,15.945,0xE0B36A,0.26],[2.4,4.518,0xCFCFD6,0.15]],
 6:[[2.3,2.520,0xC8D2DA,0.14],[2.9,8.706,0xD8DEE6,0.18],[3.5,13.463,0xB9C2CE,0.17]],
 7:[[2.6,-5.877,0xBFE0E8,0.22]]
};
const SAT_TILT={4:0.05,5:0.466,6:1.707,7:0.494};
const satMoons=[];
for(const pi in SAT_DEFS){
  const i=+pi, host=planetMeshes[i], base=ELEM[i].size;
  const grp=new THREE.Group();
  grp.rotation.x=Math.PI/2-SAT_TILT[i]; /* 與環同面(行星赤道面) */
  host.add(grp);
  for(const [rr,per,col,sz] of SAT_DEFS[i]){
    const R=base*rr;
    const m=new THREE.Mesh(new THREE.SphereGeometry(sz,10,8),
      new THREE.MeshStandardMaterial({color:col,roughness:0.8}));
    grp.add(m);
    const op=[]; for(let k=0;k<=48;k++){const a=k/48*2*Math.PI;op.push(new THREE.Vector3(Math.cos(a)*R,Math.sin(a)*R,0));}
    grp.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(op),
      new THREE.LineBasicMaterial({color:col,transparent:true,opacity:0.22})));
    satMoons.push({mesh:m,R,per});
  }
}
const earthMesh=planetMeshes[EARTH_IDX];
const earthSpin=new THREE.Group();
earthMesh.add(earthSpin);
/* 地球貼圖(程序化簡圖:海洋、陸塊、冰帽、雲),隨 GMST 自轉 */
function makeEarthTexture(){
  const W=512,H=256,c=document.createElement('canvas');c.width=W;c.height=H;
  const ctx=c.getContext('2d');
  const X=lon=>(lon+180)/360*W, Y=lat=>(90-lat)/180*H;
  const og=ctx.createLinearGradient(0,0,0,H);
  og.addColorStop(0,'#25507f');og.addColorStop(.5,'#2c66a6');og.addColorStop(1,'#25507f');
  ctx.fillStyle=og;ctx.fillRect(0,0,W,H);
  function land(pts,fill){
    ctx.beginPath();
    pts.forEach((p,i)=>{const px=X(p[0]),py=Y(p[1]);i?ctx.lineTo(px,py):ctx.moveTo(px,py);});
    ctx.closePath();ctx.fillStyle=fill;ctx.fill();
    ctx.strokeStyle='rgba(15,35,25,.4)';ctx.lineWidth=1.2;ctx.stroke();
  }
  const G='#4d7f44';
  /* 非洲+阿拉伯 */
  land([[-17,15],[0,32],[10,37],[32,31],[35,28],[44,12],[51,12],[59,23],[48,30],[35,36],[43,11],[51,-1],[40,-16],[35,-24],[19,-35],[12,-18],[9,4],[-8,4],[-17,15]],G);
  /* 歐亞 */
  land([[-10,36],[3,43],[10,44],[25,40],[27,41],[41,41],[50,45],[60,55],[90,50],[100,40],[105,22],[109,12],[104,8],[100,14],[98,25],[92,22],[88,22],[78,8],[72,20],[68,24],[60,25],[57,38],[48,42],[36,45],[28,45],[13,46],[3,47],[-9,43],[-10,36]],G);
  land([[-5,50],[10,55],[30,60],[60,68],[100,72],[140,72],[170,66],[178,64],[160,60],[135,55],[128,42],[122,38],[121,30],[110,20],[105,22],[100,40],[90,50],[60,55],[50,45],[41,41],[27,54],[10,54],[-5,50]],G);
  /* 北美 */
  land([[-168,66],[-150,70],[-130,70],[-110,72],[-90,72],[-75,72],[-60,60],[-65,45],[-70,42],[-75,35],[-81,25],[-90,29],[-97,26],[-97,16],[-85,12],[-80,8],[-92,15],[-105,20],[-114,30],[-124,40],[-125,48],[-140,60],[-155,58],[-168,66]],G);
  /* 南美 */
  land([[-80,8],[-70,12],[-62,10],[-52,4],[-42,-4],[-38,-12],[-40,-22],[-50,-28],[-58,-35],[-62,-40],[-66,-48],[-70,-54],[-73,-46],[-72,-32],[-70,-18],[-77,-8],[-80,8]],G);
  /* 澳洲 */
  land([[114,-22],[122,-14],[131,-11],[137,-12],[142,-11],[146,-15],[151,-25],[150,-33],[146,-39],[140,-38],[131,-32],[124,-33],[115,-33],[113,-26],[114,-22]],G);
  /* 格陵蘭 */
  land([[-55,60],[-45,60],[-32,68],[-20,70],[-22,76],[-32,80],[-55,78],[-60,72],[-55,60]],'#dbe3ea');
  /* 冰帽 */
  ctx.fillStyle='#dde7ee';
  ctx.fillRect(0,0,W,Y(80));
  ctx.fillRect(0,Y(-70),W,H-Y(-70));
  /* 雲 */
  ctx.fillStyle='rgba(255,255,255,.12)';
  for(let i=0;i<44;i++){
    const cx=(i*137.5)%W, cy=H*0.15+((i*89.3)%(H*0.7)), r=6+(i*7)%16;
    ctx.beginPath();ctx.ellipse(cx,cy,r*2.2,r*0.65,0,0,2*Math.PI);ctx.fill();
  }
  const tex=new THREE.CanvasTexture(c);
  return tex;
}
earthMesh.material.visible=false; /* 以貼圖球取代素色球 */
const earthGlobe=new THREE.Mesh(new THREE.SphereGeometry(1.5,48,32),
  new THREE.MeshStandardMaterial({map:makeEarthTexture(),roughness:0.85,metalness:0}));
earthSpin.add(earthGlobe);
{
  const ax=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,-4.2,0),new THREE.Vector3(0,4.2,0)]);
  earthMesh.add(new THREE.Line(ax,new THREE.LineBasicMaterial({color:0xE3B34C})));
  const axLbl=mkLbl('L',()=>T('自轉軸','Rotation axis'),'#E3B34C',3.4,false); axLbl.position.set(0,5.6,0); earthMesh.add(axLbl);
  const eqPts=[]; for(let k=0;k<=64;k++){const a=k/64*2*Math.PI;eqPts.push(new THREE.Vector3(Math.cos(a)*2.1,0,Math.sin(a)*2.1));}
  earthMesh.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(eqPts),
    new THREE.LineBasicMaterial({color:0x7fd1e0,transparent:true,opacity:0.7})));
  const merPts=[]; for(let k=0;k<=32;k++){const a=-Math.PI/2+k/32*Math.PI;merPts.push(new THREE.Vector3(Math.cos(a)*1.55,Math.sin(a)*1.55,0));}
  earthSpin.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(merPts),
    new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:0.85})));
  window._obsDot=new THREE.Mesh(new THREE.SphereGeometry(0.16,10,8),new THREE.MeshBasicMaterial({color:0xff5a4d}));
  window._obsDot.position.set(1.55,0,0); earthSpin.add(window._obsDot);
}

const moonMesh=new THREE.Mesh(new THREE.SphereGeometry(0.55,20,14),
  new THREE.MeshBasicMaterial({color:0x5c606c}));
sceneL.add(moonMesh);
/* 月相:亮半球罩(r128 SphereGeometry phiStart0..π 面向 +z),朝向太陽 */
const moonLit=new THREE.Mesh(new THREE.SphereGeometry(0.562,24,16,0,Math.PI),
  new THREE.MeshBasicMaterial({color:0xEDEFF5}));
moonMesh.add(moonLit);
/* 影錐(示意,尺寸誇大):地影錐(月食)與月影錐(日食) */
const UMBRA_LEN=11.5;
const umbraCone=new THREE.Mesh(new THREE.ConeGeometry(1.5,UMBRA_LEN,24,1,true),
  new THREE.MeshBasicMaterial({color:0x7a2a20,transparent:true,opacity:0.16,side:THREE.DoubleSide,depthWrite:false}));
sceneL.add(umbraCone);
const mShadowCone=new THREE.Mesh(new THREE.ConeGeometry(0.55,3.6,20,1,true),
  new THREE.MeshBasicMaterial({color:0x1c2030,transparent:true,opacity:0.32,side:THREE.DoubleSide,depthWrite:false}));
sceneL.add(mShadowCone);
const moonLbl=mkLbl('L',()=>T('月球','Moon'),'#cfd2d8',4,false); moonLbl.position.set(0,2.2,0); moonMesh.add(moonLbl);
function makeSeg(mat){ /* 預配置 2 點線段,之後就地更新(不重建緩衝) */
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(6),3));
  g.setAttribute('lineDistance',new THREE.Float32BufferAttribute(new Float32Array(2),1));
  return new THREE.Line(g,mat);
}
function updateSeg(line,a,b){
  const ap=line.geometry.attributes.position;
  ap.setXYZ(0,a.x,a.y,a.z); ap.setXYZ(1,b.x,b.y,b.z); ap.needsUpdate=true;
  const ld=line.geometry.attributes.lineDistance;
  ld.setX(0,0); ld.setX(1,a.distanceTo(b)); ld.needsUpdate=true;
  line.geometry.computeBoundingSphere();
}
const moonLine=makeSeg(new THREE.LineDashedMaterial({color:0x8B93AD,dashSize:1.2,gapSize:1.2,transparent:true,opacity:0.6}));
sceneL.add(moonLine);
let moonVisR=3.1, umbraHalf=11.5/2, mShadHalf=1.8; /* 月距 3.1:落在金星/火星軌道間隙內 */

const tidalGroup=new THREE.Group(); sceneL.add(tidalGroup); tidalGroup.visible=false;
const tidalArrows=[];
for(let k=0;k<12;k++){
  const a=new THREE.ArrowHelper(new THREE.Vector3(1,0,0),new THREE.Vector3(),3,0x6FC3D6,1.1,0.65);
  tidalGroup.add(a); tidalArrows.push(a);
}
let tidalBulge;
{
  const cur=new THREE.EllipseCurve(0,0,2.6,1.8,0,2*Math.PI);
  const pts=cur.getPoints(72).map(p=>new THREE.Vector3(p.x,0,p.y));
  tidalBulge=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({color:0x6FC3D6,transparent:true,opacity:0.9}));
  tidalGroup.add(tidalBulge);
  const tl=mkLbl('L',()=>T('潮汐隆起(示意)','Tidal bulge'),'#6FC3D6',3.4,false); tl.position.set(0,3.6,0); tidalGroup.add(tl);
}

/* 天球 */
const sphereGroup=new THREE.Group(); sceneL.add(sphereGroup);
let axisLine, poleMark;
{
  const wire=new THREE.Mesh(new THREE.SphereGeometry(SPHERE_R,36,18),
    new THREE.MeshBasicMaterial({color:0x21305A,wireframe:true,transparent:true,opacity:0.11}));
  sphereGroup.add(wire);
  const ecl=[]; for(let k=0;k<=128;k++){const a=k/128*2*Math.PI;ecl.push(new THREE.Vector3(Math.cos(a)*SPHERE_R,0,-Math.sin(a)*SPHERE_R));}
  sphereGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(ecl),
    new THREE.LineBasicMaterial({color:0xE3B34C,transparent:true,opacity:0.5})));
  const eclLbl=mkLbl('L',()=>T('黃道','Ecliptic'),'#E3B34C',5,false);
  eclLbl.position.set(SPHERE_R*0.98,6,0); sphereGroup.add(eclLbl);
  buildConstellations(sphereGroup, SPHERE_R*0.97, v=>eqToEclWorld(v), 7.5, 'L', 1.15, false);
  const pol=eqToEclWorld(eqUnit(37.95*DEG,89.264*DEG)).multiplyScalar(SPHERE_R*0.98);
  const star=makeGlow('rgba(255,255,255,1)','rgba(160,200,255,.5)',10); star.position.copy(pol);
  sphereGroup.add(star); regGlowL(star);
  const pl=mkLbl('L',()=>T('北極星 Polaris','Polaris'),'#ffffff',7,true); pl.position.copy(pol).multiplyScalar(1.05); sphereGroup.add(pl);
  axisLine=makeSeg(new THREE.LineDashedMaterial({color:0xE3B34C,dashSize:3,gapSize:3,transparent:true,opacity:0.5}));
  sphereGroup.add(axisLine);
  /* 歲差圈 */
  const pc=[]; for(let k=0;k<=96;k++){
    const t=k/96*2*Math.PI, se=Math.sin(OBLQ);
    pc.push(eclToWorld({x:se*Math.cos(t),y:se*Math.sin(t),z:Math.cos(OBLQ)}).multiplyScalar(SPHERE_R*0.98));
  }
  const pcl=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pc),
    new THREE.LineDashedMaterial({color:0x6FC3D6,dashSize:2.4,gapSize:2.4,transparent:true,opacity:0.45}));
  pcl.computeLineDistances(); sphereGroup.add(pcl);
  const pcLbl=mkLbl('L',()=>T('歲差圈 ~25,800 年','Precession circle ~25,800 yr'),'#6FC3D6',5,false);
  pcLbl.position.copy(pc[24]).multiplyScalar(1.06); sphereGroup.add(pcLbl);
  poleMark=new THREE.Mesh(new THREE.SphereGeometry(1.1,10,8),
    new THREE.MeshBasicMaterial({color:0xE3B34C}));
  sphereGroup.add(poleMark);
  const sp=[]; for(let k=0;k<420;k++){
    const u=Math.random()*2-1, t=Math.random()*2*Math.PI, s=Math.sqrt(1-u*u);
    sp.push(s*Math.cos(t)*SPHERE_R*0.995, u*SPHERE_R*0.995, s*Math.sin(t)*SPHERE_R*0.995);
  }
  const sg=new THREE.BufferGeometry();
  sg.setAttribute('position',new THREE.Float32BufferAttribute(sp,3));
  sphereGroup.add(new THREE.Points(sg,new THREE.PointsMaterial({color:0xaab6d8,size:1.2,sizeAttenuation:false,transparent:true,opacity:0.6})));
}

/* 黃道十二宮區塊(回歸黃道:固定於當代春分點,隨歲差相對恆星移動) */
const signBelt=new THREE.Group(); sceneL.add(signBelt);
signBelt.visible=false; /* 預設關閉 */
{
  const R=SPHERE_R*0.965, B=10*DEG;
  /* 各宮傳統色:牡羊紅、金牛綠、雙子黃、巨蟹銀、獅子金、處女大地色、
     天秤淺藍、天蠍黑、射手紫、摩羯深灰、水瓶水藍、雙魚海綠 */
  const SIGN_COL=[0xE0483C,0x4CAF6D,0xEFD35C,0xC9CFD8,0xE3B34C,0xA9805B,
                  0x9CC7E8,0x15151D,0x9A6BD0,0x5A5F6A,0x5BC8E8,0x3FA98E];
  const SIGN_OP =[0.20,0.20,0.20,0.22,0.22,0.22,0.20,0.55,0.22,0.30,0.20,0.20];
  const GLYPH_CSS=['#E0483C','#4CAF6D','#EFD35C','#C9CFD8','#E3B34C','#A9805B',
                   '#9CC7E8','#8F8F9C','#9A6BD0','#A6ACB8','#5BC8E8','#3FA98E'];
  const glyphs=['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
  for(let k=0;k<12;k++){
    const verts=[], idx=[], N=10;
    for(let j=0;j<=N;j++){
      const lam=(30*k + 30*j/N)*DEG;
      for(const b of [-B,B]){
        const cb=Math.cos(b);
        verts.push(cb*Math.cos(lam)*R, Math.sin(b)*R, -cb*Math.sin(lam)*R);
      }
    }
    for(let j=0;j<N;j++){
      const o=j*2;
      idx.push(o,o+1,o+2, o+1,o+3,o+2);
    }
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
    g.setIndex(idx);
    signBelt.add(new THREE.Mesh(g,new THREE.MeshBasicMaterial({
      color:SIGN_COL[k],transparent:true,opacity:SIGN_OP[k],side:THREE.DoubleSide,depthWrite:false})));
    const bp=[];
    for(let j=0;j<=8;j++){
      const b=-12*DEG + j/8*24*DEG, lam=30*k*DEG, cb=Math.cos(b);
      bp.push(new THREE.Vector3(cb*Math.cos(lam)*R, Math.sin(b)*R, -cb*Math.sin(lam)*R));
    }
    signBelt.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(bp),
      new THREE.LineBasicMaterial({color:0xE3B34C,transparent:true,opacity:0.35})));
    const lam=(30*k+15)*DEG, cb=Math.cos(13*DEG);
    const g2=glyphs[k];
    const lbl=mkLbl('L',()=>g2,GLYPH_CSS[k],9,true);
    lbl.position.set(cb*Math.cos(lam)*R, -Math.sin(13*DEG)*R, -cb*Math.sin(lam)*R);
    signBelt.add(lbl);
  }
}

/* ══════════════════════════════════════════════════════════
   5. 右視窗:地平視角
   ══════════════════════════════════════════════════════════ */
const paneR=document.getElementById('paneR');
const rendR=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true}); /* 殘影管線需保留繪圖緩衝 */
rendR.setPixelRatio(Math.min(devicePixelRatio,2));
paneR.appendChild(rendR.domElement);
const sceneR=new THREE.Scene();
sceneR.add(new THREE.AmbientLight(0xffffff,0.38));
const sunDirLight=new THREE.DirectionalLight(0xfff3d8,1.25);
sunDirLight.position.set(0,1,0);
sceneR.add(sunDirLight); sceneR.add(sunDirLight.target);
const BASE_FOV=65;
const camR=new THREE.PerspectiveCamera(BASE_FOV,1,0.1,600);
camR.position.set(0,2,0);
const ctrlR=new LookDrag(rendR.domElement,camR,BASE_FOV);
ctrlR.setFov(93.4); /* 預設視野 0.6×(tan 焦距比) */
ctrlR.yaw=Math.PI/2; ctrlR.pitch=0.35; ctrlR.apply(); /* 開場面向正東 */
const DOME=100;

const horizonGroup=new THREE.Group(); sceneR.add(horizonGroup);
let hideHorizon=false;
{
  const ground=new THREE.Mesh(new THREE.CircleGeometry(DOME*1.4,64),
    new THREE.MeshBasicMaterial({color:0x131A2E,transparent:true,opacity:0.82,side:THREE.DoubleSide,depthWrite:false}));
  ground.rotation.x=-Math.PI/2; ground.renderOrder=1; horizonGroup.add(ground);
  const hor=[]; for(let k=0;k<=128;k++){const a=k/128*2*Math.PI;hor.push(new THREE.Vector3(Math.cos(a)*DOME,0,Math.sin(a)*DOME));}
  horizonGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(hor),
    new THREE.LineBasicMaterial({color:0xE3B34C})));
  const horLbl=mkLbl('R',()=>T('地平線','Horizon'),'#E3B34C',3.4,false); horLbl.position.set(DOME*0.72,1.8,DOME*0.55); horizonGroup.add(horLbl);
  const gmat=new THREE.LineBasicMaterial({color:0x25335E,transparent:true,opacity:0.55});
  [30,60].forEach(alt=>{
    const r=DOME*Math.cos(alt*DEG), h=DOME*Math.sin(alt*DEG), pts=[];
    for(let k=0;k<=96;k++){const a=k/96*2*Math.PI;pts.push(new THREE.Vector3(Math.cos(a)*r,h,Math.sin(a)*r));}
    horizonGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),gmat));
  });
  for(let az=0;az<360;az+=30){
    const pts=[], ca=Math.sin(az*DEG), sa=-Math.cos(az*DEG);
    for(let k=0;k<=24;k++){const al=k/24*Math.PI/2;
      pts.push(new THREE.Vector3(ca*DOME*Math.cos(al), DOME*Math.sin(al), sa*DOME*Math.cos(al)));}
    horizonGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),gmat));
  }
  const dirs=[[['北','N'],0,-1],[['東','E'],1,0],[['南','S'],0,1],[['西','W'],-1,0]];
  dirs.forEach(d=>{
    const l=mkLbl('R',()=>T(d[0][0],d[0][1]),'#EDE7D8',6,true);
    l.position.set(d[1]*DOME*0.93,4,d[2]*DOME*0.93); horizonGroup.add(l);
  });
}

const skyGroup=new THREE.Group(); skyGroup.matrixAutoUpdate=false; sceneR.add(skyGroup);
const starFrameR=new THREE.Group(); skyGroup.add(starFrameR); /* 恆星層:隨歲差旋轉 */
const constGroupR=new THREE.Group(); starFrameR.add(constGroupR);
const ECL_POLE_EQ=new THREE.Vector3(0,-Math.sin(OBLQ),Math.cos(OBLQ));
let starsR, eclLineR, eqLineR, showEclLines=false; /* 參考線預設關閉 */
{
  const eqp=[]; for(let k=0;k<=128;k++){const a=k/128*2*Math.PI;eqp.push(eqUnit(a,0).multiplyScalar(DOME*0.97));}
  eqLineR=new THREE.Line(new THREE.BufferGeometry().setFromPoints(eqp),
    new THREE.LineBasicMaterial({color:0x6FC3D6,transparent:true,opacity:0.28}));
  eqLineR.visible=false;
  skyGroup.add(eqLineR);
  window._eqLbl=mkLbl('R',()=>T('天球赤道','Celestial equator'),'#6FC3D6',3.6,false);
  window._eqLbl.position.copy(eqUnit(100*DEG,0)).multiplyScalar(DOME*0.97);
  window._eqLbl.visible=false;
  skyGroup.add(window._eqLbl);
  const ecp=[];
  for(let k=0;k<=180;k++){
    const lam=k/180*2*Math.PI;
    const e=eclToEq({x:Math.cos(lam),y:Math.sin(lam),z:0});
    ecp.push(new THREE.Vector3(e.x,e.y,e.z).multiplyScalar(DOME*0.97));
  }
  eclLineR=new THREE.Line(new THREE.BufferGeometry().setFromPoints(ecp),
    new THREE.LineBasicMaterial({color:0xE3B34C,transparent:true,opacity:0.5}));
  eclLineR.visible=false;
  skyGroup.add(eclLineR);
  window._eclLbl=mkLbl('R',()=>T('黃道','Ecliptic'),'#E3B34C',3.6,false);
  {const e2=eclToEq({x:Math.cos(70*DEG),y:Math.sin(70*DEG),z:0});
   window._eclLbl.position.set(e2.x,e2.y,e2.z).multiplyScalar(DOME*0.97);}
  window._eclLbl.visible=false;
  skyGroup.add(window._eclLbl);
  buildConstellations(constGroupR, DOME*0.95, v=>v.clone(), 4.4, 'R', 1, true);
  const pol=eqUnit(37.95*DEG,89.264*DEG).multiplyScalar(DOME*0.96);
  const star=makeGlow('rgba(255,255,255,1)','rgba(160,200,255,.5)',7); star.position.copy(pol);
  starFrameR.add(star); regGlowR(star);
  const pl=mkLbl('R',()=>T('北極星','Polaris'),'#ffffff',4.2,true); pl.position.copy(pol).multiplyScalar(0.94); pl.position.y-=4; starFrameR.add(pl);
  const sp=[]; for(let k=0;k<500;k++){
    const u=Math.random()*2-1,t=Math.random()*2*Math.PI,s=Math.sqrt(1-u*u);
    sp.push(s*Math.cos(t)*DOME*0.985,s*Math.sin(t)*DOME*0.985,u*DOME*0.985);
  }
  const sg=new THREE.BufferGeometry();
  sg.setAttribute('position',new THREE.Float32BufferAttribute(sp,3));
  starsR=new THREE.Points(sg,new THREE.PointsMaterial({color:0xbcc7e6,size:1.3,sizeAttenuation:false,transparent:true,opacity:0.8}));
  starsR.visible=true; /* 背景星空預設開啟 */
  starFrameR.add(starsR);
}

const skyBodies=[];
function addSkyBody(key,getText,colorCss,dotR,glow,boldLbl){
  const grp=new THREE.Group(); skyGroup.add(grp);
  /* 行星用受光材質(向陽面亮、背陽面暗,呈現光影質感);太陽自發光 */
  const col=new THREE.Color(colorCss);
  const mat=key==='sun'
    ? new THREE.MeshBasicMaterial({color:col,transparent:true})
    : new THREE.MeshStandardMaterial({color:col,roughness:0.55,metalness:0.05,
        emissive:col.clone().multiplyScalar(0.16),transparent:true});
  const dot=new THREE.Mesh(new THREE.SphereGeometry(dotR,18,14),mat);
  grp.add(dot);
  /* 光暈為天體本身的物理泛光:隨場景縮放,不做視角補償
     (舊版補償導致放大後光暈縮進日盤內、太陽看起來不亮的 bug) */
  if(glow){const g=makeGlow(glow[0],glow[1],glow[2]);grp.add(g);}
  const lbl=mkLbl('R',getText,colorCss,4.2,boldLbl);
  lbl.position.set(0,dotR+3.2,0); grp.add(lbl);
  skyBodies.push({key,grp,mat,lbl});
}
addSkyBody('sun',()=>T('太陽','Sun'),'#ffd75e',2.6,['rgba(255,240,180,1)','rgba(255,190,80,.5)',16],true);
/* 日食日冕環(右視窗,日食時顯示) */
const coronaSprite=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture([245,242,235],true),
  transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));
coronaSprite.scale.set(13,13,1); coronaSprite.visible=false;
skyBodies[0].grp.add(coronaSprite); /* 日冕貼著日盤,不做視角補償 */
addSkyBody('moon',()=>T('月亮','Moon'),'#dfe3ea',2.0,['rgba(240,244,255,.9)','rgba(150,170,220,.35)',9],true);
/* 月相盤:繪製受照面(亮面永遠朝向太陽在天空中的方向) */
const moonBody=skyBodies.find(b=>b.key==='moon');
moonBody.grp.remove(moonBody.grp.children[0]); /* 移除純色圓點 */
function drawPhase(elDeg){
  const c=document.createElement('canvas'); c.width=c.height=96;
  const ctx=c.getContext('2d'), R=44, cx=48, cy=48;
  ctx.fillStyle='#3b3f4c';
  ctx.beginPath(); ctx.arc(cx,cy,R,0,2*Math.PI); ctx.fill();
  const el=Math.max(0.5,Math.min(179.5,elDeg));
  ctx.fillStyle='#EDEFF5';
  ctx.beginPath(); ctx.arc(cx,cy,R,-Math.PI/2,Math.PI/2,false); ctx.fill(); /* 亮半圓在 +x(朝日側) */
  const k=Math.abs(Math.cos(el*DEG))*R;
  ctx.fillStyle= el<90? '#3b3f4c' : '#EDEFF5'; /* 眉月遮回暗、凸月補亮 */
  ctx.beginPath(); ctx.ellipse(cx,cy,k,R,0,0,2*Math.PI); ctx.fill();
  ctx.strokeStyle='rgba(237,239,245,.5)'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.arc(cx,cy,R,0,2*Math.PI); ctx.stroke();
  const tex=new THREE.CanvasTexture(c); tex.minFilter=THREE.LinearFilter;
  return tex;
}
const moonSprite=new THREE.Sprite(new THREE.SpriteMaterial({map:drawPhase(90),transparent:true,depthWrite:false}));
moonSprite.scale.set(4.6,4.6,1);
moonBody.grp.add(moonSprite);
moonBody.mat=moonSprite.material; /* 沿用地平線下調暗邏輯 */
let phaseBucket=-1;
const phaseTexCache=new Map(); /* 月相貼圖快取:重播時零配置、零上傳 */
for(let i=0;i<ELEM.length;i++){
  if(i===EARTH_IDX)continue;
  addSkyBody(i,()=>pname(i),'#'+ELEM[i].color.toString(16).padStart(6,'0'),1.1,null,false);
}

/* 白道:月球軌道面在天球上的路徑(對黃道傾約 5.1°,交點 18.6 年退行一圈) */
let moonPathLine=null, moonPathEpoch=NaN;
const moonPathLbl=mkLbl('R',()=>T('白道','Lunar orbit'),'#c9cfdd',3.6,false);
moonPathLbl.visible=false;
skyGroup.add(moonPathLbl);
function buildMoonPath(ms){
  if(moonPathLine){skyGroup.remove(moonPathLine);moonPathLine.geometry.dispose();moonPathLine.material.dispose();}
  const psi0=psiDeg(ms)*DEG, pts=[];
  for(let k=0;k<=88;k++){
    const t=ms+((k/88)-0.5)*27.55*86400000; /* 近一個近點月 */
    const g=eclToEq(rotEclZ(moonGeo(centuries(t)),psi0));
    const v=new THREE.Vector3(g.x,g.y,g.z).normalize().multiplyScalar(DOME*0.92);
    if(isFinite(v.x+v.y+v.z))pts.push(v); /* NaN 防護 */
  }
  moonPathLine=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineDashedMaterial({color:0xc9cfdd,dashSize:1.1,gapSize:1.3,transparent:true,opacity:0.42}));
  moonPathLine.computeLineDistances();
  moonPathLine.visible=showEclLines;
  skyGroup.add(moonPathLine);
  moonPathLbl.position.copy(pts[8]).multiplyScalar(1.04);
  moonPathEpoch=ms;
}

/* 逆行軌跡(預設水星) */
let trailPast=null, trailFuture=null, trailMarks=[];
let trailEpoch=NaN, trailPlanet=0;
const TRAIL_WIN={0:70,1:150,3:220,4:280,5:300,6:330,7:330,8:360};
function rebuildTrail(ms){
  [trailPast,trailFuture,...trailMarks].forEach(o=>{if(o){skyGroup.remove(o);o.geometry.dispose();o.material.dispose();}});
  trailMarks=[];
  const W=TRAIL_WIN[trailPlanet], step=W/110;
  const psi0=psiDeg(ms)*DEG;
  const past=[],future=[];
  for(let dd=-W;dd<=W;dd+=step){
    const T2=centuries(ms+dd*86400000);
    const g=eclToEq(rotEclZ(geoEcl(trailPlanet,T2),psi0));
    const v=new THREE.Vector3(g.x,g.y,g.z).normalize().multiplyScalar(DOME*0.9);
    if(isFinite(v.x+v.y+v.z))(dd<=0?past:future).push(v); /* NaN 防護 */
  }
  if(past.length) future.unshift(past[past.length-1].clone());
  const col=ELEM[trailPlanet].color;
  trailPast=new THREE.Line(new THREE.BufferGeometry().setFromPoints(past),
    new THREE.LineBasicMaterial({color:col,transparent:true,opacity:0.95}));
  trailFuture=new THREE.Line(new THREE.BufferGeometry().setFromPoints(future),
    new THREE.LineDashedMaterial({color:col,dashSize:1.4,gapSize:1.1,transparent:true,opacity:0.65}));
  trailFuture.computeLineDistances();
  skyGroup.add(trailPast); skyGroup.add(trailFuture);
  for(let dd=-W;dd<=W;dd+=30){
    const T2=centuries(ms+dd*86400000);
    const g=eclToEq(rotEclZ(geoEcl(trailPlanet,T2),psi0));
    const v=new THREE.Vector3(g.x,g.y,g.z).normalize().multiplyScalar(DOME*0.9);
    const m=new THREE.Mesh(new THREE.SphereGeometry(0.45,8,6),
      new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:0.8}));
    m.position.copy(v); skyGroup.add(m); trailMarks.push(m);
  }
  trailEpoch=ms;
  trailPast.visible=trailFuture.visible=showTrail;
  trailMarks.forEach(m=>m.visible=showTrail);
}

/* ══════════════════════════════════════════════════════════
   6. 逆行偵測、通知與年度時刻表
   ══════════════════════════════════════════════════════════ */
const toastsEl=document.getElementById('toasts');
function toast(msg,isRetro){
  const d=document.createElement('div');
  d.className='toast '+(isRetro?'retro':'pro');
  d.textContent=msg;
  toastsEl.appendChild(d);
  while(toastsEl.children.length>4)toastsEl.firstChild.remove();
  setTimeout(()=>{d.style.opacity='0';d.style.transition='opacity .4s';setTimeout(()=>d.remove(),420);},5500);
}
const retroState=new Array(ELEM.length).fill(null);
/* 日月食偵測(真實幾何,非畫面示意尺寸;受低精度月球理論限制,
   時刻誤差可達 ~1 小時,邊緣性偏食判定僅供參考) */
let eclipseState=null;
const eclipseChip=document.getElementById('eclipseChip');
function eclipseCheck(ms){
  const T3=centuries(ms);
  const m=moonGeo(T3), su=geoEcl('sun',T3);
  const md=Math.hypot(m.x,m.y,m.z), sd=Math.hypot(su.x,su.y,su.z);
  const mh={x:m.x/md,y:m.y/md,z:m.z/md}, sh={x:su.x/sd,y:su.y/sd,z:su.z/sd};
  const dot=mh.x*sh.x+mh.y*sh.y+mh.z*sh.z;
  const distKm=m.distKm;
  const rm=Math.atan(1737.4/distKm);              /* 月角半徑 */
  const par=Math.asin(6378/distKm);               /* 月地平視差 */
  /* 月食:月心與反日點角距 vs 地影錐半徑(~4650km@月距) */
  const sigL=Math.acos(Math.max(-1,Math.min(1,-dot)));
  const u=1.02*(par-0.00465+0.0000426); /* Danjon 地影半徑 */
  if(sigL<u-rm)return 'lunarT';
  if(sigL<u+rm)return 'lunarP';
  /* 日食:日月角距 < 月半徑+日半徑+視差 → 地表某處可見 */
  const sigS=Math.acos(Math.max(-1,Math.min(1,dot)));
  if(sigS<rm+0.00465+par)return 'solar';
  return null;
}
const ECL_STR={
  lunarT:['🌕 月全食進行中(血月)','🌕 Total lunar eclipse (blood moon)'],
  lunarP:['🌗 月偏食進行中','🌗 Partial lunar eclipse'],
  solar:['🌑 日食(地表某處可見)','🌑 Solar eclipse (visible somewhere on Earth)']
};
function updateEclipse(){
  const st=eclipseCheck(simMs);
  if(st!==eclipseState){
    if(st&&playing)toast(ECL_STR[st][lang==='zh'?0:1]+' · '+fmtDate(simMs),st!=='solar');
    eclipseState=st;
    eclipseChip.style.display=st?'block':'none';
    if(st)eclipseChip.textContent=ECL_STR[st][lang==='zh'?0:1];
    moonMesh.material.color.setHex(st==='lunarT'?0xB0452F:0x5c606c); /* 血月 */
    moonLit.material.color.setHex(st==='lunarT'?0xC96A50:0xEDEFF5);
    /* 月食:地影錐轉紅增亮;日食:月影錐轉近黑實體 + 右視窗日冕環 */
    const lun=st==='lunarT'||st==='lunarP';
    umbraCone.material.color.setHex(lun?0xE04830:0x7a2a20);
    umbraCone.material.opacity=lun?0.34:0.16;
    mShadowCone.material.color.setHex(st==='solar'?0x05070D:0x1c2030);
    mShadowCone.material.opacity=st==='solar'?0.85:0.32;
    coronaSprite.visible=(st==='solar');
  }
}
function fmtDate(ms){const d=new Date(ms);return `${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())}`;}
function checkRetroFlips(){
  for(let i=0;i<ELEM.length;i++){
    if(i===EARTH_IDX)continue;
    const r=retroRate(i,simMs)<0;
    if(retroState[i]===null){retroState[i]=r;continue;}
    if(r!==retroState[i]){
      retroState[i]=r;
      if(playing){
        const msg=lang==='zh'
          ? `☍ ${pname(i)}${r?' 開始逆行':' 結束逆行,恢復順行'} · ${fmtDate(simMs)}`
          : `☍ ${pname(i)} ${r?'entered retrograde':'resumed prograde motion'} · ${fmtDate(simMs)}`;
        toast(msg,r);
      }
    }
  }
}
function refineFlip(i,a,b){
  const ra=retroRate(i,a);
  for(let k=0;k<24;k++){
    const m=(a+b)/2;
    if(ra*retroRate(i,m)<=0)b=m; else a=m;
  }
  return (a+b)/2;
}
function retroIntervals(year){
  const out=[];
  const t0=Date.UTC(year,0,1), t1=Date.UTC(year+1,0,1), step=86400000;
  for(let i=0;i<ELEM.length;i++){
    if(i===EARTH_IDX)continue;
    const iv=[];
    let prev=retroRate(i,t0)<0;
    let start=prev? {ms:t0,open:true} : null;
    for(let t=t0+step;t<=t1;t+=step){
      const r=retroRate(i,t)<0;
      if(!prev&&r) start={ms:refineFlip(i,t-step,t),open:false};
      if(prev&&!r&&start){ iv.push({s:start,e:{ms:refineFlip(i,t-step,t),open:false}}); start=null; }
      prev=r;
    }
    if(start) iv.push({s:start,e:{ms:t1,open:true}});
    out.push({i,iv});
  }
  return out;
}
const modalBg=document.getElementById('modalBg');
const yLbl=document.getElementById('yLbl');
const rowsEl=document.getElementById('retroRows');
let tableYear=new Date().getFullYear();
function renderRetroTable(){
  yLbl.textContent=tableYear;
  rowsEl.innerHTML='';
  const data=retroIntervals(tableYear);
  for(const rec of data){
    const name=pname(rec.i);
    if(rec.iv.length===0){
      rowsEl.insertAdjacentHTML('beforeend',
        `<tr class="none"><td class="pname">${name}</td><td colspan="3">${T('本年無逆行','No retrograde this year')}</td></tr>`);
      continue;
    }
    rec.iv.forEach((v,k)=>{
      const sTxt=v.s.open? T(`${tableYear-1} 年起`,`since ${tableYear-1}`) : fmtDate(v.s.ms);
      const eTxt=v.e.open? T(`持續至 ${tableYear+1} 年`,`into ${tableYear+1}`) : fmtDate(v.e.ms);
      const dur=Math.round((v.e.ms-v.s.ms)/86400000);
      rowsEl.insertAdjacentHTML('beforeend',
        `<tr><td class="pname">${k===0?name:''}</td><td>${sTxt}</td><td>${eTxt}</td><td><span class="dur">${dur} ${T('天','days')}</span></td></tr>`);
    });
  }
}
document.getElementById('retroTableBtn').addEventListener('click',()=>{
  tableYear=new Date(simMs).getFullYear();
  renderRetroTable();
  modalBg.classList.add('open');
});
document.getElementById('mClose').addEventListener('click',()=>modalBg.classList.remove('open'));
modalBg.addEventListener('click',e=>{if(e.target===modalBg)modalBg.classList.remove('open');});
document.getElementById('yPrev').addEventListener('click',()=>{tableYear--;renderRetroTable();});
document.getElementById('yNext').addEventListener('click',()=>{tableYear++;renderRetroTable();});

/* ══════════════════════════════════════════════════════════
   7. 語系切換
   ══════════════════════════════════════════════════════════ */
const UI_STR={
  uiTime:['時刻','Time'], uiSpeed:['速度','Speed'], uiLat:['緯度','Lat'], uiLon:['經度','Lon'],
  nowBtn:['現在','Now'],
  retroTableBtn:['☍ 逆行時刻表','☍ Retrograde Table'],
  chipL:['日心視角 · SOLAR SYSTEM','HELIOCENTRIC · SOLAR SYSTEM'],
  chipR:['地平視角 · SKY VIEW','HORIZON · SKY VIEW'],
  uiTidal:['月球潮汐力示意','Lunar tidal forces'],
  uiSphere:['天球與星座','Celestial sphere & constellations'],
  uiSign:['十二宮區塊(隨歲差)','Zodiac sign sectors (precessing)'],
  uiOrbit:['軌道線','Orbit lines'],
  uiTrail:['逆行軌跡','Retrograde trail'], uiShow:['顯示','Show'],
  uiConst:['星座圖形','Constellation figures'],
  uiBgStar:['背景星空','Background stars'],
  uiTrack:['軸置中','Axis lock'],
  uiInv:['反向拖曳','Invert drag'],
  uiHideHor:['隱藏地平線','Hide horizon'],
  uiTrailFx:['運動殘影(星軌)','Motion trails (star arcs)'],
  homeBtn:['⌂ 回到原點','⌂ Reset view'],
  uiObserve:['觀察','Observe'],
  uiLock:['鎖定','Lock'],
  uiDay:['日夜背景變化','Day–night background'],
  uiText:['文字標籤','Text labels'],
  uiEclLine:['黃道/白道/天球赤道線','Ecliptic / lunar / equator lines'],
  uiPhase:['月相與影錐','Moon phase & shadows'],
  uiScale:['正確比例(距離線性)','True scale (linear distances)'],
  uiFootTime:['模擬時刻','Sim time'], uiFootLoc:['觀測地','Observer'],
  uiHint:['拖曳旋轉 · 滾輪/雙指縮放 · 逆行軌跡:實線=過去 虛線=未來',
          'Drag to rotate · wheel / pinch to zoom · trail: solid = past, dashed = future'],
  uiModalTitle:['☍ 行星逆行時刻表','☍ Planetary Retrogrades'],
  thP:['行星','Planet'], thS:['開始逆行','Starts'], thE:['恢復順行','Ends'], thD:['期間','Duration']
};
const TRACK_STR=[['無置中','No axis'],['黃道軸・日出','Ecliptic · Sunrise'],['黃道軸・日沒','Ecliptic · Sunset'],
  ['白道軸・月出','Lunar orbit · Moonrise'],['白道軸・月沒','Lunar orbit · Moonset']];
const LOCK_STR=[['無鎖定','No lock'],['太陽','Sun'],['月亮','Moon']];
const SPEED_STR=[
  ['1 小時 / 秒','1 hr / s'],['2 小時 / 秒','2 hr / s'],['6 小時 / 秒','6 hr / s'],
  ['1 天 / 秒','1 day / s'],['3 天 / 秒','3 days / s'],['10 天 / 秒','10 days / s'],
  ['◀ 倒轉 1 天 / 秒','◀ Reverse 1 day / s']
];
function applyLang(){
  const k=lang==='zh'?0:1;
  for(const id in UI_STR){
    const el=document.getElementById(id);
    if(el)el.textContent=UI_STR[id][k];
  }
  const sp=document.getElementById('speed');
  [...sp.options].forEach((o,i)=>o.textContent=SPEED_STR[i][k]);
  const ts=document.getElementById('trackSel');
  [...ts.options].forEach((o,i)=>o.textContent=TRACK_STR[i][k]);
  [...obsSel.options].forEach(o=>{
    if(o.value==='none')o.textContent='—';
    else if(o.value==='sun')o.textContent=T('太陽','Sun');
    else if(o.value==='moon')o.textContent=T('月球','Moon');
    else o.textContent=pname(+o.value.slice(1));
  });
  const ls=document.getElementById('lockSel');
  [...ls.options].forEach((o,i)=>{
    if(i<LOCK_STR.length)o.textContent=LOCK_STR[i][k];
    else{const nm=o.value.slice(2);o.textContent=lang==='zh'? nm.slice(0,3):ZODIAC[nm].en;}
  });
  const rs=document.getElementById('retroSel');
  [...rs.options].forEach(o=>{o.textContent=lang==='zh'?ELEM[+o.value].name:ELEM[+o.value].en;});
  playBtn.textContent=playing? T('⏸ 暫停','⏸ Pause') : T('▶ 播放','▶ Play');
  if(eclipseState)eclipseChip.textContent=ECL_STR[eclipseState][lang==='zh'?0:1];
  lunarCd=NaN; /* 重算農曆顯示語言 */
  relabelAll();
  if(modalBg.classList.contains('open'))renderRetroTable();
}
document.getElementById('langSel').addEventListener('change',e=>{
  lang=e.target.value;
  applyLang();
});

/* ══════════════════════════════════════════════════════════
   8. 時間、UI 與主迴圈
   ══════════════════════════════════════════════════════════ */
let simMs=Date.now(), playing=false;
let showTrail=true, dayNight=true;
const dtInput=document.getElementById('dt');
const playBtn=document.getElementById('playBtn');
const speedSel=document.getElementById('speed');
const latIn=document.getElementById('lat'), lonIn=document.getElementById('lon');
const timeRead=document.getElementById('timeReadout'), jdRead=document.getElementById('jdReadout');
const locRead=document.getElementById('locReadout');
const retroStat=document.getElementById('retroStatus');
const zoomChip=document.getElementById('zoomChip');

function pad(n){return String(n).padStart(2,'0');}
function setDtInput(ms){
  const d=new Date(ms);
  dtInput.value=`${String(d.getFullYear()).padStart(4,'0')}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
setDtInput(simMs);
dtInput.addEventListener('change',()=>{const v=new Date(dtInput.value);if(!isNaN(v)){simMs=v.getTime();}});
document.getElementById('nowBtn').addEventListener('click',()=>{simMs=Date.now();setDtInput(simMs);});
playBtn.addEventListener('click',()=>{playing=!playing;playBtn.textContent=playing?T('⏸ 暫停','⏸ Pause'):T('▶ 播放','▶ Play');});
document.getElementById('tidalChk').addEventListener('change',e=>tidalGroup.visible=e.target.checked);
document.getElementById('phaseChk').addEventListener('change',e=>{
  moonLit.visible=umbraCone.visible=mShadowCone.visible=e.target.checked;
});
document.getElementById('textChk').addEventListener('change',e=>{
  for(const L of labelsR){ if(L.getText) L.sp.visible=e.target.checked; }
});
document.getElementById('sphereChk').addEventListener('change',e=>sphereGroup.visible=e.target.checked);
document.getElementById('signChk').addEventListener('change',e=>signBelt.visible=e.target.checked);
document.getElementById('orbitChk').addEventListener('change',e=>orbitGroup.visible=e.target.checked);
const camStateN={r:CAM_REF,theta:0.55,phi:1.05,tx:0,ty:0,tz:0};
const camStateT={r:2200,theta:0.55,phi:1.05,tx:0,ty:0,tz:0};
function saveCam(st){st.r=ctrlL.r;st.theta=ctrlL.theta;st.phi=ctrlL.phi;
  st.tx=ctrlL.target.x;st.ty=ctrlL.target.y;st.tz=ctrlL.target.z;}
function loadCam(st){ctrlL.r=Math.max(ctrlL.min,Math.min(ctrlL.max,st.r));
  ctrlL.theta=st.theta;ctrlL.phi=st.phi;ctrlL.target.set(st.tx,st.ty,st.tz);ctrlL.apply();}
document.getElementById('scaleChk').addEventListener('change',e=>{
  saveCam(trueScale?camStateT:camStateN); /* 保存離開模式的視角 */
  trueScale=e.target.checked;
  applyScaleMode();                        /* 還原進入模式的視角(互不影響) */
});
document.getElementById('constChk').addEventListener('change',e=>constGroupR.visible=e.target.checked);
document.getElementById('bgStarChk').addEventListener('change',e=>starsR.visible=e.target.checked);
/* 運動殘影選項:僅速度 ≥1 天/秒時顯示;開啟時強制並鎖定
   日夜背景=關、參考線=關、文字標籤=關、隱藏地平線=開(避免文字殘影) */
const trailFxChk=document.getElementById('trailFxChk');
const trailFxRow=document.getElementById('trailFxRow');
const dayChkEl=document.getElementById('dayChk');
const eclLineChkEl=document.getElementById('eclLineChk');
const textChkEl=document.getElementById('textChk');
const hideHorChkEl=document.getElementById('hideHorChk');
function setChk(el,v){ if(el.checked!==v){ el.checked=v; el.dispatchEvent(new Event('change')); } }
function toggleTrailFx(on){
  trailFxOn=on;
  const locked=[dayChkEl,eclLineChkEl,textChkEl,hideHorChkEl];
  if(on){
    trailFxSaved={day:dayChkEl.checked,ecl:eclLineChkEl.checked,text:textChkEl.checked,hor:hideHorChkEl.checked};
    setChk(dayChkEl,false); setChk(eclLineChkEl,false); setChk(textChkEl,false); setChk(hideHorChkEl,true);
    locked.forEach(el=>el.disabled=true);
  }else{
    locked.forEach(el=>el.disabled=false);
    if(trailFxSaved){
      setChk(dayChkEl,trailFxSaved.day); setChk(eclLineChkEl,trailFxSaved.ecl);
      setChk(textChkEl,trailFxSaved.text); setChk(hideHorChkEl,trailFxSaved.hor);
      trailFxSaved=null;
    }
    needTrailClear=true;
  }
}
trailFxChk.addEventListener('change',e=>toggleTrailFx(e.target.checked));
function updateTrailFxRow(){
  const hs=Math.abs(+speedSel.value)>=86400000;
  trailFxRow.style.display=hs?'':'none';
  if(!hs&&trailFxOn){ trailFxChk.checked=false; toggleTrailFx(false); }
}
speedSel.addEventListener('change',updateTrailFxRow);
document.getElementById('hideHorChk').addEventListener('change',e=>{
  hideHorizon=e.target.checked;
  horizonGroup.visible=!hideHorizon;
});
document.getElementById('eclLineChk').addEventListener('change',e=>{
  showEclLines=e.target.checked;
  eclLineR.visible=showEclLines;
  eqLineR.visible=showEclLines;
  window._eqLbl.visible=showEclLines;
  window._eclLbl.visible=showEclLines;
  if(moonPathLine)moonPathLine.visible=showEclLines;
  moonPathLbl.visible=showEclLines;
});
/* 星座質心(J2000 赤道單位向量)供鎖定用;動態加入下拉選項 */
const CONST_CENTROIDS={};
{
  const ls0=document.getElementById('lockSel');
  for(const name in ZODIAC){
    const cen=new THREE.Vector3();
    ZODIAC[name].s.forEach(st=>cen.add(eqUnit(st[0]*DEG,st[1]*DEG)));
    CONST_CENTROIDS[name]=cen.normalize();
    const o=document.createElement('option');
    o.value='c:'+name; o.textContent=name.slice(0,3);
    ls0.appendChild(o);
  }
}
const trackSelEl=document.getElementById('trackSel');
const lockSelEl=document.getElementById('lockSel');
function applyTrack(){
  /* 軸置中(黃道/白道 × 東/西)與鎖定可並用 */
  trackMode=trackSelEl.value;
  lockMode=lockSelEl.value;
  if(trackMode==='off'&&lockMode==='none'){ camR.up.set(0,1,0); ctrlR.syncFromCamera(); }
}
applyTrack();
trackSelEl.addEventListener('change',applyTrack);
lockSelEl.addEventListener('change',applyTrack);
document.getElementById('invChk').addEventListener('change',e=>invDrag=e.target.checked);
document.getElementById('dayChk').addEventListener('change',e=>dayNight=e.target.checked);
document.getElementById('retroSel').addEventListener('change',e=>{trailPlanet=+e.target.value;rebuildTrail(simMs);});
document.getElementById('trailChk').addEventListener('change',e=>{
  showTrail=e.target.checked;
  if(trailPast){trailPast.visible=trailFuture.visible=showTrail;trailMarks.forEach(m=>m.visible=showTrail);}
});
latIn.addEventListener('change',updateLoc); lonIn.addEventListener('change',updateLoc);
function updateLoc(){
  const la=+latIn.value, lo=+lonIn.value;
  locRead.textContent=`${Math.abs(la).toFixed(2)}°${la>=0?'N':'S'} ${Math.abs(lo).toFixed(2)}°${lo>=0?'E':'W'}`;
  /* 紅點=觀測者經緯度(earthSpin 依 GMST 自轉 → 該點赤經 = GMST+λ,正確對應) */
  const laR=la*DEG, loR=lo*DEG;
  window._obsDot.position.set(1.55*Math.cos(laR)*Math.cos(loR), 1.55*Math.sin(laR), -1.55*Math.cos(laR)*Math.sin(loR));
}

const lunarRead=document.getElementById('lunarRead');
let lunarCd=NaN;
const skyMat4=new THREE.Matrix4();
const bgNight=new THREE.Color(0x060912), bgDay=new THREE.Color(0x2E4E86);
const bgCur=new THREE.Color(0x060912);
sceneR.background=bgCur;
/* 運動殘影(高速播放):以半透明底色淡出前幀取代清屏,
   周日旋轉在畫面上化為連續的「長曝星軌」——快而平滑,而非頻閃 */
const fadeScene=new THREE.Scene();
const fadeCam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
const fadeMat=new THREE.MeshBasicMaterial({color:0x060912,transparent:true,opacity:0.3,depthTest:false,depthWrite:false});
fadeScene.add(new THREE.Mesh(new THREE.PlaneBufferGeometry(2,2),fadeMat));
let trailsPrev=false, needTrailClear=true;
let trailFxOn=false, trailFxSaved=null;
const sunWorld=new THREE.Vector3(), moonWorld=new THREE.Vector3();
const camFwdR=new THREE.Vector3(), tmpVR=new THREE.Vector3();
const camRgt=new THREE.Vector3(), camUpv=new THREE.Vector3();
const mhatV=new THREE.Vector3(), qV=new THREE.Vector3();

let lastReal=performance.now(), uiTick=0, flyHeld=0;
let lstAnchorOn=false, lstAnchorKey='', lstH0=0; /* 錨定恆星時狀態 */
function animate(now){
  requestAnimationFrame(animate);
  const dt=Math.min(0.1,(now-lastReal)/1000); lastReal=now;
  if(playing){ simMs+=(+speedSel.value)*dt; }
  if(trueScale&&(moveKeys.w||moveKeys.s||moveKeys.a||moveKeys.d)){
    flyHeld+=dt;
    const boost=1+Math.min(6,flyHeld*2.2); /* 長按持續加速,最多 7 倍 */
    ctrlL.move((moveKeys.w?1:0)-(moveKeys.s?1:0),(moveKeys.d?1:0)-(moveKeys.a?1:0),dt,boost);
    if(observeIdx!=='none'){observeIdx='none';obsSel.value='none';} /* 手動飛行即脫離跟隨 */
  }else flyHeld=0;
  const nearL=Math.min(0.1,Math.max(0.0008,ctrlL.r*0.02));
  if(Math.abs(camL.near-nearL)>nearL*0.2){ camL.near=nearL; camL.updateProjectionMatrix(); }

  const T2=centuries(simMs);
  const psi=psiDeg(simMs)*DEG;
  /* ── 左 ── */
  const heliosW=[];
  for(let i=0;i<ELEM.length;i++){
    const w=mapR(eclToWorld(helio(i,T2)));
    planetMeshes[i].position.copy(w);
    heliosW.push(w);
  }
  /* 地軸隨歲差進動 */
  const lamP=Math.PI/2 - psi, se=Math.sin(OBLQ);
  const axisW=eclToWorld({x:se*Math.cos(lamP), y:se*Math.sin(lamP), z:Math.cos(OBLQ)});
  earthMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),axisW);
  poleMark.position.copy(axisW).multiplyScalar(SPHERE_R*0.98);
  signBelt.rotation.y=-psi;
  earthSpin.rotation.y=gmstDeg(simMs)*DEG;
  /* 衛星公轉(週期與順/逆行方向真實) */
  {
    const dNow=days(simMs);
    for(const sm of satMoons){
      const a=2*Math.PI*(dNow/sm.per);
      sm.mesh.position.set(Math.cos(a)*sm.R,Math.sin(a)*sm.R,0);
    }
  }
  if(trueScale){
    const arr=markerPts.geometry.attributes.position.array;
    for(let i=0;i<ELEM.length;i++){arr[i*3]=heliosW[i].x;arr[i*3+1]=heliosW[i].y;arr[i*3+2]=heliosW[i].z;}
    /* 月球標記在月球更新後寫入(見下方) */
    markerPts.geometry.attributes.position.needsUpdate=true;
  }
  const mg=moonGeo(T2);
  const mdir=eclToWorld(mg).normalize();
  const ew=heliosW[EARTH_IDX];
  moonMesh.position.copy(ew).addScaledVector(mdir,moonVisR);
  if(trueScale){
    const arr=markerPts.geometry.attributes.position.array, o=ELEM.length*3;
    arr[o]=moonMesh.position.x;arr[o+1]=moonMesh.position.y;arr[o+2]=moonMesh.position.z;
  }
  /* 觀察跟隨:樞紐點鎖在所選天體上,隨其公轉移動 */
  if(trueScale&&observeIdx!=='none'){
    if(observeIdx==='sun')ctrlL.target.set(0,0,0);
    else if(observeIdx==='moon')ctrlL.target.copy(moonMesh.position);
    else ctrlL.target.copy(planetMeshes[+observeIdx.slice(1)].position);
    ctrlL.apply();
  }
  /* 月相亮半球朝向太陽(太陽在原點) */
  if(moonLit.visible){
    const toSun=moonMesh.position.clone().negate().normalize();
    moonLit.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),toSun);
  }
  /* 影錐:地影錐沿反日方向、月影錐沿日→月延伸 */
  if(umbraCone.visible){
    const ewn=ew.clone().normalize(); /* 反日方向 */
    umbraCone.position.copy(ew).addScaledVector(ewn,umbraHalf);
    umbraCone.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),ewn);
    const mn=moonMesh.position.clone().normalize();
    mShadowCone.position.copy(moonMesh.position).addScaledVector(mn,mShadHalf);
    mShadowCone.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),mn);
  }
  updateSeg(moonLine,ew,moonMesh.position);
  updateSeg(axisLine,ew.clone().divideScalar(sphereScale), axisW.clone().multiplyScalar(SPHERE_R*0.98));
  if(tidalGroup.visible){
    tidalGroup.position.copy(ew);
    const u=mdir.clone(); u.y=0; u.normalize();
    const wv=new THREE.Vector3(-u.z,0,u.x);
    for(let k=0;k<12;k++){
      const th=k/12*2*Math.PI;
      const p=u.clone().multiplyScalar(Math.cos(th)).addScaledVector(wv,Math.sin(th));
      const acc=u.clone().multiplyScalar(3*Math.cos(th)).sub(p).normalize();
      const mag=Math.sqrt(1+3*Math.cos(th)*Math.cos(th));
      tidalArrows[k].position.copy(p).multiplyScalar(2.2);
      tidalArrows[k].setDirection(acc);
      tidalArrows[k].setLength(1.4+1.5*mag/2,0.9,0.5);
    }
    tidalBulge.quaternion.setFromUnitVectors(new THREE.Vector3(1,0,0),u);
  }
  for(const L of labelsL){
    L.sp.getWorldPosition(sunWorld); /* 借用暫存向量 */
    let f=Math.max(0.005,Math.min(250,sunWorld.distanceTo(camL.position)/CAM_REF));
    L.sp.parent.getWorldScale(tmpVR);       /* 抵銷母體(行星)縮放 */
    f/=Math.max(1e-6,tmpVR.x);
    L.sp.scale.set(L.base.x*f,L.base.y*f,1);
  }

  /* ── 右 ── */
  /* 滑順優先的抖動修復:高速播放(≥1 天/秒)且鎖定/置中時,
     周日旋轉(360°/日)的取樣混疊會造成頻閃。捨棄逐日跳格,
     改用「錨定恆星時」:LST 跟隨錨定天體(日/月/星座)的赤經,
     加上進入當下凍結的時角差 H0——錨定目標的周日位置連續固定,
     其餘天體以真實逐日速率平滑流動,任何速度下皆為 60fps 連續動畫。 */
  const TR=T2, psiR=psi, mgR=mg;
  starFrameR.quaternion.setFromAxisAngle(ECL_POLE_EQ, psiR);
  const phi=(+latIn.value||0)*DEG;
  const trueLstDeg=wrap360(gmstDeg(simMs)+(+lonIn.value||0));
  let lstDeg=trueLstDeg;
  const anchorActive = playing && Math.abs(+speedSel.value)>=86400000
        && (lockMode!=='none'||trackMode!=='off');
  if(anchorActive){
    let aKey;
    if(lockMode==='sun') aKey='sun';
    else if(lockMode==='moon') aKey='moon';
    else if(lockMode!=='none') aKey=lockMode;                 /* 鎖定星座 */
    else aKey=trackMode.startsWith('lun')? 'moon' : 'sun';    /* 純軸置中 */
    let raDeg;
    if(aKey==='sun'){
      const e=eclToEq(rotEclZ(geoEcl('sun',TR),psiR));
      raDeg=wrap360(Math.atan2(e.y,e.x)/DEG);
    }else if(aKey==='moon'){
      const e=eclToEq(rotEclZ(mgR,psiR));
      raDeg=wrap360(Math.atan2(e.y,e.x)/DEG);
    }else{
      const c=tmpVR.copy(CONST_CENTROIDS[aKey.slice(2)]).applyQuaternion(starFrameR.quaternion);
      raDeg=wrap360(Math.atan2(c.y,c.x)/DEG);
    }
    if(!lstAnchorOn||lstAnchorKey!==aKey){ /* 進入(或換錨)當下無縫接軌 */
      lstAnchorOn=true; lstAnchorKey=aKey;
      lstH0=wrap360(trueLstDeg-raDeg);
    }
    lstDeg=wrap360(raDeg+lstH0);
  }else{ lstAnchorOn=false; }
  const lst=lstDeg*DEG;
  const sL=Math.sin(lst),cL=Math.cos(lst),sP=Math.sin(phi),cP=Math.cos(phi);
  skyMat4.set(
    -sL,     cL,     0,   0,
    cL*cP,   sL*cP,  sP,  0,
    cL*sP,   sL*sP, -cP,  0,
    0,0,0,1);
  skyGroup.matrix.copy(skyMat4);

  let sunAlt=-1;
  for(const b of skyBodies){
    let g;
    if(b.key==='sun')g=geoEcl('sun',TR);
    else if(b.key==='moon')g=mgR;
    else g=geoEcl(b.key,TR);
    const e=eclToEq(rotEclZ(g,psiR));
    const v=new THREE.Vector3(e.x,e.y,e.z).normalize().multiplyScalar(DOME*0.9);
    b.grp.position.copy(v);
    v.applyMatrix4(skyMat4);
    const below=!hideHorizon && v.y<0;
    b.mat.opacity=below?0.22:1;
    b.lbl.material.opacity=below?0.28:1;
    if(b.key==='sun'){ sunAlt=v.y/(DOME*0.9); sunWorld.copy(v); }
    if(b.key==='moon'){ moonWorld.copy(v); }
  }
  /* 月相更新與亮面朝向 */
  {
    const el=Math.abs(wrap180(mgR.lon - geoLon('sun',TR)));
    const bk=Math.round(el/2);
    if(bk!==phaseBucket){
      phaseBucket=bk;
      let tex=phaseTexCache.get(bk);
      if(!tex){ tex=drawPhase(el); phaseTexCache.set(bk,tex); }
      moonSprite.material.map=tex;
      moonSprite.material.needsUpdate=true;
    }
  }
  sunDirLight.position.copy(sunWorld); /* 行星光影朝向太陽 */
  /* 置中滾轉軸:依選項取黃道北極或白道(月球軌道面)法向 */
  const axisPoleW=()=>{
    if(trackMode.startsWith('lun')){
      const m2g=moonGeo(TR+3/36525);
      const nEcl=new THREE.Vector3(mgR.x,mgR.y,mgR.z)
        .cross(new THREE.Vector3(m2g.x,m2g.y,m2g.z)).normalize();
      const ne=eclToEq(rotEclZ({x:nEcl.x,y:nEcl.y,z:nEcl.z},psiR));
      return new THREE.Vector3(ne.x,ne.y,ne.z).applyMatrix4(skyMat4);
    }
    return ECL_POLE_EQ.clone().applyMatrix4(skyMat4);
  };
  if(lockMode!=='none'){
    let tgt;
    if(lockMode==='sun')tgt=sunWorld;
    else if(lockMode==='moon')tgt=moonWorld;
    else{ /* 鎖定星座:質心 → 歲差 → 地平座標 */
      tgt=tmpVR.copy(CONST_CENTROIDS[lockMode.slice(2)])
        .applyQuaternion(starFrameR.quaternion).applyMatrix4(skyMat4).multiplyScalar(DOME*0.9);
    }
    if(tgt.lengthSq()>1e-6){
      /* 以相機位置為原點瞄準天體世界座標:目標嚴格位於畫面正中央 */
      const aim=(tgt===tmpVR? tmpVR : tmpVR.copy(tgt)).sub(camR.position).normalize();
      if(trackMode!=='off'){
        /* 鎖定 + 置中:目標居中,滾轉使所選軌道面(黃道或白道)保持畫面縱向 */
        const up=new THREE.Vector3().crossVectors(axisPoleW(),aim);
        if(up.lengthSq()>1e-8){
          camR.up.copy(up.normalize());
          camR.lookAt(camR.position.x+aim.x, camR.position.y+aim.y, camR.position.z+aim.z);
        }
      }else{
        /* 純鎖定(無滾轉) */
        camR.up.set(0,1,0);
        ctrlR.pitch=Math.asin(Math.max(-1,Math.min(1,aim.y)));
        ctrlR.yaw=Math.atan2(aim.x,-aim.z);
        ctrlR.apply();
      }
    }
  }else if(trackMode!=='off'){
    /* 軸置中(無鎖定):視線沿所選軌道面自地平交點往上偏 trackOffset(垂直拖曳調整) */
    const nW=axisPoleW();
    let d=new THREE.Vector3(-nW.z,0,nW.x);
    if(d.lengthSq()>1e-6){
      d.normalize();
      const east=trackMode.endsWith('_e');
      if(east? d.x<0 : d.x>0) d.negate();
      const tRaw=new THREE.Vector3().crossVectors(nW,d).normalize();
      const sgn=tRaw.y>=0? 1 : -1;
      const co=Math.cos(trackOffset), si=Math.sin(trackOffset);
      const aim=d.clone().multiplyScalar(co).addScaledVector(tRaw,sgn*si);
      const up =d.clone().multiplyScalar(-si).addScaledVector(tRaw,sgn*co);
      camR.up.copy(up.normalize());
      camR.lookAt(camR.position.x+aim.x, camR.position.y+aim.y, camR.position.z+aim.z);
    }
  }
  const dayF=dayNight? Math.max(0,Math.min(1,(sunAlt+0.05)*4)) : 0;
  bgCur.copy(bgNight).lerp(bgDay,dayF);
  starsR.material.opacity=0.85*(1-dayF*0.92);
  /* 依視角補償(焦距比)+ 邊緣反補償:抵銷超廣角時直線透視在
     畫面外圈的放大(cos^1.6,留一點放大感但不誇張) */
  const fovF=Math.tan(camR.fov/2*DEG)/Math.tan(BASE_FOV/2*DEG);
  camR.updateMatrixWorld();
  camR.getWorldDirection(camFwdR);
  /* 月相亮緣方位角:以 3D 方向計算(太陽方向對月球方向的垂直分量,
     投影到相機的螢幕基底),不受太陽位於相機背後的投影翻轉影響 */
  {
    const eM=camR.matrixWorld.elements;
    camRgt.set(eM[0],eM[1],eM[2]); camUpv.set(eM[4],eM[5],eM[6]);
    mhatV.copy(moonWorld).normalize();
    qV.copy(sunWorld).normalize();
    qV.addScaledVector(mhatV,-qV.dot(mhatV)); /* 垂直於月球視線方向的太陽分量 */
    if(qV.lengthSq()>1e-8){
      moonSprite.material.rotation=Math.atan2(qV.dot(camUpv),qV.dot(camRgt));
    }
  }
  for(const L of labelsR){
    L.sp.getWorldPosition(tmpVR);
    tmpVR.sub(camR.position).normalize();
    const c=Math.max(0.12,Math.min(1,tmpVR.dot(camFwdR)));
    const f=fovF*Math.pow(c,1.6);
    L.sp.scale.set(L.base.x*f,L.base.y*f,1);
  }
  zoomChip.textContent=T('視野 ','FOV ')+ctrlR.zoom.toFixed(1)+'×';

  if(showTrail&&(isNaN(trailEpoch)||Math.abs(simMs-trailEpoch)>TRAIL_WIN[trailPlanet]*0.25*86400000)){
    rebuildTrail(simMs);
  }
  if(isNaN(moonPathEpoch)||Math.abs(simMs-moonPathEpoch)>5*86400000){
    buildMoonPath(simMs);
  }
  uiTick+=dt;
  if(uiTick>0.25){
    uiTick=0;
    checkRetroFlips();
    updateEclipse();
    const retro=retroState[trailPlanet];
    retroStat.textContent=pname(trailPlanet)+(retro?T(' ◀ 逆行中',' ◀ Retrograde'):T(' ▶ 順行中',' ▶ Prograde'));
    retroStat.className=retro?'retro':'pro';
    const d=new Date(simMs);
    timeRead.textContent=`${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    jdRead.textContent=julianDay(simMs).toFixed(3);
    const cdNow=civilDay(simMs);
    if(cdNow!==lunarCd){ lunarCd=cdNow; lunarRead.textContent=formatLunar(simMs,lang); }
    if(playing&&document.activeElement!==dtInput)setDtInput(simMs);
  }

  rendL.render(sceneL,camL);
  /* 右視窗:高速時走殘影管線,否則正常清屏渲染 */
  const trailsActive = playing && trailFxOn && Math.abs(+speedSel.value)>=86400000;
  if(trailsActive!==trailsPrev){ trailsPrev=trailsActive; needTrailClear=true; }
  if(trailsActive){
    sceneR.background=null;
    const spd=Math.abs(+speedSel.value)/86400000;
    fadeMat.color.copy(bgCur);
    fadeMat.opacity=Math.max(0.10, 0.40/spd); /* 越快殘影越長 */
    rendR.autoClearColor=false;
    if(needTrailClear){ rendR.setClearColor(bgCur,1); rendR.clear(true,true,false); needTrailClear=false; }
    rendR.render(fadeScene,fadeCam);
    rendR.clearDepth();
    rendR.render(sceneR,camR);
  }else{
    rendR.autoClearColor=true;
    sceneR.background=bgCur;
    rendR.render(sceneR,camR);
  }
}

function resize(){
  [[paneL,rendL,camL],[paneR,rendR,camR]].forEach(([pane,r,cam])=>{
    const w=pane.clientWidth,h=pane.clientHeight;
    if(w===0||h===0)return;
    r.setSize(w,h,false);
    cam.aspect=w/h; cam.updateProjectionMatrix();
  });
}
/* 觀察星球:相機樞紐點跟隨所選天體(拖曳/縮放仍可自由調整) */
let observeIdx='none';
const obsSel=document.getElementById('obsSel');
{
  const addOpt=(v,t)=>{const o=document.createElement('option');o.value=v;o.textContent=t;obsSel.appendChild(o);};
  addOpt('sun','太陽');
  for(let i=0;i<ELEM.length;i++)addOpt('p'+i,ELEM[i].name);
  addOpt('moon','月球');
}
function observeBodyRadius(v){
  const k=K_TRUE/AU_KM;
  if(v==='sun')return 696000*k;
  if(v==='moon')return 1737.4*k;
  return TRUE_KM[+v.slice(1)]*k;
}
obsSel.addEventListener('change',()=>{
  observeIdx=obsSel.value;
  if(observeIdx!=='none'){
    ctrlL.r=Math.max(ctrlL.min,observeBodyRadius(observeIdx)*10); /* 進到 10 倍半徑的特寫距離 */
  }
});
document.getElementById('homeBtn').addEventListener('click',()=>{
  observeIdx='none'; obsSel.value='none';
  ctrlL.target.set(0,0,0); ctrlL.r=2200; ctrlL.theta=0.55; ctrlL.phi=1.05; ctrlL.apply();
});

/* 自由飛行輸入:鍵盤 WASD 與螢幕按鍵(按住移動) */
const moveKeys={w:false,a:false,s:false,d:false};
window.addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();
  if(k in moveKeys && !/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)){moveKeys[k]=true;e.preventDefault();}
});
window.addEventListener('keyup',e=>{const k=e.key.toLowerCase();if(k in moveKeys)moveKeys[k]=false;});
window.addEventListener('blur',()=>{for(const k in moveKeys)moveKeys[k]=false;});
document.querySelectorAll('#flyPad button').forEach(b=>{
  const k=b.dataset.k;
  b.addEventListener('pointerdown',e=>{e.preventDefault();moveKeys[k]=true;b.setPointerCapture(e.pointerId);});
  const off=()=>moveKeys[k]=false;
  b.addEventListener('pointerup',off);b.addEventListener('pointercancel',off);
});
/* 彩蛋:標題懸停(或長按)1.69 秒後浮現作者 */
{
  const bt=document.getElementById('brandTitle');
  const tag=document.getElementById('authorTag');
  let tmr=null;
  const arm=()=>{clearTimeout(tmr);tmr=setTimeout(()=>tag.classList.add('show'),1690);};
  const disarm=()=>{clearTimeout(tmr);tag.classList.remove('show');};
  bt.addEventListener('pointerenter',arm);
  bt.addEventListener('pointerdown',arm);
  bt.addEventListener('pointerleave',disarm);
  bt.addEventListener('pointerup',()=>{ /* 觸控:放開後若已顯示則保留 3 秒 */
    if(tag.classList.contains('show'))setTimeout(disarm,3000); else disarm();
  });
}
window.addEventListener('resize',()=>{needTrailClear=true;});
window.addEventListener('resize',resize);
/* 點擊視角標籤展開/收合選項面板;小螢幕預設收合以免遮擋畫面 */
document.getElementById('chipL').addEventListener('click',()=>paneL.classList.toggle('panelHidden'));
document.getElementById('chipR').addEventListener('click',()=>paneR.classList.toggle('panelHidden'));
if(window.innerWidth<=860||window.innerHeight<=520){paneL.classList.add('panelHidden');paneR.classList.add('panelHidden');}
resize(); setTimeout(resize,50);
rebuildTrail(simMs);
updateLoc();
updateTrailFxRow();
requestAnimationFrame(animate);

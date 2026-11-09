export function uid(){if(globalThis.crypto?.randomUUID)return crypto.randomUUID();const bytes=new Uint8Array(16);if(globalThis.crypto?.getRandomValues)crypto.getRandomValues(bytes);else for(let i=0;i<bytes.length;i++)bytes[i]=Math.floor(Math.random()*256);return Date.now().toString(36)+'-'+Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join('');}
export const categories=['全部','飯類','麵類','鍋物','日韓','西式','其他'];
export function category(cuisine=''){
 if(/hotpot|hot_pot|shabu/i.test(cuisine))return '鍋物';
 if(/japanese|korean|sushi|ramen|udon/i.test(cuisine))return '日韓';
 if(/burger|pizza|italian|american|steak|western|pasta/i.test(cuisine))return '西式';
 if(/noodle|麵|米粉|粄條|餛飩/i.test(cuisine))return '麵類';
 if(/rice|bento|飯|便當|自助餐/i.test(cuisine))return '飯類';
 return '其他';
}
export function dayKey(time=Date.now()){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(time));}
export function distance(a,b){if(!a||!b||![a.lat,a.lon,b.lat,b.lon].every(Number.isFinite))return null;const r=x=>x*Math.PI/180;const dLat=r(b.lat-a.lat),dLon=r(b.lon-a.lon);return 6371000*2*Math.atan2(Math.sqrt(Math.sin(dLat/2)**2+Math.cos(r(a.lat))*Math.cos(r(b.lat))*Math.sin(dLon/2)**2),Math.sqrt(1-(Math.sin(dLat/2)**2+Math.cos(r(a.lat))*Math.cos(r(b.lat))*Math.sin(dLon/2)**2)));}
export function validPoint(p){return p&&Number.isFinite(p.lat)&&Number.isFinite(p.lon)&&Math.abs(p.lat)<=90&&Math.abs(p.lon)<=180;}
export function placeKey(p){return p.id||p.name.trim().toLowerCase()+'|'+(p.address||'').trim();}
export function normalizeName(s){return String(s||'').toLowerCase().replace(/[\s\-—()（）]/g,'');}
export function samePlace(a,b){return a.id===b.id||normalizeName(a.name)===normalizeName(b.name)&&((distance(a,b)??Infinity)<100||a.address&&a.address===b.address);}
export function overpassPlaces(data){
 if(!Array.isArray(data?.elements)||data.remark)throw Error(data?.remark?'店家服務未完成查詢，請稍後再試。':'店家資料格式不正確。');
 const places=[];
 for(const el of data.elements){const t=el.tags||{},p=el.center||el;
 if(!t.name||!validPoint(p))continue;
 const address=t['addr:full']||[t['addr:city'],t['addr:district']||t['addr:suburb'],t['addr:street'],t['addr:housenumber']?t['addr:housenumber']+'號':''].filter(Boolean).join('');
 const v={id:`osm:${el.type}:${el.id}`,name:t['name:zh']||t.name,lat:p.lat,lon:p.lon,address,category:category((t.cuisine||'')+' '+t.name),cuisine:t.cuisine||'',price:null,openingHours:t.opening_hours||'',menu:'',source:'osm',osmUrl:`https://www.openstreetmap.org/${el.type}/${el.id}`};
 if(!places.some(x=>samePlace(x,v)))places.push(v);
 }return places;
}
export function nextPool(history,mode='alternate'){if(mode==='familiar'||mode==='new')return mode;const last=[...history].sort((a,b)=>b.at-a.at)[0];return last?.pool==='new'?'familiar':'new';}
export function knownClosedDay(place,now=Date.now()){
 const text=String(place.openingHours||'').replace(/星期/g,'週').replace(/周/g,'週').replace(/\s/g,'');
 // Alternating weeks and conditional holidays cannot be resolved reliably.
 if(/隔週|隔周|不定期|國定/.test(text))return false;
 const weekday=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Taipei',weekday:'short'}).format(new Date(now));
 const day={Mon:'一',Tue:'二',Wed:'三',Thu:'四',Fri:'五',Sat:'六',Sun:'日'}[weekday];
 return new RegExp('(?:每)?週'+(day==='日'?'[日天]':day)+'(?:固定)?[：:]?(?:公休|店休|休息)').test(text);
}
export function chooseDinner({familiar,discovered,history,settings,sessionExcluded=[],excludedCategories=[],now=Date.now(),random=Math.random}){
 const preferred=nextPool(history,settings.mode),recent=history.filter(h=>now-h.at<settings.excludeDays*86400000&&h.at<=now);
 const fam=familiar.map(p=>({...p,pool:'familiar'}));
 const fresh=discovered.filter(p=>!familiar.some(f=>samePlace(f,p))&&!history.some(h=>samePlace(h.place,p))).map(p=>({...p,pool:'new'}));
 const base=[...fam,...fresh].filter(p=>!knownClosedDay(p,now)&&!sessionExcluded.includes(p.id)&&!excludedCategories.includes(p.category)&&(!settings.category||settings.category==='全部'||p.category===settings.category)&&!(settings.avoidIds||[]).includes(p.id));
 const budgetMatches=p=>!settings.budget||settings.budget==='any'||p.price==null&&settings.includeUnknownPrice||Number.isFinite(p.price)&&p.price<=Number(settings.budget);
 const inRange=p=>{const d=distance(settings.location,p);return d===null?p.pool==='familiar':d<=settings.radius};
 const matches=base.filter(p=>budgetMatches(p)&&inRange(p)&&(settings.mode!=='new'&&settings.mode!=='familiar'||p.pool===settings.mode));
 const available=matches.filter(p=>!recent.some(h=>samePlace(h.place,p)));
 let eligible=available,relaxed=false;
 // Relax only the recent-meal rule, and disclose it. Budget, category, radius
 // and explicit dislikes always remain enforced.
 if(!eligible.length&&matches.length&&settings.allowRepeat){eligible=matches;relaxed=true;}
 if(settings.mode==='new'||settings.mode==='familiar')eligible=eligible.filter(p=>p.pool===settings.mode);
 const preferredChoices=eligible.filter(p=>p.pool===preferred),fallback=eligible.filter(p=>p.pool!==preferred);
 const rank=list=>list.map(p=>({p,score:random()+Math.min(1,(distance(settings.location,p)??settings.radius)/settings.radius)*0.18})).sort((a,b)=>a.score-b.score).map(x=>x.p);
 const result=[...rank(preferredChoices),...rank(fallback)].slice(0,3);
 return {places:result,preferred,usedFallback:!!result.length&&result[0].pool!==preferred,relaxed,remaining:eligible.length};
}
export function mapsUrl(place,mode='search'){
 if(mode==='directions'&&validPoint(place))return 'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(place.lat+','+place.lon);
 return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent([place.name,place.address||validPoint(place)&&`${place.lat},${place.lon}`||''].filter(Boolean).join(' '));
}
export function cleanPlace(raw){if(!raw||typeof raw.name!=='string'||!raw.name.trim())throw Error('收藏缺少店名');const str=(x,max)=>String(x||'').slice(0,max);const p={id:str(raw.id||uid(),100),name:str(raw.name.trim(),100),address:str(raw.address,200),category:categories.includes(raw.category)&&raw.category!=='全部'?raw.category:'其他',menu:str(raw.menu,500),price:raw.price!==''&&raw.price!=null&&Number.isFinite(Number(raw.price))&&Number(raw.price)>0?Number(raw.price):null,source:['osm','tycg'].includes(raw.source)?raw.source:'manual',openingHours:str(raw.openingHours,200),cuisine:str(raw.cuisine,100)};if(validPoint(raw)){p.lat=raw.lat;p.lon=raw.lon}if(raw.source==='osm'&&/^https:\/\/www\.openstreetmap\.org\/(node|way|relation)\/\d+$/.test(raw.osmUrl||''))p.osmUrl=raw.osmUrl;if(raw.source==='tycg'&&/^https:\/\/travel\.tycg\.gov\.tw\/zh-tw\/consume\/detail\/\d+$/.test(raw.sourceUrl||''))p.sourceUrl=raw.sourceUrl;if(raw.snapshotDate)p.snapshotDate=str(raw.snapshotDate,30);return p;}
export function parseBackup(raw){if(raw?.app!=='dinner-pick'||raw.version!==1||!Array.isArray(raw.familiar)||!Array.isArray(raw.history)||raw.familiar.length>3000||raw.history.length>30000)throw Error('不是支援的晚餐備份');const familiar=raw.familiar.map(cleanPlace);const history=raw.history.map(h=>{if(!Number.isFinite(h.at)||h.at<0||h.at>Date.now()+86400000)throw Error('備份日期不正確');return {id:String(h.id||uid()),at:h.at,pool:h.pool==='new'?'new':'familiar',place:cleanPlace(h.place)}});return {familiar,history};}

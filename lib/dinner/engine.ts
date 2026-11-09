export const categories = ["飯／便當", "麵食", "日式", "鍋物", "義式", "速食", "鍋貼水餃", "韓式", "蔬食", "其他"] as const;
export type Category = typeof categories[number];
export type Period = { days: number[]; start: string; end: string };
export type Restaurant = { id: string; name: string; category: Category; address: string; area: string; priceMin: number | null; priceMax: number | null; priceNote: string; description: string; hours: Period[] | null; hoursText: string; source: string; verified: string; phone?: string; lat?: number; lng?: number };
export type Visit = { id: string; restaurantId: string; name: string; category: string; at: string; wasFamiliar: boolean };
export type Preferences = { familiar: string[]; hidden: string[]; visits: Visit[]; custom: Restaurant[]; overrides: Record<string, Restaurant> };
export type Filters = { min: number; max: number; categories: string[]; area: string; openOnly: boolean; avoidDays: number; mode: "mix" | "familiar" | "new"; maxKm: number; includeUnknownDistance: boolean; position: { lat: number; lng: number } | null };
export const defaultFilters: Filters = { min: 0, max: 350, categories: [], area: "全部", openOnly: false, avoidDays: 3, mode: "mix", maxKm: 0, includeUnknownDistance: true, position: null };
export const emptyPreferences: Preferences = { familiar: [], hidden: [], visits: [], custom: [], overrides: {} };
const minutes = (s: string) => { const [h,m] = s.split(":").map(Number); return h*60+m; };
export function taipeiParts(date: Date) { const d=new Date(date.getTime()+8*3600000); return { day:d.getUTCDay(), minute:d.getUTCHours()*60+d.getUTCMinutes() }; }
export function opening(r:Restaurant,now:Date):{state:"open"|"closed"|"unknown";label:string;detail:string} {
  if(!r.hours) return {state:"unknown",label:"營業時間未知",detail:"出發前請查詢店家"};
  const {day,minute}=taipeiParts(now);
  for(const p of r.hours) {const a=minutes(p.start),b=minutes(p.end);const active=a===b?p.days.includes(day):a<b?p.days.includes(day)&&minute>=a&&minute<b:(p.days.includes(day)&&minute>=a)||(p.days.includes((day+6)%7)&&minute<b);if(active)return {state:"open",label:"營業中",detail:a===b?"24 小時 · 依公告時段":`${p.end} 結束營業 · 依公告時段`};}
  const later=r.hours.filter(p=>p.days.includes(day)&&minutes(p.start)>minute).sort((a,b)=>minutes(a.start)-minutes(b.start))[0];
  return {state:"closed",label:"目前未營業",detail:later?`今天 ${later.start} 開始營業`:"今日時段已結束或公休"};
}
export function distance(r:Restaurant,p:Filters["position"]):number|null {if(!p||r.lat==null||r.lng==null)return null;const rad=(n:number)=>n*Math.PI/180;const a=Math.sin(rad(r.lat-p.lat)/2)**2+Math.cos(rad(p.lat))*Math.cos(rad(r.lat))*Math.sin(rad(r.lng-p.lng)/2)**2;return 6371*2*Math.atan2(Math.sqrt(a),Math.sqrt(Math.max(0,1-a)));}
export function isFamiliar(id:string,p:Preferences){return p.familiar.includes(id)||p.visits.some(v=>v.restaurantId===id);}
export function eligible(all:Restaurant[],f:Filters,p:Preferences,now:Date):Restaurant[]{return all.filter(r=>{
 if(p.hidden.includes(r.id))return false;
 if(f.categories.length&&!f.categories.includes(r.category))return false;
 if(f.area!=="全部"&&f.area!==r.area)return false;
 if(r.priceMin==null||r.priceMax==null){if(f.min>0||f.max<2000)return false;}else if(r.priceMin>f.max||r.priceMax<f.min)return false;
 if(f.openOnly&&opening(r,now).state!=="open")return false;
 if(f.mode==="familiar"&&!isFamiliar(r.id,p))return false;
 if(f.mode==="new"&&isFamiliar(r.id,p))return false;
 if(f.avoidDays>0&&p.visits.some(v=>v.restaurantId===r.id&&now.getTime()-Date.parse(v.at)>=0&&now.getTime()-Date.parse(v.at)<f.avoidDays*86400000))return false;
 if(f.maxKm>0){const km=distance(r,f.position);if(km===null?!f.includeUnknownDistance:km>f.maxKm)return false;}return true;});}
export function chooseBatch(pool:Restaurant[],seen:string[],p:Preferences,mode:Filters["mode"],random=Math.random):Restaurant[]{
 const items=pool.filter(r=>!seen.includes(r.id));for(let i=items.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[items[i],items[j]]=[items[j],items[i]];}
 if(mode!=="mix")return items.slice(0,3);const wantFamiliar=p.visits[0]?!p.visits[0].wasFamiliar:true;const primary=items.find(r=>isFamiliar(r.id,p)===wantFamiliar)??items[0];if(!primary)return [];
 const rest=items.filter(r=>r.id!==primary.id);rest.sort((a,b)=>Number(a.category===primary.category)-Number(b.category===primary.category));return [primary,...rest.slice(0,2)];
}
export function mapsUrl(r:Restaurant,navigate=false){const q=encodeURIComponent(`${r.name} ${r.address}`);return navigate?`https://www.google.com/maps/dir/?api=1&destination=${q}`:`https://www.google.com/maps/search/?api=1&query=${q}`;}
export function safeUrl(s:string){try{const u=new URL(s);return ["https:","http:"].includes(u.protocol)?u.href:"";}catch{return "";}}
export function validRestaurant(r:unknown):r is Restaurant {if(!r||typeof r!=="object")return false;const v=r as Restaurant;return typeof v.id==="string"&&typeof v.name==="string"&&v.name.length>0&&typeof v.address==="string"&&typeof v.area==="string"&&categories.includes(v.category)&&(v.priceMin===null||(Number.isFinite(v.priceMin)&&v.priceMin>=0))&&(v.priceMax===null||(Number.isFinite(v.priceMax)&&v.priceMax>=(v.priceMin??0)))&&typeof v.priceNote==="string"&&typeof v.description==="string"&&typeof v.hoursText==="string"&&typeof v.source==="string"&&typeof v.verified==="string"&&(v.lat===undefined||(Number.isFinite(v.lat)&&Math.abs(v.lat)<=90))&&(v.lng===undefined||(Number.isFinite(v.lng)&&Math.abs(v.lng)<=180))&&(v.hours===null||(Array.isArray(v.hours)&&v.hours.every(h=>Array.isArray(h.days)&&h.days.every(d=>Number.isInteger(d)&&d>=0&&d<=6)&&/^([01]\d|2[0-3]):[0-5]\d$/.test(h.start)&&/^([01]\d|2[0-3]):[0-5]\d$/.test(h.end))));}
export function readPreferences(input:unknown):Preferences|null {if(!input||typeof input!=="object")return null;const p=input as Preferences;if(![p.familiar,p.hidden].every(a=>Array.isArray(a)&&a.every(id=>typeof id==="string")))return null;if(!Array.isArray(p.visits)||!p.visits.every(v=>v&&typeof v.id==="string"&&typeof v.restaurantId==="string"&&typeof v.name==="string"&&typeof v.category==="string"&&typeof v.wasFamiliar==="boolean"&&typeof v.at==="string"&&Number.isFinite(Date.parse(v.at))))return null;if(!Array.isArray(p.custom)||!p.custom.every(validRestaurant)||!p.overrides||typeof p.overrides!=="object"||!Object.values(p.overrides).every(validRestaurant))return null;return p;}

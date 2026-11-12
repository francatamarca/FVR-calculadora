// Referencia independiente desde el archivo oficial generado, sin tablas históricas.
import {NCM8} from "../src/data/ncm8.js";
import {detectFamily} from "../src/lib/families.js";
const median=values=>{const sorted=[...values].sort((a,b)=>a-b),i=Math.floor(sorted.length/2);return sorted.length%2?sorted[i]:(sorted[i-1]+sorted[i])/2};
export const rateByCode=code=>{
 const digits=String(code).replace(/\D/g,"");
 if(digits.length===8)return NCM8[digits];
 return median(Object.entries(NCM8).filter(([c])=>c.startsWith(digits)).map(([,v])=>v));
};
export const rateByFamily=text=>{
 const family=detectFamily(text);
 return Math.round(median(Object.entries(NCM8).filter(([c])=>family.partidas.some(p=>c.startsWith(p))).map(([,v])=>v))*10)/10;
};

import {classifyCode,toLegacyShape,TARIFF_SOURCE} from '../src/lib/tariffEngine.js';
import {classifyPublicProduct,isProductCode} from '../src/lib/productClassifier.js';
import {NCM8} from '../src/data/ncm8.js';
import {NCM_DESC} from '../src/data/ncmDescriptions.js';
const hits=new Map();
const fmt=c=>c.length===8?`${c.slice(0,4)}.${c.slice(4,6)}.${c.slice(6,8)}`:c;
const send=(res,value)=>res.status(200).json({content:[{text:JSON.stringify({...value,
  baseDate:value.baseDate||TARIFF_SOURCE.date,
  sourceUrl:value.isGeneric?null:(value.sourceUrl||'https://www.afip.gob.ar/aduana/arancelintegrado/'),
  warnings:[...(value.warnings||[]),...((!value.isGeneric&&(Date.now()-Date.parse(TARIFF_SOURCE.date))/86400000>7)?['La base oficial disponible tiene más de 7 días. Su vigencia requiere confirmación.']:[])],
})}]});
export default async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');res.setHeader('Cache-Control','no-store, no-cache, must-revalidate');
  if(req.method==='OPTIONS')return res.status(200).end();if(req.method!=='POST')return res.status(405).end();
  const ip=String(req.headers?.['x-forwarded-for']||'unknown').split(',')[0],now=Date.now(),previous=hits.get(ip);
  const hit=!previous||now-previous.start>600000?{start:now,n:0}:previous;hit.n++;hits.set(ip,hit);if(hits.size>5000)hits.clear();
  if(hit.n>40)return res.status(429).json({error:'Demasiadas consultas seguidas — esperá unos minutos.'});
  const {type}=req.body||{};let {value}=req.body||{};
  if(!['product','hsCode'].includes(type)||typeof value!=='string'||!value.trim())return res.status(400).json({error:'Ingresá una descripción o un código para buscar.'});
  value=value.trim().slice(0,300);
  if(type==='hsCode'){
    const digits=value.replace(/[.\s]/g,'');
    if(!/^(\d{4}|\d{6}|\d{8})$/.test(digits)||digits.startsWith('00'))return send(res,{dutyRate:null,error:'Usá una partida de 4, HS de 6 o NCM de 8 dígitos de productos.',requiresManualValidation:true});
    if(!Object.keys(NCM8).some(c=>isProductCode(c)&&c.startsWith(digits)))return send(res,{dutyRate:null,error:'El código no existe en la base oficial de productos disponible.',requiresManualValidation:true});
    const flat=toLegacyShape(classifyCode(digits));flat.hsCode=fmt(digits);
    if(NCM_DESC[digits]){flat.description=NCM_DESC[digits];flat.officialDesc=NCM_DESC[digits];}
    return send(res,flat);
  }
  return send(res,await classifyPublicProduct(value));
}

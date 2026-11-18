/* Adaptador del operador: no duplica fórmulas ni modifica configuración.
   El juicio regulatorio pertenece al agente y queda documentado por caso. */
import { createHash } from 'node:crypto';
import { DEF, packTotals, originAllowed } from '../src/lib/calc.js';
import { publicModes } from '../src/lib/publicQuote.js';
import { engineVersion } from './agent-version.mjs';

export const todayAR = (now = new Date()) => new Intl.DateTimeFormat('en-CA',{timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
export const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const required = (condition, message) => { if (!condition) throw new Error(message); };
const number = (value, label, {min=0,integer=false}={}) => {
  required(typeof value === 'number' && Number.isFinite(value) && value >= min && value <= 1e9 && (!integer || Number.isInteger(value)), `${label}: número inválido.`);
  return value;
};
const text = (value,label,max=200,optional=false) => {
  if (optional && (value == null || value === '')) return '';
  required(typeof value === 'string' && value.trim().length > 0 && value.length <= max, `${label}: texto requerido o demasiado largo.`);
  return value.trim();
};
const official = url => { try { const u=new URL(url); return u.protocol==='https:' && /\.(?:gob|gov)\.ar$/.test(u.hostname); } catch { return false; } };

// No completar claves faltantes con DEF: las tarifas son las guardadas por FVR.
export function validateSnapshot(body) {
  required(Number.isInteger(body?.revision) && body.revision > 0 && typeof body.updatedAt === 'string' && Number.isFinite(Date.parse(body.updatedAt)), 'No hay una configuración central vigente.');
  const s=body.settings;
  required(s && typeof s==='object', 'Falta configuración central.');
  const clean={};
  for (const [key,example] of Object.entries(DEF)) {
    required(Object.hasOwn(s,key), `Configuración incompleta: ${key}. No se usan valores predeterminados.`);
    const v=s[key];
    if (example===null) required(v===null || (typeof v==='number' && Number.isFinite(v) && v>0), `Configuración inválida: ${key}.`);
    else required(typeof v===typeof example && (typeof v!=='number' || (Number.isFinite(v) && v>=0 && v<=1e9)), `Configuración inválida: ${key}.`);
    clean[key]=v;
  }
  return {settings:clean,revision:body.revision,updatedAt:body.updatedAt};
}

export const SERVICE_ORIGINS = ['https://calculadora.fvrlogistica.com.ar','https://fvr-calculadora.vercel.app'];
export async function fetchLive(fetchImpl=fetch) {
  const errors=[];
  for (const base of SERVICE_ORIGINS) {
    try {
      const get=async path => {
        const r=await fetchImpl(base+path,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(6000)});
        required(r.ok, `HTTP ${r.status}`); return r.json();
      };
      const [raw,version]=await Promise.all([get('/api/settings'),get('/agent-version.json')]);
      required(version.engineVersion===engineVersion(), 'El motor local no coincide con la calculadora publicada. Solicitar actualización al agente 03.');
      return {...validateSnapshot(raw),serviceOrigin:base,engineVersion:version.engineVersion};
    } catch(e) { errors.push(`${base}: ${e.message}`); }
  }
  throw new Error(`No se pudo verificar el motor y la configuración publicada. ${errors.join(' | ')}`);
}

export async function fetchExchange(settings,fetchImpl=fetch) {
  if (settings.manualDolar) return {value:settings.manualDolar,source:'Configuración FVR',fetchedAt:new Date().toISOString()};
  const sources=[
    ['https://criptoya.com/api/dolar',d=>d?.oficial?.ask ?? d?.oficial?.price],
    ['https://dolarapi.com/v1/dolares/oficial',d=>d?.venta],
    ['https://api.bluelytics.com.ar/v2/latest',d=>d?.oficial?.value_sell],
  ];
  for (const [url,pick] of sources) {
    try {
      const r=await fetchImpl(url,{redirect:'error',signal:AbortSignal.timeout(5000)});
      if (!r.ok) continue;
      const value=pick(await r.json());
      if (typeof value==='number' && Number.isFinite(value) && value>0) return {value,source:url,fetchedAt:new Date().toISOString()};
    } catch {}
  }
  throw new Error('No se pudo verificar el dólar oficial. No se usa un valor recordado.');
}

function normalizeCase(c,today) {
  required(c && typeof c==='object', 'Caso inválido.');
  const id=text(c.id,'ID',60);
  required(/^[a-zA-Z0-9_-]+$/.test(id), 'ID: usar letras, números, guion o guion bajo.');
  const input=c.data || {}, cl=c.classification || {}, reg=c.regulatory || {};
  required(reg.verifiedAt===today, 'La investigación regulatoria debe verificarse hoy.');
  required(Array.isArray(reg.sources) && reg.sources.some(official), 'Falta evidencia oficial regulatoria con URL directa.');
  required(/^\d{8}$/.test(cl.ncm || ''), 'Falta NCM probable de 8 dígitos.');
  const die=number(cl.die,'DIE',{min:0});
  required(die<=100, 'DIE fuera de rango: revisar la posición.');
  required(cl.source && official(cl.source), 'Falta fuente oficial del derecho.');
  number(cl.factualTaxes?.stat,'Tasa estadística factual');
  number(cl.factualTaxes?.vat,'IVA factual');
  const d={nombre:text(input.nombre,'Cliente',100),producto:text(input.producto,'Producto',400),
    whatsapp:text(input.whatsapp,'WhatsApp',50,true),email:text(input.email,'Email',150,true),
    paisOrigen:text(input.paisOrigen,'Origen',100),cp:input.cp ? text(input.cp,'CP',20) : '5000',
    fob:number(input.fob,'FOB',{min:0.01}),peso:number(input.peso,'Peso total',{min:0.001}),
    cantidad:input.cantidad==null ? null : number(input.cantidad,'Cantidad',{min:1,integer:true}),
    tipo:'avion',subTipo:'comercial',seaMode:'m3',hsCode:cl.sim || cl.ncm,aiDutyRate:die,
    dutyManual:true,categoria:'',tariffGeneric:false};
  required(originAllowed(d.paisOrigen), 'Origen retirado.');
  const origin=d.paisOrigen.toLowerCase();
  d.origenSel=origin==='china'?'China':/^(usa|estados unidos(?: \(usa\))?|united states)$/.test(origin)?'Estados Unidos (USA)':'Otro';
  if (input.packageGroups) {
    required(Array.isArray(input.packageGroups) && input.packageGroups.length>0 && input.packageGroups.length<=100, 'Bultos inválidos.');
    d.packageGroups=input.packageGroups.map((g,i)=>({cant:number(g.cant,`Cantidad grupo ${i+1}`,{min:1,integer:true}),
      largo:number(g.largo??0,'Largo'),ancho:number(g.ancho??0,'Ancho'),alto:number(g.alto??0,'Alto'),
      pesoCaja:number(g.pesoCaja??0,'Peso por bulto')}));
    for (const g of d.packageGroups) required([g.largo,g.ancho,g.alto].every(v=>v>0) || [g.largo,g.ancho,g.alto].every(v=>v===0), 'Informar las tres medidas o el volumen total.');
    required(d.packageGroups.every(g=>g.largo>0) || d.packageGroups.every(g=>g.largo===0),'Faltan medidas de algunos grupos: no se usa un volumen parcial.');
    const total=packTotals(d);
    if (d.packageGroups.every(g=>g.pesoCaja>0)) required(Math.abs(total.pesoGrupos-d.peso)<0.01, 'El peso por bulto no coincide con el peso total.');
  } else {
    d.bultos=number(input.bultos??1,'Bultos',{min:1,integer:true});
    d.largo=number(input.largo??0,'Largo');d.ancho=number(input.ancho??0,'Ancho');d.alto=number(input.alto??0,'Alto');
    required([d.largo,d.ancho,d.alto].every(v=>v>0) || [d.largo,d.ancho,d.alto].every(v=>v===0), 'Faltan medidas del bulto.');
  }
  if (input.totalVolumeM3!=null) {
    d.totalVolumeM3=number(input.totalVolumeM3,'Volumen TOTAL m³',{min:0.000001});
    const without={...d,totalVolumeM3:0}, measured=packTotals(without).volCm3/1e6;
    required(!measured || Math.abs(measured-d.totalVolumeM3)<0.00001,'El volumen total contradice las medidas.');
  }
  required(packTotals(d).volCm3>0,'Faltan medidas o volumen TOTAL en m³.');
  const requested=c.modes || ['auto','seaM3'];
  required(Array.isArray(requested) && requested.length>0 && requested.every(m=>['auto','air','dhl','seaM3'].includes(m)), 'Modalidad retirada o inválida.');
  return {id,d,reg,cl,requested,assumptions:input.cp?[]:['CP 5000 utilizado por regla operativa FVR.']};
}

export function buildBatch(input,live,exchange,{now=new Date()}={}) {
  required(Array.isArray(input?.cases) && input.cases.length>0 && input.cases.length<=10,'El lote admite de 1 a 10 casos.');
  required(new Set(input.cases.map(c=>c?.id)).size===input.cases.length,'Los ID de caso no se pueden repetir.');
  const snapshot=validateSnapshot(live), today=todayAR(now);
  required(exchange?.value>0 && Number.isFinite(exchange.value),'Dólar inválido.');
  const batch={schemaVersion:1,createdAt:now.toISOString(),verifiedDate:today,engineVersion:engineVersion(),
    snapshot:{...snapshot,serviceOrigin:live.serviceOrigin},exchange,cases:[]};
  for (const c of input.cases) {
    try {
      const v=normalizeCase(c,today), available=publicModes(v.d,snapshot.settings), modes=[], unavailable=[];
      const groups=v.d.packageGroups;
      const one=groups?groups.reduce((sum,g)=>sum+g.cant,0)===1:v.d.bultos===1;
      const known=one || (groups?.every(g=>g.pesoCaja>0));
      const over=one?v.d.peso>50:groups?.some(g=>g.pesoCaja>50);
      for (const m of available) {
        if (!v.requested.includes('auto') && !v.requested.includes(m.key)) continue;
        if (m.key==='seaM3' && !v.requested.includes('seaM3')) continue;
        const scope=m.key==='seaM3'?'sea':'courier';
        let reason=null;
        if (scope==='courier' && v.d.fob>3000) reason='FOB superior a USD 3.000 por envío: fuera de courier simplificado.';
        else if (scope==='courier' && over) reason='Un bulto supera 50 kg: fuera de courier simplificado.';
        else if (scope==='courier' && !known) reason='Falta conocer el peso individual de los bultos; no se infiere del promedio.';
        else if (v.reg[scope]?.status!=='viable') reason=v.reg[scope]?.reason || `Viabilidad ${scope} pendiente de verificación.`;
        if(reason) unavailable.push({key:m.key,reason}); else modes.push(m);
      }
      for (const key of v.requested.filter(k=>k!=='auto')) if (!available.some(m=>m.key===key)) unavailable.push({key,reason:'Modalidad no ofrecida por la calculadora pública para estos datos.'});
      const warnings=[...v.assumptions];
      for (const [key,label] of [['stat','Tasa estadística'],['vat','IVA'],['addVat','IVA adicional'],['ib','Ingresos Brutos'],['gains','Ganancias']]) {
        const factual=v.cl.factualTaxes?.[key];
        if (typeof factual==='number' && factual!==snapshot.settings[key]) warnings.push(`${label} factual: ${factual}%; aplicado por FVR: ${snapshot.settings[key]}%.`);
      }
      batch.cases.push({id:v.id,status:modes.length?'quoted':'blocked',data:v.d,classification:v.cl,regulatory:v.reg,modes,unavailable,warnings});
    } catch(e) { batch.cases.push({id:c?.id || '?',status:'invalid',error:e.message,modes:[]}); }
  }
  return batch;
}

export function assertBatchFresh(batch,live,{now=new Date()}={}) {
  required(batch?.schemaVersion===1 && batch.engineVersion===engineVersion(),'El lote pertenece a otra versión del motor. Volver a cotizar.');
  required(batch.verifiedDate===todayAR(now),'Cambió el día: revalidar fuentes y volver a cotizar antes de emitir PDF.');
  const snapshot=validateSnapshot(live);
  required(snapshot.revision===batch.snapshot?.revision && digest(snapshot.settings)===digest(batch.snapshot?.settings), 'Cambió la configuración FVR. Recalcular el lote e informar los nuevos totales.');
}

// Se recalcula desde los datos para evitar usar resultados alterados o mezclados.
export function selectedQuotes(batch,selection) {
  required(selection && typeof selection==='object' && !Array.isArray(selection),'Falta selección por ID de caso.');
  const selected=[], errors=[];
  for (const [id,keys] of Object.entries(selection)) {
    try {
    const c=batch.cases.find(c=>c.id===id);
    required(c && c.status==='quoted',`Caso ${id}: no hay cotización habilitada.`);
    const wanted=keys==='all'?c.modes.map(m=>m.key):keys;
    required(Array.isArray(wanted) && wanted.length>0,`Selección inválida para ${id}.`);
    for (const key of new Set(wanted)) {
      try {
      const stored=c.modes.find(m=>m.key===key);
      required(stored,`Caso ${id}: modalidad ${key} no cotizada.`);
      const actual=publicModes(c.data,batch.snapshot.settings).find(m=>m.key===key);
      required(actual && digest(actual)===digest(stored),`Caso ${id}: datos o resultados alterados. Volver a cotizar.`);
      selected.push({id,data:actual.d,result:actual.r,key,warnings:c.warnings});
      } catch(e) { errors.push({id,mode:key,error:e.message}); }
    }
    } catch(e) { errors.push({id,error:e.message}); }
  }
  required(Object.keys(selection).length>0,'Selección vacía.');return {selected,errors};
}

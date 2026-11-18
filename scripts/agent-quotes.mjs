#!/usr/bin/env node
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {buildQuotePDF} from '../src/lib/pdfQuote.js';
import {buildIndex} from '../src/lib/ncmSearch.js';
import {fetchLive,fetchExchange,buildBatch,assertBatchFresh,selectedQuotes,todayAR,SERVICE_ORIGINS,digest} from './agent-batch-lib.mjs';

const [command,...args]=process.argv.slice(2);
const flags={};
for(let i=0;i<args.length;i+=2){if(!args[i]?.startsWith('--') || !args[i+1]) throw new Error('Opciones: --input archivo --output carpeta; pdf: --batch archivo --selection archivo; lookup: --query texto.');flags[args[i].slice(2)]=args[i+1];}
const json=async path=>JSON.parse(await readFile(resolve(path),'utf8'));
const save=async (path,value)=>writeFile(path,JSON.stringify(value,null,2),{flag:'wx'});
const seal=batch=>({...batch,integrity:digest(batch)});
const unseal=value=>{const {integrity,...batch}=value;if(integrity!==digest(batch))throw new Error('El registro del lote fue modificado. Volver a cotizar.');return batch;};
const token=()=>`${Date.now()}-${randomUUID().slice(0,8)}`;

try {
  if(command==='quote') {
    if(!flags.input || !flags.output)throw new Error('quote requiere --input y --output.');
    const input=await json(flags.input),live=await fetchLive(),exchange=await fetchExchange(live.settings);
    const batch=buildBatch(input,live,exchange),out=resolve(flags.output);
    await mkdir(out,{recursive:true});
    const path=join(out,`lote-${token()}.json`);
    const record=seal({...batch,snapshot:live,exchange});
    await save(path,record);
    console.log(JSON.stringify({batch:path,revision:live.revision,dolar:exchange.value,cases:record.cases.map(c=>({id:c.id,status:c.status,error:c.error,warnings:c.warnings,unavailable:c.unavailable,modes:c.modes.map(m=>({key:m.key,totalUSD:m.r.totalGen,totalARS:m.r.totalGen*exchange.value,unitario:m.r.unitario}))}))}));
  } else if(command==='pdf') {
    if(!flags.batch || !flags.selection || !flags.output)throw new Error('pdf requiere --batch, --selection y --output.');
    const batch=unseal(await json(flags.batch)),selection=await json(flags.selection),live=await fetchLive();
    assertBatchFresh(batch,live);
    const {selected,errors}=selectedQuotes(batch,selection),out=resolve(flags.output),files=[];
    await mkdir(out,{recursive:true});
    // Mismo dólar de la cotización original, sin sustituir importes después.
    for(const q of selected) {
      try {
        const {doc}=await buildQuotePDF(q.data,q.result,batch.exchange.value,batch.snapshot.settings);
        const filename=`FVR-${q.id}-${q.key}-${token()}.pdf`,path=join(out,filename);
        await writeFile(path,Buffer.from(doc.output('arraybuffer')),{flag:'wx'});
        files.push({id:q.id,mode:q.key,path,totalUSD:q.result.totalGen,warnings:q.warnings});
      } catch(e){errors.push({id:q.id,mode:q.key,error:e.message});}
    }
    const receipt=join(out,`entrega-${token()}.json`);
    await save(receipt,{sourceBatch:resolve(flags.batch),revision:live.revision,files,errors});
    console.log(JSON.stringify({receipt,files,errors}));
    if(errors.length) process.exitCode=2;
  } else if(command==='lookup') {
    const query=flags.query?.trim();if(!query)throw new Error('lookup requiere --query.');
    let base,origin;
    for(const url of SERVICE_ORIGINS){try{const r=await fetch(url+'/agent-tariffs.json',{signal:AbortSignal.timeout(8000),redirect:'error'});if(r.ok){base=await r.json();origin=url;break;}}catch{}}
    if(!base?.positions || !base.meta)throw new Error('Índice oficial publicado no disponible. Consultar ARCA/VUCE directamente.');
    const code=query.replace(/[.\s]/g,''),rows=[];
    const limit=Math.min(10,Math.max(1,Number(flags.limit)||6));
    if(/^\d{8}$/.test(code)){if(base.positions[code])rows.push({code,...base.positions[code]});}
    else if(/^\d/.test(code))throw new Error('El índice admite NCM8. No recortar un SIM exacto para inferir sus intervenciones o su DIE.');
    else {
      const index=buildIndex(Object.entries(base.positions).map(([code,p])=>({code,desc:p.desc})));
      for(const r of index.search(query,limit))rows.push({code:r.code,...base.positions[r.code],score:r.score});
    }
    console.log(JSON.stringify({query,source:base.meta,serviceOrigin:origin,sourceIsToday:base.meta.fileDate===todayAR(),notice:'Candidatos de índice NCM8, no clasificación ni control regulatorio. mixed exige resolver apertura SIM. IVA, tasa e intervenciones se verifican por separado.',candidates:rows}));
  } else throw new Error('Comandos permitidos: quote, pdf, lookup. Ver docs/AGENTES_COTIZADOR.md.');
} catch(e){console.error(JSON.stringify({error:e.message}));process.exitCode=1;}

import {describe,it,expect} from 'vitest';
import {DEF,packTotals} from '../src/lib/calc.js';
import {publicModes} from '../src/lib/publicQuote.js';
import {todayAR,buildBatch,validateSnapshot,assertBatchFresh,selectedQuotes,fetchLive,fetchExchange} from '../scripts/agent-batch-lib.mjs';
import {engineVersion} from '../scripts/agent-version.mjs';
const date=todayAR(),live={settings:{...DEF,airRateChina:25,dhlRateHigh:18},revision:9,updatedAt:new Date().toISOString()};
const sample=(id='a',data={})=>({id,data:{nombre:'Cliente '+id,producto:'Producto de prueba',paisOrigen:'China',fob:1000,peso:25,largo:50,ancho:40,alto:30,bultos:1,...data},classification:{ncm:'94032000',die:20,source:'https://serviciosweb.afip.gob.ar/aduana/arancelintegrado/',factualTaxes:{stat:3,vat:21}},regulatory:{verifiedAt:date,sources:['https://www.arca.gob.ar/envios-internacionales/'],courier:{status:'viable'},sea:{status:'viable'}}});
const batch=(cases=[sample()])=>buildBatch({cases},live,{value:1575});
describe('cotizador de agentes con motor compartido',()=>{
  it('usa tarifas centrales y coincide exactamente con la oferta pública',()=>{
    const c=batch().cases[0];expect(c.modes).toEqual(publicModes(c.data,live.settings));
    expect(c.modes.map(m=>m.key)).toEqual(['dhl','seaM3']);
    const high=batch([sample('x',{peso:40})]).cases[0];
    expect(high.modes[0].r.flete).toBe(40*18); // DEF tiene otro valor.
  });
  it.each([[9.99,'air'],[10,'dhl'],[30,'dhl']])('límite comercial de %s kg', (peso,key)=>expect(batch([sample('a',{peso,largo:10,ancho:10,alto:10})]).cases[0].modes[0].key).toBe(key));
  it('USA no ofrece DHL',()=>expect(batch([sample('a',{paisOrigen:'USA'})]).cases[0].modes[0].key).toBe('air'));
  it('solo volumen declarado no inventa dimensiones y usa el mismo divisor',()=>{
    const c=batch([sample('a',{largo:0,ancho:0,alto:0,totalVolumeM3:0.195})]).cases[0];
    expect(c.modes[0].r.pVol).toBe(39);expect(c.data.largo).toBe(0);
    expect(packTotals({...c.data,largo:50,ancho:40,alto:30}).volCm3).toBe(60000);
  });
  it('rechaza volumen contradictorio y no frena otro cliente',()=>{
    const cs=batch([sample('a',{totalVolumeM3:2}),sample('b')]).cases;
    expect(cs[0].status).toBe('invalid');expect(cs[1].status).toBe('quoted');
  });
  it('50 kg es por bulto y no total; 2 x 30 kg admiten courier',()=>{
    const c=batch([sample('a',{peso:60,packageGroups:[{cant:2,largo:10,ancho:10,alto:10,pesoCaja:30}]})]).cases[0];
    expect(c.modes.map(m=>m.key)).toContain('dhl');
    const over=batch([sample('a',{peso:60,packageGroups:[{cant:1,largo:10,ancho:10,alto:10,pesoCaja:60}]})]).cases[0];
    expect(over.modes.map(m=>m.key)).toEqual(['seaM3']);
  });
  it('no usa el promedio para afirmar peso individual',()=>{
    const c=batch([sample('a',{peso:60,bultos:2})]).cases[0];
    expect(c.modes.map(m=>m.key)).toEqual(['seaM3']);expect(c.unavailable[0].reason).toMatch(/individual/);
  });
  it.each([3000,3000.01])('controla FOB %s por envío',fob=>{
    const c=batch([sample('a',{fob})]).cases[0];expect(c.modes.some(m=>m.key==='dhl')).toBe(fob<=3000);
  });
  it('intervención courier no impide evaluar régimen general verificado',()=>{
    const c=sample();c.regulatory.courier={status:'blocked',reason:'Autorización previa pendiente'};
    expect(batch([c]).cases[0].modes.map(m=>m.key)).toEqual(['seaM3']);
  });
  it('falta regulatoria no se convierte en viable',()=>{
    const c=sample();delete c.regulatory.courier;delete c.regulatory.sea;
    expect(batch([c]).cases[0].status).toBe('blocked');
  });
  it('rechaza datos incompletos, antiguos, negativos y modalidades retiradas',()=>{
    const old=sample('old');old.regulatory.verifiedAt='2026-01-01';
    const retired=sample('retired');retired.modes=['seaKg'];
    const cs=batch([old,retired,sample('bad',{fob:-1}),sample('ok')]).cases;
    expect(cs.map(c=>c.status)).toEqual(['invalid','invalid','invalid','quoted']);
  });
  it('exige evidencia por separado del IVA y la tasa',()=>{
    const c=sample();delete c.classification.factualTaxes;
    expect(batch([c]).cases[0].status).toBe('invalid');
  });
  it('distingue IVA factual del aplicado sin cambiar configuración',()=>{
    const c=sample();c.classification.factualTaxes.vat=10.5;
    const q=batch([c]).cases[0];expect(q.warnings.join()).toMatch(/10.5.*21/);
    expect(q.modes[0].r.iva).toBeCloseTo(q.modes[0].r.ivaBase*.21);
  });
  it('admite diez clientes con ID únicos y rechaza once o duplicados',()=>{
    const cases=Array.from({length:10},(_,i)=>sample('c'+i));expect(batch(cases).cases).toHaveLength(10);
    expect(()=>batch([...cases,sample('extra')])).toThrow(/10/);
    expect(()=>batch([sample(),sample()])).toThrow(/ID/);
  });
  it('no completa configuración remota incompleta con predeterminados',()=>{
    const s={...live.settings};delete s.seaRate;
    expect(()=>validateSnapshot({...live,settings:s})).toThrow(/seaRate/);
  });
  it('bloquea PDF con tarifas o día cambiados y preserva selección válida',()=>{
    const b={...batch(),snapshot:live};
    expect(()=>assertBatchFresh(b,live)).not.toThrow();
    expect(()=>assertBatchFresh(b,{...live,revision:10})).toThrow(/Cambió/);
    expect(()=>assertBatchFresh({...b,verifiedDate:'2026-01-01'},live)).toThrow(/día/);
    const pick=selectedQuotes(b,{a:['dhl','seaKg'],ausente:'all'});
    expect(pick.selected).toHaveLength(1);expect(pick.errors).toHaveLength(2);
  });
  it('detecta importes alterados antes de emitir PDF',()=>{
    const b={...batch(),snapshot:live};b.cases[0].modes[0].r.totalGen+=1;
    expect(selectedQuotes(b,{a:['dhl']}).errors[0].error).toMatch(/alterados/);
  });
  it('consulta solo endpoints públicos, verifica motor y usa respaldo FVR',async()=>{
    const calls=[];const fetcher=async url=>{calls.push(url);if(url.includes('calculadora.fvrlogistica'))throw Error('DNS');return {ok:true,json:async()=>url.endsWith('agent-version.json')?{engineVersion:engineVersion()}:live};};
    expect((await fetchLive(fetcher)).revision).toBe(9);
    expect(calls.every(url=>url.endsWith('/api/settings') || url.endsWith('/agent-version.json'))).toBe(true);
    await expect(fetchLive(async()=>({ok:true,json:async()=>({engineVersion:'wrong'})}))).rejects.toThrow(/motor/);
  });
  it('dólar manual vigente prevalece y nunca usa un dólar inventado',async()=>{
    expect((await fetchExchange({...DEF,manualDolar:1575})).value).toBe(1575);
    await expect(fetchExchange(DEF,async()=>{throw Error('off');})).rejects.toThrow(/recordado/);
  });
});

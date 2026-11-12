import {it,expect,vi,afterEach,beforeEach} from 'vitest';
import handler from '../api/analyze.js';
import {NCM8} from '../src/data/ncm8.js';
import {NCM_DESC} from '../src/data/ncmDescriptions.js';
import {productIntent} from '../src/lib/productIntent.js';
let counter=0;
const call=async(value,type='product')=>{
  let result;const res={setHeader(){},status(){return this},json(v){result=v;return this},end(){return this}};
  await handler({method:'POST',headers:{'x-forwarded-for':`semantic-test-${counter++}`},body:{type,value}},res);
  return JSON.parse(result.content[0].text);
};
beforeEach(()=>vi.stubEnv('ANTHROPIC_API_KEY',''));
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
it.each(['silla de madera','sillas de madera','sillas con armazón de madera'])('%s conserva el asiento y ofrece variantes con/sin relleno',async value=>{
  const r=await call(value);expect(r.needsConfirmation).toBe(true);expect(r.dutyRate).toBeNull();
  expect(r.alternatives.map(a=>a.hsCode)).toEqual(['9401.61.00','9401.69.00']);
  for(const a of r.alternatives){expect(a.dutyRate).toBe(NCM8[a.hsCode.replace(/\D/g,'')]);expect(a.description).toMatch(/madera/);}
});
it.each(['moto de agua','motos acuáticas','jet ski','jetski'])('%s es embarcación, sin agua mineral ni motocicletas',async value=>{
  const r=await call(value);expect(r.alternatives).toHaveLength(1);expect(r.alternatives[0].hsCode).toBe('8903.93.00');
  expect(r.needsConfirmation).toBe(true);
});
it('no confunde un accesorio para una moto de agua con la embarcación completa',()=>{
  expect(productIntent('funda para moto de agua')).toBeNull();
  expect(productIntent('motor de moto de agua')).toBeNull();
});
it('caja de herramientas distingue envase vacío, bolso y juego completo',async()=>{
  const r=await call('caja de herramientas');
  expect(r.alternatives.map(a=>a.hsCode)).toEqual(['3926.90.90','4202.92.00','8206.00.00']);
  expect(r.alternatives.some(a=>/8704|8214|8303/.test(a.hsCode))).toBe(false);
});
it('botellas no presupone vidrio: pide material y uso',async()=>{
  const r=await call('botellas');expect(r.dutyRate).toBeNull();
  expect(r.alternatives.every(a=>a.query&&!a.hsCode)).toBe(true);
  expect(r.alternatives.some(a=>/plástico/.test(a.description))).toBe(true);
});
it('motocicletas pide cilindrada y no ofrece motores, neumáticos o partes',async()=>{
  const r=await call('motocicletas');expect(r.alternatives.length).toBeGreaterThan(3);
  for(const a of r.alternatives)expect(a.hsCode.startsWith('8711')).toBe(true);
  expect((await call('moto 150 cc')).alternatives.map(a=>a.hsCode)).toEqual(['8711.20.20']);
});
it('un producto desconocido no recibe el 16% genérico automático',async()=>{
  const r=await call('xyzzy frobnicator');expect(r.dutyRate).toBeNull();expect(r.alternatives).toEqual([]);expect(r.needsConfirmation).toBe(true);
});
it('contexto oficial conserva el material y los niveles intermedios',()=>{
  expect(NCM_DESC['94016100']).toMatch(/madera/i);
  expect(NCM_DESC['94017100']).toMatch(/metal/i);
});
it('seleccionar una variante resuelve su porcentaje desde el código oficial actual',async()=>{
  const options=(await call('silla de madera')).alternatives;
  for(const a of options){const r=await call(a.hsCode,'hsCode');expect(r.dutyRate).toBe(a.dutyRate);expect(r.baseDate).toBeTruthy();}
});
it('no agrega alternativas que la IA rechazó, aunque haya otros rubros en la búsqueda',async()=>{
  vi.stubEnv('ANTHROPIC_API_KEY','test');
  vi.stubGlobal('fetch',vi.fn(async(_url,request)=>{
    const prompt=JSON.parse(request.body).messages[0].content;
    const match=prompt.match(/^(\d+)\. 8471/m);expect(match).toBeTruthy();
    return {ok:true,json:async()=>({content:[{text:JSON.stringify({compatibles:[Number(match[1])],pregunta:'Confirmá el tipo de computadora',consultas:[]})}]})};
  }));
  const r=await call('notebooks');expect(r.alternatives).toHaveLength(1);expect(r.alternatives[0].hsCode.startsWith('8471')).toBe(true);
});
it('rechazo total de la IA deja sin porcentaje y sin opciones incompatibles',async()=>{
  vi.stubEnv('ANTHROPIC_API_KEY','test');
  vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>({content:[{text:'{"compatibles":[],"consultas":[],"pregunta":"Agregá el uso exacto"}'}]})})));
  const r=await call('bomba de agua');expect(r.alternatives).toEqual([]);expect(r.dutyRate).toBeNull();
});
it('la expansión semántica no admite buscar solamente un material',async()=>{
  vi.stubEnv('ANTHROPIC_API_KEY','test');
  vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>({content:[{text:'{"compatibles":[],"consultas":[{"termino":"madera","objeto":"madera"}]}'}]})})));
  expect((await call('objeto xyzzy de madera')).alternatives).toEqual([]);
});
it('sin IA, un rechazo de red no vuelve al porcentaje genérico',async()=>{
  vi.stubEnv('ANTHROPIC_API_KEY','test');vi.stubGlobal('fetch',vi.fn(async()=>{throw Error('offline')}));
  expect((await call('xyzzy frobnicator')).dutyRate).toBeNull();
});

it('mencionar el motor no convierte una motocicleta o embarcación completa en un repuesto',async()=>{
  expect((await call('moto de agua con motor')).alternatives[0].hsCode).toBe('8903.93.00');
  expect((await call('moto con motor eléctrico')).alternatives.map(a=>a.hsCode)).toEqual(['8711.60.00']);
});
it.each(['9999','999999'])('un prefijo inexistente %s no recibe un porcentaje genérico',async code=>{
  const r=await call(code,'hsCode');expect(r.dutyRate).toBeNull();expect(r.error).toBeTruthy();
});

it('recupera la descripción oficial de la apertura única .000 cuando falta el registro NCM8',()=>{
  expect(NCM_DESC['39233010']).toMatch(/gas licuado/i);
  expect(NCM_DESC['94013100']).toMatch(/madera/i);
});
it('botellas para bebidas no ofrece recipientes para gas licuado',async()=>{
  const r=await call('botella de plástico para envasar bebidas');
  expect(r.alternatives.length).toBeGreaterThan(0);
  expect(r.alternatives.some(a=>a.hsCode==='3923.30.10')).toBe(false);
});

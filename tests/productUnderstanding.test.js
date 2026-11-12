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
  const r=await call('xyzzy frobnicator');expect(r.dutyRate).toBe(20);expect(r.isGeneric).toBe(true);expect(r.alternatives).toEqual([]);
});
it('contexto oficial conserva el material y los niveles intermedios',()=>{
  expect(NCM_DESC['94016100']).toMatch(/madera/i);
  expect(NCM_DESC['94017100']).toMatch(/metal/i);
});
it('seleccionar una variante resuelve su porcentaje desde el código oficial actual',async()=>{
  const options=(await call('silla de madera')).alternatives;
  for(const a of options){const r=await call(a.hsCode,'hsCode');expect(r.dutyRate).toBe(a.dutyRate);expect(r.baseDate).toBeTruthy();}
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

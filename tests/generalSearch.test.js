import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {classifyPublicProduct,localSearch,clearProductCache,isProductCode} from '../src/lib/productClassifier.js';
import {genericEstimate,classificationPatch} from '../src/lib/searchPolicy.js';
import {classifyCode,toLegacyShape} from '../src/lib/tariffEngine.js';
import {NCM8} from '../src/data/ncm8.js';
import handler from '../api/analyze.js';
beforeEach(()=>{clearProductCache();vi.stubEnv('GEMINI_API_KEY','');vi.stubEnv('GEMINI_FREE_TIER_CONFIRMED','false');});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
const toolResponse=(_name,input)=>({ok:true,json:async()=>({usageMetadata:{promptTokenCount:100,candidatesTokenCount:50},candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(input)}]}}]})});
const samples=[
  ['mesa de metal para comedor','mueble','muebles de metal','94032090'],
  ['mesa de madera para comedor','mueble','muebles de madera','94036000'],
  ['bomba de agua centrífuga','bomba','bombas centrifugas','84137090'],
  ['licuadora eléctrica para cocina','licuadora','licuadoras alimentos','85094010'],
  ['notebook portátil con batería','computadora','maquina automatica portatil procesamiento datos','84713019'],
  ['cafetera eléctrica doméstica','cafetera','aparatos preparacion cafe','85167100'],
  ['tornillos de acero','tornillo','tornillos pernos roscados','73181500'],
  ['rodamiento radial de bolas','rodamiento','rodamientos bolas radiales','84821010'],
  ['paneles solares fotovoltaicos','panel','celulas fotovoltaicas paneles','85414300'],
  ['máquina de coser doméstica','maquina','maquinas coser domesticas','84521000'],
  ['aspiradora doméstica 1200 W 10 litros','aspiradora','aspiradoras motor electrico','85081100'],
  ['juego de mesa de sociedad','juego','juegos sociedad','95049090'],
  ['zapatillas deportivas','calzado','calzado deporte','64041100'],
  ['mochila de poliéster','mochila','bolsas mochilas materia textil','42029200'],
  ['remera de algodón de punto','camiseta','camisetas algodon punto','61091000'],
  ['botella plástica para envasar bebidas','botella','botellas plastico','39233090'],
  ['botella de vidrio de 2 litros','botella','botellas vidrio capacidad superior litro','70109011'],
  ['bicicleta sin motor','bicicleta','bicicletas sin motor','87120010'],
  ['cámara digital','camara','camaras digitales','85258929'],
  ['auriculares con micrófono','auricular','auriculares microfono','85183000'],
  ['cargador eléctrico USB','convertidor','convertidores estaticos','85044090'],
  ['bombilla LED','lampara','lamparas led','85395200'],
  ['ventilador de mesa','ventilador','ventiladores mesa','84145110'],
  ['lapicera bolígrafo','boligrafo','boligrafos','96081000'],
  ['guantes de nitrilo de uso doméstico','guante','guantes caucho','40151900'],
  ['termo de acero al vacío','termo','termos recipientes isotermicos','96170010'],
  ['crema hidratante facial','crema','cremas belleza nutritivas','33049910'],
  ['motocicleta eléctrica completa','motocicleta','motocicletas motor electrico','87116000'],
  ['moto de agua jetski completa','embarcacion','embarcaciones recreo longitud inferior 7,5','89039300'],
  ['silla de madera con tapizado','asiento','asientos armazon madera relleno','94016100'],
];
function semanticFixture(query,object,search,target,{reject=false}={}) {
  return vi.fn(async(_url,request)=>{
    const body=JSON.parse(request.body),context=JSON.parse(body.contents[0].parts[0].text),stage=context.candidatos?'validar_variantes':'interpretar_producto';
    if(stage==='interpretar_producto')return toolResponse(stage,{identificado:true,nombre:query,objeto:object,funcion:'Uso comercial descrito',presentacion:'completo',consultas:[search],partidas:[target.slice(0,4)],faltantes:[]});
    const found=context.candidatos.find(c=>c.ncm.replace(/\D/g,'')===target);
    expect(found,`La recuperación debe incluir ${target} para ${query}`).toBeTruthy();
    return toolResponse(stage,{pregunta:'Confirmá si esta variante describe tu producto.',confianza:'media',refinamientos:[],opciones:reject?[]:[{indice:found.indice,nombre:query,detalle:'Variante compatible según las características indicadas',dutyRate:99}]});
  });
}
it.each(samples)('recuperación general de catálogo: %s',async(query,object,search,target)=>{
  expect(isProductCode(target)).toBe(true);
  const mock=semanticFixture(query,object,search,target);vi.stubGlobal('fetch',mock);
  const result=await classifyPublicProduct(query,{apiKey:'test'});
  expect(mock).toHaveBeenCalledTimes(2);expect(result.method).toBe('semantica-ia-validada');
  expect(result.alternatives).toHaveLength(1);
  expect(result.alternatives[0].hsCode.replace(/\D/g,'')).toBe(target);
  expect(result.alternatives[0].dutyRate).toBe(toLegacyShape(classifyCode(target)).dutyRate);
  expect(result.alternatives[0].dutyRate).not.toBe(99);
});
it('interpreta primero también cuando el producto coincide con una regla específica previa',async()=>{
  const mock=semanticFixture('martillo manual','martillo','martillos mazas','82052000');vi.stubGlobal('fetch',mock);
  await classifyPublicProduct('martillo manual',{apiKey:'test'});
  const request=JSON.parse(mock.mock.calls[0][1].body);
  expect(request.contents[0].parts[0].text).not.toContain('candidatos');expect(request.generationConfig.responseMimeType).toBe('application/json');
});
it('una coincidencia por MESA en cubiertos no es una mesa y nunca se ofrece 0082',()=>{
  const r=localSearch('mesa de metal');expect(r.alternatives.length).toBeGreaterThan(0);
  expect(r.alternatives.every(a=>a.hsCode.startsWith('9403'))).toBe(true);
  expect(r.alternatives.some(a=>/madera|cubiertos/i.test(a.description))).toBe(false);
});
it('el respaldo local de notebook no incluye discos ni unidades de memoria',()=>{
  const r=localSearch('notebooks');expect(r.alternatives.length).toBeGreaterThan(0);
  expect(r.alternatives.every(a=>a.hsCode.startsWith('8471.30'))).toBe(true);
});
it('los encabezados de capítulos no son NCM de productos',()=>{
  expect(Object.keys(NCM8).some(c=>c.startsWith('00'))).toBe(false);expect(isProductCode('00820000')).toBe(false);
});
it('sin una clasificación, el respaldo es 20% FVR sin NCM o fuente ARCA inventados',async()=>{
  const r=await classifyPublicProduct('xyzzy frobnicator',{apiKey:''});
  expect(r.dutyRate).toBe(20);expect(r.isGeneric).toBe(true);expect(r.hsCode).toBe('');expect(r.source).toBe('Estimación genérica FVR');expect(r.sourceUrl).toBeNull();
});
it('rechazo de todos los candidatos no agrega opciones descartadas',async()=>{
  vi.stubGlobal('fetch',semanticFixture('mesa de metal','mueble','muebles metal','94032090',{reject:true}));
  const r=await classifyPublicProduct('mesa de metal',{apiKey:'test'});expect(r.dutyRate).toBe(20);expect(r.alternatives).toEqual([]);
});
it('no acepta índices fuera de lista o códigos inventados por la IA',async()=>{
  let stage=0;vi.stubGlobal('fetch',vi.fn(async()=>++stage===1?toolResponse('interpretar_producto',{identificado:true,objeto:'mueble',nombre:'mesa',consultas:['muebles metal'],partidas:['9403']}):toolResponse('validar_variantes',{opciones:[{indice:999999,nombre:'inventado',hsCode:'9999.99.99'}]})));
  const r=await classifyPublicProduct('mesa de metal',{apiKey:'test'});expect(r.dutyRate).toBe(20);expect(r.alternatives).toEqual([]);
});
it('una consulta repetida reutiliza el resultado y evita nuevas llamadas de IA',async()=>{
  const mock=semanticFixture('licuadora','licuadora','licuadoras','85094010');vi.stubGlobal('fetch',mock);
  await classifyPublicProduct('licuadora',{apiKey:'test'});const again=await classifyPublicProduct('licuadora',{apiKey:'test'});
  expect(mock).toHaveBeenCalledTimes(2);expect(again.fromCache).toBe(true);
});
it('dos búsquedas iguales simultáneas comparten el mismo análisis',async()=>{
  const mock=semanticFixture('licuadora','licuadora','licuadoras','85094010');vi.stubGlobal('fetch',mock);
  const result=await Promise.all([classifyPublicProduct('licuadora',{apiKey:'test'}),classifyPublicProduct('licuadora',{apiKey:'test'})]);
  expect(mock).toHaveBeenCalledTimes(2);expect(result[0]).toEqual(result[1]);
});
it('una falla externa no convierte resultados rechazados en confirmados y permite reintentar',async()=>{
  const mock=vi.fn(async()=>{throw Error('offline')});vi.stubGlobal('fetch',mock);
  expect((await classifyPublicProduct('xyzzy frobnicator',{apiKey:'test'})).dutyRate).toBe(20);
  await classifyPublicProduct('xyzzy frobnicator',{apiKey:'test'});expect(mock).toHaveBeenCalledTimes(2);
});
it('el porcentaje genérico permite cotizar y deja trazabilidad sin HS falso',()=>{
  const patch=classificationPatch(genericEstimate(),'artículo no identificado');
  expect(patch.aiDutyRate).toBe(20);expect(patch.tariffGeneric).toBe(true);expect(patch.hsCode).toBe('');expect(patch.tariffSourceDate).toBeNull();
  expect(patch.aiSuggestion).toMatch(/genérica FVR/);
});
it('elegir después una posición oficial quita la marca genérica y respeta un arancel 0%',()=>{
  const patch=classificationPatch({hsCode:'8517.13.00',dutyRate:0,source:'ARCA',baseDate:'2026-11-12'},'celular');
  expect(patch.aiDutyRate).toBe(0);expect(patch.tariffGeneric).toBe(false);expect(patch.hsCode).toBe('8517.13.00');
});
it('la API informa el respaldo de 20% como FVR y rechaza capítulos 00',async()=>{
  let payload;const res={setHeader(){},status(){return this},json(v){payload=v;return this},end(){return this}};
  await handler({method:'POST',headers:{'x-forwarded-for':'api-generic'},body:{type:'product',value:'xyzzy frobnicator'}},res);
  const result=JSON.parse(payload.content[0].text);expect(result.dutyRate).toBe(20);expect(result.sourceUrl).toBeNull();
  await handler({method:'POST',headers:{'x-forwarded-for':'api-generic'},body:{type:'hsCode',value:'0082.00.00'}},res);
  expect(JSON.parse(payload.content[0].text).dutyRate).toBeNull();
});

it('una clave de Anthropic existente no activa llamadas pagas en el buscador gratuito',async()=>{
  vi.stubEnv('ANTHROPIC_API_KEY','existing-do-not-use');
  const mock=vi.fn();vi.stubGlobal('fetch',mock);
  const r=await classifyPublicProduct('xyzzy frobnicator');expect(mock).not.toHaveBeenCalled();expect(r.dutyRate).toBe(20);
});
it('sin confirmar el proyecto gratuito, una clave Gemini no se usa automáticamente',async()=>{
  vi.stubEnv('GEMINI_API_KEY','fake-key');const mock=vi.fn();vi.stubGlobal('fetch',mock);
  await classifyPublicProduct('licuadora');expect(mock).not.toHaveBeenCalled();
});
it('el agotamiento de cuota gratuita cae al respaldo sin llamar a otro proveedor',async()=>{
  const mock=vi.fn(async()=>({ok:false,status:429}));vi.stubGlobal('fetch',mock);
  const r=await classifyPublicProduct('xyzzy frobnicator',{apiKey:'test'});
  expect(mock).toHaveBeenCalledTimes(1);expect(mock.mock.calls[0][0]).toContain('generativelanguage.googleapis.com');
  expect(r.dutyRate).toBe(20);expect(r.fallbackReason).toBe('free-quota-exhausted');
});
it('la clave se envía sólo en el encabezado del servidor y no en la URL',async()=>{
  const mock=semanticFixture('licuadora','licuadora','licuadoras','85094010');vi.stubGlobal('fetch',mock);
  await classifyPublicProduct('licuadora',{apiKey:'secret-test-only'});
  for(const [url,request]of mock.mock.calls){expect(url).not.toContain('secret-test-only');expect(request.headers['x-goog-api-key']).toBe('secret-test-only');expect(JSON.parse(request.body).tools).toBeUndefined();}
});

it('las aperturas nacionales conservan la identidad específica sin cambiar el NCM padre',async()=>{
  const {NCM_SPECIFICS}=await import('../src/data/ncmSpecifics.js');
  expect(Object.keys(NCM_SPECIFICS).every(isProductCode)).toBe(true);
  expect(NCM_SPECIFICS['89039300'].some(s=>/jetski|motoski/i.test(s.desc))).toBe(true);
  expect(NCM_SPECIFICS['70109090'].some(s=>/botellas/i.test(s.desc))).toBe(true);
});
it('el validador recibe las aperturas SIM que distinguen un producto del encabezado genérico',async()=>{
  const mock=semanticFixture('moto de agua','embarcacion','barcos de motor recreo','89039300');vi.stubGlobal('fetch',mock);
  const result=await classifyPublicProduct('moto de agua',{apiKey:'test'});
  const ctx=JSON.parse(JSON.parse(mock.mock.calls[1][1].body).contents[0].parts[0].text);
  const candidate=ctx.candidatos.find(c=>c.ncm==='8903.93.00');
  expect(candidate.aperturasSIM.some(s=>/jetski|motoski/i.test(s))).toBe(true);
  expect(result.alternatives[0].hsCode).toBe('8903.93.00');
});
it('la recuperación conserva variantes residuales de una familia aunque no repitan el nombre común',async()=>{
  const mock=semanticFixture('botellas de vidrio','botella','bombonas botellas vidrio','70109090');vi.stubGlobal('fetch',mock);
  const result=await classifyPublicProduct('botellas de vidrio',{apiKey:'test'});
  const ctx=JSON.parse(JSON.parse(mock.mock.calls[1][1].body).contents[0].parts[0].text);
  expect(ctx.candidatos.map(c=>c.ncm)).toEqual(expect.arrayContaining(['7010.90.11','7010.90.21','7010.90.90']));
  expect(result.alternatives[0].hsCode).toBe('7010.90.90');
});

it('dedica razonamiento a la validación de exclusiones sin habilitar herramientas pagas',async()=>{
  const mock=semanticFixture('mesa de metal','mueble','muebles metal','94032090');vi.stubGlobal('fetch',mock);
  const result=await classifyPublicProduct('mesa de metal',{apiKey:'test'});
  const first=JSON.parse(mock.mock.calls[0][1].body),second=JSON.parse(mock.mock.calls[1][1].body);
  expect(first.generationConfig.thinkingConfig.thinkingLevel).toBe('LOW');
  expect(second.generationConfig.thinkingConfig.thinkingLevel).toBe('MEDIUM');
  expect(second.tools).toBeUndefined();
  expect(result.question).toBe('Confirmá si esta variante corresponde a tu producto.');
});

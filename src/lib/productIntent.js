/* Identidad del producto antes del material o de palabras aisladas.
   Reglas de significado, no de aranceles. Todo código se valida luego
   contra la base oficial vigente; si desaparece no se ofrece. */
import { stripAccents, tokenize, phraseMatch } from './textNorm.js';

export function productIntent(value) {
  const q=stripAccents(value), t=tokenize(value);
  const head=t.find(x=>!/^\d+$/.test(x));
  const starts=(...words)=>words.some(w=>tokenize(w)[0]===head);
  const has=(...words)=>words.some(w=>phraseMatch(t,w));
  const choices=(question,options)=>({question,options});
  const code=(hsCode,label)=>({hsCode,label});
  const refine=(label,query)=>({label,query});
  const part=starts('repuesto','parte','pieza','neumatico','cubierta','motor');
  // Las expresiones compuestas se resuelven antes de "moto", "agua", etc.
  if (starts('moto','motoacuatica','jet','jetski','motoski') && has('moto de agua','moto acuatica','motoacuatica','jet ski','jetski','motoski')) {
    if(part) return choices('Describí el repuesto de la moto de agua: qué pieza es y para qué sirve.',[]);
    return choices('¿Esta descripción corresponde a tu producto?',[
      code('89039300','Moto de agua / motoski completa, de hasta 7,5 m de longitud'),
    ]);
  }
  if (starts('caja','maletin','toolbox','tool') && has('caja de herramientas','caja para herramientas','maletin de herramientas','toolbox','tool box')) {
    return choices('¿Qué incluye y cómo es la caja de herramientas?',[
      code('39269090','Caja rígida de plástico, vacía, para guardar herramientas'),
      code('42029200','Bolso o estuche para herramientas, con exterior textil o de hojas de plástico'),
      code('82060000','Juego para venta al por menor: herramientas de dos o más partidas 8202 a 8205'),
    ]);
  }
  if (starts('silla') && has('silla de ruedas')) return {prefixes:['8713'],query:value};
  if ((starts('silla','sillon','asiento','chair','seat','sofa') || part) && has('silla','sillon','asiento','chair','seat','sofa')) {
    if(part) return {prefixes:['94019'],query:value};
    if (has('auto','automovil','vehiculo','aeronave','avion','odontologico','medico','peluqueria','bebe')) return {prefixes:has('odontologico','medico','peluqueria')?['9402']:has('bebe')?['9401','8715']:['94011','94012'],query:value};
    if(has('giratoria','giratorio','oficina','gamer','escritorio')) return choices('Para una silla giratoria, confirmá su estructura y que tenga altura ajustable.',[
      code('94013100','Silla giratoria de altura ajustable, de madera'),
      code('94013900','Silla giratoria de altura ajustable, de otros materiales'),
    ]);
    if(has('cama','transformable')) return choices('Confirmá el material del asiento transformable en cama.',[
      code('94014100','Asiento transformable en cama, de madera'),code('94014900','Asiento transformable en cama, de otros materiales'),
    ]);
    if(has('madera','wood')) return choices('Para la silla de madera, ¿cuál es la variante?',[
      code('94016100','Asiento con armazón de madera, con relleno o tapizado'),
      code('94016900','Asiento con armazón de madera, sin relleno'),
    ].filter(o=>has('sin relleno','sin tapizado','no tapizada','no tapizado')?o.hsCode==='94016900':has('tapizada','tapizado','acolchada','acolchado')?o.hsCode==='94016100':true));
    if(has('metal','metalica','metalico','acero','aluminio')) return choices('Para la silla de metal, ¿cuál es la variante?',[
      code('94017100','Asiento con armazón de metal, con relleno o tapizado'),code('94017900','Asiento con armazón de metal, sin relleno'),
    ]);
    if(has('plastico','plastica')) return choices('Confirmá la descripción del asiento.',[code('94018000','Asiento de plástico, sin armazón de madera o metal')]);
    return choices('¿Cómo es la silla o el asiento? El material y el mecanismo cambian la clasificación.',[
      refine('Con armazón de madera','silla con armazón de madera'),refine('Con armazón de metal','silla con armazón de metal'),
      refine('De plástico','silla de plástico'),refine('Giratoria de altura ajustable','silla giratoria de altura ajustable'),
    ]);
  }
  if(starts('moto','motocicleta','scooter','ciclomotor') && has('moto','motocicleta','scooter','ciclomotor') && !part) {
    const opts=[code('87111000','Motocicleta con motor de pistón, hasta 50 cm³'),code('87112010','Motocicleta de más de 50 y hasta 125 cm³'),
      code('87112020','Motocicleta de más de 125 y hasta 250 cm³'),code('87113000','Motocicleta de más de 250 y hasta 500 cm³'),
      code('87114000','Motocicleta de más de 500 y hasta 800 cm³'),code('87115000','Motocicleta de más de 800 cm³'),code('87116000','Motocicleta con motor eléctrico')];
    const cc=q.match(/\b(\d+(?:[.,]\d+)?)\s*(?:cc|cm3|cm³)\b/);
    let options=opts;
    if(has('electrica','electrico')) options=opts.slice(-1);
    else if(cc){const n=Number(cc[1].replace(',','.'));options=[opts[n<=50?0:n<=125?1:n<=250?2:n<=500?3:n<=800?4:5]];}
    return choices('Confirmá la motorización de la motocicleta completa.',options);
  }
  if(starts('botella','bottle') && has('botella','bottle') && !(has('botella termica','botella termico','termo','isotermico','isotermica') && !has('sin aislamiento'))) {
    if(has('vidrio')) return {prefixes:['701090'],query:value+' envase capacidad'};
    if(has('plastico','plastica','pet')) return {prefixes:['392330'],query:value+' envase'};
    if(has('acero','aluminio','metal')) {
      if(has('inoxidable')) return choices('Confirmá que la botella sea reutilizable y no tenga aislamiento al vacío.',[code('73239300','Botella reutilizable de acero inoxidable, sin aislamiento al vacío')]);
      return choices('Indicá la aleación de la botella y si tiene aislamiento térmico. Estos datos cambian su clasificación.',[]);
    }
    return choices('¿De qué material es la botella y para qué se usa?',[
      refine('Envase de vidrio','botella de vidrio para envasar bebidas'),refine('Envase de plástico','botella de plástico para envasar bebidas'),
      refine('Botella reutilizable de acero inoxidable, sin aislamiento','botella reutilizable de acero inoxidable para beber sin aislamiento térmico'),
      refine('Botella térmica / termo al vacío','botella térmica al vacío'),
    ]);
  }
  if(has('herramienta') && !has('martillo','destornillador','alicate','taladro','amoladora','sierra','llave')) {
    if(has('electrica','electrico')) return choices('¿Qué herramienta eléctrica es?',[
      refine('Taladro eléctrico','taladro eléctrico de mano'),refine('Amoladora eléctrica','amoladora eléctrica de mano'),refine('Sierra circular eléctrica','sierra circular eléctrica de mano'),
    ]);
    return choices('¿Qué herramienta querés importar? Elegí una opción o agregá más detalle en la descripción.',[
      refine('Martillo manual','martillo manual'),refine('Destornillador manual','destornillador de mano'),refine('Alicate de mano','alicate de mano'),
      refine('Juego de herramientas en caja','caja de herramientas'),refine('Herramienta eléctrica','herramienta eléctrica'),
    ]);
  }
  return null;
}

import { describe, it, expect } from "vitest";
import { publicQuote, publicModes, originAllowed } from "../src/lib/publicQuote.js";
import { DEF, calculate } from "../src/lib/calc.js";
const base = { tipo:"avion", origenSel:"China", paisOrigen:"China", fob:1000, peso:10, largo:10, ancho:10, alto:10, aiDutyRate:18 };
describe("oferta comercial pública", () => {
  it.each([[9.99,"avion"],[10,"dhl"],[10.01,"dhl"]])("China con %s kg elige %s", (peso,tipo) => {
    const q=publicQuote({...base,peso},DEF); expect(q.d.tipo).toBe(tipo);
    expect(q.r).toEqual(calculate(q.d,DEF));
    expect(publicModes({...base,peso},DEF).map(m=>m.key)).toEqual([tipo==="dhl"?"dhl":"air","seaM3"]);
  });
  it("usa peso facturable, incluso con peso real menor a 10 kg", () => {
    expect(publicQuote({...base,peso:2,largo:50,ancho:50,alto:50},DEF).d.tipo).toBe("dhl");
  });
  it.each(["Estados Unidos (USA)","Brasil"])("%s mantiene aéreo comercial", origen => {
    expect(publicQuote({...base,paisOrigen:origen,origenSel:origen},DEF).d.tipo).toBe("avion");
  });
  it("respeta DHL desactivado y retira opciones anteriores de los resultados", () => {
    expect(publicQuote(base,{...DEF,dhlPublic:false}).d.tipo).toBe("avion");
    const q=publicQuote({...base,tipo:"barco",seaMode:"kg",subTipo:"personal",m3manual:2},DEF);
    expect(q.d.seaMode).toBe("m3"); expect(q.r.isPersonal).toBe(false); expect(q.r.seaKg).toBe(false);
  });
  it("no ofrece aéreo sin medidas ni acepta la ruta retirada", () => {
    expect(publicModes({...base,tipo:"barco",largo:"",ancho:"",alto:"",m3manual:1},DEF).map(m=>m.key)).toEqual(["seaM3"]);
    expect(originAllowed("España")).toBe(false);
    expect(()=>publicQuote({...base,paisOrigen:"España"},DEF)).toThrow();
  });
});

it("no compara volúmenes distintos ni reutiliza un CBM viejo al volver a aéreo",()=>{
  const sea=publicModes({...base,tipo:"barco",m3manual:2},DEF);
  expect(sea.map(m=>m.key)).toEqual(["seaM3"]);
  const air=publicModes({...base,m3manual:2},DEF);
  expect(air.find(m=>m.key==="seaM3").r.m3).toBeCloseTo(0.001);
});

import { describe,it,expect } from "vitest";
import { NCM8,NCM_MIXED } from "../src/data/ncm8.js";
import { classifyCode, classifyProduct } from "../src/lib/tariffEngine.js";
import { normalizeCP } from "../src/lib/dhlZones.js";
describe("coherencia de la fuente oficial", () => {
  it("ninguna tabla histórica pisa el DIE de un NCM existente", () => {
    for(const [code,rate] of Object.entries(NCM8)) expect(classifyCode(code).selected.dutyRate,code).toBe(rate);
  });
  it("advierte aperturas SIM con porcentajes diferentes", () => {
    for(const code of Object.keys(NCM_MIXED)) {
      const selected=classifyCode(code).selected;
      expect(selected.confidence).toBe("medium");
      expect(selected.warnings.join(" ")).toMatch(/SIM/);
    }
  });
  it.each(["123456","CP4600","4600ABC","00000","4600!","Y4600AB"])("no extrae un CP de una entrada incorrecta: %s", value => {
    expect(normalizeCP(value).num).toBeNull();
  });
});

import {familyEstimate,detectFamily} from "../src/lib/families.js";
it("herramientas eléctricas prioriza la familia específica y calcula desde la base oficial",()=>{
  const family=detectFamily("herramientas eléctricas");
  expect(family.id).toBe("herramientas-electricas");
  const rates=Object.entries(NCM8).filter(([c])=>c.startsWith("8467")).map(([,v])=>v).sort((a,b)=>a-b);
  const middle=Math.floor(rates.length/2);
  expect(familyEstimate(family).rate).toBe(Math.round((rates.length%2?rates[middle]:(rates[middle-1]+rates[middle])/2)*10)/10);
});

it("un cambio real de DIE se refleja sin editar reglas de producto ni congelar la alícuota histórica",()=>{
  const previous=NCM8["82052000"];
  try {
    NCM8["82052000"]=previous+1;
    expect(classifyCode("8205.20.00").selected.dutyRate).toBe(previous+1);
    expect(classifyProduct("martillo manual").selected.dutyRate).toBe(previous+1);
  } finally {NCM8["82052000"]=previous;}
});

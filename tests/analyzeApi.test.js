import { describe,it,expect,vi,afterEach } from "vitest";
import handler from "../api/analyze.js";
const call=async(type,value)=>{
  let payload;
  const res={setHeader(){},status(){return this},json(v){payload=v;return this},end(){return this}};
  await handler({method:"POST",headers:{"x-forwarded-for":"prueba-api"},body:{type,value}},res);
  return JSON.parse(payload.content[0].text);
};
afterEach(()=>vi.unstubAllEnvs());
describe("buscador único por API",()=>{
  it.each([["martillo manual de acero","8205.20.00"],["destornillador de mano","8205.40.00"],["alicates de mano","8203.20.10"]])("%s usa una posición específica existente",async(query,code)=>{
    const result=await call("product",query);
    expect(result.hsCode).toBe(code);expect(result.method).toBe("regla-especifica-validada");
    const byCode=await call("hsCode",code);expect(result.dutyRate).toBe(byCode.dutyRate);
    expect(result.baseDate).toBe(byCode.baseDate);
  });
  it("herramientas amplias pide identificar la herramienta antes de asignar un arancel",async()=>{
    vi.stubEnv("ANTHROPIC_API_KEY","");
    const result=await call("product","herramientas");
    expect(result.needsConfirmation).toBe(true);expect(result.dutyRate).toBeNull();expect(result.requiresManualValidation).toBe(true);
  });
  it.each(["8499.99.99","8205200000","abcd82052000"])("rechaza %s sin inventar un porcentaje",async(value)=>{
    const result=await call("hsCode",value);expect(result.dutyRate).toBeNull();expect(result.error).toBeTruthy();
  });
});

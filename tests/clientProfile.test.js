import { describe, expect, it } from "vitest";
import { loadClientProfile, saveClientProfile } from "../src/lib/clientProfile.js";

const storage = () => {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key), values };
};
describe("datos del cliente en el mismo navegador", () => {
  it("recupera contactos y conserva ceros del CP, sin persistir productos ni documentos", () => {
    const store = storage();
    saveClientProfile({ nombre:"Francisco", whatsapp:"+54 9 3885 223299", email:"fvr@example.com", cp:"0123", producto:"herramientas", files:["factura.pdf"], docUrls:["privado"] }, store);
    expect(loadClientProfile(store)).toEqual({ nombre:"Francisco", whatsapp:"+54 9 3885 223299", email:"fvr@example.com", cp:"0123" });
    expect([...store.values.values()][0]).not.toMatch(/herramientas|factura|privado/);
  });
  it("borra el registro al vaciar los contactos sin tocar otros datos del navegador", () => {
    const store = storage(); store.setItem("fvr_cfg", "configuración");
    saveClientProfile({ nombre:"Cliente" }, store);
    saveClientProfile({}, store);
    expect(store.values.size).toBe(1);
    expect(store.getItem("fvr_cfg")).toBe("configuración");
    expect(loadClientProfile(store).nombre).toBe("");
  });
  it("tolera registros corruptos, versiones incompatibles y valores inesperados", () => {
    const store = storage();
    for (const raw of ["{", "null", '{"version":99,"contact":{"nombre":"Viejo"}}', '{"version":1,"contact":{"nombre":{},"cp":42}}']) {
      store.setItem("fvr_client_profile_v1", raw);
      expect(loadClientProfile(store)).toEqual({ nombre:"", whatsapp:"", email:"", cp:"" });
    }
  });
  it("no rompe el cotizador si el almacenamiento está bloqueado", () => {
    const blocked = { getItem(){ throw Error(); }, setItem(){ throw Error(); }, removeItem(){ throw Error(); } };
    expect(loadClientProfile(blocked).nombre).toBe("");
    expect(saveClientProfile({ nombre:"Cliente" }, blocked)).toBe(false);
  });
});

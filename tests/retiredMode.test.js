import { describe, expect, it, vi } from "vitest";
import { calculate, compareModes, DEF, currentSettings } from "../src/lib/calc.js";
import { publicQuote } from "../src/lib/publicQuote.js";
import { buildQuotePDF } from "../src/lib/pdfQuote.js";
import { sanitizeSettings } from "../api/settingsModel.js";
import { mergeTemporarySettings } from "../src/lib/internalOverrides.js";
import { fetchCanonicalSettings, saveCanonicalSettings } from "../src/lib/settingsRemote.js";

const retiredKeys = ["seaRateKg", "seaCustomsPerKg", "handlingSea", "domesticSeaKg", "feePctKg", "feeFixedKg"];
const staleSettings = { ...DEF, seaRate: 444, airRateChina: 31, dhlRateHigh: 19, ...Object.fromEntries(retiredKeys.map(k => [k, 999])) };
const quote = { tipo:"barco", seaMode:"kg", peso:65, fob:1000, largo:100, ancho:100, alto:100, m3manual:2, aiDutyRate:20 };

describe("retiro definitivo de modalidades discontinuadas", () => {
  it("bloquea cotizaciones antiguas en vez de convertirlas silenciosamente a m³", async () => {
    expect(() => calculate(quote, staleSettings)).toThrow("Modalidad no disponible");
    expect(() => publicQuote(quote, staleSettings)).toThrow("Modalidad no disponible");
    await expect(buildQuotePDF(quote, {}, 1570, staleSettings)).rejects.toThrow("Modalidad no disponible");
  });

  it("sólo compara servicios vigentes y no ofrece marítimo sin volumen", () => {
    const modes = compareModes({ ...quote, tipo:"avion", subTipo:"comercial", origenSel:"China" }, DEF);
    expect(modes.map(m => m.key)).toEqual(["aereo", "dhl", "barcoM3"]);
    const sea = modes.find(m => m.key === "barcoM3");
    expect(sea.d.seaMode).toBe("m3");
    expect(sea.r.flete).toBe(1200);
    expect(compareModes({ peso:65, fob:1000 }, { ...DEF, dhlActive:false })).toEqual([]);
  });

  it("descarta tarifas antiguas sin modificar las tarifas de las modalidades vigentes", () => {
    for (const cleaned of [currentSettings(staleSettings), sanitizeSettings(staleSettings), mergeTemporarySettings(staleSettings, { seaRate:"444", seaRateKg:"1" })]) {
      retiredKeys.forEach(k => expect(cleaned).not.toHaveProperty(k));
      expect(cleaned.seaRate).toBe(444);
      expect(cleaned.airRateChina).toBe(31);
      expect(cleaned.dhlRateHigh).toBe(19);
      expect(calculate({ ...quote, seaMode:"m3" }, cleaned).flete).toBe(888);
    }
    retiredKeys.forEach(k => expect(staleSettings[k]).toBe(999));
  });

  it("no vuelve a cargar ni guardar parámetros retirados desde una sesión vieja", async () => {
    const server = vi.fn(async () => ({ ok:true, json:async () => ({ settings:staleSettings, revision:7 }) }));
    const remote = await fetchCanonicalSettings(server);
    retiredKeys.forEach(k => expect(remote.settings).not.toHaveProperty(k));
    await saveCanonicalSettings(staleSettings, "clave", 7, server);
    const sent = JSON.parse(server.mock.calls[1][1].body).settings;
    retiredKeys.forEach(k => expect(sent).not.toHaveProperty(k));
    expect(sent.seaRate).toBe(444);
  });
});

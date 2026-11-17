import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../api/quotes.js";

afterEach(() => vi.unstubAllEnvs());

describe("cotizaciones de sesiones desactualizadas", () => {
  it.each([
    { tipo:"barco", seaMode:"kg" },
    { tipo:"avion", subTipo:"personal" },
    { tipo:"dhl", subTipo:"personal" },
    { tipo:"avion", subTipo:"comercial", origenSel:"España" },
  ])("rechaza una solicitud retirada antes de guardar: %j", async formData => {
    vi.stubEnv("DATABASE_URL", "postgresql://unused");
    const res = { setHeader:vi.fn(), status:vi.fn(), json:vi.fn() };
    res.status.mockReturnValue(res);
    await handler({ method:"POST", body:{ id:"legacy-quote", formData } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error:expect.stringMatching(/(Modalidad|Origen) no disponible/) });
  });
});

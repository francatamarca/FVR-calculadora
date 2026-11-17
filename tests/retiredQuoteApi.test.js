import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../api/quotes.js";

afterEach(() => vi.unstubAllEnvs());

describe("cotizaciones de sesiones desactualizadas", () => {
  it("rechaza la modalidad retirada antes de intentar guardar el presupuesto", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://unused");
    const res = { setHeader:vi.fn(), status:vi.fn(), json:vi.fn() };
    res.status.mockReturnValue(res);
    await handler({ method:"POST", body:{ id:"legacy-quote", formData:{ tipo:"barco", seaMode:"kg" } } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error:expect.stringContaining("Modalidad no disponible") });
  });
});

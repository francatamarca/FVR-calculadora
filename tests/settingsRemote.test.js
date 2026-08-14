import { describe, expect, it, vi } from "vitest";
import { fetchCanonicalSettings, saveCanonicalSettings } from "../src/lib/settingsRemote.js";
import { calculate, DEF } from "../src/lib/calc.js";

const response = (body, ok = true) => ({ ok, json: async () => body });

describe("configuración central", () => {
  it("lee sin caché la revisión canónica", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ settings: { seaRate: 450 }, revision: 7, updatedAt: "2026-08-13T12:00:00Z" }));
    const result = await fetchCanonicalSettings(fetchMock);
    expect(fetchMock).toHaveBeenCalledWith("/api/settings", expect.objectContaining({ method: "GET", cache: "no-store" }));
    expect(result).toEqual({ settings: { seaRate: 450 }, revision: 7, updatedAt: "2026-08-13T12:00:00Z" });
  });

  it("guarda el objeto completo con autorización y devuelve la nueva revisión", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ settings: { seaRate: 100 }, revision: 8, updatedAt: "2026-08-13T13:00:00Z" }));
    const result = await saveCanonicalSettings({ seaRate: 100 }, "clave", 7, fetchMock);
    expect(fetchMock).toHaveBeenCalledWith("/api/settings", expect.objectContaining({
      method: "PUT",
      headers: expect.objectContaining({ "x-admin-key": "clave" }),
      body: JSON.stringify({ settings: { seaRate: 100 }, baseRevision: 7 }),
    }));
    expect(result.revision).toBe(8);
  });

  it("rechaza guardar sin autorización", async () => {
    await expect(saveCanonicalSettings({ seaRate: 600 }, "", 0, vi.fn())).rejects.toThrow("autorización");
  });

  it("no convierte un error remoto en una configuración válida", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ error: "caído" }, false));
    await expect(fetchCanonicalSettings(fetchMock)).rejects.toThrow("caído");
  });

  it("otra sesión usa siempre el último valor guardado: 450 → 600 → 100", async () => {
    let settings = { ...DEF };
    let revision = 0;
    const server = vi.fn(async (_url, options) => {
      if (options.method === "PUT") {
        settings = JSON.parse(options.body).settings;
        revision += 1;
      }
      return response({ settings, revision, updatedAt: `revision-${revision}` });
    });
    const quote = { tipo: "barco", seaMode: "m3", fob: 1000, m3manual: 1, aiDutyRate: 20 };

    for (const expectedRate of [450, 600, 100]) {
      await saveCanonicalSettings({ ...settings, seaRate: expectedRate }, "clave", revision, server);
      const remoteSession = await fetchCanonicalSettings(server);
      expect(remoteSession.settings.seaRate).toBe(expectedRate);
      expect(calculate(quote, remoteSession.settings).flete).toBe(expectedRate);
    }

    expect(revision).toBe(3);
  });
});

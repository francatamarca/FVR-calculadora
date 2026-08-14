const SETTINGS_ENDPOINT = "/api/settings";

const parseResponse = async (res, fallbackMessage) => {
  let body = null;
  try { body = await res.json(); } catch {}
  if (!res.ok) throw new Error(body?.error || fallbackMessage);
  return body || {};
};

export const fetchCanonicalSettings = async (fetchImpl = fetch) => {
  const res = await fetchImpl(SETTINGS_ENDPOINT, {
    method: "GET",
    cache: "no-store",
    headers: { "Cache-Control": "no-cache" },
  });
  const body = await parseResponse(res, "No se pudo leer la configuración central.");
  return {
    settings: body.settings && typeof body.settings === "object" ? body.settings : null,
    revision: Number(body.revision || 0),
    updatedAt: body.updatedAt || null,
  };
};

export const saveCanonicalSettings = async (settings, adminKey, baseRevision, fetchImpl = fetch) => {
  if (!adminKey) throw new Error("Falta la autorización de administrador.");
  if (!Number.isInteger(baseRevision) || baseRevision < 0) throw new Error("Falta la revisión central de origen.");
  const res = await fetchImpl(SETTINGS_ENDPOINT, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      "x-admin-key": adminKey,
    },
    body: JSON.stringify({ settings, baseRevision }),
  });
  const body = await parseResponse(res, "No se pudo guardar la configuración central.");
  if (!body.settings || typeof body.settings !== "object") {
    throw new Error("El servidor no devolvió la configuración guardada.");
  }
  return {
    settings: body.settings,
    revision: Number(body.revision || 0),
    updatedAt: body.updatedAt || null,
  };
};

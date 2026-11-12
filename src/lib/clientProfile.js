// Sólo datos de contacto. Los documentos y datos del producto no se
// guardan en este registro persistente del navegador.
const KEY = "fvr_client_profile_v1";
const LIMITS = { nombre: 200, whatsapp: 60, email: 254, cp: 20 };
const clean = (value) => Object.fromEntries(Object.entries(LIMITS).map(([key, max]) =>
  [key, typeof value?.[key] === "string" ? value[key].slice(0, max) : ""]));

export const loadClientProfile = (storage) => {
  try {
    const value = JSON.parse((storage ?? globalThis.localStorage).getItem(KEY));
    return clean(value?.version === 1 ? value.contact : null);
  } catch { return clean(null); }
};

export const saveClientProfile = (form, storage) => {
  try {
    const target = storage ?? globalThis.localStorage;
    const contact = clean(form);
    if (Object.values(contact).some(Boolean)) {
      target.setItem(KEY, JSON.stringify({ version: 1, contact }));
    } else target.removeItem(KEY);
    return true;
  } catch { return false; }
};

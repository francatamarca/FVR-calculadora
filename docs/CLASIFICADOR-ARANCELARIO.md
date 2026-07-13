# Clasificador arancelario FVR — arquitectura y mantenimiento

**Versión:** 2.0 (2026-07-13) · reemplaza al sistema auditado en `AUDITORIA-IA-ARANCELES.md`

---

## 1. Informe de auditoría (Fase 1) — qué había y qué se encontró

| Dato | Antes (v1) | Ahora (v2) |
|---|---|---|
| Base de 8 dígitos | TEC/AEC **de Brasil** (XLSX Gecex 272/21) — jurisdicción brasileña, sin DIE argentino | **DIE argentino consolidado de ARCA** (arancel.zip diario) |
| Descripciones | No había (solo código→%) | 10.230 descripciones oficiales en español (ARCA) |
| Excepciones AR | 4 hardcodeadas (2 estaban mal) | Estructura versionada + ya vienen consolidadas en la base |
| Matcher de texto | `includes()` con falsos positivos | Palabra completa + guards + BM25 + IA restringida |
| Actualización | Manual, sin script reproducible | Pipeline + GitHub Action semanal con PR |

**Errores concretos que la fuente oficial corrigió** (verificados contra ARCA 13/07/2026):
- Ortopédicos 9021.10.10: figuraba 0% → el DIE real es **12,6%**
- Sillas de ruedas 8713.10.00: figuraba 8% → el DIE real es **10,8%** (8713.90 con motor: 0%)
- **Notebooks/tablets 8471.30.xx: figuraba 0% (BIT) → el DIE real vigente es 16%**
- Cámaras de vigilancia 8525.89.19: la TEC decía 20% → el DIE real es **2%**
- Martillos 8205.59.00: tabla interna decía 12% → DIE real **18%**

## 2. Fuentes oficiales (Fase 2) — comparación y elección

| Fuente | Qué da | Formato | Automatizable | Uso |
|---|---|---|---|---|
| **ARCA arancel.zip** ⭐ | DIE argentino consolidado + descripciones ES + DE/reintegros, actualizado a DIARIO (~02:00 AR) | ZIP con TXT delimitado por `@` | Sí — `curl` directo, sin auth | **FUENTE PRINCIPAL** |
| POLCOM Mercosur | AEC + flag BK/BIT + descripciones ES/PT, versionado NCM | JSON (endpoint DataTables con CSRF) | Sí (2 pasos) | Control cruzado futuro |
| Brasil MDIC XLSX | TEC brasileña | XLSX (URL cambia por fecha) | Frágil (scrape del índice) | Solo verificación anual |
| VUCE Argentina | Posiciones + tratamientos | API JSON **con token OIDC** | No limpio | Referencia visual manual |
| datos.gob.ar | — | — | — | NO tiene el nomenclador |
| InfoLeg/BO | Normas (557/23, 236/25, 333/25, 513/25, 273/25) | PDF | Solo monitoreo | Contexto normativo — el zip de ARCA ya las consolida |

- URL fuente: `https://serviciosweb.afip.gob.ar/aduana/arancelintegrado/archivos/arancel.zip`
- Diseño de registro: `2@POSICION_SIM(16)@DE@ReintExtra@DIE@ReintIntra@DII@DerEspMin@UEst@UDerEsp@DESCRIPCION` (encoding Latin-1)
- El campo 5 (DIE) es el Derecho de Importación Extrazona **ya consolidado con todos los decretos** — no hay que aplicar excepciones a mano.

## 3. Pipeline de actualización (Fase 3)

```
node scripts/update-tariff-base.mjs            # descarga + regenera + tests
node scripts/update-tariff-base.mjs --dry-run  # solo muestra el diff
node scripts/update-tariff-base.mjs --offline arancel.zip  # sin red
node scripts/update-tariff-base.mjs --force    # salta freno de cambios masivos
```

Qué hace: descarga → checksum SHA-256 → parsea (SIM → NCM 8 díg, DIE = moda de las hojas) → **sanity gates** (≥9.000 posiciones, aranceles en [0,60], ≤5% sin descripción, caída ≤5% vs anterior, cambios ≤20%) → genera `src/data/ncm8.js` + `ncmDescriptions.js` + `tariffMeta.js` + `data/tariff-base.json` → **corre vitest**; si algo falla **restaura el backup** y no publica → registra en `data/tariff-history/CHANGELOG.md`.

**Automatización:** `.github/workflows/tariff-update.yml` — lunes 09:00 AR y a demanda. Si hay cambios abre un **PR** (nunca publica solo). Rollback = revert del commit.

La app muestra "Base arancelaria oficial (ARCA) actualizada al DD/MM/AAAA" (footer + tarjeta de análisis), leyendo `src/data/tariffMeta.js` (archivo chico, el dataset completo de 1,9 MB **jamás va al bundle del cliente** — solo lo importan las funciones `/api/*`; hay un check de fuga en el build de esta sesión que conviene repetir si se cambian imports).

## 4. Clasificador híbrido (Fase 4)

```
texto del cliente
  │  CAPA A: normalización (textNorm.js) — minúsculas, acentos, plurales,
  │          stopwords, alias regionales/inglés (goma→caucho, hammer→martillo)
  ▼
  CAPA local determinística (tariffEngine.classifyProduct):
    1. sinónimos → 2. reglas curadas por PALABRA COMPLETA con guards
    negativos → 3. familia comercial → 4. genérico 16%
  ▼
  /api/analyze (solo "product"):
  │  CAPA B: candidatos REALES = regla matcheada + BM25/fuzzy (ncmSearch.js)
  │          sobre las 10.230 descripciones oficiales → 5-15 candidatos
  │  CAPA C: Claude Haiku elige SOLO entre esos candidatos (o "ninguno"),
  │          con confianza + motivo + alternativas
  │  CAPA D: validación inversa — el prompt exige rechazar descripciones
  │          incompatibles; el server valida que la elección esté en la lista;
  │          "ninguno"/inválido → jerarquía local
  ▼
  % SIEMPRE de classifyCode() (base DIE + excepciones) — NUNCA de la IA
```

Orden de capas por código (Fase 7): excepciones AR verificadas → Dec. 236/2025 → **DIE oficial 8 díg** → tabla 4 díg (solo si no hay posición oficial) → capítulo → nada (validación manual). La tabla de 4 dígitos **no puede pisar** una posición oficial.

## 5. Entradas amplias (Fase 5)

Jerarquía: producto exacto → familia comercial → capítulo → **16% genérico (última alternativa, no se elimina)**.

"herramientas", "ropa", "telas", etc. resuelven por **familia** (`src/lib/families.js`): el % es la **mediana determinística** de todas las posiciones oficiales de las partidas de la familia, con las capas argentinas aplicadas. Confianza siempre "estimación por categoría". 20 familias definidas.

## 6. Mantenimiento

| Tarea | Dónde | Cómo |
|---|---|---|
| Agregar producto puntual | `src/lib/tariffData.js` → `KEYWORD_RULES` (arriba) | `{k:["términos"], hs:"posición QUE EXISTA", rate: <DIE verificado>, desc:"..."}` — el % se re-resuelve solo contra la base |
| Evitar un falso positivo | misma regla, campo `not:["token"]` | tokens que descartan la regla |
| Agregar familia | `src/lib/families.js` → `FAMILIES` | términos + partidas; el % se calcula solo |
| Override de emergencia | `src/data/argExceptions.js` | entrada con `verified:true` + norma; documentar |
| Actualizar base | `node scripts/update-tariff-base.mjs` o esperar el PR del lunes | — |
| Ver dónde falla | Panel Admin → Dashboard → "🤖 Clasificador arancelario" | consultas al 16%, correcciones, candidatos a reglas nuevas |

Después de CUALQUIER cambio: `npx vitest run` (75 tests — la batería de Fase 9 está en `tests/classifier.test.js`).

## 7. Telemetría (Fase 10)

Cada análisis guarda en el lead (`formData.aiTelemetry`, sin datos personales): consulta, método (`local` / `ia-candidatos` / `ia-legacy` / `local-ia-rechazo`), código elegido, confianza, precisión, si cayó al 16%, cuántas alternativas se mostraron y si el cliente lo corrigió (con qué). El dashboard admin resume: % al 16% genérico, correcciones y las consultas sin clasificar (candidatas a reglas nuevas).

## 8. Lo que este sistema NO garantiza (leer antes de confiar ciegamente)

1. **No reemplaza al despachante.** La posición SIM final (16 dígitos, con sufijos de valor e intervenciones) la determina el despachante en la destinación. Esto estima el DIE a nivel NCM de 8 dígitos.
2. **DIE mixto dentro de una NCM:** 56 posiciones tienen DIE distinto según el sufijo SIM (quedan marcadas `mixed` en `data/tariff-base.json`); se usa el valor más frecuente.
3. **La IA puede elegir mal entre candidatos válidos** si la descripción del cliente es ambigua — por eso muestra confianza + alternativas y nunca dice "confirmado".
4. **Intervenciones y tributos no arancelarios** (licencias, IVA adicional percepciones especiales por producto, impuestos internos específicos) no salen de esta base.
5. **Si ARCA cambia el formato del TXT**, el pipeline falla en seco (por diseño): conserva la base anterior y hay que adaptar `parse()`.

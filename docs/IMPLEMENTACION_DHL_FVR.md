# Implementación DHL Express — Informe

**Fecha:** 2026-07-14 · **Punto de restauración:** commit `3033421` (estado previo, pusheado)
**Estado:** implementado y validado. **DHL público: APAGADO por defecto** (activación abajo). DHL interno: ACTIVO.

---

## 1. Qué se implementó

Nueva modalidad **DHL Express (China → Argentina, solo envío comercial, ≥ 10 kg facturables)** como cuarta alternativa, con una sola carga de datos. Sin tocar las fórmulas de aéreo comercial/personal ni marítimas (regresión congelada por test).

## 2. Archivos modificados / agregados

| Archivo | Cambio |
|---|---|
| `src/lib/calc.js` | **`calculateDhl()`** (motor independiente — cero `if DHL` en la fórmula aérea), **`dhlEligibility()`**, **`packGroups()`/`packTotals()`** (bultos múltiples, fuente única de volumen), config DHL en `DEF`, ruteo `tipo:"dhl"` en `calculate()`, DHL en `compareModes()` (interno) |
| `src/lib/dhlZones.js` *(nuevo)* | `normalizeCP()` (4600 / Y4600 / Y4600ABC), `remoteStatus()` (`remote`/`not_remote`/`unknown`), `deliveryEstimate()` |
| `src/data/dhlRemoteZones.js` *(nuevo)* | Lista local de CPs remotos — **VACÍA a propósito** (no se inventan códigos) |
| `scripts/import-dhl-zones.mjs` *(nuevo)* | Importador de la lista oficial (CSV/JSON → regenera el archivo con fecha) |
| `src/App.jsx` | Campo CP (paso 1), bultos iguales/diferentes con grupos, 4 tarjetas + tarjeta deshabilitada, detalle DHL, resumen DHL, PDF DHL, WhatsApp/copiar DHL, config admin, interno DHL, chips de portada, filtro de presupuestos |
| `tests/dhl.test.js` *(nuevo)* | 56 pruebas nuevas (ver §5) |

## 3. Fórmulas finales (verificadas por test al decimal)

```
Volumen total  = Σ (cant grupo × largo × ancho × alto)          [cm³]
Peso vol. DHL  = volumen ÷ 4.000        (divisor propio, NO el 5.000 aéreo)
Facturable     = max(peso real, peso vol. DHL)
Flete cobrado  = facturable × (20 USD/kg si <30 kg | 15 USD/kg si ≥30)
Flete base ad. = facturable × 3 USD/kg  (SOLO tributos — no se cobra; override total en interno)
Seguro         = (FOB + flete base) × 1% (reutiliza el % global)
CIF            = FOB + flete base + seguro
Derecho        = CIF × alícuota (misma fuente: IA/categoría/HS/manual/config)
Tasa           = CIF × 3% · Base IVA = CIF+Der+Tasa · IVA = Base × 21%
Handling DHL   = 18,15 USD (único cargo — sin honorarios, pickup ni nacional)
Total servicio = flete cobrado + seguro + derecho + tasa + IVA + handling
Total general  = FOB + total servicio (FOB una sola vez)
```
Límites sin error de borde: 10,000 y 29,999 → 20/kg · 30,000 → 15/kg.

## 4. Compatibilidad y persistencia

- **Presupuestos viejos abren igual**: sin `packageGroups` se construye un grupo único desde largo/ancho/alto × bultos. Los resultados guardados son snapshot (nunca se recalculan con tarifas nuevas).
- Cambio de comportamiento **intencional** (spec §12): el peso volumétrico aéreo ahora multiplica por la cantidad de bultos (antes ignoraba `bultos`). Con 1 bulto (caso típico) nada cambia — la regresión congelada lo garantiza.
- El lead guarda `cp`, `bultosIguales`, `packageGroups` dentro de `formData` (mismo mecanismo). CSV y filtros admiten DHL.
- La extracción IA de documentos sigue intacta: mapea al grupo único legacy; el usuario revisa antes de calcular.

## 5. Pruebas (131/131 verdes)

- **Caso DHL A (10 kg)**: totales exactos 736,42849 / 1.736,42849 ✓
- **Caso DHL B (58,824 kg)**: 1.863,653928908 / 3.673,653928908 ✓
- Límites 10 / 29,999 / 30 kg ✓ · volumétrico ÷4.000 puede mandar ✓
- Elegibilidad: USA/España/personal/<10 kg → NO ✓ · volumétrico ≥10 con real 9 → SÍ ✓
- Bultos múltiples: Σ volumen y Σ peso ✓ · aéreo ÷5.000 sobre el mismo total ✓ · compat legacy ✓
- CP: normalización 3 formatos, original conservado, lista vacía → `unknown` + plazo estándar ✓
- **REGRESIÓN CONGELADA**: presupuesto aéreo de referencia (FOB 999 → total 1.639,14) intacto, con y sin config DHL ✓
- Verificación visual en preview: móvil 375 (4 tarjetas sin overflow, 1/fila), desktop 1440 (2×2), tarjeta deshabilitada <10 kg, interno (caso A = 1.736,43 en UI, override de base aduanera vivo, Personal oculto con DHL), config admin completa, autosuma de peso por grupos (2×8+1×4=20 ✓).

## 6. Zonas remotas — ACCIÓN MANUAL PENDIENTE

La lista oficial de CPs remotos de DHL **no estaba en el repositorio** y no se inventaron códigos. Mientras esté vacía: todo CP → estado interno `unknown` → se muestra el plazo estándar "5 a 7 días hábiles" (nunca "sujeto a confirmación").

**Para importarla** (cuando tengas el archivo oficial de DHL):
```bash
node scripts/import-dhl-zones.mjs zonas-remotas.csv   # o .json
npx vitest run && git add -A && git commit -m "DHL: lista oficial de zonas remotas" && git push
```
Acepta un CP por línea (4600 / Y4600 / Y4600ABC) o JSON array. Registra fecha y cantidad; el admin la muestra.

## 7. Cómo activar DHL públicamente

Hoy: **DHL interno SÍ · DHL público NO**. El toggle "Mostrar DHL en calculadora pública" del admin activa DHL **solo en ese navegador** (la config vive en localStorage por dispositivo) — sirve para previsualizar la experiencia del cliente.

**Para activarlo para TODOS los clientes**: cambiar `dhlPublic: false` → `true` en `DEF` (`src/lib/calc.js`) y pushear (1 línea). Decímelo y lo hago al instante. Al activarse, la portada pasa automáticamente a: *✈️ Aéreo y marítimo · ⚡ DHL Express · 5 a 7 días · 📄 Subí tu factura y listo* (sin "Impuestos incluidos").

## 8. Riesgos pendientes / notas

1. Lista de zonas remotas vacía (acción manual §6) — mientras tanto el plazo mostrado es el estándar.
2. El importador de zonas es por archivo+commit (no upload en el admin): la config del admin es por navegador y no serviría a los clientes — el repo es la fuente que ve todo el mundo.
3. Con bultos >1 en modalidad aérea el volumétrico ahora es correcto (×cantidad) — cotizaciones viejas guardadas no cambian, pero recotizar el mismo caso puede dar más flete aéreo que antes (antes subestimaba).
4. El CP nunca modifica el precio — solo el plazo mostrado.

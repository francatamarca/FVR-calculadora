> ⚠️ **DOCUMENTO HISTÓRICO (v1).** El 13/07/2026 se implementó el clasificador
> v2 que resuelve las debilidades acá descriptas: base = DIE argentino oficial
> de ARCA (actualización automática), matcher por palabra completa, candidatos
> reales + IA restringida, familias comerciales y telemetría.
> **Ver el documento vigente: `docs/CLASIFICADOR-ARANCELARIO.md`.**

# Auditoría — Análisis de IA y clasificación arancelaria

**Proyecto:** FVR Calculadora de importaciones
**Alcance:** SOLO el sistema de detección de arancel (por tipo de producto y por HS Code).
**Fecha:** 2026-07-13
**Estado verificado:** IA **activa** en producción (Claude Haiku 4.5). Base oficial TEC/AEC 10.515 posiciones cargada.

---

## 1. Veredicto en una frase

El sistema es **híbrido y defensivo**: la IA solo **interpreta** el producto y **sugiere un código**; el **porcentaje de arancel nunca lo decide la IA** — sale siempre de una base de datos local (TEC/AEC oficial + excepciones argentinas). Esto es lo correcto y es su mayor fortaleza. La debilidad no está en el arancel (que es sólido), sino en el **paso previo de clasificación**: elegir *qué código* corresponde al producto. Ahí hay dos motores de distinta calidad y un matcher local frágil.

---

## 2. Las 4 formas en que el cliente puede definir el arancel

| Vía | Quién decide el código | Quién decide el % | Precisión |
|-----|------------------------|-------------------|-----------|
| **A. Escribir el producto + "🤖 Analizar IA"** | Claude Haiku (o matcher local si la IA falla) | Base local | Media — depende de que la IA acierte la subpartida |
| **B. Escribir el HS Code + "🔍"** | El cliente | Base local (100% sin IA) | Alta si el código es correcto |
| **C. Elegir una categoría de la lista** | Lista fija de 108 categorías | Tabla fija en el código | Alta pero genérica |
| **D. Escribir el arancel a mano (%)** | — | El cliente | Total (bajo su responsabilidad) |

**Prioridad cuando hay varios cargados:** el motor de cálculo usa `aiDutyRate`, y ese campo lo pisa lo último que el cliente toca. Orden real de "quién gana": manual > categoría > IA/HS. Si no hay nada, usa el arancel por defecto de configuración (`settings.duty`).

---

## 3. Arquitectura (qué archivo hace qué)

```
Cliente escribe producto o HS Code
        │
        ▼
  src/App.jsx  ── handleAnalyzeProduct() / handleAnalyzeHsCode()
        │         (POST /api/analyze con {type, value})
        ▼
  api/analyze.js  ── endpoint serverless (Vercel)
        │
        ├── type "hsCode"  → 100% local, sin IA
        │       classifyCode(value)
        │
        └── type "product" → si hay API key: Claude sugiere código
                              luego classifyCode(códigoSugerido) para el %
                              si no hay key o falla: classifyProduct(texto)
        │
        ▼
  src/lib/tariffEngine.js  ── EL MOTOR (5 capas). Única fuente del %.
        │
        ├── src/data/ncm8.js      → TEC/AEC oficial, 10.515 posiciones (8 díg)
        └── src/lib/tariffData.js → tabla auditada 4 díg + reglas por palabra + capítulos
```

Un segundo endpoint, **`api/document-analyze.js`**, hace lo mismo pero leyendo una factura/packing (PDF o foto): Claude extrae el HS declarado por el proveedor y/o la descripción, y de nuevo **el % lo resuelve el motor local**, nunca el documento.

---

## 4. El motor en 5 capas (`classifyCode`) — orden de prioridad

Cuando entra un código (tipeado, sugerido por IA o declarado en un documento), se resuelve por **la primera capa que matchee**, en este orden:

1. **Excepciones nacionales argentinas** (lo más fuerte). Longest-prefix sobre el código:
   - `847130` notebooks/tablets → **0%**
   - `851712` / `851713` celulares → **0%** (Dec. 333/2025)
   - `8703` autos → **35%** (régimen automotor)
2. **Dec. 236/2025 — textil/calzado** (capítulos 50 a 64). Manda la tabla argentina auditada (telas 18%, prendas/calzado 20%), **ignorando el 35% del AEC Mercosur**.
3. **TEC/AEC oficial a 8 dígitos** (`ncm8.js`, 10.515 posiciones, Res. Gecex 272/21 act. 10/2025). Es la capa más precisa. Marca aviso si la posición es del régimen BIT (informática/telecom, que suele ser 0%).
4. **Tabla interna auditada a 4 dígitos** (`NCM_RATES`, ~600 partidas). Fallback cuando el código no llega a 8 dígitos o no está en la base oficial.
5. **Promedio del capítulo** (`CHAPTER_RATES`, 2 dígitos). Último recurso, marcado como "muy referencial" y con validación manual obligatoria.

Si nada matchea → `requiresManualValidation: true` y no inventa nada.

**Precisión que reporta según lo que ingresás:**
- 8+ dígitos → alta (NCM oficial)
- 6 dígitos → media (HS internacional, "incompleto para Argentina")
- 4 dígitos → media ("referencial, dentro de la partida hay subpartidas distintas")
- menos → requiere validación manual

---

## 5. El motor por descripción (`classifyProduct`) — el eslabón más débil

Cuando NO hay API key, o la IA falla, o se clasifica desde un documento sin HS, se usa el matcher local por palabras clave:

1. Normaliza el texto (minúsculas, sin acentos).
2. Aplica **sinónimos** (ej: "collar gps" → "reloj inteligente"; "silla de ruedas" → término que matchea 8713).
3. Recorre `EXTRA_RULES` (4 reglas) + `KEYWORD_RULES` (~85 reglas, ~140 términos) y **gana la primera** que aparezca como **substring** del texto.
4. Si nada matchea → **fallback genérico 16%** con advertencia fuerte.

**El problema técnico:** usa `texto.includes(palabra)` sin límites de palabra. Palabras cortas dentro de la lista ("moto", "aro", "anillo", "watch", "silla") matchean dentro de palabras más largas y producen **falsos positivos silenciosos** (dan un % con apariencia de acierto).

### Casos reales verificados (todos hoy, en el motor actual)

| Producto ingresado | Clasificó como | % | ¿Correcto? |
|--------------------|----------------|---|-----------|
| `control remoto` | Motocicleta (8711) | 20% | ❌ "re**moto**" contiene "moto" |
| `motosierra` | Motocicleta (8711) | 20% | ❌ "**moto**sierra"; debería ser herramienta (~cap. 84/85) |
| `anillo de goma industrial` | Bisutería (7117) | 18% | ❌ es una junta de caucho (cap. 40) |
| `aro de metal` | Bisutería (7117) | 18% | ❌ "aro" es genérico |
| `perfumero de vidrio` | Perfume (3303) | 18% | ❌ es envase de vidrio (cap. 70) |
| `tela de algodón` | Genérico | 16% | ❌ hay tabla textil (debería ~18%) |
| `sombrero` | Genérico | 16% | ❌ cap. 65 = 18% |
| `termo de acero` | Genérico | 16% | ❌ no matchea nada |
| `reloj despertador` | Genérico | 16% | ❌ hay "reloj pulsera" pero no "reloj" solo |

**Conclusión:** el matcher local acierta bien en los productos que están explícitamente en la lista (celulares, notebooks, remeras, zapatillas, airsoft, etc.), pero es frágil fuera de ella: o inventa un falso positivo por substring, o cae al 16% genérico. **Cubre bien el catálogo típico, mal la cola larga.**

---

## 6. La IA (cuando está activa, como ahora en producción)

- **Modelo:** `claude-haiku-4-5`. Timeout 8s (el plan de Vercel corta a 10s).
- **Su único trabajo:** dado el texto del producto, devolver `{hsCode, description, ambiguo}`. El prompt le **prohíbe explícitamente** devolver porcentajes.
- **Validación:** el código que devuelve se limpia (solo dígitos y puntos), se exige que empiece con 4 dígitos, y se pasa por `classifyCode()` para sacar el %. Si la IA se cae → cae limpio al matcher local.
- **Ventaja sobre el matcher:** entiende lenguaje natural. "Termo de acero para mate" → la IA devolvió `7310.29.00` (recipiente de acero), algo que el matcher local no podía.

### La limitación real de la IA (verificada)
La IA acierta el **capítulo/rubro** pero puede **errar la subpartida exacta**, y como el % sale del código que ella eligió, un código mal elegido da un % plausible pero equivocado. Ejemplo verificado hoy:

> `termo de acero inoxidable para mate` → la IA devolvió **7310.29.00**, cuya descripción oficial es *"recipientes de acero de capacidad **superior a 300 litros**"*. Un termo de mate no es un tanque de 300 L. El código correcto rondaría 9617 (termos) o 7323 (uso doméstico). El % (8%) salió de un código que no corresponde.

Esto no es un bug del código: es el techo natural de clasificar con IA generativa sin una base de posiciones validada detrás. **Es exactamente el problema que resolvería conectar Tarifar** (ver §9).

---

## 7. Fortalezas (lo que está muy bien y hay que conservar)

1. **La IA nunca define el arancel.** Separación de responsabilidades impecable: interpretar (IA) vs tarifar (base oficial). Es la decisión de diseño correcta.
2. **Base oficial real:** 10.515 posiciones TEC/AEC a 8 dígitos, con el recorte CMC 08/22 aplicado (por eso hay valores 12,6% / 10,8% / 7,2%).
3. **Excepciones argentinas modeladas de verdad:** celulares/notebooks 0%, autos 35%, textil/calzado por Dec. 236/2025. No es "AEC crudo".
4. **Extrazona correcto:** siempre usa el derecho que paga China/USA (DIE extrazona), nunca el 0% intrazona Mercosur. Esto es central para el negocio y está bien resuelto.
5. **Nunca inventa en silencio:** cuando no sabe, marca `requiresManualValidation` y muestra advertencias ("confirmar con despachante").
6. **Degradación limpia:** sin API key, sin internet, o con IA caída, todo sigue funcionando con el motor local.
7. **Defensa de la API key:** rate limiting por IP (40 análisis / 10 min; 10 documentos / 10 min), límite de 300 caracteres por consulta, validación server-side campo por campo.
8. **HS declarado por proveedor tratado con desconfianza:** se valida contra el motor y se avisa "suele venir mal".

---

## 8. Debilidades y riesgos (ordenados por impacto)

| # | Hallazgo | Impacto | Dónde |
|---|----------|---------|-------|
| 1 | **Falsos positivos por substring** ("control remoto"→moto). Dan un % con cara de acierto. | Alto — engaña sin avisar | `tariffEngine.js` `classifyProduct` (`.includes`) |
| 2 | **La IA puede errar la subpartida** y el % sale de ese código errado. | Alto — es el techo del enfoque actual | `analyze.js` + IA |
| 3 | **Cola larga cae al 16% genérico** (termo, sombrero, tela, reloj despertador…). | Medio — muchos productos reales quedan sin clasificar | `KEYWORD_RULES` (cobertura ~140 términos) |
| 4 | **La capa oficial de 8 díg solo se usa si el código llega con 8 díg.** La IA a veces devuelve 4 o 6 → se resuelve por tabla interna, menos precisa. | Medio | flujo `classifyCode` |
| 5 | **Etiqueta de precisión inconsistente:** un celular por capa 1 reporta "NCM_8_DIGITS" en vez de "NCM_8_OFICIAL". Cosmético. | Bajo | capa 1 usa `prec.precision` |
| 6 | **La lista de 108 categorías y la tabla de 4 díg se mantienen a mano** y pueden desincronizarse de la base oficial. | Bajo-medio (mantenimiento) | `App.jsx` `CATEGORIES` + `tariffData.js` |
| 7 | **Sin registro de qué clasificó la IA vs. qué corrigió el cliente.** No hay telemetría para saber dónde falla más. | Bajo (pero útil para mejorar) | — |

---

## 9. Qué cambiaría conectar Tarifar (o similar)

El sistema ya está **arquitectónicamente preparado** para esto. Hoy la cadena es:

> texto → **IA adivina código** → base local da % 

El eslabón débil es "IA adivina código". Tarifar (o el buscador de VUCE, o una base de posiciones con descripciones oficiales) atacaría exactamente eso:

- **Opción A (mínima):** usar Tarifar como **validador**. La IA sugiere un código; antes de mostrarlo, se busca ese código en Tarifar para traer la **descripción oficial de la posición** y mostrársela al cliente ("8471.30.19 — Máquinas automáticas para tratamiento de información, portátiles, peso ≤ 10 kg"). El cliente confirma si es lo suyo. Bajísimo riesgo, gran salto de confianza.
- **Opción B (media):** clasificación **asistida por búsqueda**. En vez de que la IA invente el código de memoria, se le da como contexto las posiciones candidatas reales de Tarifar que matchean la descripción, y elige entre ellas. Esto elimina el problema del "termo de 300 litros": la IA solo puede elegir códigos que existen y con su texto oficial.
- **Opción C (máxima):** reemplazar el % de la base local por el de Tarifar en vivo. **No lo recomiendo de entrada** — tu base local ya modela las excepciones argentinas (Dec. 236, régimen BIT, automotor) que un feed crudo de AEC podría no traer. Conviene que Tarifar mejore la *elección del código*, y tu motor siga poniendo el *%* con tus excepciones.

**Recomendación:** empezar por A o B. El diseño actual (IA sugiere código, motor local pone %) es justo el punto de inserción ideal — Tarifar entra entre esos dos pasos sin tocar nada del cálculo.

---

## 10. Mejoras rápidas independientes de Tarifar (si querés, en otra sesión)

1. **Matching por palabra completa** en `classifyProduct` (límites `\b` o tokenizar), para matar los falsos positivos de #8.1. Fix chico, alto impacto.
2. **Ampliar `KEYWORD_RULES`** con la cola larga frecuente (termos, sombreros, telas por metro, artículos de bazar, etc.) o —mejor— dejar que la IA cubra eso y usar el matcher solo de red de seguridad.
3. **Pedirle a la IA 8 dígitos NCM sí o sí** (o rechazar y reintentar si devuelve menos), para forzar la capa oficial.
4. **Registrar** (aunque sea en el lead) el código que sugirió la IA y el que finalmente se usó, para ver dónde corregís más seguido.
5. **Unificar** la etiqueta de precisión de la capa 1.

---

## Anexo — Distribución de aranceles en la base oficial (10.515 posiciones)

```
0%:    2918    9%:    1114    12,6%: 2137
3,6%:   242    10%:      6    14%:     32
5,4%:   254    10,8%:  719    16%:    766
6%:       2    12%:     18    18%:    839
7,2%:   321                   20%:    391
8%:       4                   26%:    386
                              35%:    366
```
(Los valores fraccionarios son el recorte CMC 08/22 sobre bienes de capital e informática/telecom.)

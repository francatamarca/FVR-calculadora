# Operador FVR por lotes

La herramienta ejecuta `publicModes` y `buildQuotePDF` de la calculadora. No usa IA ni automatiza formularios. Consulta únicamente recursos públicos FVR y dólar; no guarda cotizaciones en la base pública, no modifica configuración y no envía mensajes. El índice NCM es orientativo: el agente investiga la normativa y aporta evidencia.

## Ejecución

Desde Codex local usar el envoltorio auditado `C:/Users/frann/.codex/skills/fvr-comex-argentina/scripts/fvr_quotes.py` con Python. No requiere claves.

```
python <envoltorio> lookup --query 94032000
python <envoltorio> quote --input casos.json --output salida
python <envoltorio> pdf --batch salida/lote-....json --selection seleccion.json --output salida
```

`quote` admite de 1 a 10 casos y devuelve la ruta de un registro persistente, totales y bloqueos. No genera PDF hasta pedirlos. `pdf` recibe una selección por ID, por ejemplo `{"cliente1":["dhl","seaM3"],"cliente2":"all"}`. Un PDF fallido no cancela los correctos. Los errores parciales retornan código 2 y un JSON con archivos entregables.

## Entrada

Ejemplo de estructura, no de clasificación ya verificada. Sustituir fecha y evidencia por las del caso real:

```json
{"cases":[{
  "id":"cliente1",
  "data":{"nombre":"Referencia del cliente","producto":"Descripción técnica","paisOrigen":"China","whatsapp":"Número aportado","fob":1000,"peso":20,"cantidad":50,"cp":"5000","packageGroups":[{"cant":2,"largo":40,"ancho":30,"alto":30,"pesoCaja":10}]},
  "classification":{"ncm":"94032000","die":20,"source":"https://serviciosweb.afip.gob.ar/aduana/arancelintegrado/","factualTaxes":{"stat":3,"vat":21}},
  "regulatory":{"verifiedAt":"AAAA-MM-DD","sources":["https://www.arca.gob.ar/envios-internacionales/"],"courier":{"status":"viable","reason":"Conclusión justificada"},"sea":{"status":"viable","reason":"Conclusión justificada"}},
  "modes":["auto","seaM3"]
}]}
```

Los números deben ser números JSON (decimales con punto), no textos con moneda o separadores. No inventar teléfono, cantidad o medidas. CP ausente usa 5000 y lo advierte. `cantidad` y contacto son opcionales. Para un solo grupo se admiten `bultos`, `largo`, `ancho`, `alto`. Para volumen total declarado usar `totalVolumeM3` en lugar de medidas: conserva m³ reales sin simular una caja cúbica. Para varios grupos hay que informar todas las medidas o usar sólo el volumen total. Si se conocen todos los pesos por caja, su suma debe coincidir con el peso total.

`modes`: `auto` ofrece la opción aérea pública correspondiente (DHL desde China cuando alcanza el mínimo; en los demás casos aéreo comercial). `seaM3` ofrece marítimo general. También puede solicitarse explícitamente `air` o `dhl`, pero no fuerza una modalidad que la home no ofrezca. No existen personal ni marítimo/kg.

`regulatory.courier` y `.sea` admiten `viable`, `pending` o `blocked`. La herramienta sólo cotiza la rama `viable`; el agente debe incluir restricciones logísticas/DG en su evaluación. No confundir condiciones posteriores al libramiento con un bloqueo previo. Una rama pendiente no bloquea otra realmente verificada.

La fecha debe ser la del día de Argentina; las URL oficiales son evidencia suministrada por el agente, no una certificación automática de su contenido. El 20% genérico de la home no sustituye un DIE investigado en este operador. IVA y tasa factuales son obligatorios; las diferencias con la configuración comercial se muestran como advertencias y no cambian las tarifas FVR.

## Vigencia y seguridad

La herramienta lee `/api/settings` y `/agent-version.json`; exige todos los valores centrales y que el motor local coincida con el publicado. Si falla, detiene los importes: jamás usa DEF como tarifa de respaldo. Puede usar el alias oficial `https://fvr-calculadora.vercel.app` si el dominio propio falla.

El registro conserva configuración, revisión, dólar y fecha. Al pedir PDF verifica nuevamente motor, día y configuración. Si cambiaron, hay que volver a cotizar e informar los nuevos totales. Si no cambiaron, usa el mismo dólar del presupuesto original. El hash detecta corrupción accidental; no es una firma de seguridad ni reemplaza permisos del sistema de archivos.

Se guardan registros y PDF en la carpeta de salida indicada, dentro del espacio autorizado del agente. No editar a mano un registro emitido. Conservar el JSON original de entrada para corregir o revalidar un caso. IDs únicos evitan mezclar clientes y los nombres de PDF incluyen caso/modalidad/identificador. No imprimir datos personales innecesarios en consola.

`lookup` consulta el índice publicado de ARCA. `fileDate`, `downloadedAt` y `checksum` indican la versión; `sourceIsToday=false` exige verificar la fuente actual. `mixed/rates` obliga a resolver el SIM: el DIE agregado por NCM8 no es suficiente. Una búsqueda por texto sólo devuelve candidatos. La herramienta no consulta ANMAT, SENASA ni VUCE por sí sola.

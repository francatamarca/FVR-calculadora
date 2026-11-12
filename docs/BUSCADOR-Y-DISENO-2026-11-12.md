# Buscador contextual y diseño público — 12/11/2026

Estado: preparada localmente para revisión. Pendiente aprobación de esta nueva publicación.
Base publicada de partida: 979add753e7e5c13b96af089d0c99ea4b879b5ed.

## Problema y resultado

La búsqueda separaba palabras y llenaba alternativas con partidas diferentes.
Además se perdía contexto oficial: por ejemplo el armazón de madera de un
asiento, o el uso exclusivo para GLP de cierto recipiente de plástico.

La nueva búsqueda identifica primero el objeto completo y sus atributos.
Las consultas ambiguas muestran preguntas y variantes para confirmar. No se
asigna automáticamente el 16% genérico cuando falta una clasificación.
Cada código ofrecido existe en la base vigente y su porcentaje se resuelve
con el mismo motor oficial usado al seleccionar la variante.

Casos cubiertos: sillas de madera (con/sin relleno), motos de agua (8903,
embarcaciones), motocicletas (motorización/cilindrada), caja de herramientas
(envase, bolso o juego), herramientas y botellas (material/uso).
No se rellena una lista con candidatos rechazados por la IA.

Para otros productos hay búsqueda por objeto principal, sinónimos técnicos
y evaluación contextual con Claude Haiku. La IA interpreta descripciones;
no devuelve porcentajes ni crea códigos. Si no puede identificar el artículo,
se pide detalle o un código/arancel conocido. Los resultados siguen siendo
orientativos: la elección del cliente no equivale a una clasificación aduanera
definitiva y no determina por sí sola la admisibilidad de un producto.

Los datos aplicados desde una factura también pasan por el buscador para
confirmar la clasificación; el HS del proveedor se conserva en la lectura
del documento como referencia, sin aplicarlo automáticamente.

## Fuente y actualización

El generador conserva los niveles intermedios oficiales y el texto de la
apertura única SIM .000 cuando ARCA omite un registro de ocho dígitos.
Los cambios de esquema regeneran las descripciones aunque el ZIP sea igual,
sin desactivar los controles de integridad o de cambios masivos de tasas.

La tarea diaria existente se mantiene a las 07:17 de Argentina en GitHub
Actions. Esta mejora del generador entrará en esa tarea al publicar el código.
La actualización no usa IA. Los aranceles y las 10599 posiciones no cambiaron
en esta revisión; cambió el contexto usado para buscarlas.

Fuente: https://serviciosweb.afip.gob.ar/aduana/arancelintegrado/archivos/arancel.zip

## Diseño

Portada con marca FVR, acceso directo a cotizar y una composición más breve
en celular. Logo original DHL descargado de su sitio, conservando proporción
y colores: https://www.dhl.com/content/dam/dhl/global/core/images/logos/dhl-logo.svg

Comparador y resumen superior renovados. Todas las modalidades muestran la
misma suma: mercadería + costo completo de importación = total estimado.
USD, equivalencia ARS, precio unitario y peso/volumen facturable están separados.
El flotante de WhatsApp no tapa los importes del resultado; se usa su botón
existente para enviar el presupuesto.

Se preservaron fórmulas, tarifas comerciales, PDF, resumen inferior,
reglas de DHL por origen/peso, admin y calculadora interna.

## Verificación

- 204 pruebas en 13 archivos, aprobadas. Incluyen ejemplos reportados,
  códigos inexistentes, selección de variantes, rechazo total de IA,
  respuestas simuladas y caída de conexión.
- Compilación de producción aprobada.
- Fuente oficial recompilada: 0 tasas modificadas; regresión completa aprobada.
- Segunda ejecución con el mismo ZIP: sin regeneración innecesaria.
- Revisión de interfaz en 320 y 390 px y computadora: sin desbordes en los
  importes de prueba, confirmación pendiente bloquea el avance y editar
  conserva producto, clasificación, contacto, valor, cantidad y bultos.
- Recorridos verificados: China/DHL, marítimo y USA/aéreo comercial.
- Servicio local de revisión sin escrituras de cotizaciones en producción.
- Sin credenciales locales del proveedor IA: las llamadas reales a Anthropic
  quedan para la comprobación del entorno de publicación. La ruta local y
  los contratos de respuesta/falla de IA sí están probados.

Vista previa en esta computadora: http://127.0.0.1:5183/

# Buscador general y Gemini gratuito — 12/11/2026

Estado: Gemini gratuito conectado y probado en vista previa Vercel.
No publicado en producción. Clave oculta de servidor en preview y producción;
la versión pública anterior todavía no utiliza este buscador nuevo.

Esta revisión reemplaza la búsqueda orientada por reglas puntuales de la
versión 0565718. Con IA disponible, TODOS los productos recorren las mismas
etapas: interpretación del objeto completo, recuperación del catálogo ARCA
y validación de opciones contra sus descripciones oficiales. Las pistas de
partida del modelo nunca se usan como NCM final. Ningún porcentaje sale de IA.

El cliente confirma variantes o responde una pregunta concreta por atributos.
Si no hay identificación suficiente se usa el 20% genérico pedido por FVR,
sin NCM ni fuente oficial inventados. También puede elegir expresamente ese
respaldo si no sabe seleccionar una variante. Es una estimación comercial,
no una afirmación de que ese sea el derecho real del producto.

La recuperación incorpora 23885 descripciones de aperturas SIM dentro de
4012 NCM y contexto de ramas específicas hermanas en 6088 posiciones.
Esto evita depender de los nombres genéricos de encabezados y permite
interpretar mejor las posiciones residuales. Los porcentajes no se modifican.
El generador diario incluye estos datos y mantiene sus controles y rollback.

Cada opción exige compatibilidad explícita del modelo y ausencia de atributos
contradictorios. Un filtro adicional de lenguaje descarta oposiciones expresas
como con/sin batería, con/sin motor o con/sin tapizado. Es una ayuda general,
no una garantía de clasificación legal ni de comprensión perfecta.

Se corrigió además el parser: 96 encabezados de capítulo codificados como
00xx0000 se habían incluido indebidamente en NCM8. Ya no son candidatos ni
códigos válidos de consulta. La base ahora contiene 10503 posiciones de
productos; los porcentajes de las posiciones reales no cambiaron.

## Servicio gratuito elegido por Francisco

Gemini 3.5 Flash-Lite, modelo disponible en la cuota gratuita según Google:
https://aistudio.google.com/docs/pricing#gemini-3.5-flash-lite

Autorizado: reutilizar la clave existente del Default Gemini Project gratuito
en el servidor de la calculadora, para preview y futura producción.
Se comprobó el Nivel gratuito en Google AI Studio. No se activó facturación.
La clave se guardó como Secret en Vercel, sin mostrarla ni guardarla en archivos
del repositorio. Las llamadas se habilitan sólo con:

- GEMINI_API_KEY (secreto de servidor).
- GEMINI_FREE_TIER_CONFIRMED=true (configuración de servidor, confirmada).

El buscador no usa ANTHROPIC_API_KEY ni tiene fallback automático de pago.
La lectura de facturas es una función aparte y queda fuera de esta migración.
Google limita la cuota gratuita y puede usar su contenido para mejorar productos:
https://aistudio.google.com/docs/pricing
Sólo se envía la descripción del producto y candidatos del catálogo, no los
datos de contacto del cliente ni la cotización completa.

API documentada: POST /v1beta/models/{model}:generateContent, respuesta JSON
con esquema, clave sólo en encabezado x-goog-api-key:
https://aistudio.google.com/api-reference/generate-content

Dos llamadas máximas por análisis; razonamiento LOW para interpretar y
MEDIUM para validar, contexto acotado a 40 kB por petición y sin reintentos automáticos
ni herramientas de búsqueda web. Ante agotamiento de cuota, error o demora,
se usa el 20% genérico con aviso al cliente, sin presentar coincidencias locales
como si hubieran sido validadas ni pasar a otro proveedor.
Hay caché temporal por instancia (6 horas para resultados compatibles, 5 minutos
para consultas no identificadas), invalidada por checksum de fuente y modelo.
No equivale a una caché global persistente entre todos los servidores.

## Interfaz y continuidad de la cotización

Botón con icono de búsqueda, búsqueda por Enter, distribución móvil sin
recortar el campo, progreso visible y cancelación de respuestas antiguas.
Un resultado genérico aparece en ámbar y permite seguir cotizando. Su carácter
genérico se conserva en resultado, resumen para WhatsApp y PDF.

## Validación local

- 260 pruebas, 14 archivos, aprobadas.
- 60 pruebas del buscador volvieron a pasar tras el ajuste final de preguntas.
- 30 productos variados verifican la recuperación del catálogo con respuestas
  simuladas del proveedor. No son una medición de calidad real de Gemini.
- Cobertura de rechazo de candidatos, índices inválidos, 20% genérico,
  encabezados de capítulos, porcentajes oficiales, caché, consultas simultáneas,
  cuota 429 y prohibición de usar Anthropic como respaldo.
- Compilación de producción aprobada.
- Revisión visual y funcional en celular: mesa de metal sin cubiertos ni 0%,
  botón y Enter, aplicación de 20% a producto no identificado, generación de
  cotización y edición conservando datos.

Vista previa local (sin IA conectada): http://127.0.0.1:5183/
El servicio real ya se comprobó en preview Vercel con los secretos
configurados. La publicación en el dominio de clientes requiere aprobación.

## Evaluación real y límites

Las pruebas con Gemini real detectaron y motivaron mejoras generales:
- Encabezados de capítulos indebidamente tratados como productos.
- Falta de vocabulario específico de las aperturas SIM (jetski/motoski).
- Contexto insuficiente para distinguir posiciones residuales.
- Opciones que contradecían atributos ya informados por el cliente.

Se guardan las observaciones por versión, incluyendo los problemas detectados,
en la carpeta de salida buscador-general de la sesión. Las pruebas simuladas
verifican el contrato y recuperación; no miden la precisión real del modelo.
La evaluación real es una muestra de productos, no cubre todo el universo NCM.
La confirmación del cliente es orientativa y la clasificación debe validarse
antes de operar, especialmente en productos complejos o regulados.

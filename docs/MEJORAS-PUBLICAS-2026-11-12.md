# Revisión de la calculadora pública — 12/11/2026

Estado: implementación local. Requiere autorización de Francisco para publicar y reactivar el workflow deshabilitado al inicio de esta revisión. Admin/interno quedan para la etapa posterior. No se borraron cotizaciones históricas.

## Cambios

- Contactos guardados únicamente en el navegador, con control Borrar mis datos.
- Editar consulta conserva el formulario completo en memoria, incluidos bultos, análisis y archivos. Al recargar/cerrar sólo se recuperan contactos.
- Oferta pública: aéreo comercial y marítimo m³. Se retiraron España, personal y marítimo/kg del formulario y resultados públicos. Se conserva compatibilidad con registros históricos y funciones internas hasta su revisión posterior.
- China: DHL desde el mínimo facturable configurado (actualmente 10 kg); reemplaza a aéreo comercial cuando está disponible. USA/otros: aéreo comercial. No se alteraron tarifas comerciales ni fórmulas del motor calc.js.
- Bultos con peso por caja y total calculado; se rechazan grupos incompletos. Comparación de modalidades sólo para cargas con volúmenes coherentes.
- Una búsqueda de producto. Se eliminó la tabla paralela de categorías con porcentajes fijos. Código NCM/HS y porcentaje manual son opcionales.
- Un NCM existente usa el DIE de ARCA, sin ser pisado por tablas históricas. Un código inexistente no obtiene un porcentaje de capítulo. Familias y códigos parciales usan la misma base oficial, con advertencias. Las aperturas SIM con tasas diferentes quedan identificadas.
- Se corrigieron reglas concretas de martillos, destornilladores y alicates contra las descripciones de la fuente. Cambiar el producto invalida el resultado anterior y las respuestas atrasadas no lo sobrescriben.
- Logo incluido dentro del PDF, sin descarga de imagen en tiempo de generación. Después de descargar aparece Compartir PDF si el navegador admite compartir ese archivo. El usuario indicó Android/Chrome.

## Fuentes verificadas

- ARCA: https://www.afip.gob.ar/aduana/arancelintegrado/ y https://serviciosweb.afip.gob.ar/aduana/arancelintegrado/archivos/arancel.zip
- Archivo descargado: nomenclador del 12/11/2026, 10.599 NCM. Frente a la base de agosto: una posición eliminada, cero porcentajes modificados entre posiciones comunes; 56 NCM con tasas mixtas según SIM.
- CIVUCE: ARCA documenta que consume la nomenclatura del Arancel Integrado: https://www.afip.gov.ar/operadoresComercioExterior/civuse/default.asp
- DHL: URL y hash en data/dhl/cotejo-2026-11-12.json. La URL oficial con extensión PDF entrega actualmente un XLSX. Se leyó exclusivamente ARGENTINA/AR de Remote Area Locations: 608 rangos, 733 CP. La base anterior tenía 841: se retiraron 108 que no figuran en el archivo consultado. No se añadió ni cambió ningún cargo por zona remota.

## Actualización automática preparada

- Consulta ARCA una vez al día, a las 07:17 de Argentina (10:17 UTC). Puede haber demoras de cola de GitHub y de incorporación de novedades por ARCA; no es un aviso instantáneo de toda norma nueva.
- Verifica respuesta, tamaño, checksum, fecha no futura ni anterior, estructura, rangos, cantidad de posiciones, magnitud de cambios y pruebas. Luego compila la aplicación.
- Sólo puede guardar los archivos generados de datos y el changelog en main. No modifica tarifas FVR, fórmulas ni otros archivos. El push dispara la integración de publicación que deberá comprobarse al activarlo.
- Si falla, conserva la base anterior y deja la ejecución fallida. La interfaz identifica la fecha de fuente y advierte si la base tiene más de siete días.
- Diagnóstico comprobado: últimas ejecuciones fallaron en npm ci por la dependencia esbuild ausente; después el workflow quedó disabled_inactivity. Se reparó el lockfile y se comprobó instalación limpia. No se reactivó ni se publicó durante esta revisión.
- Esta automatización cubre nomenclatura y DIE. No garantiza actualización automática de IVA, percepciones, antidumping, intervenciones, certificaciones ni de normas aún no reflejadas en la fuente. No se conectó una cuenta personal de Tarifar.

## Verificación y límites

- Suite automatizada de cálculo, DHL, contacto, clasificación por API, NCM oficiales, familias, códigos inválidos, modos públicos y límites 9,99/10/10,01 kg.
- Instalación limpia y compilación verificadas en copia separada.
- Recorrido local: cálculo con análisis automático, edición sin borrar, China con/sin DHL, USA sin DHL, grupos de bultos, rechazo de grupo incompleto, derecho manual 0%, marítimo m³, NCM opcional y descarga PDF. No se enviaron cotizaciones a clientes.
- Revisión visual en 390×844 y 1366×900. PDFs de las tres modalidades renderizados y revisados, con logo embebido y totales cotejados.
- No se puede garantizar la miniatura que WhatsApp decide mostrar. Falta comprobar en el Android real del usuario la miniatura y el selector de compartir; el archivo PDF sí contiene el logo.
- No se verificaron los flujos de admin/interno ni se declara una auditoría de seguridad completa.

## Recomendaciones siguientes

1. Validar profesionalmente el tratamiento fiscal por NCM, origen, régimen y situación del importador: IVA reducido/exento, percepciones, topes de tasa y tratamientos especiales. La actualización de DIE no reemplaza esa validación.
2. Completar la etapa de admin: autenticación en servidor, protección de documentos/leads y sincronización observable. Evitar prometer seguridad sin esa revisión.
3. Validar cualquier extracción de factura/packing con la vista de revisión antes de calcular. La clasificación por descripción sigue siendo probable.
4. Comprobar una operación real de compartir desde Android/Chrome y monitorear la primera ejecución y publicación de la actualización automática después de aprobarla.

## Cierre de comprobaciones

181 pruebas aprobadas. Compilación de producción aprobada. Se corrigió además el código histórico de smartphones y se rechazó el código médico inexistente. Las pruebas arancelarias consultan la base vigente; una prueba de cambio de alícuota confirma que el nuevo valor se propaga a código y producto, sin bloquear legítimas actualizaciones de DIE. Se conservan los casos fijos del motor comercial.

Se simuló una fuente ZIP inválida: la ejecución falló y los cuatro archivos de base conservaron sus hashes. Tres PDFs de muestra y la descarga real desde la UI tienen una página, imagen de logo embebida, fecha de base y footer presentes. Totales de ejemplo cotejados: aéreo 1715,922115; DHL 2032,796575; marítimo 2710,7970675 (FOB 1000, casos documentados en los archivos de revisión; no son cotizaciones de clientes).

Versión lista para revisión previa a producción. Faltan autorización de publicación, activación del workflow y comprobación del primer ciclo y despliegue automático en la infraestructura real. Verificar miniatura en el Android real de Francisco; no se enviaron mensajes de WhatsApp.


## Autorización de publicación

Francisco aprobó publicar esta versión y activar la actualización una vez al día. El proceso no llama modelos de IA; la consulta de ARCA y las pruebas se ejecutan en GitHub Actions. Horario elegido: 07:17 de Argentina. Pendiente registrar el resultado efectivo del despliegue y primera ejecución.

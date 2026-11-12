// Política comercial de respaldo solicitada por FVR. No es una tasa de ARCA.
export const GENERIC_DUTY_RATE = 20;
export function genericEstimate(reason='unidentified',baseDate=null) {
  const notice=reason==='free-quota-exhausted'?'La búsqueda automática alcanzó su límite gratuito. Podés reintentar más tarde o continuar con esta estimación.':/^(?:provider-|context-budget|invalid-model-response|service-unavailable)/.test(reason)?'No pudimos completar la búsqueda automática. Podés reintentar o continuar con esta estimación.':null;
  return {hsCode:'',description:'Estimación genérica para un producto sin clasificación confirmada',
    dutyRate:GENERIC_DUTY_RATE,precision:'GENERIC_FALLBACK',precisionLabel:'Estimación comercial FVR',confidence:'baja',
    source:'Estimación genérica FVR',sourceUrl:null,baseDate,method:'estimacion-generica-fvr',fallbackReason:reason,
    isGeneric:true,needsConfirmation:false,requiresManualValidation:true,alternatives:[],
    warnings:[...(notice?[notice]:[]),'Se aplica un 20% orientativo elegido por FVR. No corresponde a un NCM confirmado ni garantiza el derecho real del producto. Agregá más detalle para mejorar la búsqueda.']};
}
export function classificationPatch(result,value) {
  const generic=result.precision==='GENERIC_FALLBACK';
  return {categoria:'',manualDuty:'',dutyManual:false,tariffGeneric:generic,
    hsCode:/FAMILY|GENERIC|CHAPTER/.test(result.precision||'')?'':(result.hsCode||''),aiDutyRate:result.dutyRate,
    aiSuggestion:generic?`Estimación genérica FVR: ${GENERIC_DUTY_RATE}% — producto sin clasificación confirmada`:`${result.description} — Derecho estimado: ${result.dutyRate}%`,
    tariffSource:result.source,tariffSourceDate:generic?null:(result.baseDate||result.sourceDate),
    aiTelemetry:{query:String(value||'').slice(0,120),method:result.method,chosen:result.hsCode,baseDate:result.baseDate,
      confidence:result.confidence,precision:result.precision,source:result.source,ts:Date.now(),corrected:false}};
}

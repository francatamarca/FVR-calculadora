import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
export const ROOT = fileURLToPath(new URL('../', import.meta.url));
const files = ['src/lib/calc.js','src/lib/publicQuote.js','src/lib/pdfQuote.js','src/lib/dhlZones.js','src/data/quoteLogo.js','src/data/dhlRemoteZones.js'];
export const engineVersion = () => createHash('sha256').update(files.map(p => `${p}\n${readFileSync(new URL('../'+p, import.meta.url),'utf8').replace(/\r\n/g,'\n')}`).join('\n')).digest('hex');

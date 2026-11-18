import { writeFileSync, copyFileSync } from 'node:fs';
import { engineVersion } from './agent-version.mjs';
writeFileSync(new URL('../public/agent-version.json',import.meta.url),JSON.stringify({schemaVersion:1,engineVersion:engineVersion()}));
copyFileSync(new URL('../data/tariff-base.json',import.meta.url),new URL('../public/agent-tariffs.json',import.meta.url));

#!/usr/bin/env node
// Envía un incidente (JSON tipo Cherwell/Oracle) a Voximplant Kit y lanza el
// escenario saliente "Alerta NOC" con los datos del ticket como variables.
//
// Uso:
//   node scripts/trigger-kit.mjs events/incidente-demo.json            # llamada real
//   node scripts/trigger-kit.mjs events/incidente-demo.json --dry-run  # solo muestra la petición
//
// Variables de entorno (en GitHub van como Secrets):
//   KIT_API_HOST         Host de la API de tu cuenta (Administración → Seguridad → API tokens), ej. https://kitapi-eu.voximplant.com
//   KIT_DOMAIN           Nombre de la cuenta de Kit
//   KIT_ACCESS_TOKEN     Token de API de Kit
//   KIT_SCENARIO_ID      ID del escenario saliente "Alerta NOC"
//   KIT_PHONE_NUMBER_ID  ID del número de Kit que se usa como caller ID
//   DEMO_PHONE           (opcional) Teléfono destino para la demo; reemplaza al del JSON

import { readFile } from 'node:fs/promises';

const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith('--'));
const dryRun = args.includes('--dry-run') || process.env.DRY_RUN === 'true';

if (!file) {
  console.error('Falta la ruta del JSON. Ej: node scripts/trigger-kit.mjs events/incidente-demo.json');
  process.exit(2);
}

const raw = JSON.parse(await readFile(file, 'utf8'));
const inc = raw.incident ?? {};
const cus = raw.customer ?? {};

// Hora local legible para voz y WhatsApp (ej. "08:42")
const hhmm = iso => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Bogota' });
};

// Mapeo JSON del ticketing → variables del escenario de Kit.
// Los nombres de la izquierda deben existir como variables en el escenario.
const variables = {
  ticket_id: inc.IncidentID,
  evento: inc.ShortDescription,
  servicio: inc.Service ?? '',
  prioridad: inc.Priority ?? '',
  estado: inc.Status ?? '',
  sede: [inc.Location?.Site, inc.Location?.City].filter(Boolean).join(', '),
  inicio: hhmm(inc.CreatedDateTime),
  proxima_actualizacion: hhmm(inc.NextUpdateDateTime),
  cliente: cus.DisplayName ?? '',
  contacto: cus.ContactName ?? '',
};

// Texto listo para el bloque de voz (TTS) del escenario.
variables.mensaje_voz =
  `Hola${variables.contacto ? ' ' + variables.contacto : ''}, le llamamos del NOC Central. ` +
  `Le informamos un incidente en ${variables.servicio || 'su servicio'}, sede ${variables.sede}: ${variables.evento}. ` +
  `Inició a las ${variables.inicio} y el estado actual es ${variables.estado}. ` +
  `La próxima actualización será a las ${variables.proxima_actualizacion}. Número de ticket ${variables.ticket_id}.`;

const phone = (process.env.DEMO_PHONE || cus.ContactPhone || '').replace(/[^\d+]/g, '');

const missing = Object.entries({ ticket_id: variables.ticket_id, evento: variables.evento, phone })
  .filter(([k, v]) => !v || (k === 'phone' && !/^\+?\d{8,15}$/.test(v))).map(([k]) => k);
if (missing.length && !dryRun) {
  console.error(`Faltan datos: ${missing.join(', ')}. Define DEMO_PHONE o corrige el JSON.`);
  process.exit(2);
}

const env = k => process.env[k] ?? '';
const host = env('KIT_API_HOST').replace(/\/+$/, '') || 'https://kitapi-eu.voximplant.com';
const url = `${host}/api/v3/scenario/runScenario`;

const body = new URLSearchParams({
  domain: env('KIT_DOMAIN'),
  access_token: env('KIT_ACCESS_TOKEN'),
  scenario_id: env('KIT_SCENARIO_ID'),
  phone_number_id: env('KIT_PHONE_NUMBER_ID'),
  phone,
  variables: JSON.stringify(variables),
});

const mask = s => (s ? s.slice(0, 2) + '•••' + s.slice(-2) : '(vacío)');
console.log(`→ POST ${url}`);
console.log(`  domain=${env('KIT_DOMAIN') || '(vacío)'} scenario_id=${env('KIT_SCENARIO_ID') || '(vacío)'} phone_number_id=${env('KIT_PHONE_NUMBER_ID') || '(vacío)'}`);
console.log(`  access_token=${mask(env('KIT_ACCESS_TOKEN'))} phone=${mask(phone)}`);
console.log('  variables =', JSON.stringify(variables, null, 2));

if (dryRun) {
  console.log('\nDry run: no se envió nada a Kit.');
  process.exit(0);
}

for (const k of ['KIT_DOMAIN', 'KIT_ACCESS_TOKEN', 'KIT_SCENARIO_ID', 'KIT_PHONE_NUMBER_ID']) {
  if (!env(k)) { console.error(`Falta la variable de entorno ${k}.`); process.exit(2); }
}

const res = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body,
});
const text = await res.text();
let json; try { json = JSON.parse(text); } catch { json = null; }
console.log(`\n← HTTP ${res.status}`);
console.log(json ? JSON.stringify(json, null, 2) : text);

if (!res.ok || (json && json.success === false)) {
  console.error('Kit rechazó la petición. Revisa credenciales, IDs y el formato de variables.');
  process.exit(1);
}
console.log('\nEscenario lanzado. La llamada de alerta debería entrar en unos segundos.');

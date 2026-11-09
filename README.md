# Demo: Alerta NOC con Voximplant Kit

Simula el flujo completo de notificación de incidentes:

1. El sistema de tickets (Cherwell/Oracle) envía un JSON del incidente. **En la demo, este repositorio hace ese papel.**
2. GitHub Actions toma el JSON y llama a la API de Voximplant Kit (`runScenario`).
3. Kit hace la **llamada de alerta**, lee el incidente y pregunta si quedó claro.
4. Si el cliente responde **No** o **Error**, Kit envía el **template de WhatsApp** con el detalle del ticket por el canal de Voximplant.
5. Si en WhatsApp responde **No**, se le conecta con un ingeniero del NOC.

```
events/incidente-demo.json ──push──▶ GitHub Actions ──POST runScenario──▶ Voximplant Kit
                                                                              │
                                                     llamada IVR ◀────────────┘
                                                        │ No / Error
                                                        ▼
                                                  WhatsApp (template)
```

## Estructura

| Ruta | Qué es |
|---|---|
| `events/incidente-demo.json` | Incidente simulado, con forma parecida a un payload de Cherwell. Datos de ejemplo. |
| `scripts/trigger-kit.mjs` | Mapea el JSON a variables de Kit y lanza el escenario. Node 20, sin dependencias. |
| `.github/workflows/noc-alert.yml` | Workflow que ejecuta el script manualmente o al hacer push a `events/`. |
| `docs/configuracion-kit.md` | Cómo preparar el escenario, el template de WhatsApp y las variables en Kit. |

## Puesta en marcha

1. Configura Kit siguiendo [`docs/configuracion-kit.md`](docs/configuracion-kit.md).
2. Crea el repositorio (privado) y sube estos archivos.
3. En **Settings → Secrets and variables → Actions**, crea estos secrets:

| Secret | Valor |
|---|---|
| `KIT_API_HOST` | Host de la API de tu cuenta (Administración → Seguridad → API tokens) |
| `KIT_DOMAIN` | Nombre de la cuenta de Kit |
| `KIT_ACCESS_TOKEN` | Token de API de Kit |
| `KIT_SCENARIO_ID` | ID del escenario saliente "Alerta NOC" |
| `KIT_PHONE_NUMBER_ID` | ID del número de Kit que hace la llamada |
| `DEMO_PHONE` | Teléfono que recibirá la llamada en la demo, formato `+57...` |

El teléfono real va solo en `DEMO_PHONE`. El JSON del repo trae `+57XXXXXXXXXX` a propósito.

## Ejecutar la demo

**Opción A, frente al cliente (recomendada):** Actions → *Alerta NOC → Voximplant Kit* → **Run workflow**. Primero prueba con `dry_run` activado para revisar la petición sin llamar.

**Opción B, "llega un ticket nuevo":** duplica `events/incidente-demo.json`, cambia el `IncidentID` y la descripción, y haz push. El workflow se dispara solo.

**Opción C, local:**

```bash
cp .env.example .env   # completa los valores
set -a; source .env; set +a
node scripts/trigger-kit.mjs events/incidente-demo.json --dry-run
node scripts/trigger-kit.mjs events/incidente-demo.json
```

## Guion sugerido (5 min)

1. Mostrar el JSON del incidente y explicar que en producción lo envía Cherwell/Oracle.
2. Ejecutar el workflow y mostrar el log: petición a Kit y respuesta.
3. Contestar la llamada en el teléfono de demo y responder **"No"**.
4. Mostrar el WhatsApp que llega con el detalle del ticket y responder **"No"** para ver el escalamiento al NOC.

## Del demo a producción

- Reemplazar GitHub por una regla del ticketing (Cherwell One-Step Action o la integración de Oracle) que haga el POST, idealmente a través de un middleware que guarde el token y normalice ambos formatos de JSON.
- Registrar el resultado de cada llamada y conversación de vuelta en el ticket.
- Confirmar en la documentación vigente del Kit API el host regional, el formato de respuesta y los códigos de error de `runScenario`.

## Seguridad

- No subas tokens ni teléfonos reales al repositorio. Si un token se expone, revócalo en Kit y crea uno nuevo.
- Usa un repositorio privado y limita quién puede ejecutar el workflow.

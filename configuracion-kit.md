# Configuración en Voximplant Kit

Guía para preparar la cuenta de Kit antes de correr la demo. Los nombres de menús y bloques pueden variar según la versión de Kit; verifícalos en el editor.

## 1. Credenciales de API

1. En **Administración → Seguridad → API tokens**, crea un token para la demo.
2. Copia también el **nombre de la cuenta** (`KIT_DOMAIN`) y el **host de la API** (`KIT_API_HOST`) que aparecen en esa sección.
3. Cárgalos como Secrets del repositorio (ver README). No los pegues en el código.

## 2. Número saliente

Usa un número de Kit habilitado para llamadas salientes a Colombia. Anota su ID (`KIT_PHONE_NUMBER_ID`).

## 3. Canal y template de WhatsApp

1. Conecta el canal de WhatsApp Business de Voximplant en Kit.
2. Crea este template y envíalo a aprobación de Meta (categoría **Utility**, idioma **es**):

**Nombre sugerido:** `noc_incidente_seguimiento`

**Cuerpo:**

```
Hola, me comunico por parte del NOC Central. Te compartimos por escrito la información de la llamada que te hicimos:

Ticket: {{1}}
Evento: {{2}}
Sede: {{3}}
Inicio: {{4}}
Estado: {{5}}
Próxima actualización: {{6}}

¿Te quedó claro el mensaje?
```

**Botones de respuesta rápida:** `Sí` · `No`

| Variable del template | Variable del escenario |
|---|---|
| {{1}} | `ticket_id` |
| {{2}} | `evento` |
| {{3}} | `sede` |
| {{4}} | `inicio` |
| {{5}} | `estado` |
| {{6}} | `proxima_actualizacion` |

> WhatsApp solo permite que la empresa inicie una conversación con un template aprobado. Por eso el detalle del evento va dentro del template y no en mensajes libres posteriores.

## 4. Escenario saliente "Alerta NOC"

Crea un escenario saliente y declara estas variables (deben llamarse igual que en `scripts/trigger-kit.mjs`):

`ticket_id`, `evento`, `servicio`, `prioridad`, `estado`, `sede`, `inicio`, `proxima_actualizacion`, `cliente`, `contacto`, `mensaje_voz`

Flujo de bloques:

1. **Llamada saliente** al teléfono recibido por API.
2. **Reproducir mensaje (TTS, es-CO)** con `{mensaje_voz}`.
3. **Reconocimiento de voz / menú** con la pregunta: *"Por favor responda si recibió claramente la información, diciendo sí, no o error."*
   - Opciones de voz: **sí**, **no**, **error**.
   - Respaldo DTMF: 1 = sí, 2 = no, 3 = error.
   - Sin respuesta o no reconocida → rama **error** (un reintento antes).
4. **Condición:**
   - **Sí** → mensaje *"Gracias, que tenga buen día"* → colgar.
   - **No / Error** → mensaje *"Se re enviará la información del evento por WhatsApp lo más pronto posible"* → colgar → **Enviar WhatsApp** con el template `noc_incidente_seguimiento` al mismo teléfono, mapeando las variables de la tabla anterior.

Copia el ID del escenario (`KIT_SCENARIO_ID`).

## 5. Respuesta del cliente en WhatsApp

En el escenario o bot del canal de WhatsApp:

- **Sí** → *"¡Gracias por confirmar! Si necesitas algo más sobre este evento, escríbenos por este medio."* → cerrar conversación.
- **No** → *"Te pondré en contacto con un ingeniero para más información."* → transferir a la cola del NOC o lanzar el escenario de llamada "Enlace NOC".

> Pendiente de validar con el equipo de Kit: si el escenario del canal de chat puede iniciar la llamada directamente o si debe hacerse vía API (`runScenario` de un segundo escenario).

## 6. Registro del resultado (opcional en la demo)

Al final de cada rama, agrega una **petición HTTP** hacia el sistema de tickets o un endpoint de pruebas con `ticket_id` y el resultado (`ivr=si|no|error`, `whatsapp=si|no|sin_respuesta`).

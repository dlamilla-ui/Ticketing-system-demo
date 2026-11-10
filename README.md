# Ticketing system demo → Voximplant Kit

Página que simula el envío de un ticket del NOC a Voximplant Kit. Arma un JSON con el número a llamar, una descripción corta y un session ID, y lo inyecta como contacto en una **campaña automatizada** de Kit. Kit llama automáticamente a ese número.

```json
{
  "telefono": "+573001234567",
  "descripcion": "Intermitencia en enlace de datos, sede Calle 93.",
  "session_id": "NOC-20261110-153000-A1B2"
}
```

```
Página (index.html) ──POST outbound/appendToCampaign──▶ Campaña automatizada en Kit
                                                              │
                                                    Escenario de llamada
                                                              │
                                                    Condicional → WhatsApp
```

## Privacidad

- El repositorio no contiene tokens, cuentas ni teléfonos reales.
- Las credenciales se escriben en la página cada vez y no se guardan: sin cookies, sin almacenamiento del navegador y sin servidor propio. Viajan por HTTPS directo a Kit.
- Al cerrar la pestaña o pulsar **Borrar todo**, los datos desaparecen.

## Publicar la página

**Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)` → Save.**

En uno o dos minutos queda en `https://<usuario>.github.io/<repositorio>/`. También funciona abriendo `index.html` con doble clic.

## Uso

1. Escribe el host de la API, la cuenta, el token y el ID de la campaña (Kit → Administración → Seguridad → API tokens).
2. Escribe el número (formato `+57...`), la descripción (máx. 200 caracteres) y el session ID (se genera solo).
3. Pulsa **Enviar a Kit**. La respuesta de Kit se abre en una pestaña nueva; `"success": true` indica que el contacto entró a la campaña.

## Archivos

| Ruta | Qué es |
|---|---|
| `index.html` | Página de envío. |
| `kit/contactos-plantilla.csv` | Encabezados para crear la campaña en Kit (`telefono,descripcion,session_id`). |
| `events/alerta-ejemplo.json` | JSON de ejemplo. |

## Notas

- Los nombres de columna de la campaña deben coincidir con los del JSON. Si son otros, se cambian en la página, en "Nombres de columnas de la campaña".
- La campaña debe estar activa y dentro de su horario de llamadas para marcar de inmediato.
- Si un token se expone, revócalo en Kit y crea uno nuevo.

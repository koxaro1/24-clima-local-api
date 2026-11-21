# Bitácora de correcciones a la IA

| Fecha | Tarea | Qué propuso la IA | Qué corregí o rechacé y por qué |
| ----- | ----- | ----------------- | ------------------------------- |

## Corrección: firebase-admin no cargaba en Vercel

- **Qué propuso la IA:** usar firebase-admin en las rutas de la API, con export const runtime = 'nodejs'.
- **Qué falló:** el build rechazó esa línea con cacheComponents, y luego /api/clima dio 500 en Vercel por ERR_REQUIRE_ESM (jose es solo ESM y jwks-rsa lo cargaba con require).
- **Cómo lo detecté:** logs de Vercel (Runtime Logs), no el mensaje genérico de la API.
- **Qué corregí:** quité la línea runtime de las rutas y fijé jose a ^4.15.9 con overrides en package.json.
- **Resultado:** /api/clima responde con datos reales de Medellín.

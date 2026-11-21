# Clima local · API

API en Next.js (App Router, Route Handlers) desplegada en Vercel. Firebase Auth mediada por la API y Firestore solo por Admin SDK.

## Endpoints

- `GET /api/health`
- `POST /api/auth/registro` · `POST /api/auth/login` · `POST /api/auth/refresh` · `GET /api/auth/yo`
- `GET /api/ciudad_favorita?since=` · `PUT|DELETE /api/ciudad_favorita/:id`
- `GET /api/clima?lat=&lng=` (caché de 15 min) · `GET /api/geocodificar?q=`

## Variables de entorno (solo en Vercel)

`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_WEB_API_KEY`. Ver `env.example`.

## Comandos

`npm run check` (typecheck + lint + format + test + hook) · `npm run test:cov`

## Dependencias

- `firebase-admin`: acceso a Auth y Firestore desde el servidor.
- `zod`: validación de toda entrada y de respuestas externas.
- `vitest`: pruebas.

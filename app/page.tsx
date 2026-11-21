export default function Inicio() {
  return (
    <main
      style={{
        fontFamily: 'system-ui, sans-serif',
        maxWidth: 640,
        margin: '48px auto',
        padding: '0 20px',
        lineHeight: 1.5,
      }}
    >
      <h1>API de Clima Local</h1>
      <p>
        Servicio de la app 24-clima-local. Todas las rutas, salvo las de salud y registro, piden el
        token de Firebase en el encabezado Authorization.
      </p>
      <ul>
        <li>
          <a href="/api/health">GET /api/health</a>: estado del servicio
        </li>
        <li>POST /api/auth/registro y /api/auth/login: crear cuenta e iniciar sesión</li>
        <li>GET /api/clima?lat=&amp;lng=: clima actual (caché de 15 min)</li>
        <li>GET /api/geocodificar?q=: buscar ciudades</li>
        <li>
          GET /api/ciudad_favorita y PUT o DELETE /api/ciudad_favorita/:id: favoritas sincronizadas
        </li>
      </ul>
    </main>
  );
}

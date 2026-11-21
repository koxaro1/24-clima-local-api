import { ApiError } from './http';

// Límite simple en memoria (por instancia). En producción real se complementa
// con el Firewall de Vercel; aquí frena fuerza bruta básica.
const golpes = new Map<string, number[]>();

export function limitar(clave: string, max = 10, ventanaMs = 60_000, ahora = Date.now()): void {
  const recientes = (golpes.get(clave) ?? []).filter((t) => ahora - t < ventanaMs);
  if (recientes.length >= max) throw new ApiError(429, 'Demasiados intentos, intenta más tarde');
  recientes.push(ahora);
  golpes.set(clave, recientes);
}

export function clienteIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'desconocido';
}

import { requireEnv } from './env';
import { ApiError } from './http';

const CUENTAS = 'https://identitytoolkit.googleapis.com/v1/accounts';
const TOKEN = 'https://securetoken.googleapis.com/v1/token';

export interface Sesion {
  token: string;
  refreshToken: string;
  expiraEnSeg: number;
}
export interface SesionUsuario extends Sesion {
  usuario: { id: string; email: string };
}

type Datos = Record<string, unknown>;

const CREDENCIALES = [
  'INVALID_LOGIN_CREDENTIALS',
  'EMAIL_NOT_FOUND',
  'INVALID_PASSWORD',
  'USER_DISABLED',
  'USER_NOT_FOUND',
  'INVALID_REFRESH_TOKEN',
  'TOKEN_EXPIRED',
];

export function mapearError(mensaje: string): ApiError {
  if (mensaje.startsWith('EMAIL_EXISTS')) return new ApiError(409, 'El correo ya está registrado');
  if (mensaje.startsWith('WEAK_PASSWORD')) return new ApiError(400, 'Contraseña débil');
  if (mensaje.startsWith('INVALID_EMAIL')) return new ApiError(400, 'Correo inválido');
  if (mensaje.startsWith('TOO_MANY_ATTEMPTS'))
    return new ApiError(429, 'Demasiados intentos, intenta más tarde');
  if (CREDENCIALES.some((c) => mensaje.startsWith(c)))
    return new ApiError(401, 'Credenciales inválidas');
  return new ApiError(502, 'Servicio de autenticación no disponible');
}

async function llamar(url: string, init: RequestInit): Promise<Datos> {
  let r: Response;
  try {
    r = await fetch(url, { ...init, signal: AbortSignal.timeout(8000) });
  } catch {
    throw new ApiError(502, 'Servicio de autenticación no disponible');
  }
  const datos = (await r.json().catch(() => ({}))) as Datos;
  if (r.ok) return datos;
  const err = datos.error as { message?: string } | undefined;
  throw mapearError(err?.message ?? '');
}

function aSesionUsuario(d: Datos): SesionUsuario {
  return {
    token: String(d.idToken),
    refreshToken: String(d.refreshToken),
    expiraEnSeg: Number(d.expiresIn),
    usuario: { id: String(d.localId), email: String(d.email) },
  };
}

function conClave(url: string): string {
  return `${url}?key=${encodeURIComponent(requireEnv('FIREBASE_WEB_API_KEY'))}`;
}

function cuerpoJson(email: string, password: string): RequestInit {
  return {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  };
}

export async function registrar(email: string, password: string): Promise<SesionUsuario> {
  return aSesionUsuario(await llamar(conClave(`${CUENTAS}:signUp`), cuerpoJson(email, password)));
}

export async function iniciarSesion(email: string, password: string): Promise<SesionUsuario> {
  const url = conClave(`${CUENTAS}:signInWithPassword`);
  return aSesionUsuario(await llamar(url, cuerpoJson(email, password)));
}

export async function renovar(refreshToken: string): Promise<Sesion> {
  const d = await llamar(conClave(TOKEN), {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
  });
  return {
    token: String(d.id_token),
    refreshToken: String(d.refresh_token),
    expiraEnSeg: Number(d.expires_in),
  };
}

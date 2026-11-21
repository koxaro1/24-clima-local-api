import { adminAuth } from './firebase';
import { ApiError } from './http';

export interface Usuario {
  uid: string;
  email: string | null;
  rol: string | null;
}

// El uid sale SIEMPRE del token verificado, nunca del cuerpo ni de la URL.
export async function requireUser(req: Request): Promise<Usuario> {
  const cabecera = req.headers.get('authorization') ?? '';
  const token = /^Bearer (.+)$/.exec(cabecera)?.[1];
  if (!token) throw new ApiError(401, 'No autenticado');
  try {
    const t = await adminAuth().verifyIdToken(token);
    return { uid: t.uid, email: t.email ?? null, rol: typeof t.rol === 'string' ? t.rol : null };
  } catch {
    throw new ApiError(401, 'No autenticado');
  }
}

export function requireAdmin(user: Usuario): void {
  if (user.rol !== 'admin') throw new ApiError(403, 'Acceso denegado');
}

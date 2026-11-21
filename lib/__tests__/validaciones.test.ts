import { describe, expect, it, vi } from 'vitest';

vi.mock('../firebase', () => ({
  adminAuth: () => ({ verifyIdToken: async () => ({ uid: 'u1' }) }),
  db: vi.fn(),
}));

import { GET as geocodificar } from '../../app/api/geocodificar/route';
import { POST as login } from '../../app/api/auth/login/route';
import { POST as registro } from '../../app/api/auth/registro/route';
import { GET as health } from '../../app/api/health/route';
import { mapearError } from '../firebaseRest';
import { limitar } from '../ratelimit';
import { requireAdmin } from '../auth';

const json = (url: string, cuerpo: unknown): Request =>
  new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '9.9.9.9' },
    body: JSON.stringify(cuerpo),
  });

describe('validación', () => {
  it('registro rechaza contraseñas de menos de 8 caracteres', async () => {
    const res = await registro(
      json('http://x/api/auth/registro', { email: 'a@b.co', password: '1234567' }),
    );
    expect(res.status).toBe(400);
  });

  it('login rechaza un correo inválido', async () => {
    const res = await login(
      json('http://x/api/auth/login', { email: 'no-es-correo', password: '12345678' }),
    );
    expect(res.status).toBe(400);
  });

  it('geocodificar exige al menos 2 caracteres', async () => {
    const req = new Request('http://x/api/geocodificar?q=a', {
      headers: { authorization: 'Bearer t' },
    });
    expect((await geocodificar(req)).status).toBe(400);
  });

  it('health responde ok', async () => {
    expect(await health().json()).toEqual({ ok: true });
  });
});

describe('errores de Firebase y límites', () => {
  it('mapea los códigos de Firebase a los estados del enunciado', () => {
    expect(mapearError('EMAIL_EXISTS').status).toBe(409);
    expect(mapearError('INVALID_LOGIN_CREDENTIALS').status).toBe(401);
    expect(mapearError('EMAIL_NOT_FOUND').message).toBe(mapearError('INVALID_PASSWORD').message);
    expect(mapearError('WEAK_PASSWORD : Password should be at least 6').status).toBe(400);
    expect(mapearError('TOO_MANY_ATTEMPTS_TRY_LATER').status).toBe(429);
    expect(mapearError('OTRA_COSA').status).toBe(502);
  });

  it('limita los intentos repetidos con 429', () => {
    const ahora = 1_000_000;
    for (let i = 0; i < 3; i++) limitar('k', 3, 60_000, ahora);
    expect(() => limitar('k', 3, 60_000, ahora)).toThrow('Demasiados intentos');
    expect(() => limitar('k', 3, 60_000, ahora + 61_000)).not.toThrow();
  });

  it('las rutas de administración responden 403 sin el claim rol=admin', () => {
    expect(() => requireAdmin({ uid: 'u', email: null, rol: null })).toThrow('Acceso denegado');
    expect(() => requireAdmin({ uid: 'u', email: null, rol: 'admin' })).not.toThrow();
  });
});

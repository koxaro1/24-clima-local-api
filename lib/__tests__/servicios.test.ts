import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../firebase', () => ({
  adminAuth: vi.fn(),
  db: () => ({
    collection: () => ({
      where: () => ({
        orderBy: () => ({
          limit: () => ({
            get: async () => ({
              docs: [{ data: () => ({ id: 'a', updated_at: '2026-01-01T00:00:00.000Z' }) }],
            }),
          }),
        }),
      }),
    }),
  }),
}));

import { listarCiudades } from '../ciudades';
import { buscarCiudades } from '../geocodificar';
import { iniciarSesion, registrar, renovar } from '../firebaseRest';
import { ApiError } from '../http';

const respuesta = (cuerpo: unknown, status = 200): Response =>
  new Response(JSON.stringify(cuerpo), { status });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('listarCiudades', () => {
  it('devuelve los items y la hora del servidor', async () => {
    const r = await listarCiudades('u1', null);
    expect(r.items).toHaveLength(1);
    expect(r.servidor_ahora).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('rechaza un since que no es fecha ISO', async () => {
    await expect(listarCiudades('u1', 'ayer')).rejects.toBeInstanceOf(ApiError);
  });
});

describe('geocodificar', () => {
  it('traduce la respuesta del servicio', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        respuesta({
          results: [
            { id: 1, name: 'Medellín', latitude: 6.25, longitude: -75.56, country: 'Colombia' },
          ],
        }),
      ),
    );
    const r = await buscarCiudades('Medellín');
    expect(r[0]).toMatchObject({ nombre: 'Medellín', pais: 'Colombia', region: null });
  });

  it('devuelve lista vacía si no hay resultados', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuesta({})));
    expect(await buscarCiudades('zzzz')).toEqual([]);
  });

  it('responde 502 si el servicio falla', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuesta({}, 500)));
    await expect(buscarCiudades('Medellín')).rejects.toMatchObject({ status: 502 });
  });
});

describe('Firebase Auth REST', () => {
  it('registra y normaliza la sesión', async () => {
    vi.stubEnv('FIREBASE_WEB_API_KEY', 'clave-falsa');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        respuesta({
          idToken: 't',
          refreshToken: 'r',
          expiresIn: '3600',
          localId: 'u1',
          email: 'a@b.co',
        }),
      ),
    );
    expect(await registrar('a@b.co', '12345678')).toEqual({
      token: 't',
      refreshToken: 'r',
      expiraEnSeg: 3600,
      usuario: { id: 'u1', email: 'a@b.co' },
    });
  });

  it('login con credenciales malas responde 401', async () => {
    vi.stubEnv('FIREBASE_WEB_API_KEY', 'clave-falsa');
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(respuesta({ error: { message: 'INVALID_LOGIN_CREDENTIALS' } }, 400)),
    );
    await expect(iniciarSesion('a@b.co', '12345678')).rejects.toMatchObject({ status: 401 });
  });

  it('renueva el token', async () => {
    vi.stubEnv('FIREBASE_WEB_API_KEY', 'clave-falsa');
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(respuesta({ id_token: 't2', refresh_token: 'r2', expires_in: '3600' })),
    );
    expect(await renovar('refresh-largo-123')).toEqual({
      token: 't2',
      refreshToken: 'r2',
      expiraEnSeg: 3600,
    });
  });

  it('responde 502 si Firebase no responde', async () => {
    vi.stubEnv('FIREBASE_WEB_API_KEY', 'clave-falsa');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('red')));
    await expect(renovar('refresh-largo-123')).rejects.toMatchObject({ status: 502 });
  });
});

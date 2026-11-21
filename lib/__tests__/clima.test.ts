import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const estado = vi.hoisted(() => ({
  cache: null as { datos: unknown; obtenido_en: string } | null,
  guardado: null as unknown,
}));

vi.mock('../firebase', () => ({
  adminAuth: () => ({ verifyIdToken: async () => ({ uid: 'u1' }) }),
  db: () => ({
    doc: () => ({
      get: async () => ({
        exists: estado.cache !== null,
        get: (c: string) => (estado.cache as Record<string, unknown> | null)?.[c],
      }),
      set: async (d: unknown) => {
        estado.guardado = d;
      },
    }),
  }),
}));

import { GET } from '../../app/api/clima/route';
import { claveCache, normalizar, redondear } from '../clima';

const DATOS = {
  ubicacion: { lat: 6.25, lng: -75.56 },
  actual: { temperatura: 20, viento: 5, prob_lluvia: 10, presion: 1013 },
  horas: [],
};

function pedir(consulta: string, token = 'x'): Request {
  return new Request(`http://x/api/clima${consulta}`, {
    headers: { authorization: `Bearer ${token}` },
  });
}

const OPEN_METEO = {
  current: {
    time: '2026-11-20T22:30',
    temperature_2m: 18.5,
    wind_speed_10m: 7,
    surface_pressure: 1008.2,
  },
  hourly: {
    time: ['2026-11-20T21:00', '2026-11-20T22:00', '2026-11-20T23:00'],
    temperature_2m: [19, 18, 17],
    precipitation_probability: [10, 40, null],
    surface_pressure: [1009, 1008, 1007],
  },
};

beforeEach(() => {
  estado.cache = null;
  estado.guardado = null;
});
afterEach(() => vi.unstubAllGlobals());

describe('funciones puras', () => {
  it('redondea a 2 decimales y arma la clave de caché', () => {
    expect(redondear(6.25678)).toBe(6.26);
    expect(claveCache(6.254, -75.561)).toBe('6.25_-75.56');
  });

  it('normaliza la respuesta de Open-Meteo desde la hora actual', () => {
    const c = normalizar(OPEN_METEO, 6.25, -75.56);
    expect(c.horas[0]?.hora).toBe('2026-11-20T22:00');
    expect(c.actual.prob_lluvia).toBe(40);
    expect(c.horas[1]?.prob_lluvia).toBe(0);
    expect(c.actual.presion).toBe(1008.2);
  });
});

describe('GET /api/clima', () => {
  it('responde 401 sin token', async () => {
    const res = await GET(new Request('http://x/api/clima?lat=1&lng=1'));
    expect(res.status).toBe(401);
  });

  it('responde 400 con coordenadas inválidas o ausentes', async () => {
    expect((await GET(pedir('?lat=abc&lng=1'))).status).toBe(400);
    expect((await GET(pedir('?lat=91&lng=1'))).status).toBe(400);
    expect((await GET(pedir(''))).status).toBe(400);
  });

  it('responde con la caché cuando el servicio externo falla', async () => {
    estado.cache = { datos: DATOS, obtenido_en: '2000-01-01T00:00:00.000Z' };
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('sin red')));
    const res = await GET(pedir('?lat=6.25&lng=-75.56'));
    expect(res.status).toBe(200);
    const cuerpo = (await res.json()) as { desde_cache: boolean; desactualizado: boolean };
    expect(cuerpo.desde_cache).toBe(true);
    expect(cuerpo.desactualizado).toBe(true);
  });

  it('responde 502 si falla el servicio y no hay caché', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('sin red')));
    expect((await GET(pedir('?lat=6.25&lng=-75.56'))).status).toBe(502);
  });

  it('usa la caché fresca sin llamar al servicio externo', async () => {
    estado.cache = { datos: DATOS, obtenido_en: new Date().toISOString() };
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    const res = await GET(pedir('?lat=6.25&lng=-75.56'));
    expect(res.status).toBe(200);
    expect(f).not.toHaveBeenCalled();
  });

  it('pide a Open-Meteo, guarda en caché y responde', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify(OPEN_METEO), { status: 200 })),
    );
    const res = await GET(pedir('?lat=6.254&lng=-75.561'));
    expect(res.status).toBe(200);
    expect(estado.guardado).not.toBeNull();
  });
});

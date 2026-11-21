import { beforeEach, describe, expect, it, vi } from 'vitest';

const estado = vi.hoisted(() => ({
  escrituras: [] as { ruta: string; doc: Record<string, unknown> }[],
  activas: 0,
  existentes: {} as Record<string, Record<string, unknown>>,
}));

vi.mock('../firebase', () => ({
  adminAuth: () => ({
    verifyIdToken: async (t: string) => {
      if (t === 'tokenA') return { uid: 'usuarioA' };
      if (t === 'tokenB') return { uid: 'usuarioB' };
      throw new Error('malo');
    },
  }),
  db: () => ({
    doc: (ruta: string) => ({
      get: async () => {
        const d = estado.existentes[ruta];
        return { exists: d !== undefined, get: (c: string) => d?.[c] };
      },
      set: async (doc: Record<string, unknown>) => {
        estado.escrituras.push({ ruta, doc });
      },
      update: async (doc: Record<string, unknown>) => {
        estado.escrituras.push({ ruta, doc });
      },
    }),
    collection: () => ({
      where: () => ({
        count: () => ({ get: async () => ({ data: () => ({ count: estado.activas }) }) }),
      }),
    }),
  }),
}));

import { DELETE, PUT } from '../../app/api/ciudad_favorita/[id]/route';

const ID = '3f2b8c1e-5d4a-4c9e-8b7a-1a2b3c4d5e6f';
const ctx = { params: Promise.resolve({ id: ID }) };

function pedir(metodo: string, token: string, cuerpo?: unknown): Request {
  return new Request(`http://x/api/ciudad_favorita/${ID}`, {
    method: metodo,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
}

beforeEach(() => {
  estado.escrituras = [];
  estado.activas = 0;
  estado.existentes = {};
});

describe('PUT /api/ciudad_favorita/:id', () => {
  it('responde 401 sin token válido', async () => {
    const res = await PUT(pedir('PUT', 'falso', { nombre: 'X', lat: 1, lng: 1 }), ctx);
    expect(res.status).toBe(401);
  });

  it('responde 400 si la latitud es inválida', async () => {
    const res = await PUT(pedir('PUT', 'tokenA', { nombre: 'Medellín', lat: 123, lng: 1 }), ctx);
    expect(res.status).toBe(400);
    const cuerpo = (await res.json()) as { error: string; detalles: { campo: string }[] };
    expect(cuerpo.detalles[0]?.campo).toBe('lat');
  });

  it('responde 400 si el id no es un UUID', async () => {
    const mala = { params: Promise.resolve({ id: 'no-es-uuid' }) };
    const res = await PUT(pedir('PUT', 'tokenA', { nombre: 'X', lat: 1, lng: 1 }), mala);
    expect(res.status).toBe(400);
  });

  it('aísla usuarios: escribe bajo el uid del token e ignora uid del cuerpo', async () => {
    const res = await PUT(
      pedir('PUT', 'tokenA', {
        nombre: 'Medellín',
        lat: 6.25,
        lng: -75.56,
        uid: 'usuarioB',
        extra: 1,
      }),
      ctx,
    );
    expect(res.status).toBe(200);
    const w = estado.escrituras[0];
    expect(w?.ruta).toBe(`usuarios/usuarioA/ciudad_favorita/${ID}`);
    expect(w?.doc).not.toHaveProperty('uid');
    expect(w?.doc).not.toHaveProperty('extra');
    expect(w?.doc.deleted_at).toBeNull();
  });

  it('responde 409 si ya hay 10 ciudades', async () => {
    estado.activas = 10;
    const res = await PUT(pedir('PUT', 'tokenA', { nombre: 'X', lat: 1, lng: 1 }), ctx);
    expect(res.status).toBe(409);
  });

  it('responde 415 si no es JSON', async () => {
    const req = new Request(`http://x/api/ciudad_favorita/${ID}`, {
      method: 'PUT',
      headers: { authorization: 'Bearer tokenA', 'content-type': 'text/plain' },
      body: 'hola',
    });
    expect((await PUT(req, ctx)).status).toBe(415);
  });
});

describe('DELETE /api/ciudad_favorita/:id', () => {
  it('responde 404 si la ciudad es de otro usuario (no existe bajo su ruta)', async () => {
    estado.existentes[`usuarios/usuarioB/ciudad_favorita/${ID}`] = { deleted_at: null };
    const res = await DELETE(pedir('DELETE', 'tokenA'), ctx);
    expect(res.status).toBe(404);
  });

  it('hace borrado lógico si existe', async () => {
    estado.existentes[`usuarios/usuarioA/ciudad_favorita/${ID}`] = { deleted_at: null };
    const res = await DELETE(pedir('DELETE', 'tokenA'), ctx);
    expect(res.status).toBe(200);
    expect(estado.escrituras[0]?.doc.deleted_at).toEqual(expect.any(String));
  });
});

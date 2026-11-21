import { describe, expect, it, vi } from 'vitest';

vi.mock('../firebase', () => ({
  adminAuth: () => ({
    verifyIdToken: async (t: string) => {
      if (t === 'valido') return { uid: 'u1', email: 'a@b.co' };
      throw new Error('token malo');
    },
  }),
  db: vi.fn(),
}));

import { GET } from '../../app/api/auth/yo/route';

describe('GET /api/auth/yo', () => {
  it('responde 401 sin token', async () => {
    const res = await GET(new Request('http://x/api/auth/yo'));
    expect(res.status).toBe(401);
  });

  it('responde 401 con token inválido', async () => {
    const res = await GET(
      new Request('http://x/api/auth/yo', { headers: { authorization: 'Bearer malo' } }),
    );
    expect(res.status).toBe(401);
  });

  it('responde 200 con token válido y toma el uid del token', async () => {
    const res = await GET(
      new Request('http://x/api/auth/yo', { headers: { authorization: 'Bearer valido' } }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ usuario: { id: 'u1', email: 'a@b.co' } });
  });
});

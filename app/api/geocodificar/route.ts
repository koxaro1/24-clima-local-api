import { z } from 'zod';
import { requireUser } from '../../../lib/auth';
import { buscarCiudades } from '../../../lib/geocodificar';
import { errorResponse, json, parse } from '../../../lib/http';

const schema = z.object({ q: z.string().trim().min(2).max(80) });

export async function GET(req: Request): Promise<Response> {
  try {
    await requireUser(req);
    const { q } = parse(schema, { q: new URL(req.url).searchParams.get('q') ?? '' });
    return json({ items: await buscarCiudades(q) });
  } catch (e) {
    return errorResponse(e);
  }
}

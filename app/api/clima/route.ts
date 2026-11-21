import { z } from 'zod';
import { requireUser } from '../../../lib/auth';
import { obtenerClima } from '../../../lib/clima';
import { errorResponse, json, parse } from '../../../lib/http';

const coordenada = (min: number, max: number) =>
  z
    .string()
    .regex(/^-?\d+(\.\d+)?$/, 'Número inválido')
    .transform(Number)
    .pipe(z.number().min(min).max(max));

const schema = z.object({ lat: coordenada(-90, 90), lng: coordenada(-180, 180) });

export async function GET(req: Request): Promise<Response> {
  try {
    await requireUser(req);
    const p = new URL(req.url).searchParams;
    const { lat, lng } = parse(schema, { lat: p.get('lat') ?? '', lng: p.get('lng') ?? '' });
    return json(await obtenerClima(lat, lng));
  } catch (e) {
    return errorResponse(e);
  }
}

import { requireUser } from '../../../lib/auth';
import { listarCiudades } from '../../../lib/ciudades';
import { errorResponse, json } from '../../../lib/http';

export const runtime = 'nodejs';

export async function GET(req: Request): Promise<Response> {
  try {
    const u = await requireUser(req);
    const since = new URL(req.url).searchParams.get('since');
    return json(await listarCiudades(u.uid, since));
  } catch (e) {
    return errorResponse(e);
  }
}

import { z } from 'zod';
import { errorResponse, json, parse, readJson } from '../../../../lib/http';
import { clienteIp, limitar } from '../../../../lib/ratelimit';
import { renovar } from '../../../../lib/firebaseRest';

export const runtime = 'nodejs';

const schema = z.object({ refreshToken: z.string().min(10).max(2000) });

export async function POST(req: Request): Promise<Response> {
  try {
    limitar('refresh:' + clienteIp(req), 30);
    const { refreshToken } = parse(schema, await readJson(req));
    return json(await renovar(refreshToken));
  } catch (e) {
    return errorResponse(e);
  }
}

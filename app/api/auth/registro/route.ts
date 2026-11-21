import { z } from 'zod';
import { errorResponse, json, parse, readJson } from '../../../../lib/http';
import { clienteIp, limitar } from '../../../../lib/ratelimit';
import { registrar } from '../../../../lib/firebaseRest';

const schema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(8).max(200),
});

export async function POST(req: Request): Promise<Response> {
  try {
    limitar('auth:' + clienteIp(req));
    const { email, password } = parse(schema, await readJson(req));
    return json(await registrar(email, password), 201);
  } catch (e) {
    return errorResponse(e);
  }
}

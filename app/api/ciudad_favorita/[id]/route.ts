import { requireUser } from '../../../../lib/auth';
import { borrarCiudad, guardarCiudad, idSchema } from '../../../../lib/ciudades';
import { errorResponse, json, parse, readJson } from '../../../../lib/http';

export const runtime = 'nodejs';

interface Contexto {
  params: Promise<{ id: string }>;
}

export async function PUT(req: Request, ctx: Contexto): Promise<Response> {
  try {
    const u = await requireUser(req);
    const id = parse(idSchema, (await ctx.params).id);
    return json(await guardarCiudad(u.uid, id, await readJson(req)));
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(req: Request, ctx: Contexto): Promise<Response> {
  try {
    const u = await requireUser(req);
    const id = parse(idSchema, (await ctx.params).id);
    await borrarCiudad(u.uid, id);
    return json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}

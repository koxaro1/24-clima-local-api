import { NextResponse } from 'next/server';
import type { z } from 'zod';

export interface Detalle {
  campo: string;
  mensaje: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public detalles?: Detalle[],
  ) {
    super(message);
  }
}

export function json(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function errorResponse(e: unknown): NextResponse {
  if (e instanceof ApiError) {
    const cuerpo = e.detalles ? { error: e.message, detalles: e.detalles } : { error: e.message };
    return json(cuerpo, e.status);
  }
  console.error('Error interno:', e instanceof Error ? e.message : 'desconocido');
  console.error('Error interno:', e instanceof Error ? e.message : 'desconocido');
  return json({ error: 'Error interno' }, 500);
}

export async function readJson(req: Request): Promise<unknown> {
  const tipo = req.headers.get('content-type') ?? '';
  if (!tipo.includes('application/json')) throw new ApiError(415, 'Se requiere application/json');
  const texto = await req.text();
  if (texto.length > 100_000) throw new ApiError(413, 'Cuerpo demasiado grande');
  try {
    return JSON.parse(texto) as unknown;
  } catch {
    throw new ApiError(400, 'JSON inválido');
  }
}

export function parse<S extends z.ZodType>(schema: S, data: unknown): z.infer<S> {
  const r = schema.safeParse(data);
  if (r.success) return r.data as z.infer<S>;
  const detalles = r.error.issues.map((i) => ({
    campo: i.path.join('.'),
    mensaje: i.message,
  }));
  throw new ApiError(400, 'Datos inválidos', detalles);
}

import { z } from 'zod';
import { db } from './firebase';
import { ApiError, parse } from './http';

export const MAX_CIUDADES = 10;
const LIMITE_PAGINA = 500;

export const idSchema = z.string().uuid();

export const ciudadSchema = z.object({
  nombre: z.string().trim().min(1).max(80),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const sinceSchema = z.string().datetime();

export interface CiudadDoc {
  id: string;
  nombre: string;
  lat: number;
  lng: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

const coleccion = (uid: string) => db().collection(`usuarios/${uid}/ciudad_favorita`);

export async function listarCiudades(uid: string, desde: string | null) {
  const since = desde === null ? '1970-01-01T00:00:00.000Z' : parse(sinceSchema, desde);
  const snap = await coleccion(uid)
    .where('updated_at', '>', since)
    .orderBy('updated_at')
    .limit(LIMITE_PAGINA)
    .get();
  const items = snap.docs.map((d) => d.data() as CiudadDoc);
  return { items, servidor_ahora: new Date().toISOString() };
}

async function contarActivas(uid: string): Promise<number> {
  const r = await coleccion(uid).where('deleted_at', '==', null).count().get();
  return r.data().count;
}

export async function guardarCiudad(uid: string, id: string, cuerpo: unknown): Promise<CiudadDoc> {
  const datos = parse(ciudadSchema, cuerpo);
  const ref = db().doc(`usuarios/${uid}/ciudad_favorita/${id}`);
  const snap = await ref.get();
  const activa = snap.exists && snap.get('deleted_at') === null;
  if (!activa && (await contarActivas(uid)) >= MAX_CIUDADES) {
    throw new ApiError(409, `No se permiten más de ${MAX_CIUDADES} ciudades`);
  }
  const ahora = new Date().toISOString();
  const creada = snap.exists ? (snap.get('created_at') as string | undefined) : undefined;
  const doc: CiudadDoc = {
    id,
    ...datos,
    created_at: creada ?? ahora,
    updated_at: ahora,
    deleted_at: null,
  };
  await ref.set(doc);
  return doc;
}

export async function borrarCiudad(uid: string, id: string): Promise<void> {
  const ref = db().doc(`usuarios/${uid}/ciudad_favorita/${id}`);
  const snap = await ref.get();
  if (!snap.exists || snap.get('deleted_at') !== null) throw new ApiError(404, 'No existe');
  const ahora = new Date().toISOString();
  await ref.update({ deleted_at: ahora, updated_at: ahora });
}

import { z } from 'zod';
import { ApiError } from './http';

const Respuesta = z.object({
  results: z
    .array(
      z.object({
        id: z.number(),
        name: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        country: z.string().optional(),
        admin1: z.string().optional(),
      }),
    )
    .optional(),
});

export interface Lugar {
  id: number;
  nombre: string;
  region: string | null;
  pais: string | null;
  lat: number;
  lng: number;
}

export async function buscarCiudades(q: string): Promise<Lugar[]> {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.searchParams.set('name', q);
  url.searchParams.set('count', '8');
  url.searchParams.set('language', 'es');
  let datos: z.infer<typeof Respuesta>;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new Error(String(r.status));
    datos = Respuesta.parse(await r.json());
  } catch {
    throw new ApiError(502, 'Servicio de búsqueda no disponible');
  }
  return (datos.results ?? []).map((x) => ({
    id: x.id,
    nombre: x.name,
    region: x.admin1 ?? null,
    pais: x.country ?? null,
    lat: x.latitude,
    lng: x.longitude,
  }));
}

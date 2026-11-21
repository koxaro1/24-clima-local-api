import { z } from 'zod';
import { db } from './firebase';
import { ApiError } from './http';

const CACHE_MS = 15 * 60_000;

const OpenMeteo = z.object({
  current: z.object({
    time: z.string(),
    temperature_2m: z.number(),
    wind_speed_10m: z.number(),
    surface_pressure: z.number(),
  }),
  hourly: z.object({
    time: z.array(z.string()),
    temperature_2m: z.array(z.number()),
    precipitation_probability: z.array(z.number().nullable()),
    surface_pressure: z.array(z.number()),
  }),
});
type OpenMeteoDatos = z.infer<typeof OpenMeteo>;

export interface Hora {
  hora: string;
  temperatura: number;
  prob_lluvia: number;
  presion: number;
}
export interface Clima {
  ubicacion: { lat: number; lng: number };
  actual: { temperatura: number; viento: number; prob_lluvia: number; presion: number };
  horas: Hora[];
}
export interface ClimaRespuesta extends Clima {
  obtenido_en: string;
  desde_cache: boolean;
  desactualizado: boolean;
}

export const redondear = (n: number): number => Math.round(n * 100) / 100;
export const claveCache = (lat: number, lng: number): string =>
  `${redondear(lat).toFixed(2)}_${redondear(lng).toFixed(2)}`;

export function normalizar(raw: OpenMeteoDatos, lat: number, lng: number): Clima {
  const { current: c, hourly: h } = raw;
  const desde = `${c.time.slice(0, 13)}:00`;
  const encontrado = h.time.findIndex((t) => t >= desde);
  const inicio = Math.max(encontrado, 0);
  const horas: Hora[] = h.time.slice(inicio, inicio + 24).map((hora, i) => ({
    hora,
    temperatura: h.temperature_2m[inicio + i] ?? 0,
    prob_lluvia: h.precipitation_probability[inicio + i] ?? 0,
    presion: h.surface_pressure[inicio + i] ?? c.surface_pressure,
  }));
  return {
    ubicacion: { lat, lng },
    actual: {
      temperatura: c.temperature_2m,
      viento: c.wind_speed_10m,
      prob_lluvia: h.precipitation_probability[inicio] ?? 0,
      presion: c.surface_pressure,
    },
    horas,
  };
}

async function pedirOpenMeteo(lat: number, lng: number): Promise<Clima> {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lng));
  url.searchParams.set('current', 'temperature_2m,wind_speed_10m,surface_pressure');
  url.searchParams.set('hourly', 'temperature_2m,precipitation_probability,surface_pressure');
  url.searchParams.set('forecast_days', '2');
  url.searchParams.set('timezone', 'auto');
  const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`Open-Meteo ${r.status}`);
  return normalizar(OpenMeteo.parse(await r.json()), lat, lng);
}

interface Cache {
  datos: Clima;
  obtenido_en: string;
}

async function leerCache(clave: string): Promise<Cache | null> {
  const snap = await db().doc(`cache_clima/${clave}`).get();
  if (!snap.exists) return null;
  return { datos: snap.get('datos') as Clima, obtenido_en: snap.get('obtenido_en') as string };
}

export async function obtenerClima(
  latCruda: number,
  lngCruda: number,
  ahora = Date.now(),
): Promise<ClimaRespuesta> {
  const lat = redondear(latCruda);
  const lng = redondear(lngCruda);
  const clave = claveCache(lat, lng);
  const cache = await leerCache(clave);
  if (cache && ahora - Date.parse(cache.obtenido_en) < CACHE_MS) {
    return {
      ...cache.datos,
      obtenido_en: cache.obtenido_en,
      desde_cache: true,
      desactualizado: false,
    };
  }
  try {
    const datos = await pedirOpenMeteo(lat, lng);
    const obtenido_en = new Date(ahora).toISOString();
    await db().doc(`cache_clima/${clave}`).set({ datos, obtenido_en });
    return { ...datos, obtenido_en, desde_cache: false, desactualizado: false };
  } catch {
    if (!cache) throw new ApiError(502, 'Servicio de clima no disponible');
    return {
      ...cache.datos,
      obtenido_en: cache.obtenido_en,
      desde_cache: true,
      desactualizado: true,
    };
  }
}

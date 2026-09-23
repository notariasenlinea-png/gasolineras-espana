// Shared helpers for station data. Imported both at build time (Astro frontmatter)
// and in client scripts, so it must stay free of Node-only APIs.

export interface StationPrices {
  gasolina95: number | null;
  gasolina95_e10?: number | null;
  gasolina98?: number | null;
  gasolina98_e10?: number | null;
  diesel: number | null;
  diesel_plus?: number | null;
  gasoleo_b?: number | null;
  glp?: number | null;
  adblue?: number | null;
  gnc?: number | null;
  gnl?: number | null;
  hvo?: number | null;
}

export interface GasStation {
  id: string;
  brand: string;
  brand_raw?: string;
  address: string;
  town: string;
  town_slug?: string;
  postal_code?: string;
  province: string;
  province_slug?: string;
  ccaa?: string;
  lat: number;
  lng: number;
  schedule: string;
  is_24h: boolean;
  prices: StationPrices;
  maps_url: string;
}

/** Compact record from public/data/stations_light.json */
export interface StationLight {
  i: string;
  b: string;
  a: string;
  t: string;
  p: string;
  ps: string;
  lt: number;
  ln: number;
  p95: number | null;
  d: number | null;
  h24: boolean;
}

export const FUELS: Array<{ key: keyof StationPrices; label: string; short: string; dot: string }> = [
  { key: 'gasolina95', label: 'Gasolina 95', short: 'SP95', dot: '#16A34A' },
  { key: 'diesel', label: 'Diésel A', short: 'Diésel', dot: '#111827' },
  { key: 'gasolina98', label: 'Gasolina 98', short: 'SP98', dot: '#166534' },
  { key: 'diesel_plus', label: 'Diésel Premium', short: 'Diésel+', dot: '#374151' },
  { key: 'gasolina95_e10', label: 'Gasolina 95 E10', short: 'E10', dot: '#4ADE80' },
  { key: 'gasolina98_e10', label: 'Gasolina 98 E10', short: 'SP98 E10', dot: '#22C55E' },
  { key: 'gasoleo_b', label: 'Gasóleo B', short: 'Gasóleo B', dot: '#DC2626' },
  { key: 'glp', label: 'GLP / Autogas', short: 'GLP', dot: '#F59E0B' },
  { key: 'gnc', label: 'GNC', short: 'GNC', dot: '#0EA5E9' },
  { key: 'gnl', label: 'GNL', short: 'GNL', dot: '#0369A1' },
  { key: 'hvo', label: 'HVO100 renovable', short: 'HVO', dot: '#0D9488' },
  { key: 'adblue', label: 'AdBlue', short: 'AdBlue', dot: '#2563EB' },
];

export function slugify(text: string): string {
  return (text || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Stable, descriptive slug for a station detail page: marca-municipio-id */
export function stationSlug(brand: string, town: string, id: string): string {
  return [slugify(brand), slugify(town), slugify(id)].filter(Boolean).join('-');
}

export function stationUrl(s: Pick<GasStation, 'brand' | 'town' | 'id'>): string {
  return `/gasolinera/${stationSlug(s.brand, s.town, s.id)}/`;
}

export function lightStationUrl(s: Pick<StationLight, 'b' | 't' | 'i'>): string {
  return `/gasolinera/${stationSlug(s.b, s.t, s.i)}/`;
}

export function mapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

export function wazeUrl(lat: number, lng: number): string {
  return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
}

const LOW_COST_BRANDS = [
  'plenoil', 'plenergy', 'ballenoil', 'petroprix', 'gasexpress', 'easygas', 'autonet',
  'fast fuel', 'bonàrea', 'bonarea', 'carrefour', 'alcampo', 'eroski', 'esclatoil',
  'gmoil', 'low cost', 'costco', 'e.leclerc', 'leclerc', 'petrocat directe',
];

export function isLowCost(brand: string): boolean {
  const b = (brand || '').toLowerCase();
  return LOW_COST_BRANDS.some((lc) => b.includes(lc));
}

export function fmtPrice(p: number | null | undefined, digits = 3): string {
  return typeof p === 'number' ? p.toFixed(digits).replace('.', ',') : '–';
}

export function fmtEuros(v: number): string {
  return `${v.toFixed(2).replace('.', ',')} €`;
}

export function average(values: Array<number | null | undefined>): number | null {
  const nums = values.filter((v): v is number => typeof v === 'number');
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/* ------------------------------------------------------------------ */
/* Opening hours: MITECO strings like "L-V: 06:00-22:00; S-D: 07:00-22:00" */
/* ------------------------------------------------------------------ */

const DAY_LETTERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const SCHEMA_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** Per weekday (0 = Monday) list of [openMinutes, closeMinutes] intervals. */
export type WeekSchedule = Array<Array<[number, number]>>;

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Parses the MITECO schedule text. Returns null when the format is not
 * understood, or when it only lists Monday ("L: ..."), which MITECO data
 * uses ambiguously and we'd rather not guess on.
 */
export function parseSchedule(text: string): WeekSchedule | null {
  if (!text) return null;
  const week: WeekSchedule = [[], [], [], [], [], [], []];
  const segments = text.split(';').map((s) => s.trim()).filter(Boolean);
  let onlyMonday = true;

  for (const seg of segments) {
    const m = seg.match(/^([LMXJVSD])(?:-([LMXJVSD]))?\s*:\s*(.+)$/i);
    if (!m) return null;
    const from = DAY_LETTERS.indexOf(m[1].toUpperCase());
    const to = m[2] ? DAY_LETTERS.indexOf(m[2].toUpperCase()) : from;
    if (from < 0 || to < from) return null;
    if (!(from === 0 && to === 0)) onlyMonday = false;

    const hoursText = m[3].trim().toUpperCase();
    const intervals: Array<[number, number]> = [];
    if (hoursText === '24H') {
      intervals.push([0, 1440]);
    } else {
      const ranges = hoursText.split(/\s+Y\s+|,\s*/);
      for (const r of ranges) {
        const rm = r.trim().match(/^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/);
        if (!rm) return null;
        const open = toMinutes(rm[1]);
        let close = toMinutes(rm[2]);
        if (close === 0) close = 1440;
        if (close === 1439) close = 1440;
        intervals.push([open, close]);
      }
    }
    for (let d = from; d <= to; d++) week[d].push(...intervals);
  }

  if (onlyMonday && segments.length === 1) return null;
  return week;
}

function minutesToHHMM(min: number): string {
  if (min >= 1440) return '23:59';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function openingHoursSpecification(week: WeekSchedule) {
  const specs: Array<Record<string, unknown>> = [];
  week.forEach((intervals, day) => {
    for (const [o, c] of intervals) {
      specs.push({
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: `https://schema.org/${SCHEMA_DAYS[day]}`,
        opens: minutesToHHMM(o),
        closes: minutesToHHMM(c),
      });
    }
  });
  return specs;
}

/** Whether a station is open at the given moment (evaluated in Europe/Madrid time). */
export function isOpenAt(week: WeekSchedule, date: Date): boolean {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Madrid',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const wd = parts.find((p) => p.type === 'weekday')?.value ?? 'Mon';
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0) % 24;
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  const day = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(wd);
  const now = hour * 60 + minute;

  const within = (d: number, t: number) =>
    week[d].some(([o, c]) => (c > o ? t >= o && t < c : t >= o || t < c));
  if (within(day, now)) return true;
  // Overnight intervals from the previous day (e.g. 22:00-02:00)
  const prev = (day + 6) % 7;
  return week[prev].some(([o, c]) => c < o && now < c);
}

/* ------------------------------------------------------------------ */
/* Visual helpers                                                      */
/* ------------------------------------------------------------------ */

const BRAND_COLORS: Array<[string, string, string]> = [
  // [match, background, foreground]
  ['repsol', '#FF7A00', '#FFFFFF'],
  ['moeve', '#E30613', '#FFFFFF'],
  ['cepsa', '#E30613', '#FFFFFF'],
  ['bp', '#00874A', '#FFFFFF'],
  ['shell', '#FFD500', '#D52B1E'],
  ['galp', '#F26B21', '#FFFFFF'],
  ['ballenoil', '#0A64B4', '#FFFFFF'],
  ['plenergy', '#00A0E0', '#FFFFFF'],
  ['plenoil', '#00A0E0', '#FFFFFF'],
  ['petroprix', '#6D28D9', '#FFFFFF'],
  ['petronor', '#FF7A00', '#FFFFFF'],
  ['carrefour', '#1E4FA0', '#FFFFFF'],
  ['alcampo', '#E2001A', '#FFFFFF'],
  ['disa', '#003A8C', '#FFFFFF'],
  ['avia', '#D71920', '#FFFFFF'],
  ['q8', '#0055A4', '#FFD200'],
  ['campsa', '#E30613', '#FFD200'],
  ['bonàrea', '#D6001C', '#FFFFFF'],
  ['eroski', '#E30613', '#FFFFFF'],
];

export function brandStyle(brand: string): { bg: string; fg: string; initials: string } {
  const b = (brand || '').toLowerCase();
  const hit = BRAND_COLORS.find(([m]) => (m === 'bp' ? b === 'bp' : b.includes(m)));
  const words = (brand || '?').replace(/[^\p{L}\p{N}\s]/gu, ' ').trim().split(/\s+/).filter(Boolean);
  const initials = (words.length > 1 ? words[0][0] + words[1][0] : (words[0] || '?').slice(0, 2)).toUpperCase();
  return { bg: hit ? hit[1] : '#1C221E', fg: hit ? hit[2] : '#D6FF3D', initials };
}

export type PriceLevel = 'low' | 'mid' | 'high';

/** Classifies a price against a local reference average (±2 cts band). */
export function priceLevel(price: number | null | undefined, avg: number | null | undefined): PriceLevel | null {
  if (typeof price !== 'number' || typeof avg !== 'number') return null;
  const d = price - avg;
  if (d <= -0.02) return 'low';
  if (d >= 0.02) return 'high';
  return 'mid';
}

export const LEVEL_LABEL: Record<PriceLevel, string> = { low: 'Barata', mid: 'En la media', high: 'Cara' };

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function fmtKm(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1).replace('.', ',')} km`;
}

/** Share (0-100) of prices in the sorted array that are strictly higher than `price`. */
export function cheaperThanPct(sortedAsc: number[], price: number): number {
  if (sortedAsc.length <= 1) return 0;
  let lo = 0;
  let hi = sortedAsc.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sortedAsc[mid] <= price) lo = mid + 1;
    else hi = mid;
  }
  return Math.round(((sortedAsc.length - lo) / (sortedAsc.length - 1)) * 100);
}

export const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export function fmtInterval([o, c]: [number, number]): string {
  if (o === 0 && c >= 1440) return '24 horas';
  const f = (m: number) => (m >= 1440 ? '24:00' : `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
  return `${f(o)} – ${f(c)}`;
}

/** Compact map point: [lat, lng, sp95, diesel, url, brand, address, is24h] */
export type MapPoint = [number, number, number | null, number | null, string, string, string, 0 | 1];

export function toMapPoint(s: GasStation): MapPoint {
  return [s.lat, s.lng, s.prices?.gasolina95 ?? null, s.prices?.diesel ?? null, stationUrl(s), s.brand, s.address, s.is_24h ? 1 : 0];
}

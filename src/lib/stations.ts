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
  { key: 'gasolina95', label: 'Gasolina 95 E5', short: 'G95', dot: 'bg-emerald-600' },
  { key: 'diesel', label: 'Diésel A (Gasóleo A)', short: 'Diésel', dot: 'bg-sky-600' },
  { key: 'gasolina98', label: 'Gasolina 98 E5', short: 'G98', dot: 'bg-violet-600' },
  { key: 'diesel_plus', label: 'Diésel Premium (A+)', short: 'Diésel+', dot: 'bg-sky-800' },
  { key: 'gasolina95_e10', label: 'Gasolina 95 E10', short: 'G95 E10', dot: 'bg-emerald-400' },
  { key: 'gasolina98_e10', label: 'Gasolina 98 E10', short: 'G98 E10', dot: 'bg-violet-400' },
  { key: 'gasoleo_b', label: 'Gasóleo B (agrícola)', short: 'Gasóleo B', dot: 'bg-rose-500' },
  { key: 'glp', label: 'GLP / Autogas', short: 'GLP', dot: 'bg-amber-500' },
  { key: 'gnc', label: 'Gas Natural Comprimido (GNC)', short: 'GNC', dot: 'bg-cyan-600' },
  { key: 'gnl', label: 'Gas Natural Licuado (GNL)', short: 'GNL', dot: 'bg-cyan-800' },
  { key: 'hvo', label: 'HVO100 (diésel renovable)', short: 'HVO100', dot: 'bg-teal-600' },
  { key: 'adblue', label: 'AdBlue', short: 'AdBlue', dot: 'bg-blue-500' },
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

export function brandBadgeClass(brand: string): string {
  const b = (brand || '').toLowerCase();
  if (b.includes('repsol')) return 'badge-repsol';
  if (b.includes('cepsa') || b.includes('moeve')) return 'badge-cepsa';
  if (b === 'bp') return 'badge-bp';
  if (b.includes('shell')) return 'badge-shell';
  if (b.includes('galp')) return 'badge-galp';
  if (isLowCost(brand)) return 'badge-plenoil';
  return 'badge-default';
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

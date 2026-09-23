// Build-time access to the ETL output in src/data/. Loaded once and cached so
// that getStaticPaths for ~11.400 station pages stays fast.
import provincesMeta from '../data/provinces.json';
import { average, type GasStation } from './stations';

export interface Municipality {
  name: string;
  slug: string;
  count: number;
  min_p95: number | null;
  min_diesel: number | null;
}

export interface ProvinceDetail {
  metadata: (typeof provincesMeta)[number];
  updated_at: string;
  cheapest_gasolina95: GasStation[];
  cheapest_diesel: GasStation[];
  all_stations: GasStation[];
  municipalities: Municipality[];
}

const modules = import.meta.glob<{ default: ProvinceDetail }>('../data/provincias/*.json');

let cache: Map<string, ProvinceDetail> | null = null;

export async function loadAllProvinces(): Promise<Map<string, ProvinceDetail>> {
  if (cache) return cache;
  const entries = await Promise.all(
    provincesMeta.map(async (p) => {
      const loader = modules[`../data/provincias/${p.slug}.json`];
      const mod = await loader();
      return [p.slug, mod.default] as const;
    }),
  );
  cache = new Map(entries);
  return cache;
}

export interface TownStats {
  avgG95: number | null;
  avgDiesel: number | null;
  count: number;
}

export function townStats(stations: GasStation[]): TownStats {
  return {
    avgG95: average(stations.map((s) => s.prices?.gasolina95)),
    avgDiesel: average(stations.map((s) => s.prices?.diesel)),
    count: stations.length,
  };
}

export { provincesMeta };

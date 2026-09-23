// Compact index for the home search box (municipios, provincias, códigos postales, marcas).
import { loadAllProvinces, provincesMeta } from '../../lib/data';

export async function GET() {
  const provinces = await loadAllProvinces();
  const munis: Array<[string, string, string, number, string]> = [];
  const brands = new Map<string, number>();

  for (const meta of provincesMeta) {
    const detail = provinces.get(meta.slug);
    if (!detail) continue;

    const cpsByTown = new Map<string, Set<string>>();
    for (const s of detail.all_stations) {
      brands.set(s.brand, (brands.get(s.brand) || 0) + 1);
      if (!s.town_slug || !s.postal_code) continue;
      if (!cpsByTown.has(s.town_slug)) cpsByTown.set(s.town_slug, new Set());
      cpsByTown.get(s.town_slug)!.add(s.postal_code);
    }

    for (const m of detail.municipalities) {
      munis.push([
        m.name,
        meta.name,
        `/${meta.slug}/${m.slug}/`,
        m.count,
        [...(cpsByTown.get(m.slug) || [])].sort().join(' '),
      ]);
    }
  }

  const body = {
    p: provincesMeta.map((p) => [p.name, `/${p.slug}/`, p.total_stations]),
    m: munis,
    b: [...brands.entries()].filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1]),
  };

  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

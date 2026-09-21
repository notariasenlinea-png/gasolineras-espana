#!/usr/bin/env python3
"""
ETL Pipeline for Spanish Gas Station Live Prices (MITECO)
Ministry for the Ecological Transition and the Demographic Challenge (Spain)
API: https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/
"""

import json
import os
import re
import subprocess
import sys
import unicodedata
from datetime import datetime
from pathlib import Path

MITECO_URL = "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/"

# Base directories
BASE_DIR = Path(__file__).resolve().parent.parent
SRC_DATA_DIR = BASE_DIR / "src" / "data"
SRC_PROVINCES_DIR = SRC_DATA_DIR / "provincias"
ROOT_DATA_DIR = BASE_DIR / "data"
ROOT_PROVINCES_DIR = ROOT_DATA_DIR / "provincias"
PUBLIC_DATA_DIR = BASE_DIR / "public" / "data"

SRC_PROVINCES_DIR.mkdir(parents=True, exist_ok=True)
ROOT_PROVINCES_DIR.mkdir(parents=True, exist_ok=True)
PUBLIC_DATA_DIR.mkdir(parents=True, exist_ok=True)


def slugify(text: str) -> str:
    """Convert a string into a clean URL-friendly slug."""
    text = unicodedata.normalize('NFKD', text).encode('ASCII', 'ignore').decode('utf-8')
    text = re.sub(r'[^\w\s-]', '', text).strip().lower()
    return re.sub(r'[-\s]+', '-', text)


def normalize_string(text: str) -> str:
    """Normalize text removing accents for reliable comparison."""
    if not text:
        return ""
    nfkd = unicodedata.normalize('NFKD', text)
    return "".join([c for c in nfkd if not unicodedata.combining(c)]).lower().strip()


def parse_float(val: str | None) -> float | None:
    """Parse comma-separated decimal string to float for fuel prices (positive values only)."""
    if not val or not isinstance(val, str):
        return None
    val = val.strip().replace(',', '.')
    try:
        f = float(val)
        return round(f, 3) if f > 0 else None
    except ValueError:
        return None


def parse_coord(val: str | None) -> float | None:
    """Parse coordinate decimal string to float, preserving negative longitudes."""
    if not val or not isinstance(val, str):
        return None
    val = val.strip().replace(',', '.')
    try:
        f = float(val)
        return round(f, 6)
    except ValueError:
        return None


def get_field(item: dict, *keys: str) -> str | None:
    """Safely get field by exact key or normalized key matching to tolerate encoding differences."""
    for k in keys:
        if k in item and item[k]:
            return str(item[k]).strip()
    
    # Fuzzy match normalized keys
    norm_map = {normalize_string(k): v for k, v in item.items()}
    for k in keys:
        norm_k = normalize_string(k)
        if norm_k in norm_map and norm_map[norm_k]:
            return str(norm_map[norm_k]).strip()
    return None


def clean_brand(brand_raw: str) -> str:
    """Normalize and standardize brand names for display and badge styling."""
    if not brand_raw:
        return "Independiente"
    b = brand_raw.strip().upper()

    # Canonical brands
    if "REPSOL" in b:
        return "Repsol"
    if "CEPSA" in b or "MOEVE" in b:
        return "Moeve / Cepsa"
    if "BP" in b:
        return "BP"
    if "SHELL" in b:
        return "Shell"
    if "GALP" in b:
        return "Galp"
    if "PLENOIL" in b:
        return "Plenoil"
    if "BALLENOIL" in b:
        return "Ballenoil"
    if "PETROPRIX" in b:
        return "Petroprix"
    if "CARREFOUR" in b:
        return "Carrefour"
    if "ALCAMPO" in b:
        return "Alcampo"
    if "AVIA" in b:
        return "Avia"
    if "BONAREA" in b:
        return "BonÀrea"
    if "EROSKI" in b:
        return "Eroski"
    if "Q8" in b:
        return "Q8"
    if "DISA" in b:
        return "Disa"
    if "MEROIL" in b:
        return "Meroil"
    if "VALCARCE" in b:
        return "Valcarce"
    if "CAMPSA" in b:
        return "Campsa"
    if "PETRONOR" in b:
        return "Petronor"
    if "TAMOIL" in b:
        return "Tamoil"
    if "FAST FUEL" in b:
        return "Fast Fuel"
    if "AUTONETOIL" in b:
        return "Autonet&Oil"
    if "GMOIL" in b or "GM OIL" in b:
        return "GMOil"

    # Title case for others
    cleaned = brand_raw.strip().title()
    if len(cleaned) > 25:
        cleaned = cleaned[:25]
    return cleaned or "Independiente"


def fetch_raw_data() -> dict:
    """Fetch live data from MITECO API with curl fallback and local caching."""
    sample_file = BASE_DIR / "sample.json"

    print(f"[*] Fetching live data from MITECO API: {MITECO_URL}")
    try:
        import shutil
        curl_bin = shutil.which("curl") or shutil.which("curl.exe") or "curl"
        res = subprocess.run(
            [curl_bin, "-k", "-s", "--max-time", "60", MITECO_URL],
            capture_output=True,
            text=False,
            check=True
        )
        data = json.loads(res.stdout.decode('utf-8'))
        stations_count = len(data.get('ListaEESSPrecio', []))
        print(f"[+] Successfully retrieved {stations_count} stations from API")
        
        # Keep sample.json refreshed with pristine UTF-8 live data
        if stations_count > 5000:
            with open(sample_file, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            print("[+] Updated local sample.json cache with live payload.")
            
        return data
    except Exception as e:
        print(f"[!] Warning: API fetch failed ({e}). Checking local cache...")
        if sample_file.exists():
            print("[*] Using cached sample.json...")
            with open(sample_file, "r", encoding="utf-8") as f:
                return json.load(f)
        raise RuntimeError("No data available from API or local fallback.")


PROVINCE_CANONICAL_NAMES = {
    "ALBACETE": ("Albacete", "albacete", "Castilla-La Mancha"),
    "ALICANTE": ("Alicante", "alicante", "Comunitat Valenciana"),
    "ALMERIA": ("Almería", "almeria", "Andalucía"),
    "ALMERÍA": ("Almería", "almeria", "Andalucía"),
    "ARABA/ÁLAVA": ("Álava", "alava", "País Vasco"),
    "ALAVA": ("Álava", "alava", "País Vasco"),
    "ÁLAVA": ("Álava", "alava", "País Vasco"),
    "ASTURIAS": ("Asturias", "asturias", "Principado de Asturias"),
    "AVILA": ("Ávila", "avila", "Castilla y León"),
    "ÁVILA": ("Ávila", "avila", "Castilla y León"),
    "BADAJOZ": ("Badajoz", "badajoz", "Extremadura"),
    "BALEARS (ILLES)": ("Illes Balears", "baleares", "Illes Balears"),
    "BALEARES": ("Illes Balears", "baleares", "Illes Balears"),
    "ILLES BALEARS": ("Illes Balears", "baleares", "Illes Balears"),
    "BARCELONA": ("Barcelona", "barcelona", "Catalunya"),
    "BIZKAIA": ("Vizcaya", "vizcaya", "País Vasco"),
    "VIZCAYA": ("Vizcaya", "vizcaya", "País Vasco"),
    "BURGOS": ("Burgos", "burgos", "Castilla y León"),
    "CACERES": ("Cáceres", "caceres", "Extremadura"),
    "CÁCERES": ("Cáceres", "caceres", "Extremadura"),
    "CADIZ": ("Cádiz", "cadiz", "Andalucía"),
    "CÁDIZ": ("Cádiz", "cadiz", "Andalucía"),
    "CANTABRIA": ("Cantabria", "cantabria", "Cantabria"),
    "CASTELLON / CASTELLO": ("Castellón", "castellon", "Comunitat Valenciana"),
    "CASTELLÓN / CASTELLÓ": ("Castellón", "castellon", "Comunitat Valenciana"),
    "CASTELLON": ("Castellón", "castellon", "Comunitat Valenciana"),
    "CASTELLÓN": ("Castellón", "castellon", "Comunitat Valenciana"),
    "CIUDAD REAL": ("Ciudad Real", "ciudad-real", "Castilla-La Mancha"),
    "CORDOBA": ("Córdoba", "cordoba", "Andalucía"),
    "CÓRDOBA": ("Córdoba", "cordoba", "Andalucía"),
    "CORUÑA (A)": ("A Coruña", "a-coruna", "Galicia"),
    "A CORUÑA": ("A Coruña", "a-coruna", "Galicia"),
    "CUENCA": ("Cuenca", "cuenca", "Castilla-La Mancha"),
    "GIPUZKOA": ("Guipúzcoa", "guipuzcoa", "País Vasco"),
    "GUIPUZCOA": ("Guipúzcoa", "guipuzcoa", "País Vasco"),
    "GUIPÚZCOA": ("Guipúzcoa", "guipuzcoa", "País Vasco"),
    "GIRONA": ("Girona", "girona", "Catalunya"),
    "GRANADA": ("Granada", "granada", "Andalucía"),
    "GUADALAJARA": ("Guadalajara", "guadalajara", "Castilla-La Mancha"),
    "HUELVA": ("Huelva", "huelva", "Andalucía"),
    "HUESCA": ("Huesca", "huesca", "Aragón"),
    "JAEN": ("Jaén", "jaen", "Andalucía"),
    "JAÉN": ("Jaén", "jaen", "Andalucía"),
    "LEON": ("León", "leon", "Castilla y León"),
    "LEÓN": ("León", "leon", "Castilla y León"),
    "LLEIDA": ("Lleida", "lleida", "Catalunya"),
    "LUGO": ("Lugo", "lugo", "Galicia"),
    "MADRID": ("Madrid", "madrid", "Comunidad de Madrid"),
    "MALAGA": ("Málaga", "malaga", "Andalucía"),
    "MÁLAGA": ("Málaga", "malaga", "Andalucía"),
    "MURCIA": ("Murcia", "murcia", "Región de Murcia"),
    "NAVARRA": ("Navarra", "navarra", "Comunidad Foral de Navarra"),
    "OURENSE": ("Ourense", "ourense", "Galicia"),
    "PALENCIA": ("Palencia", "palencia", "Castilla y León"),
    "PALMAS (LAS)": ("Las Palmas", "las-palmas", "Canarias"),
    "LAS PALMAS": ("Las Palmas", "las-palmas", "Canarias"),
    "PONTEVEDRA": ("Pontevedra", "pontevedra", "Galicia"),
    "RIOJA (LA)": ("La Rioja", "la-rioja", "La Rioja"),
    "LA RIOJA": ("La Rioja", "la-rioja", "La Rioja"),
    "SALAMANCA": ("Salamanca", "salamanca", "Castilla y León"),
    "SANTA CRUZ DE TENERIFE": ("Santa Cruz de Tenerife", "santa-cruz-de-tenerife", "Canarias"),
    "SEGOVIA": ("Segovia", "segovia", "Castilla y León"),
    "SEVILLA": ("Sevilla", "sevilla", "Andalucía"),
    "SORIA": ("Soria", "soria", "Castilla y León"),
    "TARRAGONA": ("Tarragona", "tarragona", "Catalunya"),
    "TERUEL": ("Teruel", "teruel", "Aragón"),
    "TOLEDO": ("Toledo", "toledo", "Castilla-La Mancha"),
    "VALENCIA": ("Valencia", "valencia", "Comunitat Valenciana"),
    "VALENCIA / VALÈNCIA": ("Valencia", "valencia", "Comunitat Valenciana"),
    "VALENCIA / VALENCIA": ("Valencia", "valencia", "Comunitat Valenciana"),
    "VALADOLID": ("Valladolid", "valladolid", "Castilla y León"),
    "VALLADOLID": ("Valladolid", "valladolid", "Castilla y León"),
    "ZAMORA": ("Zamora", "zamora", "Castilla y León"),
    "ZARAGOZA": ("Zaragoza", "zaragoza", "Aragón"),
    "CEUTA": ("Ceuta", "ceuta", "Ceuta"),
    "MELILLA": ("Melilla", "melilla", "Melilla"),
}


def get_province_info(raw_prov: str) -> tuple[str, str, str]:
    """Return (displayName, slug, autonomousCommunity)."""
    norm = raw_prov.strip().upper()
    if norm in PROVINCE_CANONICAL_NAMES:
        return PROVINCE_CANONICAL_NAMES[norm]
    unaccented = unicodedata.normalize('NFKD', norm).encode('ASCII', 'ignore').decode('utf-8')
    if unaccented in PROVINCE_CANONICAL_NAMES:
        return PROVINCE_CANONICAL_NAMES[unaccented]
    slug = slugify(raw_prov)
    name = raw_prov.strip().title()
    return name, slug, "España"


def process_gas_stations(raw_data: dict):
    raw_list = raw_data.get("ListaEESSPrecio", [])
    updated_str = raw_data.get("Fecha", datetime.now().strftime("%d/%m/%Y %H:%M"))

    stations = []
    light_stations = []

    for item in raw_list:
        lat = parse_coord(get_field(item, "Latitud"))
        lng = parse_coord(get_field(item, "Longitud (WGS84)", "Longitud"))
        if lat is None or lng is None:
            continue

        # Filter out coordinates clearly outside Spain/Canaries/Balearics/Ceuta/Melilla
        if not (27.0 <= lat <= 44.5 and -19.0 <= lng <= 5.0):
            continue

        raw_prov = get_field(item, "Provincia") or ""
        if not raw_prov:
            continue

        prov_name, prov_slug, prov_ccaa = get_province_info(raw_prov)
        raw_rotulo = get_field(item, "Rótulo", "Rotulo", "Rtulo") or ""
        brand = clean_brand(raw_rotulo)

        p95 = parse_float(get_field(item, "Precio Gasolina 95 E5"))
        p95_e10 = parse_float(get_field(item, "Precio Gasolina 95 E10"))
        p98 = parse_float(get_field(item, "Precio Gasolina 98 E5"))
        p98_e10 = parse_float(get_field(item, "Precio Gasolina 98 E10"))
        p_gasoleo_a = parse_float(get_field(item, "Precio Gasoleo A", "Precio Gasóleo A"))
        p_diesel_plus = parse_float(get_field(item, "Precio Gasoleo Premium", "Precio Gasóleo Premium"))
        p_gasoleo_b = parse_float(get_field(item, "Precio Gasoleo B", "Precio Gasóleo B"))
        p_glp = parse_float(get_field(item, "Precio Gases licuados del petróleo", "Precio Gases licuados del petroleo", "Precio Gases licuados del petrleo"))
        p_adblue = parse_float(get_field(item, "Precio Adblue", "Precio AdBlue"))
        p_gnc = parse_float(get_field(item, "Precio Gas Natural Comprimido"))
        p_gnl = parse_float(get_field(item, "Precio Gas Natural Licuado"))
        p_hvo = parse_float(get_field(item, "Precio Diésel Renovable", "Precio Disel Renovable", "Precio Biodiesel"))

        # Skip station if it has no fuel prices at all
        if not any([p95, p98, p_gasoleo_a, p_diesel_plus, p_glp, p_adblue, p_gnc, p_gnl]):
            continue

        station_id = get_field(item, "IDEESS") or ""
        raw_address = get_field(item, "Dirección", "Direccion", "Direccin") or ""
        address = raw_address.strip().title()
        raw_town = get_field(item, "Municipio") or ""
        town = raw_town.strip().title()
        cp = get_field(item, "C.P.", "CP") or ""
        schedule = get_field(item, "Horario") or ""
        is_24h = "24" in schedule or "24H" in schedule.upper()

        station_obj = {
            "id": station_id,
            "brand": brand,
            "brand_raw": raw_rotulo.strip(),
            "address": address,
            "town": town,
            "town_slug": slugify(town),
            "postal_code": cp,
            "province": prov_name,
            "province_slug": prov_slug,
            "ccaa": prov_ccaa,
            "lat": lat,
            "lng": lng,
            "schedule": schedule,
            "is_24h": is_24h,
            "prices": {
                "gasolina95": p95,
                "gasolina95_e10": p95_e10,
                "gasolina98": p98,
                "gasolina98_e10": p98_e10,
                "diesel": p_gasoleo_a,
                "diesel_plus": p_diesel_plus,
                "gasoleo_b": p_gasoleo_b,
                "glp": p_glp,
                "adblue": p_adblue,
                "gnc": p_gnc,
                "gnl": p_gnl,
                "hvo": p_hvo
            },
            "maps_url": f"https://www.google.com/maps/dir/?api=1&destination={lat},{lng}"
        }
        stations.append(station_obj)

        # Lightweight entry for GPS instant client search
        light_stations.append({
            "i": station_id,
            "b": brand,
            "a": address,
            "t": town,
            "p": prov_name,
            "ps": prov_slug,
            "lt": lat,
            "ln": lng,
            "p95": p95,
            "d": p_gasoleo_a,
            "h24": is_24h
        })

    print(f"[*] Valid stations processed: {len(stations)}")

    # Calculate national statistics
    all_p95 = [s["prices"]["gasolina95"] for s in stations if s["prices"]["gasolina95"]]
    all_diesel = [s["prices"]["diesel"] for s in stations if s["prices"]["diesel"]]

    avg_p95 = round(sum(all_p95) / len(all_p95), 3) if all_p95 else 0.0
    avg_diesel = round(sum(all_diesel) / len(all_diesel), 3) if all_diesel else 0.0

    min_p95 = min(all_p95) if all_p95 else 0.0
    min_diesel = min(all_diesel) if all_diesel else 0.0

    # Sort national top 15 cheapest
    cheapest_p95_national = sorted(
        [s for s in stations if s["prices"]["gasolina95"]],
        key=lambda x: x["prices"]["gasolina95"]
    )[:15]

    cheapest_diesel_national = sorted(
        [s for s in stations if s["prices"]["diesel"]],
        key=lambda x: x["prices"]["diesel"]
    )[:15]

    # Group by province
    by_province = {}
    for s in stations:
        ps = s["province_slug"]
        if ps not in by_province:
            by_province[ps] = {
                "name": s["province"],
                "slug": ps,
                "ccaa": s["ccaa"],
                "stations": []
            }
        by_province[ps]["stations"].append(s)

    provinces_summary = []

    for p_slug, p_data in by_province.items():
        p_stations = p_data["stations"]
        p_name = p_data["name"]

        p_all_95 = [st["prices"]["gasolina95"] for st in p_stations if st["prices"]["gasolina95"]]
        p_all_d = [st["prices"]["diesel"] for st in p_stations if st["prices"]["diesel"]]

        p_avg_95 = round(sum(p_all_95) / len(p_all_95), 3) if p_all_95 else 0.0
        p_avg_d = round(sum(p_all_d) / len(p_all_d), 3) if p_all_d else 0.0
        p_min_95 = min(p_all_95) if p_all_95 else 0.0
        p_min_d = min(p_all_d) if p_all_d else 0.0

        # Cheapest stations in province
        p_cheap_95 = sorted(
            [st for st in p_stations if st["prices"]["gasolina95"]],
            key=lambda x: x["prices"]["gasolina95"]
        )[:10]

        p_cheap_d = sorted(
            [st for st in p_stations if st["prices"]["diesel"]],
            key=lambda x: x["prices"]["diesel"]
        )[:10]

        # Municipalities summary
        muni_dict = {}
        for st in p_stations:
            m = st["town"]
            ms = st["town_slug"]
            if ms not in muni_dict:
                muni_dict[ms] = {
                    "name": m,
                    "slug": ms,
                    "count": 0,
                    "min_p95": 999.0,
                    "min_diesel": 999.0
                }
            muni_dict[ms]["count"] += 1
            if st["prices"]["gasolina95"] and st["prices"]["gasolina95"] < muni_dict[ms]["min_p95"]:
                muni_dict[ms]["min_p95"] = st["prices"]["gasolina95"]
            if st["prices"]["diesel"] and st["prices"]["diesel"] < muni_dict[ms]["min_diesel"]:
                muni_dict[ms]["min_diesel"] = st["prices"]["diesel"]

        muni_list = sorted(muni_dict.values(), key=lambda x: x["count"], reverse=True)
        for m in muni_list:
            if m["min_p95"] == 999.0:
                m["min_p95"] = None
            if m["min_diesel"] == 999.0:
                m["min_diesel"] = None

        prov_meta = {
            "name": p_name,
            "slug": p_slug,
            "ccaa": p_data["ccaa"],
            "total_stations": len(p_stations),
            "avg_gasolina95": p_avg_95,
            "avg_diesel": p_avg_d,
            "min_gasolina95": p_min_95,
            "min_diesel": p_min_d,
            "top_municipalities": muni_list[:12]
        }
        provinces_summary.append(prov_meta)

        # Province detail file with full station list
        prov_detail = {
            "metadata": prov_meta,
            "updated_at": updated_str,
            "cheapest_gasolina95": p_cheap_95,
            "cheapest_diesel": p_cheap_d,
            "all_stations": sorted(p_stations, key=lambda x: (x["prices"]["gasolina95"] or 999.0)),
            "municipalities": muni_list
        }
        
        # Write to src/data/provincias/ and data/provincias/
        for target_dir in [SRC_PROVINCES_DIR, ROOT_PROVINCES_DIR]:
            with open(target_dir / f"{p_slug}.json", "w", encoding="utf-8") as f:
                json.dump(prov_detail, f, ensure_ascii=False, indent=2)

    # Sort provinces alphabetically
    provinces_summary.sort(key=lambda x: x["name"])

    # Global summary
    summary_data = {
        "updated_at": updated_str,
        "total_stations": len(stations),
        "total_provinces": len(provinces_summary),
        "national_averages": {
            "gasolina95": avg_p95,
            "diesel": avg_diesel,
            "min_gasolina95": min_p95,
            "min_diesel": min_diesel
        },
        "cheapest_gasolina95": cheapest_p95_national,
        "cheapest_diesel": cheapest_diesel_national
    }

    print("[*] Writing summary.json and provinces.json to src/data/ and data/...")
    for target_dir in [SRC_DATA_DIR, ROOT_DATA_DIR]:
        with open(target_dir / "summary.json", "w", encoding="utf-8") as f:
            json.dump(summary_data, f, ensure_ascii=False, indent=2)

        with open(target_dir / "provinces.json", "w", encoding="utf-8") as f:
            json.dump(provinces_summary, f, ensure_ascii=False, indent=2)

    print(f"[*] Writing compact GPS stations file to {PUBLIC_DATA_DIR / 'stations_light.json'} ({len(light_stations)} stations)...")
    with open(PUBLIC_DATA_DIR / "stations_light.json", "w", encoding="utf-8") as f:
        json.dump(light_stations, f, ensure_ascii=False, separators=(',', ':'))

    print("[OK] ETL completed successfully!")


if __name__ == "__main__":
    raw = fetch_raw_data()
    process_gas_stations(raw)

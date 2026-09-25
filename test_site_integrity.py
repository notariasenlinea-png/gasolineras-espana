#!/usr/bin/env python3
"""
Comprehensive Integrity & SEO Verification Test Suite for ESPANA_GASOLINERAS
"""

import json
import xml.etree.ElementTree as ET
from pathlib import Path
import re

BASE_DIR = Path(__file__).resolve().parent
DIST_DIR = BASE_DIR / "dist"
SRC_DATA_DIR = BASE_DIR / "src" / "data"
ROOT_DATA_DIR = BASE_DIR / "data"


def test_dist_exists():
    assert DIST_DIR.exists() and DIST_DIR.is_dir(), "dist folder does not exist"
    print("[PASS] dist directory exists")


def test_data_folders():
    assert ROOT_DATA_DIR.exists(), "Root data/ directory must exist"
    assert (ROOT_DATA_DIR / "summary.json").exists(), "data/summary.json missing"
    assert (ROOT_DATA_DIR / "provinces.json").exists(), "data/provinces.json missing"
    assert (ROOT_DATA_DIR / "provincias").exists(), "data/provincias/ missing"

    assert SRC_DATA_DIR.exists(), "src/data/ directory must exist"
    assert (SRC_DATA_DIR / "summary.json").exists(), "src/data/summary.json missing"
    assert (SRC_DATA_DIR / "provinces.json").exists(), "src/data/provinces.json missing"
    assert (SRC_DATA_DIR / "provincias").exists(), "src/data/provincias/ missing"

    # Verify provincial JSON counts (52 provinces)
    prov_files_root = list((ROOT_DATA_DIR / "provincias").glob("*.json"))
    prov_files_src = list((SRC_DATA_DIR / "provincias").glob("*.json"))
    assert len(prov_files_root) == 52, f"Expected 52 provincial files in data/provincias, got {len(prov_files_root)}"
    assert len(prov_files_src) == 52, f"Expected 52 provincial files in src/data/provincias, got {len(prov_files_src)}"
    print(f"[PASS] Verified data/ and src/data/ structure with all 52 provinces")


def test_html_pages_count():
    html_files = list(DIST_DIR.rglob("*.html"))
    print(f"[INFO] Found {len(html_files)} HTML pages in dist")
    assert len(html_files) >= 58, f"Expected at least 58 HTML pages, got {len(html_files)}"
    print("[PASS] Static HTML page count verified (>= 58)")


def test_essential_pages_exist():
    essential = [
        "index.html",
        "gasolina-95/index.html",
        "diesel/index.html",
        "aviso-legal/index.html",
        "politica-de-privacidad/index.html",
        "cookies/index.html",
        "madrid/index.html",
        "barcelona/index.html",
        "valencia/index.html",
        "sevilla/index.html",
        "vizcaya/index.html",
        "zaragoza/index.html",
        "malaga/index.html",
        "las-palmas/index.html"
    ]
    for page in essential:
        p = DIST_DIR / page
        assert p.exists(), f"Missing essential page: {page}"
    print("[PASS] All essential route pages exist")


def test_seo_and_schema_meta():
    # Skip search-console verification files (e.g. google*.html), which are not site pages
    html_files = [hf for hf in DIST_DIR.rglob("*.html") if not hf.name.startswith("google")]
    for hf in html_files:
        content = hf.read_text(encoding="utf-8")
        assert "<title>" in content and "</title>" in content, f"{hf.name} missing <title>"
        assert 'name="description"' in content, f"{hf.name} missing meta description"
        assert 'rel="canonical"' in content, f"{hf.name} missing canonical link"
        assert 'type="application/ld+json"' in content, f"{hf.name} missing JSON-LD schema"
        assert "<h1" in content, f"{hf.name} missing <h1> heading"
    print(f"[PASS] Verified <title>, meta description, canonical, <h1>, and Schema.org on all {len(html_files)} pages")


def test_sitemap():
    sitemap_idx = DIST_DIR / "sitemap-index.xml"
    sitemap_0 = DIST_DIR / "sitemap-0.xml"
    assert sitemap_idx.exists(), "sitemap-index.xml missing"
    assert sitemap_0.exists(), "sitemap-0.xml missing"
    
    tree = ET.parse(sitemap_0)
    root = tree.getroot()
    urls = [elem.text for elem in root.iter() if elem.tag.endswith('loc')]
    print(f"[INFO] Sitemap contains {len(urls)} URLs")
    assert len(urls) >= 58, f"Sitemap URL count unexpected: {len(urls)}"
    print("[PASS] Sitemap XML verified and well-formed")


def test_robots_txt():
    robots = DIST_DIR / "robots.txt"
    assert robots.exists(), "robots.txt missing in dist"
    content = robots.read_text(encoding="utf-8")
    assert "User-agent: *" in content
    assert "Sitemap: https://gasolinerasenlinea.es/sitemap-index.xml" in content
    print("[PASS] robots.txt valid and references sitemap")


def test_stations_light_json():
    light_file = DIST_DIR / "data" / "stations_light.json"
    assert light_file.exists(), "stations_light.json missing in dist/data/"
    with open(light_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    print(f"[INFO] Compact GPS dataset contains {len(data)} stations")
    assert len(data) > 11400, f"Expected > 11400 stations in stations_light.json, got {len(data)}"
    
    # Check sample station has required fields
    sample = data[0]
    required_keys = {"i", "b", "a", "t", "p", "ps", "lt", "ln", "p95", "d", "h24"}
    assert required_keys.issubset(sample.keys()), f"Missing keys in station sample: {sample}"
    assert isinstance(sample["lt"], float) and isinstance(sample["ln"], float), "Coordinates must be floats"
    print("[PASS] GPS compact stations dataset verified")


def test_boosted_ui_elements():
    index_file = DIST_DIR / "index.html"
    content = index_file.read_text(encoding="utf-8")
    assert "btn-gps-locate" in content, "Missing GPS locate button"
    assert "calc-tank-slider" in content, "Missing Savings Calculator component"
    assert "finder-input" in content, "Missing search box"
    assert "top5-g95" in content, "Missing top 5 lists"
    assert "home-map" in content, "Missing price map"
    print("[PASS] Core UI components verified in index.html (GPS, Search, Calculator, Top 5, Map)")


def test_internal_links_resolution():
    index_file = DIST_DIR / "index.html"
    content = index_file.read_text(encoding="utf-8")
    hrefs = set(re.findall(r'href="(/[^"#]+)"', content))
    print(f"[INFO] Found {len(hrefs)} unique root-relative internal links in homepage")
    for href in hrefs:
        slug = href.split('?')[0].lstrip('/')
        if not slug:
            continue
        if '.' in slug.split('/')[-1]:  # Asset file like .css or .svg
            target = DIST_DIR / slug
        else:
            target = DIST_DIR / slug / "index.html"
        assert target.exists(), f"Broken internal link found: {href} -> {target} does not exist"
    print("[PASS] All internal links and assets on homepage resolve correctly")


if __name__ == "__main__":
    print("\n--- RUNNING SYSTEM INTEGRITY TESTS ---")
    test_dist_exists()
    test_data_folders()
    test_html_pages_count()
    test_essential_pages_exist()
    test_seo_and_schema_meta()
    test_sitemap()
    test_robots_txt()
    test_stations_light_json()
    test_boosted_ui_elements()
    test_internal_links_resolution()
    print("--- ALL 10 TESTS PASSED SUCCESSFULLY! ---\n")

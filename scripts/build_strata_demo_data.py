#!/usr/bin/env python3
"""
Build the demo data for Strata v0.2 from the seed register.

Reads  assets/strata/data/sites.seed.geojson  (10 point features)
Writes assets/strata/data/sites.geojson       (10 Polygon features)
Writes assets/strata/data/context/<id>.json   (one per site)
Writes assets/strata/data/timeseries/<id>.json (one per site)
Writes assets/strata/data/lifecycle/pathways.json  (empty, not_started)
Writes assets/strata/data/community/<id>.json      (empty, not_started)
Writes assets/strata/data/config.json

Every value is synthesised in a way that is PLAUSIBLE and CONSISTENT
with the site's register status, so the lifecycle card has something
to show while the real pipeline (M1 to M3 of CLAUDE.md) is run.
A pilot banner on the app says so. No value here is a measurement.
"""
import json, math, pathlib, random, sys

random.seed(2026)

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / 'assets' / 'strata' / 'data'
SEED = DATA / 'sites.seed.geojson'

# ──────────────────────────────────────────────────────────────────
# Approximate polygon per site, as a small irregular ring around the
# centroid. Area target varies by facility_type.
# ──────────────────────────────────────────────────────────────────

AREA_HA_BY_TYPE = {
    'waste heaps, leaching areas, flooded open pit':             110,
    'waste heaps, tailings, pit lakes':                           65,
    'historic waste heaps and tailings next to an operating mine':180,
    'open pits, waste heaps, acid streams':                      220,
    'open pits, waste heaps, tailings; headwaters of the Río Tinto': 420,
    'flooded open pit, waste heaps':                              45,
    'open pit, waste heaps':                                      95,
    'open pits, former tailings area':                           260,
    'tailings pond from Rammelsberg ore processing':              35,
    'historic waste heaps and slag around the Great Pit':         70,
}

def polygon_around(lon, lat, area_ha, salt):
    """Build an irregular polygon around (lon, lat) with given area."""
    # Target radius in metres for a disc of area_ha hectares
    r_m = math.sqrt(area_ha * 10_000 / math.pi)
    # Convert to degrees
    deg_per_m_lat = 1 / 111_320
    deg_per_m_lon = 1 / (111_320 * math.cos(math.radians(lat)))
    rng = random.Random(salt)
    pts = []
    for i in range(14):
        ang = (i / 14) * 2 * math.pi
        jitter = 0.78 + rng.random() * 0.42
        dx = math.cos(ang) * r_m * jitter * deg_per_m_lon
        dy = math.sin(ang) * r_m * jitter * deg_per_m_lat
        pts.append([round(lon + dx, 6), round(lat + dy, 6)])
    pts.append(pts[0])
    return [pts]  # Polygon = list of rings; outer only

# ──────────────────────────────────────────────────────────────────
# Synthesised annual time series, 2017..2026, per status
# ──────────────────────────────────────────────────────────────────

def mkpoint(year, veg, bare, iron, water, red, bareHa, waterHa, valid=92, scenes=4):
    return {
        'year': year, 'validPct': valid, 'vegetationPct': round(veg, 1),
        'barePct': round(bare, 1), 'ironPct': round(iron, 1),
        'waterPct': round(water, 1), 'redWaterOfWaterPct': round(red, 1),
        'bareHa': round(bareHa, 1), 'waterHa': round(waterHa, 1),
        'scenes': scenes,
    }

def series_for(status, area_ha, salt):
    rng = random.Random(salt + 101)
    years = list(range(2017, 2027))
    out = []
    if status == 'operating':
        # High bare, iron signal; mild year-on-year growth of bare area
        for i, y in enumerate(years):
            veg = max(5, 10 - 0.2 * i + rng.uniform(-1, 1))
            bare = min(85, 60 + 0.5 * i + rng.uniform(-2, 2))
            iron = min(50, 28 + 0.3 * i + rng.uniform(-1.5, 1.5))
            water = max(2, 6 + rng.uniform(-1, 1))
            red = max(0, 30 + rng.uniform(-5, 5))
            bareHa = area_ha * bare / 100
            waterHa = area_ha * water / 100
            out.append(mkpoint(y, veg, bare, iron, water, red, bareHa, waterHa))
    elif status == 'reopening_planned':
        # Historic closed trajectory, modest new disturbance in the last year
        for i, y in enumerate(years):
            veg = max(8, 18 + 0.6 * i + rng.uniform(-1.5, 1.5))
            bare = max(10, 55 - 0.3 * i + rng.uniform(-2, 2))
            iron = max(5, 22 - 0.2 * i + rng.uniform(-1, 1))
            water = max(2, 5 + rng.uniform(-1, 1))
            red = max(0, 18 + rng.uniform(-5, 5))
            bareHa = area_ha * bare / 100
            waterHa = area_ha * water / 100
            out.append(mkpoint(y, veg, bare, iron, water, red, bareHa, waterHa))
        # Last year: bare grows markedly (preparing site)
        last = out[-1]
        last['barePct'] = round(min(80, last['barePct'] + 12), 1)
        last['bareHa'] = round(area_ha * last['barePct'] / 100, 1)
    elif status == 'rehabilitated':
        # Vegetation is near target already
        for i, y in enumerate(years):
            veg = min(85, 48 + 2.8 * i + rng.uniform(-1, 1))
            bare = max(5, 32 - 2.2 * i + rng.uniform(-1, 1))
            iron = max(2, 10 - 0.5 * i + rng.uniform(-1, 1))
            water = max(1, 3 + rng.uniform(-0.5, 0.5))
            red = max(0, 4 + rng.uniform(-2, 2))
            bareHa = area_ha * bare / 100
            waterHa = area_ha * water / 100
            out.append(mkpoint(y, veg, bare, iron, water, red, bareHa, waterHa))
    else:  # 'closed'
        # Legacy mixed to legacy bare depending on climate
        base_veg = rng.choice([14, 22, 30])
        base_bare = 70 - base_veg
        slope = rng.uniform(0.1, 0.6)  # points per year
        for i, y in enumerate(years):
            veg = min(60, base_veg + slope * i + rng.uniform(-1, 1))
            bare = max(10, base_bare - slope * 0.9 * i + rng.uniform(-1.5, 1.5))
            iron = max(3, 18 - 0.3 * i + rng.uniform(-1, 1))
            water = max(1, 4 + rng.uniform(-1, 1))
            red = max(0, 12 + rng.uniform(-4, 4))
            bareHa = area_ha * bare / 100
            waterHa = area_ha * water / 100
            out.append(mkpoint(y, veg, bare, iron, water, red, bareHa, waterHa))
    return out

# ──────────────────────────────────────────────────────────────────
# Context (people, Natura 2000, river, EGMS, GSW) per site
# ──────────────────────────────────────────────────────────────────

CONTEXT_PRESETS = {
    'PT-SDO': dict(within1km=320,  within5km=2800,  natura1km=0,  distNat=4600, river='Chança', riverM=1600),
    'PT-LOU': dict(within1km=180,  within5km=4100,  natura1km=0,  distNat=5400, river='Sado',   riverM=2800),
    'PT-ALJ': dict(within1km=620,  within5km=12400, natura1km=0,  distNat=8200, river='Roxo',   riverM=1200),
    'ES-THA': dict(within1km=410,  within5km=3900,  natura1km=12, distNat=2100, river='Chança', riverM=1800),
    'ES-RTO': dict(within1km=1240, within5km=14800, natura1km=0,  distNat=6100, river='Tinto',  riverM=250),
    'ES-PDH': dict(within1km=190,  within5km=5600,  natura1km=0,  distNat=3800, river='Tinto',  riverM=900),
    'ES-ZAR': dict(within1km=140,  within5km=2900,  natura1km=0,  distNat=4300, river='Odiel',  riverM=2000),
    'ES-AZN': dict(within1km=580,  within5km=6400,  natura1km=380,distNat=0,    river='Agrio',  riverM=320),
    'DE-BOL': dict(within1km=1100, within5km=28000, natura1km=24, distNat=1900, river='Oker',   riverM=600),
    'SE-FAL': dict(within1km=2200, within5km=22400, natura1km=0,  distNat=5100, river='Faluån', riverM=250),
}

LAND_RING_PRESETS = {
    # % of a 500 m ring by ESA WorldCover class, totals near 100
    'PT-SDO': {'Shrubland':48,'Grassland':24,'Tree cover':14,'Cropland':10,'Built-up':4},
    'PT-LOU': {'Grassland':34,'Tree cover':26,'Shrubland':22,'Cropland':14,'Built-up':4},
    'PT-ALJ': {'Cropland':38,'Grassland':30,'Shrubland':18,'Built-up':10,'Tree cover':4},
    'ES-THA': {'Shrubland':42,'Tree cover':30,'Grassland':18,'Cropland':8,'Built-up':2},
    'ES-RTO': {'Shrubland':34,'Tree cover':28,'Built-up':16,'Grassland':14,'Bare / sparse vegetation':8},
    'ES-PDH': {'Shrubland':40,'Tree cover':32,'Grassland':16,'Cropland':8,'Built-up':4},
    'ES-ZAR': {'Shrubland':44,'Grassland':24,'Tree cover':20,'Cropland':8,'Built-up':4},
    'ES-AZN': {'Cropland':40,'Grassland':24,'Shrubland':16,'Tree cover':12,'Built-up':8},
    'DE-BOL': {'Tree cover':56,'Grassland':20,'Cropland':12,'Built-up':10,'Shrubland':2},
    'SE-FAL': {'Tree cover':64,'Grassland':14,'Built-up':12,'Permanent water bodies':6,'Shrubland':4},
}

EGMS_PRESETS = {
    # Pilot countries all in EGMS coverage. Points invented but reasonable.
    'PT-SDO': {'loaded': True, 'medianMmYr': -1.8, 'shareBelowThresholdPct': 6.0,  'points': 184, 'period': '2019-01 to 2024-12'},
    'PT-LOU': {'loaded': True, 'medianMmYr': -0.6, 'shareBelowThresholdPct': 1.5,  'points':  96, 'period': '2019-01 to 2024-12'},
    'PT-ALJ': {'loaded': True, 'medianMmYr': -3.1, 'shareBelowThresholdPct': 11.0, 'points': 268, 'period': '2019-01 to 2024-12'},
    'ES-THA': {'loaded': True, 'medianMmYr': -1.2, 'shareBelowThresholdPct': 4.5,  'points': 220, 'period': '2019-01 to 2024-12'},
    'ES-RTO': {'loaded': True, 'medianMmYr': -4.2, 'shareBelowThresholdPct': 14.0, 'points': 312, 'period': '2019-01 to 2024-12'},
    'ES-PDH': {'loaded': False, 'medianMmYr': None, 'shareBelowThresholdPct': None, 'points': 0,  'period': ''},
    'ES-ZAR': {'loaded': True, 'medianMmYr': -1.0, 'shareBelowThresholdPct': 3.0,  'points': 142, 'period': '2019-01 to 2024-12'},
    'ES-AZN': {'loaded': True, 'medianMmYr': -2.6, 'shareBelowThresholdPct': 9.5,  'points': 240, 'period': '2019-01 to 2024-12'},
    'DE-BOL': {'loaded': True, 'medianMmYr': -0.9, 'shareBelowThresholdPct': 2.4,  'points': 118, 'period': '2019-01 to 2024-12'},
    'SE-FAL': {'loaded': True, 'medianMmYr': -0.4, 'shareBelowThresholdPct': 1.0,  'points':  84, 'period': '2019-01 to 2024-12'},
}

# ──────────────────────────────────────────────────────────────────
# Volume proxy (DEM) per site. Low confidence for tailings ponds.
# ──────────────────────────────────────────────────────────────────

def volume_proxy_for(area_ha, facility_type, salt):
    rng = random.Random(salt + 203)
    pond = 'tailings pond' in facility_type or 'tailings ponds' in facility_type
    if pond:
        base_h = rng.uniform(2.5, 6.0)   # low heaps, flat tailings
        conf = 'low'
    elif 'heap' in facility_type:
        base_h = rng.uniform(18, 42)
        conf = 'medium'
    else:
        base_h = rng.uniform(12, 28)
        conf = 'medium'
    vol = area_ha * 10_000 * base_h * 0.55  # 55% average height fill factor
    return {
        'baseElevationM': round(rng.uniform(100, 420), 1),
        'maxHeightM': round(base_h * 1.6, 1),
        'volumeAboveBaseM3': int(vol),
        'volumeBelowBaseM3': int(area_ha * 10_000 * rng.uniform(1, 4)),
        'confidence': conf,
        'note': 'Copernicus DEM GLO-30, epoch 2011 to 2015. DEM proxy only; verify against promoter records.',
    }

# ──────────────────────────────────────────────────────────────────
# Pipeline
# ──────────────────────────────────────────────────────────────────

def main():
    DATA.mkdir(parents=True, exist_ok=True)
    (DATA / 'context').mkdir(exist_ok=True)
    (DATA / 'timeseries').mkdir(exist_ok=True)
    (DATA / 'lifecycle').mkdir(exist_ok=True)
    (DATA / 'community').mkdir(exist_ok=True)

    seed = json.loads(SEED.read_text())
    polygons = {'type': 'FeatureCollection', 'name': 'strata_sites', 'generated': '2026-10-30',
                'description': 'Approximate monitoring polygons synthesised around the seed centroids. The real pipeline (M1) will replace them with OSM and Tang-Werner polygons verified by Marcel.',
                'features': []}

    for i, feat in enumerate(seed['features']):
        props = feat['properties']
        sid = props['id']
        lon, lat = feat['geometry']['coordinates']
        area = AREA_HA_BY_TYPE.get(props.get('facility_type', ''), 80)

        poly = polygon_around(lon, lat, area, salt=i * 7 + 1)
        new_props = dict(props)
        new_props['polygon_source'] = 'synthetic'
        new_props['polygon_note'] = 'Illustrative polygon drawn around the seed point for the demo. Replace with OSM / Tang-Werner polygons during M1.'
        new_props['verified_by'] = ''
        new_props['verified_date'] = ''
        new_props['area_ha_synth'] = area
        polygons['features'].append({
            'type': 'Feature',
            'geometry': {'type': 'Polygon', 'coordinates': poly},
            'properties': new_props,
        })

        # Context
        ctx_preset = CONTEXT_PRESETS.get(sid, {'within1km': 300, 'within5km': 2500, 'natura1km': 0, 'distNat': 4000, 'river': 'Local stream', 'riverM': 1200})
        land_ring = LAND_RING_PRESETS.get(sid, {'Shrubland':40,'Grassland':30,'Tree cover':20,'Cropland':10})
        context = {
            'areaHa': area,
            'dem': volume_proxy_for(area, props.get('facility_type',''), salt=i * 7 + 2),
            'worldcoverRing': land_ring,
            'natura2000': {
                'withinPolygonHa': 0,
                'within1kmHa': ctx_preset['natura1km'],
                'distanceM': ctx_preset['distNat'],
                'siteCodes': [],
            },
            'population': {
                'within1km': ctx_preset['within1km'],
                'within5km': ctx_preset['within5km'],
                'epoch': 2025,
            },
            'river': {'distanceM': ctx_preset['riverM'], 'name': ctx_preset['river']},
            'gsw': {'occurrenceOver50Ha': round(area * 0.03, 2)},
            'egms': EGMS_PRESETS.get(sid, {'loaded': False, 'medianMmYr': None, 'shareBelowThresholdPct': None, 'points': 0, 'period': ''}),
        }
        (DATA / 'context' / f'{sid}.json').write_text(json.dumps(context, indent=2) + '\n')

        # Timeseries
        polygon_series = series_for(props['status'], area, salt=i * 7 + 3)
        ring_series = series_for(props['status'], area * 1.6, salt=i * 7 + 4)
        for ps in ring_series:
            ps['vegetationPct'] = min(90, ps['vegetationPct'] + random.uniform(15, 25))
            ps['barePct'] = max(2, ps['barePct'] - random.uniform(15, 25))
            ps['ironPct'] = max(0, ps['ironPct'] - random.uniform(8, 15))
            ps['redWaterOfWaterPct'] = max(0, ps['redWaterOfWaterPct'] - random.uniform(10, 20))
        ts = {
            'id': sid,
            'method': '0.2',
            'season': '06-01/09-30',
            'polygon': polygon_series,
            'ring': ring_series,
        }
        (DATA / 'timeseries' / f'{sid}.json').write_text(json.dumps(ts, indent=2) + '\n')

    (DATA / 'sites.geojson').write_text(json.dumps(polygons, indent=2) + '\n')

    (DATA / 'lifecycle' / 'pathways.json').write_text(json.dumps({
        'status': 'not_started',
        'source': 'FIERCE service S1, provider to be named',
        'updated': '',
        'pathways': {
            'leave': {'summary': '', 'impacts': []},
            'rehabilitate': {'summary': '', 'impacts': []},
            'reprocess': {'summary': '', 'impacts': []},
        },
        'siteNotes': {f['properties']['id']: '' for f in seed['features']},
    }, indent=2) + '\n')

    for feat in seed['features']:
        sid = feat['properties']['id']
        (DATA / 'community' / f'{sid}.json').write_text(json.dumps({
            'status': 'not_started',
            'source': 'FIERCE service S2, anonymised',
            'updated': '',
            'themes': [],
            'preferredPathway': {'leave': 0, 'rehabilitate': 0, 'reprocess': 0, 'unsure': 0},
        }, indent=2) + '\n')

    (DATA / 'config.json').write_text(json.dumps({
        'methodVersion': '0.2',
        'provider': 'earthsearch',
        'fallbackProvider': 'planetary',
        'thresholds': {
            'vegNdvi': 0.30, 'bareNdvi': 0.15, 'bareBsi': 0.0,
            'ironRatio': 1.35, 'waterMndwi': 0.0, 'redWater': 0.15,
        },
        'bulkDensityTPerM3': 1.8,
        'surveyUrl': None,
        'contactEmail': 'marcel@transitionslab.org',
        'fierceFunded': False,
        'demoBanner': True,
        'auth': {'enabled': False, 'supabaseUrl': '', 'supabaseAnonKey': ''},
    }, indent=2) + '\n')

    print(f'wrote {len(polygons["features"])} sites, context + timeseries, config.json, empty lifecycle + community')


if __name__ == '__main__':
    main()

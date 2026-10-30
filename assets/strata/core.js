/**
 * strata-core.js
 * Reference implementation of Strata's satellite logic, shared by the web app.
 *
 * What lives here
 *   1. Live Sentinel-2 L2A scene for a site (STAC search + Cloud-Optimised GeoTIFF window reads)
 *   2. Spectral indices and per-pixel classes (vegetation, bare, bare with iron signal, water, red water)
 *   3. Polygon and ring masks in pixel space, summaries per region
 *   4. Lifecycle logic: recovery clock (Theil-Sen trend) and lifecycle stage + flags
 *   5. Export row mapped to CRMA Article 27 database fields
 *
 * Pure functions (sections 2 to 5) have no dependencies and are covered by selfTest().
 * Network functions (section 1) need the npm packages `geotiff` (2.x). They are loaded lazily.
 *
 * Every threshold is a starting value, to be calibrated by the planned feasibility study.
 * Keep thresholds in config.json, never hard-code them in UI code.
 *
 * Licence of this file: MIT, Transitions Lab B.V.
 * Data used at runtime: Copernicus Sentinel-2 (free, full and open). Display
 * "Contains modified Copernicus Sentinel data [year]" wherever outputs are shown.
 */

/* ------------------------------------------------------------------ */
/* 0. Configuration                                                    */
/* ------------------------------------------------------------------ */

export const DEFAULTS = Object.freeze({
  methodVersion: '0.2',
  pixelSizeM: 10,
  thresholds: Object.freeze({
    vegNdvi: 0.30,      // NDVI above this = vegetation
    bareNdvi: 0.15,     // NDVI below this AND BSI above bareBsi = bare ground
    bareBsi: 0.0,
    ironRatio: 1.35,    // red/green (B04/B03) above this on bare pixels = iron oxide signal
    waterMndwi: 0.0,    // MNDWI above this = open water
    redWater: 0.15,     // (B04-B02)/(B04+B02) above this on water pixels = red/orange water
  }),
  // Sentinel-2 Scene Classification Layer values treated as invalid
  // 0 no data, 1 saturated/defective, 3 cloud shadow, 8 cloud medium, 9 cloud high, 10 cirrus, 11 snow
  sclInvalid: Object.freeze([0, 1, 3, 8, 9, 10, 11]),
  minValidFraction: 0.6, // a scene must have >= 60% valid pixels inside the site polygon
  ringMetres: 500,
  recovery: Object.freeze({
    targetCoverPct: 50,     // "recovered" = 50% of polygon under vegetation
    minYears: 5,            // fewer valid years = insufficient data
    minSlopePpPerYr: 0.5,   // slower than this = no meaningful trend
    horizonYears: 100,      // beyond this, show "more than 100 years"
  }),
  lifecycle: Object.freeze({
    vegetatedPct: 60,       // latest vegetation cover >= 60% = vegetated / rehabilitated
    bareLegacyPct: 40,      // latest bare >= 40% = legacy, largely bare
    newDisturbanceRel: 1.10,// bare area now >= 110% of earlier median ...
    newDisturbanceAbsHa: 2, // ... and at least 2 ha more
    redWaterFlagPct: 5,     // >= 5% of water pixels red = red water flag
    ironFlagPct: 20,        // >= 20% of polygon with iron signal = iron signal flag
    groundMotionMmYr: -5,   // EGMS points below this ...
    groundMotionSharePct: 10// ... making up >= 10% of points = ground motion flag
  }),
});

export const CLASS = Object.freeze({
  INVALID: 0, VEGETATION: 1, BARE: 2, BARE_IRON: 3, WATER: 4, RED_WATER: 5, OTHER: 6,
});

export const CLASS_LABEL = Object.freeze({
  0: 'No valid data', 1: 'Vegetation', 2: 'Bare ground', 3: 'Bare ground, iron signal',
  4: 'Water', 5: 'Red or orange water', 6: 'Other surface',
});

/* ------------------------------------------------------------------ */
/* 1. Live Sentinel-2 scene (network)                                  */
/* ------------------------------------------------------------------ */

/**
 * Providers. Earth Search is primary. Planetary Computer is the fallback if
 * browser CORS or availability fails (it needs a short-lived SAS token).
 * Asset keys differ between providers, so they are mapped here.
 */
export const PROVIDERS = Object.freeze({
  earthsearch: {
    stac: 'https://earth-search.aws.element84.com/v1',
    collection: 'sentinel-2-l2a',
    assets: { blue: 'blue', green: 'green', red: 'red', nir: 'nir', swir16: 'swir16', swir22: 'swir22', scl: 'scl' },
    sign: async (href) => href,
  },
  planetary: {
    stac: 'https://planetarycomputer.microsoft.com/api/stac/v1',
    collection: 'sentinel-2-l2a',
    assets: { blue: 'B02', green: 'B03', red: 'B04', nir: 'B08', swir16: 'B11', swir22: 'B12', scl: 'SCL' },
    sign: (() => {
      let cached = null;
      return async (href) => {
        const now = Date.now();
        if (!cached || cached.expiry - now < 60_000) {
          const r = await fetch('https://planetarycomputer.microsoft.com/api/sas/v1/token/sentinel-2-l2a');
          if (!r.ok) throw new Error(`Planetary Computer token request failed (${r.status})`);
          const j = await r.json();
          cached = { token: j.token, expiry: Date.parse(j['msft:expiry']) || now + 30 * 60_000 };
        }
        return `${href}${href.includes('?') ? '&' : '?'}${cached.token}`;
      };
    })(),
  },
});

/** Search scenes over a lon/lat bbox, clearest first. */
export async function searchScenes({ bbox, start, end, maxCloud = 30, limit = 10, provider = 'earthsearch' }) {
  const p = PROVIDERS[provider];
  const body = {
    collections: [p.collection],
    bbox,
    datetime: `${start}T00:00:00Z/${end}T23:59:59Z`,
    limit: 50,
    query: { 'eo:cloud_cover': { lt: maxCloud } },
  };
  const r = await fetch(`${p.stac}/search`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`STAC search failed (${r.status}) at ${p.stac}`);
  const j = await r.json();
  const items = (j.features || [])
    .filter((f) => f.properties && typeof f.properties['eo:cloud_cover'] === 'number')
    .sort((a, b) => a.properties['eo:cloud_cover'] - b.properties['eo:cloud_cover'] ||
      Date.parse(b.properties.datetime) - Date.parse(a.properties.datetime));
  return items.slice(0, limit);
}

/** EPSG code of an item's projected CRS (UTM north 326xx in Europe). */
export function itemEpsg(item) {
  const props = item.properties || {};
  if (props['proj:epsg']) return props['proj:epsg'];
  if (props['proj:code']) return Number(String(props['proj:code']).split(':').pop());
  // Earth Search sometimes stores it per asset
  for (const a of Object.values(item.assets || {})) {
    if (a['proj:epsg']) return a['proj:epsg'];
    if (a['proj:code']) return Number(String(a['proj:code']).split(':').pop());
  }
  throw new Error('Item has no projection code');
}

/**
 * Reflectance scale and offset for one asset.
 * Uses raster:bands when present. Otherwise scale 1e-4 and, for processing
 * baseline 04.00 or later (scenes from 25 Jan 2022), offset -0.1.
 */
export function scaleOffset(item, assetKey) {
  const a = (item.assets || {})[assetKey] || {};
  const rb = Array.isArray(a['raster:bands']) ? a['raster:bands'][0] : null;
  if (rb && (rb.scale !== undefined || rb.offset !== undefined)) {
    return { scale: rb.scale ?? 1e-4, offset: rb.offset ?? 0 };
  }
  const pb = parseFloat(item.properties?.['s2:processing_baseline'] ?? '0');
  const harmonised = item.properties?.['earthsearch:boa_offset_applied'] === true;
  return { scale: 1e-4, offset: !harmonised && pb >= 4 ? -0.1 : 0 };
}

/**
 * Read a 10 m grid of the six bands plus SCL over a projected bbox.
 * bboxUtm: [minX, minY, maxX, maxY] in the item's UTM CRS.
 * Returns Float32Array reflectances and a Uint8Array SCL, all width*height.
 */
export async function readBands(item, bboxUtm, { provider = 'earthsearch', pixelSizeM = 10 } = {}) {
  const { fromUrl } = await import('geotiff');
  const p = PROVIDERS[provider];
  const width = Math.max(1, Math.round((bboxUtm[2] - bboxUtm[0]) / pixelSizeM));
  const height = Math.max(1, Math.round((bboxUtm[3] - bboxUtm[1]) / pixelSizeM));
  const out = { width, height };
  const keys = ['blue', 'green', 'red', 'nir', 'swir16', 'swir22', 'scl'];
  await Promise.all(keys.map(async (k) => {
    const assetKey = p.assets[k];
    const asset = item.assets[assetKey];
    if (!asset) throw new Error(`Scene ${item.id} has no ${assetKey} asset`);
    const href = await p.sign(asset.href);
    const tiff = await fromUrl(href, { allowFullFile: false });
    const img = await tiff.getImage();
    const [ox, oy] = img.getOrigin();
    const [rx, ry] = img.getResolution(); // ry is negative
    const win = [
      Math.floor((bboxUtm[0] - ox) / rx),
      Math.floor((bboxUtm[3] - oy) / ry),
      Math.ceil((bboxUtm[2] - ox) / rx),
      Math.ceil((bboxUtm[1] - oy) / ry),
    ];
    const ras = await img.readRasters({
      window: win, width, height, samples: [0], interleave: true,
      resampleMethod: k === 'scl' ? 'nearest' : 'bilinear', fillValue: 0,
    });
    if (k === 'scl') {
      out.scl = Uint8Array.from(ras);
    } else {
      const { scale, offset } = scaleOffset(item, assetKey);
      const arr = new Float32Array(width * height);
      for (let i = 0; i < arr.length; i++) arr[i] = ras[i] === 0 ? NaN : ras[i] * scale + offset;
      out[k] = arr;
    }
  }));
  return out;
}

/**
 * Full live workflow for one site.
 * site: GeoJSON Feature with Polygon/MultiPolygon geometry (lon/lat).
 * Tries the clearest scenes in the last `days` days until one has enough valid pixels in the polygon.
 */
export async function liveScene(site, {
  days = 120, maxCloud = 40, provider = 'earthsearch', cfg = DEFAULTS, today = new Date(),
} = {}) {
  const end = today.toISOString().slice(0, 10);
  const start = new Date(today.getTime() - days * 86_400_000).toISOString().slice(0, 10);
  const lonLatBbox = expandLonLatBbox(geometryBbox(site.geometry), cfg.ringMetres + 200);
  const items = await searchScenes({ bbox: lonLatBbox, start, end, maxCloud, provider });
  if (!items.length) return { status: 'no_scene', message: `No Sentinel-2 scene under ${maxCloud}% cloud in the last ${days} days.` };

  for (const item of items.slice(0, 4)) {
    const epsg = itemEpsg(item);
    const zone = epsg % 100;
    const bboxUtm = lonLatBboxToUtm(lonLatBbox, zone);
    const bands = await readBands(item, bboxUtm, { provider, pixelSizeM: cfg.pixelSizeM });
    const { width, height } = bands;
    const ringsPx = geometryToPixelRings(site.geometry, zone, bboxUtm, cfg.pixelSizeM);
    const poly = rasterisePolygon(ringsPx, width, height);
    const ring = ringMask(poly, width, height, Math.round(cfg.ringMetres / cfg.pixelSizeM));
    const valid = validMask(bands, cfg.sclInvalid);
    const vf = fractionValid(valid, poly);
    if (vf < cfg.minValidFraction) continue;
    const idx = computeIndexRasters(bands, width * height);
    const classes = classifyPixels(idx, valid, cfg.thresholds);
    return {
      status: 'ok',
      scene: {
        id: item.id,
        datetime: item.properties.datetime,
        cloudCover: item.properties['eo:cloud_cover'],
        provider,
        attribution: `Contains modified Copernicus Sentinel data ${item.properties.datetime.slice(0, 4)}`,
      },
      width, height, bands, idx, classes, poly, ring,
      stats: {
        polygon: summarise(classes, poly, cfg.pixelSizeM),
        ring: summarise(classes, ring, cfg.pixelSizeM),
        validFraction: vf,
      },
    };
  }
  return { status: 'too_cloudy', message: 'Recent scenes are too cloudy over this site. Try a longer period.' };
}

/* ------------------------------------------------------------------ */
/* 2. Indices and classes (pure)                                       */
/* ------------------------------------------------------------------ */

const nd = (a, b) => (a + b === 0 ? NaN : (a - b) / (a + b));

/** Indices for one pixel. All inputs are surface reflectance (0..1). */
export function pixelIndices(b) {
  const { blue, green, red, nir, swir16, swir22 } = b;
  return {
    ndvi: nd(nir, red),                                       // vegetation
    bsi: nd(swir16 + red, nir + blue),                        // bare soil index
    iron: green > 0 ? red / green : NaN,                      // iron oxide ratio, red/green (B04/B03)
    clay: swir22 > 0 ? swir16 / swir22 : NaN,                 // hydroxyl / clay ratio (B11/B12)
    mndwi: nd(green, swir16),                                 // modified normalised difference water index
    redwater: nd(red, blue),                                  // red-blue difference, AMWI-style band pair (665/490 nm)
  };
}

/** Index rasters for n pixels. */
export function computeIndexRasters(bands, n) {
  const out = {
    ndvi: new Float32Array(n), bsi: new Float32Array(n), iron: new Float32Array(n),
    clay: new Float32Array(n), mndwi: new Float32Array(n), redwater: new Float32Array(n),
  };
  for (let i = 0; i < n; i++) {
    const v = pixelIndices({
      blue: bands.blue[i], green: bands.green[i], red: bands.red[i],
      nir: bands.nir[i], swir16: bands.swir16[i], swir22: bands.swir22[i],
    });
    out.ndvi[i] = v.ndvi; out.bsi[i] = v.bsi; out.iron[i] = v.iron;
    out.clay[i] = v.clay; out.mndwi[i] = v.mndwi; out.redwater[i] = v.redwater;
  }
  return out;
}

/** Valid pixel mask from SCL and finite reflectances. */
export function validMask(bands, sclInvalid = DEFAULTS.sclInvalid) {
  const n = bands.width * bands.height;
  const bad = new Set(sclInvalid);
  const m = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const ok = !bad.has(bands.scl[i]) &&
      Number.isFinite(bands.red[i]) && Number.isFinite(bands.nir[i]) &&
      Number.isFinite(bands.green[i]) && Number.isFinite(bands.blue[i]) &&
      Number.isFinite(bands.swir16[i]) && Number.isFinite(bands.swir22[i]);
    m[i] = ok ? 1 : 0;
  }
  return m;
}

/**
 * Per-pixel class. Order matters: water first, then vegetation, then bare.
 * Iron signal is only assessed on bare pixels; red water only on water pixels.
 */
export function classifyPixels(idx, valid, t = DEFAULTS.thresholds) {
  const n = valid.length;
  const c = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    if (!valid[i]) { c[i] = CLASS.INVALID; continue; }
    if (idx.mndwi[i] > t.waterMndwi && idx.ndvi[i] < t.vegNdvi) {
      c[i] = idx.redwater[i] > t.redWater ? CLASS.RED_WATER : CLASS.WATER;
    } else if (idx.ndvi[i] >= t.vegNdvi) {
      c[i] = CLASS.VEGETATION;
    } else if (idx.ndvi[i] < t.bareNdvi && idx.bsi[i] > t.bareBsi) {
      c[i] = idx.iron[i] > t.ironRatio ? CLASS.BARE_IRON : CLASS.BARE;
    } else {
      c[i] = CLASS.OTHER;
    }
  }
  return c;
}

/**
 * Summary of classes inside a region mask.
 * Percentages are of valid pixels in the region; red water % is of water pixels.
 */
export function summarise(classes, region, pixelSizeM = 10) {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  let regionPx = 0;
  for (let i = 0; i < classes.length; i++) {
    if (!region[i]) continue;
    regionPx++;
    counts[classes[i]]++;
  }
  const valid = regionPx - counts[CLASS.INVALID];
  const pct = (k) => (valid ? (100 * k) / valid : NaN);
  const haPerPx = (pixelSizeM * pixelSizeM) / 10_000;
  const water = counts[CLASS.WATER] + counts[CLASS.RED_WATER];
  const bareAll = counts[CLASS.BARE] + counts[CLASS.BARE_IRON];
  return {
    regionHa: round(regionPx * haPerPx, 2),
    validPct: round(regionPx ? (100 * valid) / regionPx : NaN, 1),
    vegetationPct: round(pct(counts[CLASS.VEGETATION]), 1),
    barePct: round(pct(bareAll), 1),
    ironPct: round(pct(counts[CLASS.BARE_IRON]), 1),
    waterPct: round(pct(water), 1),
    redWaterOfWaterPct: round(water ? (100 * counts[CLASS.RED_WATER]) / water : 0, 1),
    bareHa: round(bareAll * haPerPx, 2),
    waterHa: round(water * haPerPx, 2),
  };
}

export function fractionValid(valid, region) {
  let r = 0, v = 0;
  for (let i = 0; i < valid.length; i++) if (region[i]) { r++; if (valid[i]) v++; }
  return r ? v / r : 0;
}

/* ------------------------------------------------------------------ */
/* 3. Geometry and masks (pure)                                        */
/* ------------------------------------------------------------------ */

/** WGS84 lon/lat to UTM easting/northing in a given northern zone (Snyder, USGS PP 1395). */
export function lonLatToUtm(lon, lat, zone) {
  const a = 6378137.0, f = 1 / 298.257223563, k0 = 0.9996;
  const e2 = f * (2 - f), ep2 = e2 / (1 - e2);
  const z = zone ?? Math.floor((lon + 180) / 6) + 1;
  const lon0 = ((z - 1) * 6 - 180 + 3) * Math.PI / 180;
  const phi = lat * Math.PI / 180, lam = lon * Math.PI / 180;
  const N = a / Math.sqrt(1 - e2 * Math.sin(phi) ** 2);
  const T = Math.tan(phi) ** 2;
  const C = ep2 * Math.cos(phi) ** 2;
  const A = Math.cos(phi) * (lam - lon0);
  const M = a * ((1 - e2 / 4 - 3 * e2 ** 2 / 64 - 5 * e2 ** 3 / 256) * phi
    - (3 * e2 / 8 + 3 * e2 ** 2 / 32 + 45 * e2 ** 3 / 1024) * Math.sin(2 * phi)
    + (15 * e2 ** 2 / 256 + 45 * e2 ** 3 / 1024) * Math.sin(4 * phi)
    - (35 * e2 ** 3 / 3072) * Math.sin(6 * phi));
  const x = k0 * N * (A + (1 - T + C) * A ** 3 / 6 + (5 - 18 * T + T ** 2 + 72 * C - 58 * ep2) * A ** 5 / 120) + 500000;
  const y = k0 * (M + N * Math.tan(phi) * (A ** 2 / 2 + (5 - T + 9 * C + 4 * C ** 2) * A ** 4 / 24
    + (61 - 58 * T + T ** 2 + 600 * C - 330 * ep2) * A ** 6 / 720));
  return [x, y, z];
}

export function geometryBbox(geom) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  for (const poly of polys) for (const ring of poly) for (const [x, y] of ring) {
    if (x < minX) minX = x; if (y < minY) minY = y; if (x > maxX) maxX = x; if (y > maxY) maxY = y;
  }
  return [minX, minY, maxX, maxY];
}

/** Expand a lon/lat bbox by metres (approximate, fine at site scale). */
export function expandLonLatBbox([minX, minY, maxX, maxY], metres) {
  const dLat = metres / 111_320;
  const midLat = (minY + maxY) / 2;
  const dLon = metres / (111_320 * Math.cos(midLat * Math.PI / 180));
  return [minX - dLon, minY - dLat, maxX + dLon, maxY + dLat];
}

export function lonLatBboxToUtm([minX, minY, maxX, maxY], zone) {
  const pts = [[minX, minY], [minX, maxY], [maxX, minY], [maxX, maxY]].map(([x, y]) => lonLatToUtm(x, y, zone));
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  // snap outward to the 10 m grid so bands align
  return [Math.floor(Math.min(...xs) / 10) * 10, Math.floor(Math.min(...ys) / 10) * 10,
    Math.ceil(Math.max(...xs) / 10) * 10, Math.ceil(Math.max(...ys) / 10) * 10];
}

/** Polygon rings converted to pixel coordinates of the bbox grid. */
export function geometryToPixelRings(geom, zone, bboxUtm, px = 10) {
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  return polys.map((poly) => poly.map((ring) => ring.map(([lon, lat]) => {
    const [x, y] = lonLatToUtm(lon, lat, zone);
    return [(x - bboxUtm[0]) / px, (bboxUtm[3] - y) / px];
  })));
}

/** Even-odd point in polygon for one polygon (outer ring + holes). */
export function pointInPolygon(x, y, rings) {
  let inside = false;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}

/** Pixel-centre rasterisation of one or more polygons (array of ring arrays). */
export function rasterisePolygon(polys, width, height) {
  const m = new Uint8Array(width * height);
  for (const rings of polys) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [x, y] of rings[0]) { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
    const x0 = Math.max(0, Math.floor(minX)), x1 = Math.min(width - 1, Math.ceil(maxX));
    const y0 = Math.max(0, Math.floor(minY)), y1 = Math.min(height - 1, Math.ceil(maxY));
    for (let r = y0; r <= y1; r++) for (let c = x0; c <= x1; c++) {
      if (pointInPolygon(c + 0.5, r + 0.5, rings)) m[r * width + c] = 1;
    }
  }
  return m;
}

/**
 * Ring of pixels outside the polygon within `distPx` pixels (Euclidean, exact for small rasters
 * via a two-pass squared-distance transform on rows then columns).
 */
export function ringMask(poly, width, height, distPx) {
  const INF = 1e12;
  const g = new Float64Array(width * height);
  // pass 1: along rows, distance to nearest polygon pixel
  for (let r = 0; r < height; r++) {
    let last = -INF;
    for (let c = 0; c < width; c++) { if (poly[r * width + c]) last = c; g[r * width + c] = c - last; }
    last = INF;
    for (let c = width - 1; c >= 0; c--) {
      if (poly[r * width + c]) last = c;
      g[r * width + c] = Math.min(g[r * width + c], last - c);
    }
  }
  // pass 2: along columns, brute force over rows (fine for site windows up to ~600 px)
  const out = new Uint8Array(width * height);
  const d2max = distPx * distPx;
  for (let c = 0; c < width; c++) {
    for (let r = 0; r < height; r++) {
      if (poly[r * width + c]) continue;
      let best = INF;
      const rMin = Math.max(0, r - distPx), rMax = Math.min(height - 1, r + distPx);
      for (let k = rMin; k <= rMax; k++) {
        const gx = g[k * width + c];
        if (gx > distPx) continue;
        const d2 = gx * gx + (r - k) * (r - k);
        if (d2 < best) best = d2;
      }
      if (best <= d2max) out[r * width + c] = 1;
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* 4. Lifecycle logic (pure)                                           */
/* ------------------------------------------------------------------ */

/** Theil-Sen slope and intercept (median of pairwise slopes). */
export function theilSen(xs, ys) {
  const slopes = [];
  for (let i = 0; i < xs.length; i++) for (let j = i + 1; j < xs.length; j++) {
    if (xs[j] !== xs[i]) slopes.push((ys[j] - ys[i]) / (xs[j] - xs[i]));
  }
  if (!slopes.length) return { slope: NaN, intercept: NaN };
  const slope = median(slopes);
  const intercept = median(xs.map((x, i) => ys[i] - slope * x));
  return { slope, intercept };
}

/**
 * Natural recovery clock: at the current vegetation trend, when does the polygon reach
 * the target vegetation cover? series: [{year, vegetationPct, validPct}] (annual composites).
 */
export function recoveryClock(series, cfg = DEFAULTS.recovery) {
  const pts = series.filter((s) => Number.isFinite(s.vegetationPct) && (s.validPct ?? 100) >= 60);
  if (pts.length < cfg.minYears) {
    return { status: 'insufficient', label: 'Not enough clear years to estimate a trend', validYears: pts.length };
  }
  const xs = pts.map((p) => p.year), ys = pts.map((p) => p.vegetationPct);
  const { slope, intercept } = theilSen(xs, ys);
  const lastYear = Math.max(...xs);
  const fitted = slope * lastYear + intercept;
  const current = ys[xs.indexOf(lastYear)];
  const base = { slopePpPerYr: round(slope, 2), currentPct: round(current, 1), fittedPct: round(fitted, 1), validYears: pts.length };
  if (current >= cfg.targetCoverPct) {
    return { ...base, status: 'reached', label: `Vegetation already covers ${round(current, 0)}% of the site` };
  }
  if (slope < -cfg.minSlopePpPerYr) {
    return { ...base, status: 'declining', label: `Vegetation cover is falling by ${round(-slope, 1)} points a year` };
  }
  if (slope < cfg.minSlopePpPerYr) {
    return { ...base, status: 'stable', label: 'No meaningful natural recovery at the current trend' };
  }
  const years = (cfg.targetCoverPct - fitted) / slope;
  if (years > cfg.horizonYears) {
    return { ...base, status: 'slow', yearsToTarget: null, label: `More than ${cfg.horizonYears} years to reach ${cfg.targetCoverPct}% vegetation at the current trend` };
  }
  const y = Math.max(0, Math.ceil(years));
  return {
    ...base, status: 'recovering', yearsToTarget: y, targetYear: lastYear + y,
    label: `About ${y} years to reach ${cfg.targetCoverPct}% vegetation at the current trend (around ${lastYear + y})`,
  };
}

/**
 * Lifecycle stage plus flags for a site.
 * series: annual stats for the polygon [{year, barePct, bareHa, vegetationPct, ironPct, redWaterOfWaterPct, waterHa, validPct}]
 * meta: { status: 'operating'|'closed'|'reopening_planned'|'rehabilitated'|'unknown' } from the register
 * context: { egms: { shareBelowThresholdPct } } optional
 */
export function lifecycleStage(series, meta = {}, context = {}, cfg = DEFAULTS) {
  const L = cfg.lifecycle;
  const pts = [...series].filter((s) => (s.validPct ?? 100) >= 60).sort((a, b) => a.year - b.year);
  const clock = recoveryClock(pts, cfg.recovery);
  const flags = [];

  if (pts.length >= 4) {
    const last = pts[pts.length - 1];
    const earlier = pts.slice(Math.max(0, pts.length - 6), pts.length - 2).map((p) => p.bareHa);
    const ref = median(earlier);
    if (Number.isFinite(ref) && last.bareHa >= ref * L.newDisturbanceRel && last.bareHa - ref >= L.newDisturbanceAbsHa) {
      flags.push({ id: 'new_disturbance', label: `Bare area grew by ${round(last.bareHa - ref, 1)} ha compared with earlier years` });
    }
    if (last.redWaterOfWaterPct >= L.redWaterFlagPct && last.waterHa > 0) {
      flags.push({ id: 'red_water', label: `${round(last.redWaterOfWaterPct, 0)}% of open water on site shows a red or orange colour` });
    }
    if (last.ironPct >= L.ironFlagPct) {
      flags.push({ id: 'iron_signal', label: `Iron oxide signal on ${round(last.ironPct, 0)}% of the site surface` });
    }
  }
  const eg = context.egms;
  if (eg && Number.isFinite(eg.shareBelowThresholdPct) && eg.shareBelowThresholdPct >= L.groundMotionSharePct) {
    flags.push({ id: 'ground_motion', label: `${round(eg.shareBelowThresholdPct, 0)}% of ground motion points subside faster than ${-L.groundMotionMmYr} mm a year` });
  }

  let stage, reason;
  if (pts.length < cfg.recovery.minYears) {
    stage = 'insufficient_data'; reason = 'Fewer than five clear summers since 2017';
  } else if (meta.status === 'operating') {
    stage = 'operating'; reason = 'Listed as an operating site in the register';
  } else if (meta.status === 'reopening_planned') {
    stage = 'reopening_planned'; reason = 'Reopening or reprocessing planned according to public sources';
  } else if (pts[pts.length - 1].vegetationPct >= L.vegetatedPct) {
    stage = 'vegetated'; reason = `Vegetation covers ${round(pts[pts.length - 1].vegetationPct, 0)}% of the site`;
  } else if (clock.status === 'recovering') {
    stage = 'recovering'; reason = clock.label;
  } else if (pts[pts.length - 1].barePct >= L.bareLegacyPct) {
    stage = 'legacy_bare'; reason = `${round(pts[pts.length - 1].barePct, 0)}% of the site is bare ground`;
  } else {
    stage = 'legacy_mixed'; reason = 'Closed site with mixed cover and no clear trend';
  }
  return { stage, label: STAGE_LABEL[stage], reason, flags, clock };
}

export const STAGE_LABEL = Object.freeze({
  operating: 'Operating',
  reopening_planned: 'Reopening planned',
  legacy_bare: 'Legacy, largely bare',
  legacy_mixed: 'Legacy, mixed cover',
  recovering: 'Recovering naturally',
  vegetated: 'Vegetated',
  insufficient_data: 'Not enough data',
});

/* ------------------------------------------------------------------ */
/* 5. Export row, CRMA Article 27 field mapping (pure)                 */
/* ------------------------------------------------------------------ */

/**
 * One row per site. Field names follow what Article 27 databases must hold
 * (location, area, waste volume, operator, raw material content, other recovery-relevant data).
 * Values Strata cannot measure from space are left empty and named as such, never estimated.
 */
export function crmaExportRow(site, card) {
  const p = site.properties || {};
  const ctx = card.context || {};
  const latest = card.latest || {};
  const lc = card.lifecycle || {};
  const [cx, cy] = centroidOfBbox(geometryBbox(site.geometry));
  return {
    strata_id: p.id,
    name: p.name,
    country: p.country,
    longitude: round(cx, 5),
    latitude: round(cy, 5),
    register_status: p.status,
    facility_type: p.facility_type,
    area_ha_satellite: ctx.areaHa ?? '',
    waste_volume_m3_dem_proxy: ctx.dem?.volumeAboveBaseM3 ?? '',
    dem_epoch: ctx.dem ? '2011-2015 (Copernicus DEM GLO-30)' : '',
    operator: '',                 // not observable from space; fill from national records
    crm_content_measured: '',     // requires sampling; Strata does not estimate grades
    crm_candidates_deposit_type: (p.crm_candidates || []).join('; '),
    surface_iron_signal_pct: latest.ironPct ?? '',
    bare_ground_pct: latest.barePct ?? '',
    vegetation_cover_pct: latest.vegetationPct ?? '',
    red_water_share_pct: latest.redWaterOfWaterPct ?? '',
    lifecycle_stage: lc.label ?? '',
    recovery_clock: lc.clock?.label ?? '',
    ground_motion_median_mm_yr: ctx.egms?.medianMmYr ?? '',
    population_within_1km: ctx.population?.within1km ?? '',
    population_within_5km: ctx.population?.within5km ?? '',
    natura2000_within_1km_ha: ctx.natura2000?.within1kmHa ?? '',
    distance_to_watercourse_m: ctx.river?.distanceM ?? '',
    latest_scene_date: latest.sceneDate ?? '',
    method_version: DEFAULTS.methodVersion,
    attribution: 'Contains modified Copernicus Sentinel data; Copernicus DEM GLO-30; ESA WorldCover; JRC Global Surface Water; GHSL; EEA Natura 2000; OpenStreetMap contributors (ODbL)',
  };
}

/* ------------------------------------------------------------------ */
/* Rendering helpers (browser only, no deps)                           */
/* ------------------------------------------------------------------ */

/** RGBA buffer for a true-colour preview (linear stretch 0..maxRefl). */
export function trueColourRGBA(bands, maxRefl = 0.3) {
  const n = bands.width * bands.height;
  const out = new Uint8ClampedArray(n * 4);
  const s = (v) => (Number.isFinite(v) ? Math.max(0, Math.min(255, (v / maxRefl) * 255)) : 0);
  for (let i = 0; i < n; i++) {
    out[i * 4] = s(bands.red[i]); out[i * 4 + 1] = s(bands.green[i]); out[i * 4 + 2] = s(bands.blue[i]);
    out[i * 4 + 3] = Number.isFinite(bands.red[i]) ? 255 : 0;
  }
  return out;
}

/** RGBA buffer for the class map. colours: {classId: [r,g,b]} */
export function classRGBA(classes, colours) {
  const out = new Uint8ClampedArray(classes.length * 4);
  for (let i = 0; i < classes.length; i++) {
    const c = colours[classes[i]] || [0, 0, 0];
    out[i * 4] = c[0]; out[i * 4 + 1] = c[1]; out[i * 4 + 2] = c[2];
    out[i * 4 + 3] = classes[i] === CLASS.INVALID ? 0 : 255;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Utilities                                                           */
/* ------------------------------------------------------------------ */

export function median(a) {
  const v = a.filter(Number.isFinite).sort((x, y) => x - y);
  if (!v.length) return NaN;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}
export function round(v, d = 0) { if (!Number.isFinite(v)) return v; const k = 10 ** d; return Math.round(v * k) / k; }
function centroidOfBbox([a, b, c, d]) { return [(a + c) / 2, (b + d) / 2]; }

/* ------------------------------------------------------------------ */
/* Self-test (node strata-core.js --test, or import and call)          */
/* ------------------------------------------------------------------ */

export function selfTest() {
  const results = [];
  const ok = (name, cond, detail = '') => results.push({ name, pass: !!cond, detail });
  const near = (a, b, tol) => Math.abs(a - b) <= tol;

  // UTM: London (51.5074 N, 0.1278 W) is 30U 699316 E, 5710164 N
  const [ex, ny, zz] = lonLatToUtm(-0.1278, 51.5074);
  ok('UTM zone London', zz === 30, zz);
  ok('UTM easting London', near(ex, 699316, 3), ex.toFixed(1));
  ok('UTM northing London', near(ny, 5710164, 3), ny.toFixed(1));
  // Equator on central meridian
  const [e0, n0] = lonLatToUtm(3, 0, 31);
  ok('UTM central meridian', near(e0, 500000, 0.01) && near(n0, 0, 0.01), `${e0},${n0}`);

  // Indices on reference spectra
  const veg = pixelIndices({ blue: 0.03, green: 0.06, red: 0.04, nir: 0.35, swir16: 0.18, swir22: 0.09 });
  ok('NDVI vegetation > 0.7', veg.ndvi > 0.7, veg.ndvi.toFixed(3));
  const gossan = pixelIndices({ blue: 0.06, green: 0.10, red: 0.18, nir: 0.20, swir16: 0.28, swir22: 0.24 });
  ok('Iron ratio gossan > 1.35', gossan.iron > 1.35, gossan.iron.toFixed(3));
  ok('BSI gossan > 0', gossan.bsi > 0, gossan.bsi.toFixed(3));
  const acidWater = pixelIndices({ blue: 0.03, green: 0.06, red: 0.09, nir: 0.04, swir16: 0.02, swir22: 0.015 });
  ok('MNDWI acid water > 0', acidWater.mndwi > 0, acidWater.mndwi.toFixed(3));
  ok('Red water index > 0.15', acidWater.redwater > 0.15, acidWater.redwater.toFixed(3));
  const clearWater = pixelIndices({ blue: 0.06, green: 0.05, red: 0.03, nir: 0.02, swir16: 0.01, swir22: 0.008 });
  ok('Clear water red index < 0', clearWater.redwater < 0, clearWater.redwater.toFixed(3));

  // Classification on a 2x3 raster
  const spectra = [
    { blue: 0.03, green: 0.06, red: 0.04, nir: 0.35, swir16: 0.18, swir22: 0.09 }, // veg
    { blue: 0.06, green: 0.10, red: 0.18, nir: 0.20, swir16: 0.28, swir22: 0.24 }, // bare iron
    { blue: 0.08, green: 0.11, red: 0.13, nir: 0.17, swir16: 0.26, swir22: 0.22 }, // bare, no iron
    { blue: 0.03, green: 0.06, red: 0.09, nir: 0.04, swir16: 0.02, swir22: 0.015 }, // red water
    { blue: 0.06, green: 0.05, red: 0.03, nir: 0.02, swir16: 0.01, swir22: 0.008 }, // clear water
    { blue: 0.06, green: 0.10, red: 0.18, nir: 0.20, swir16: 0.28, swir22: 0.24 }, // cloud (via SCL)
  ];
  const bands = { width: 3, height: 2, scl: Uint8Array.from([4, 5, 5, 6, 6, 9]) };
  for (const k of ['blue', 'green', 'red', 'nir', 'swir16', 'swir22']) bands[k] = Float32Array.from(spectra.map((s) => s[k]));
  const valid = validMask(bands);
  const idx = computeIndexRasters(bands, 6);
  const cls = classifyPixels(idx, valid);
  ok('Classes', [...cls].join(',') === '1,3,2,5,4,0', [...cls].join(','));
  const sum = summarise(cls, Uint8Array.from([1, 1, 1, 1, 1, 1]));
  ok('Summary vegetation 20%', sum.vegetationPct === 20, sum.vegetationPct);
  ok('Summary red water 50% of water', sum.redWaterOfWaterPct === 50, sum.redWaterOfWaterPct);

  // Raster masks: 20x20 grid, square polygon from 5..15
  const sq = [[[5, 5], [15, 5], [15, 15], [5, 15], [5, 5]]];
  const pm = rasterisePolygon([sq], 20, 20);
  const inside = pm.reduce((a, b) => a + b, 0);
  ok('Polygon raster 100 px', inside === 100, inside);
  const rm = ringMask(pm, 20, 20, 2);
  let ringCount = 0, overlap = 0;
  for (let i = 0; i < 400; i++) { ringCount += rm[i]; if (rm[i] && pm[i]) overlap++; }
  ok('Ring excludes polygon', overlap === 0, overlap);
  ok('Ring 2 px count plausible (60-90)', ringCount >= 60 && ringCount <= 90, ringCount);

  // Theil-Sen and recovery clock
  const ts = theilSen([2017, 2018, 2019, 2020, 2021], [10, 12, 14, 100, 18]);
  ok('Theil-Sen robust to outlier (slope 2)', near(ts.slope, 2, 1e-9), ts.slope);
  const rec = recoveryClock([2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026]
    .map((year, i) => ({ year, vegetationPct: 10 + 2 * i, validPct: 95 })));
  ok('Recovery clock 11 years to 50%', rec.status === 'recovering' && rec.yearsToTarget === 11 && rec.targetYear === 2037, JSON.stringify(rec));
  const flat = recoveryClock([2019, 2020, 2021, 2022, 2023, 2024].map((year) => ({ year, vegetationPct: 8, validPct: 90 })));
  ok('Recovery clock stable', flat.status === 'stable', flat.status);
  const few = recoveryClock([{ year: 2025, vegetationPct: 5 }, { year: 2026, vegetationPct: 6 }]);
  ok('Recovery clock insufficient', few.status === 'insufficient', few.status);

  // Lifecycle stage
  const legacy = [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026].map((year) => ({
    year, barePct: 70, bareHa: 50, vegetationPct: 8, ironPct: 35, redWaterOfWaterPct: 40, waterHa: 2, validPct: 90,
  }));
  const lc1 = lifecycleStage(legacy, { status: 'closed' }, { egms: { shareBelowThresholdPct: 12 } });
  ok('Stage legacy bare', lc1.stage === 'legacy_bare', lc1.stage);
  ok('Flags iron, red water, ground motion', ['iron_signal', 'red_water', 'ground_motion'].every((f) => lc1.flags.some((x) => x.id === f)), lc1.flags.map((f) => f.id).join(','));
  const disturbed = legacy.map((s, i) => (i === legacy.length - 1 ? { ...s, bareHa: 60 } : s));
  const lc2 = lifecycleStage(disturbed, { status: 'reopening_planned' });
  ok('Stage reopening + new disturbance flag', lc2.stage === 'reopening_planned' && lc2.flags.some((f) => f.id === 'new_disturbance'), `${lc2.stage} ${lc2.flags.map((f) => f.id)}`);
  const greening = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026].map((year, i) => ({
    year, barePct: 60 - 3 * i, bareHa: 30 - i, vegetationPct: 12 + 3 * i, ironPct: 5, redWaterOfWaterPct: 0, waterHa: 0, validPct: 90,
  }));
  const lc3 = lifecycleStage(greening, { status: 'closed' });
  ok('Stage recovering', lc3.stage === 'recovering', `${lc3.stage} ${lc3.reason}`);

  // Export row keeps unmeasurable fields empty
  const site = { type: 'Feature', properties: { id: 'PT-SD', name: 'Test', country: 'PT', status: 'closed', facility_type: 'waste heap', crm_candidates: ['Copper', 'Cobalt'] },
    geometry: { type: 'Polygon', coordinates: [[[-7.51, 37.66], [-7.49, 37.66], [-7.49, 37.67], [-7.51, 37.67], [-7.51, 37.66]]] } };
  const row = crmaExportRow(site, { context: { areaHa: 120 }, latest: { ironPct: 30 }, lifecycle: lc1 });
  ok('Export operator empty', row.operator === '' && row.crm_content_measured === '', JSON.stringify(row).slice(0, 80));
  ok('Export candidates joined', row.crm_candidates_deposit_type === 'Copper; Cobalt', row.crm_candidates_deposit_type);

  const failed = results.filter((r) => !r.pass);
  return { passed: results.length - failed.length, total: results.length, failed, results };
}

// Node CLI: node strata-core.js --test
if (typeof process !== 'undefined' && process.argv && process.argv.includes('--test')) {
  const r = selfTest();
  for (const t of r.results) console.log(`${t.pass ? 'PASS' : 'FAIL'}  ${t.name}${t.pass ? '' : `  (${t.detail})`}`);
  console.log(`\n${r.passed}/${r.total} passed`);
  if (r.failed.length) process.exit(1);
}

/**
 * Malawi border coordinates (GeoJSON [lon, lat]) converted to canvas-space
 * normalized points [0..1]. Used as particle attraction targets so the
 * particle field forms a recognizable Malawi silhouette.
 *
 * Uses Mercator-correct aspect ratio so the shape is not deformed.
 * Lake Malawi particles are flagged with `isLake: true` for blue rendering.
 */

const MALAWI_BORDER: [number, number][] = [
  [34.559989, -11.52002],
  [34.280006, -12.280025],
  [34.559989, -13.579998],
  [34.907151, -13.565425],
  [35.267956, -13.887834],
  [35.686845, -14.611046],
  [35.771905, -15.896859],
  [35.339063, -16.10744],
  [35.03381, -16.8013],
  [34.381292, -16.18356],
  [34.307291, -15.478641],
  [34.517666, -15.013709],
  [34.459633, -14.61301],
  [34.064825, -14.35995],
  [33.7897, -14.451831],
  [33.214025, -13.97186],
  [32.688165, -13.712858],
  [32.991764, -12.783871],
  [33.306422, -12.435778],
  [33.114289, -11.607198],
  [33.31531, -10.79655],
  [33.485688, -10.525559],
  [33.231388, -9.676722],
  [32.759375, -9.230599],
  [33.739729, -9.417151],
  [33.940838, -9.693674],
  [34.280006, -10.16],
  [34.559989, -11.52002], // close ring
];

// Lake Malawi approximate boundary — eastern side of the country
// This polygon encloses the lake area; points inside get flagged as lake particles.
const LAKE_POLYGON: [number, number][] = [
  [34.50, -10.10],
  [34.56, -11.52],
  [34.50, -12.20],
  [34.56, -13.55],
  [34.90, -13.56],
  [35.27, -13.89],
  [35.69, -14.61],
  [35.77, -15.90],
  [35.50, -16.00],
  [35.10, -15.00],
  [34.90, -14.00],
  [34.70, -13.00],
  [34.60, -12.00],
  [34.70, -11.00],
  [34.50, -10.10],
];

const MIN_LON = 32.68;
const MAX_LON = 35.78;
const MIN_LAT = -16.80;
const MAX_LAT = -9.23;

const LAT_RANGE = MAX_LAT - MIN_LAT; // 7.57°

// Mercator-corrected: 1° longitude ≈ cos(meanLat) * 111km, 1° latitude ≈ 111km
const MEAN_LAT_RAD = ((MAX_LAT + MIN_LAT) / 2) * (Math.PI / 180);
const LON_KM = (MAX_LON - MIN_LON) * 111.32 * Math.cos(MEAN_LAT_RAD);
const LAT_KM = LAT_RANGE * 111.32;
const REAL_ASPECT = LON_KM / LAT_KM; // width / height ≈ 0.285 (tall & narrow)

function lerp(a: [number, number], b: [number, number], t: number): [number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/**
 * Map a geo [lon, lat] to canvas-normalized [0..1] with Mercator aspect ratio.
 * Returns [0..1] x, [0..1] y, preserving the real-world proportions.
 * The shape is fitted to height (Y axis), centered horizontally.
 */
function toCanvas(lon: number, lat: number): [number, number] {
  // Normalized Y (0 = north/top, 1 = south/bottom)
  const ny = 1 - (lat - MIN_LAT) / LAT_RANGE;
  // Normalized X relative to center of the country
  const nxRaw = (lon - (MIN_LON + MAX_LON) / 2) / (MAX_LON - MIN_LON);
  // Scale X by real aspect ratio so the shape is correct
  const nx = nxRaw * REAL_ASPECT + 0.5; // center at 0.5
  return [nx, ny];
}

function pointInPolygon(x: number, y: number, polygon: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    if (
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }
  return inside;
}

export interface MalawiPoint {
  x: number;
  y: number;
  isLake: boolean;
}

/**
 * Generate `targetCount` points forming the Malawi silhouette.
 * Each point has an `isLake` flag for Lake Malawi rendering.
 */
export function generateMalawiPoints(targetCount: number = 200): MalawiPoint[] {
  const points: MalawiPoint[] = [];

  // Convert geo border to canvas space
  const canvasBorder = MALAWI_BORDER.map(([lon, lat]) => toCanvas(lon, lat));
  const lakeCanvas = LAKE_POLYGON.map(([lon, lat]) => toCanvas(lon, lat));

  // --- 1. Border outline points ---
  let totalLength = 0;
  const segLengths: number[] = [];
  for (let i = 0; i < canvasBorder.length - 1; i++) {
    const dx = canvasBorder[i + 1][0] - canvasBorder[i][0];
    const dy = canvasBorder[i + 1][1] - canvasBorder[i][1];
    const len = Math.sqrt(dx * dx + dy * dy);
    segLengths.push(len);
    totalLength += len;
  }

  // 60% border, 40% interior
  const borderCount = Math.floor(targetCount * 0.6);
  const spacing = totalLength / borderCount;

  let accDist = 0;
  let segIdx = 0;
  for (let i = 0; i < borderCount; i++) {
    const targetDist = (i + 0.5) * spacing;
    while (segIdx < segLengths.length - 1 && accDist + segLengths[segIdx] < targetDist) {
      accDist += segLengths[segIdx];
      segIdx++;
    }
    const segT = segLengths[segIdx] > 0
      ? (targetDist - accDist) / segLengths[segIdx]
      : 0;
    const pt = lerp(canvasBorder[segIdx], canvasBorder[segIdx + 1], segT);

    // Small jitter
    const jitter = 0.004;
    const px = pt[0] + (Math.random() - 0.5) * jitter;
    const py = pt[1] + (Math.random() - 0.5) * jitter;
    points.push({
      x: Math.max(0, Math.min(1, px)),
      y: Math.max(0, Math.min(1, py)),
      isLake: pointInPolygon(px, py, lakeCanvas),
    });
  }

  // --- 2. Interior fill ---
  let cx = 0, cy = 0;
  for (const p of canvasBorder) {
    cx += p[0];
    cy += p[1];
  }
  cx /= canvasBorder.length;
  cy /= canvasBorder.length;

  const interiorCount = targetCount - borderCount;
  const fillAttempts = interiorCount * 6;
  for (let i = 0; i < fillAttempts && points.length - borderCount < interiorCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * 0.45;
    const px = cx + Math.cos(angle) * r;
    const py = cy + Math.sin(angle) * r;

    if (pointInPolygon(px, py, canvasBorder)) {
      points.push({
        x: Math.max(0, Math.min(1, px)),
        y: Math.max(0, Math.min(1, py)),
        isLake: pointInPolygon(px, py, lakeCanvas),
      });
    }
  }

  return points;
}

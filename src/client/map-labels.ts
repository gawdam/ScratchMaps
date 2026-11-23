import type { Feature, Polygon, Position } from 'geojson';
import { contains } from './challenge-location';

export type MapLabel = { name: string; lat: number; lng: number };
export type CountryLabel = MapLabel & { area: number };
type Bounds = { west: number; east: number; south: number; north: number };
type CountryPolygon = Bounds & { rings: Polygon['coordinates'] };
export type CountryLabelGeometry = { label: CountryLabel; polygons: CountryPolygon[] };

export const showDetailNames = (zoom: number): boolean => zoom > 5;

const polygonLabel = (rings: Polygon['coordinates']): Omit<CountryLabel, 'name'> | undefined => {
  const outer = rings[0];
  if (!outer || outer.length < 3) return undefined;
  let twiceArea = 0, longitude = 0, latitude = 0, south = Infinity, north = -Infinity;
  for (let i = 0; i < outer.length; i += 1) {
    const a = outer[i], b = outer[(i + 1) % outer.length];
    if (!a || !b || a[0] === undefined || a[1] === undefined || b[0] === undefined || b[1] === undefined) continue;
    const cross = a[0] * b[1] - b[0] * a[1];
    twiceArea += cross;
    longitude += (a[0] + b[0]) * cross;
    latitude += (a[1] + b[1]) * cross;
    south = Math.min(south, a[1]);
    north = Math.max(north, a[1]);
  }
  if (twiceArea === 0) return undefined;
  const area = Math.abs(twiceArea) / 2;
  const lng = longitude / (3 * twiceArea), lat = latitude / (3 * twiceArea);
  if (contains(outer, lng, lat) && !rings.slice(1).some((ring) => contains(ring, lng, lat))) {
    return { lat, lng, area };
  }

  let best: { lat: number; lng: number; width: number } | undefined;
  for (let row = 1; row < 20; row += 1) {
    const y = south + (north - south) * row / 20;
    const intersections: number[] = [];
    for (const ring of rings) {
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
        const a: Position | undefined = ring[i], b: Position | undefined = ring[j];
        if (!a || !b || a[0] === undefined || a[1] === undefined || b[0] === undefined || b[1] === undefined) continue;
        if ((a[1] > y) !== (b[1] > y)) {
          intersections.push(a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]));
        }
      }
    }
    intersections.sort((a, b) => a - b);
    for (let i = 0; i + 1 < intersections.length; i += 2) {
      const left = intersections[i], right = intersections[i + 1];
      if (left === undefined || right === undefined) continue;
      const width = right - left;
      if (!best || width > best.width) best = { lat: y, lng: (left + right) / 2, width };
    }
  }
  return best ? { lat: best.lat, lng: best.lng, area } : undefined;
};

export const countryLabel = (feature: Feature): CountryLabel | undefined => {
  const name = feature.properties?.name;
  if (typeof name !== 'string' || !name || !feature.geometry) return undefined;
  const geometry = feature.geometry;
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] :
    geometry.type === 'MultiPolygon' ? geometry.coordinates : [];
  let largest: Omit<CountryLabel, 'name'> | undefined;
  for (const polygon of polygons) {
    const label = polygonLabel(polygon);
    if (label && (!largest || label.area > largest.area)) largest = label;
  }
  return largest ? { name, ...largest } : undefined;
};

export const prepareCountryLabel = (feature: Feature): CountryLabelGeometry | undefined => {
  const label = countryLabel(feature);
  if (!label || !feature.geometry) return undefined;
  const geometry = feature.geometry;
  const coordinates = geometry.type === 'Polygon' ? [geometry.coordinates] :
    geometry.type === 'MultiPolygon' ? geometry.coordinates : [];
  const polygons: CountryPolygon[] = [];
  for (const rings of coordinates) {
    let west = Infinity, east = -Infinity, south = Infinity, north = -Infinity;
    for (const position of rings[0] ?? []) {
      const [lng, lat] = position;
      if (lng === undefined || lat === undefined) continue;
      west = Math.min(west, lng);
      east = Math.max(east, lng);
      south = Math.min(south, lat);
      north = Math.max(north, lat);
    }
    if (west <= east && south <= north) polygons.push({ rings, west, east, south, north });
  }
  return { label, polygons };
};

export const countryLabelInBounds = (country: CountryLabelGeometry, bounds: Bounds): MapLabel | undefined => {
  const { label } = country;
  if (label.lng >= bounds.west && label.lng <= bounds.east &&
    label.lat >= bounds.south && label.lat <= bounds.north) return label;

  let best: { lng: number; lat: number; area: number } | undefined;
  for (const polygon of country.polygons) {
    const west = Math.max(bounds.west, polygon.west), east = Math.min(bounds.east, polygon.east);
    const south = Math.max(bounds.south, polygon.south), north = Math.min(bounds.north, polygon.north);
    const area = (east - west) * (north - south);
    if (west >= east || south >= north || (best && area <= best.area)) continue;
    for (const y of [0.5, 0.25, 0.75, 0.1, 0.9]) {
      for (const x of [0.5, 0.25, 0.75, 0.1, 0.9]) {
        const lng = west + (east - west) * x, lat = south + (north - south) * y;
        const outer = polygon.rings[0];
        if (outer && contains(outer, lng, lat) &&
          !polygon.rings.slice(1).some((ring) => contains(ring, lng, lat))) {
          best = { lng, lat, area };
          break;
        }
      }
      if (best?.area === area) break;
    }
  }
  return best ? { name: label.name, lat: best.lat, lng: best.lng } : undefined;
};

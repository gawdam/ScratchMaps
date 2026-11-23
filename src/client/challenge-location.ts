import type { FeatureCollection, Polygon, Position } from 'geojson';

type Area = {
  rings: Position[][];
  west: number;
  east: number;
  south: number;
  north: number;
  weight: number;
};

export const contains = (ring: Position[], longitude: number, latitude: number): boolean => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const a = ring[i];
    const b = ring[j];
    if (!a || !b || a[0] === undefined || a[1] === undefined || b[0] === undefined || b[1] === undefined) {
      continue;
    }
    if ((a[1] > latitude) !== (b[1] > latitude) &&
      longitude < ((b[0] - a[0]) * (latitude - a[1])) / (b[1] - a[1]) + a[0]) {
      inside = !inside;
    }
  }
  return inside;
};

export const createLocationPicker = (countries: FeatureCollection, random = Math.random) => {
  const areas: Area[] = [];
  let totalWeight = 0;
  const addPolygon = (rings: Polygon['coordinates']) => {
    const outer = rings[0];
    if (!outer) return;
    let west = 180, east = -180, south = 80, north = -80;
    for (const point of outer) {
      const [longitude, latitude] = point;
      if (longitude === undefined || latitude === undefined) continue;
      west = Math.min(west, longitude);
      east = Math.max(east, longitude);
      south = Math.min(south, latitude);
      north = Math.max(north, latitude);
    }
    west = Math.max(-180, west);
    east = Math.min(180, east);
    south = Math.max(-80, south);
    north = Math.min(80, north);
    const weight = (east - west) * (north - south) * Math.cos(((south + north) / 2) * Math.PI / 180);
    if (weight > 0) {
      totalWeight += weight;
      areas.push({ rings, west, east, south, north, weight: totalWeight });
    }
  };
  for (const feature of countries.features) {
    if (feature.properties?.name === 'Antarctica') continue;
    const geometry = feature.geometry;
    if (geometry?.type === 'Polygon') addPolygon(geometry.coordinates);
    if (geometry?.type === 'MultiPolygon') geometry.coordinates.forEach(addPolygon);
  }

  if (areas.length === 0) throw new Error('No country polygons available for the location challenge.');

  return (): [number, number] => {
    for (let attempt = 0; attempt < 1000; attempt += 1) {
      const weight = random() * totalWeight;
      let low = 0, high = areas.length - 1;
      while (low < high) {
        const mid = Math.floor((low + high) / 2);
        const area = areas[mid];
        if (area && weight < area.weight) high = mid;
        else low = mid + 1;
      }
      const area = areas[low];
      if (!area) continue;
      const longitude = area.west + random() * (area.east - area.west);
      const latitude = area.south + random() * (area.north - area.south);
      const outer = area.rings[0];
      if (outer && contains(outer, longitude, latitude) &&
        !area.rings.slice(1).some((ring) => contains(ring, longitude, latitude))) {
        return [latitude, longitude];
      }
    }
    throw new Error('Unable to choose a land location for the challenge.');
  };
};

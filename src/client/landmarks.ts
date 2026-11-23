import landmarkData from './landmark-data.json';

export type LandmarkKind = 'mountain' | 'forest';

export type Landmark = {
  name: string;
  kind: LandmarkKind;
  lat: number;
  lng: number;
  minZoomOffset: number;
};

const mountains: Landmark[] = landmarkData.mountains.map((mountain) => ({
  ...mountain,
  kind: 'mountain',
}));

const forests: Landmark[] = landmarkData.forests.map((forest) => ({
  ...forest,
  kind: 'forest',
}));

export const landmarks: Landmark[] = [];
for (let index = 0; index < Math.max(mountains.length, forests.length); index += 1) {
  const mountain = mountains[index];
  const forest = forests[index];
  if (mountain) {
    landmarks.push(mountain);
  }
  if (forest) {
    landmarks.push(forest);
  }
}

type Point = { x: number; y: number };

export const visibleLandmarks = (
  candidates: Landmark[],
  project: (landmark: Landmark) => Point,
  size: Point,
  zoom: number,
  minZoom: number
): Landmark[] => {
  const selected: Landmark[] = [];
  const spacing = 52;
  const occupied = new Map<string, Point[]>();

  for (const landmark of candidates) {
    if (zoom < 5 && zoom - minZoom < landmark.minZoomOffset) {
      continue;
    }

    const point = project(landmark);
    if (point.x < -21 || point.y < -21 || point.x > size.x + 21 || point.y > size.y + 21) {
      continue;
    }

    if (zoom >= 5) {
      selected.push(landmark);
      continue;
    }

    const column = Math.floor(point.x / spacing);
    const row = Math.floor(point.y / spacing);
    let overlaps = false;
    for (let x = column - 1; x <= column + 1 && !overlaps; x += 1) {
      for (let y = row - 1; y <= row + 1; y += 1) {
        const others = occupied.get(`${x},${y}`);
        if (others?.some((other) => Math.hypot(point.x - other.x, point.y - other.y) < spacing)) {
          overlaps = true;
          break;
        }
      }
    }
    if (overlaps) {
      continue;
    }

    const key = `${column},${row}`;
    const cell = occupied.get(key) ?? [];
    cell.push(point);
    occupied.set(key, cell);
    selected.push(landmark);
  }

  return selected;
};

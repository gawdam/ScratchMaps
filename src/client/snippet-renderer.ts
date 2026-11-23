import L from 'leaflet';
import type { Feature, FeatureCollection, Geometry, Position } from 'geojson';
import { nationPalette } from './country-colors';
import { landmarks, visibleLandmarks, type Landmark, type LandmarkKind } from './landmarks';
import { getRiverStyle } from './river-style';
import { worldCountries } from './world-countries';
import { worldLakes, worldRivers } from './world-water';

export const snippetWidth = 280;
export const snippetHeight = 196;
const snippetZoom = 5;
const imageScale = 2;
const imageZoom = snippetZoom + 1;
const tileWidth = snippetWidth;
const tileHeight = snippetHeight;
const imageWidth = tileWidth * imageScale;
const imageHeight = tileHeight * imageScale;

export type LandmarkAssets = Record<LandmarkKind, { url: string; size: number; color: string }>;
export type SnippetClues = { oceanPercent: number; countries: number; mountains: number; forests: number; rivers: number };
export type SnippetRender = { images: string[]; clues: SnippetClues };

export const oceanPercentFromLandPixels = (pixels: Uint8ClampedArray): number => {
  let land = 0;
  for (let index = 3; index < pixels.length; index += 4) {
    land += (pixels[index] ?? 0) / 255;
  }
  return Math.round((1 - land / (pixels.length / 4)) * 1000) / 10;
};

export const getSnippetBounds = (center: L.LatLng): L.LatLngBounds => {
  const point = L.CRS.EPSG3857.latLngToPoint(center, snippetZoom);
  return L.latLngBounds(
    L.CRS.EPSG3857.pointToLatLng(point.subtract([snippetWidth / 2, -snippetHeight / 2]), snippetZoom),
    L.CRS.EPSG3857.pointToLatLng(point.add([snippetWidth / 2, -snippetHeight / 2]), snippetZoom)
  );
};

export const snippetVariantIndex = (colors: boolean, rivers: boolean, landmarksEnabled: boolean): number =>
  Number(colors) + Number(rivers) * 2 + Number(landmarksEnabled) * 4;

export const countSnippetLandmarks = (
  items: Landmark[],
  project: (landmark: Landmark) => { x: number; y: number }
): { mountains: number; forests: number } => {
  const counts = { mountains: 0, forests: 0 };
  for (const item of items) {
    const point = project(item);
    if (point.x < 0 || point.x > snippetWidth || point.y < 0 || point.y > snippetHeight) continue;
    if (item.kind === 'mountain') counts.mountains += 1;
    else counts.forests += 1;
  }
  return counts;
};

export const riverIntersectsBounds = (feature: Feature, bounds: L.Bounds): boolean => {
  const geometry = feature.geometry;
  const { min, max } = bounds;
  if (!min || !max) throw new Error('River bounds are invalid.');
  if (!geometry || (geometry.type !== 'LineString' && geometry.type !== 'MultiLineString')) {
    throw new Error('A river feature has invalid line geometry.');
  }
  const lines = geometry.type === 'LineString' ? [geometry.coordinates] : geometry.coordinates;
  const project = (position: Position): L.Point => {
    const [lng, lat] = position;
    if (lng === undefined || lat === undefined) throw new Error('A river has invalid coordinates.');
    return L.CRS.EPSG3857.latLngToPoint(L.latLng(lat, lng), imageZoom);
  };
  const intersects = (a: L.Point, b: L.Point): boolean => {
    let start = 0;
    let end = 1;
    const axes: [number, number, number, number][] = [
      [a.x, b.x - a.x, min.x, max.x],
      [a.y, b.y - a.y, min.y, max.y],
    ];
    for (const [value, delta, lower, upper] of axes) {
      if (delta === 0) {
        if (value < lower || value > upper) return false;
        continue;
      }
      const first = (lower - value) / delta;
      const last = (upper - value) / delta;
      start = Math.max(start, Math.min(first, last));
      end = Math.min(end, Math.max(first, last));
      if (start > end) return false;
    }
    return true;
  };
  return lines.some((line) => {
    const first = line[0];
    if (!first) return false;
    let previous = project(first);
    if (bounds.contains(previous)) return true;
    for (let index = 1; index < line.length; index += 1) {
      const position = line[index];
      if (!position) throw new Error('A river has invalid coordinates.');
      const point = project(position);
      if (intersects(previous, point)) return true;
      previous = point;
    }
    return false;
  });
};

type Shape = {
  feature: Feature;
  path: Path2D;
  bounds: L.Bounds;
};

const makeCanvas = (width = imageWidth, height = imageHeight, willReadFrequently = false) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently });
  if (!context) throw new Error('Canvas rendering is unavailable.');
  return { canvas, context };
};

const makeShape = (feature: Feature): Shape | undefined => {
  const path = new Path2D();
  const bounds = L.bounds([]);
  let hasPoints = false;
  const addLine = (positions: Position[], close: boolean) => {
    let started = false;
    for (const position of positions) {
      const [lng, lat] = position;
      if (lng === undefined || lat === undefined) continue;
      const point = L.CRS.EPSG3857.latLngToPoint(L.latLng(lat, lng), imageZoom);
      bounds.extend(point);
      if (started) path.lineTo(point.x, point.y);
      else path.moveTo(point.x, point.y);
      started = true;
      hasPoints = true;
    }
    if (started && close) path.closePath();
  };
  const addGeometry = (geometry: Geometry | null) => {
    if (!geometry) return;
    switch (geometry.type) {
      case 'LineString': addLine(geometry.coordinates, false); break;
      case 'MultiLineString': geometry.coordinates.forEach((line) => addLine(line, false)); break;
      case 'Polygon': geometry.coordinates.forEach((ring) => addLine(ring, true)); break;
      case 'MultiPolygon': geometry.coordinates.forEach((polygon) => polygon.forEach((ring) => addLine(ring, true))); break;
      case 'GeometryCollection': geometry.geometries.forEach(addGeometry); break;
    }
  };
  addGeometry(feature.geometry);
  return hasPoints ? { feature, path, bounds } : undefined;
};

const makeShapes = (collection: FeatureCollection): Shape[] =>
  collection.features.map(makeShape).filter((shape): shape is Shape => shape !== undefined);

const loadIcon = async (asset: LandmarkAssets[LandmarkKind]): Promise<HTMLCanvasElement> => {
  const image = new Image();
  image.src = asset.url;
  await image.decode();
  const { canvas, context } = makeCanvas(asset.size * imageScale, asset.size * imageScale);
  const scale = Math.min(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  context.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
  context.globalCompositeOperation = 'source-in';
  context.fillStyle = asset.color;
  context.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
};

export const createSnippetRenderer = (
  countryColors: Map<Feature, number>,
  coastline: FeatureCollection,
  assets: LandmarkAssets,
  minZoom: number
) => {
  let shapes: { countries: Shape[]; lakes: Shape[]; rivers: Shape[]; coastline: Shape[] } | undefined;
  let iconPromise: Promise<Record<LandmarkKind, HTMLCanvasElement>> | undefined;

  return async (center: L.LatLng, signal: AbortSignal): Promise<SnippetRender | undefined> => {
    if (!iconPromise) {
      iconPromise = Promise.all([loadIcon(assets.mountain), loadIcon(assets.forest)])
        .then(([mountain, forest]) => ({ mountain, forest }))
        .catch((error: unknown) => {
          iconPromise = undefined;
          throw error;
        });
    }
    const icons = await iconPromise;
    if (signal.aborted) throw new DOMException('Snippet rendering was cancelled.', 'AbortError');
    if (!shapes) {
      shapes = {
        countries: makeShapes(worldCountries),
        lakes: makeShapes(worldLakes),
        rivers: makeShapes(worldRivers),
        coastline: makeShapes(coastline),
      };
    }
    const origin = L.CRS.EPSG3857.latLngToPoint(center, imageZoom).subtract([imageWidth / 2, imageHeight / 2]);
    const worldWidth = 256 * 2 ** imageZoom;
    if (origin.x < 0 || origin.x + imageWidth > worldWidth) return undefined;
    const view = L.bounds(origin.subtract([32, 32]), origin.add([imageWidth + 32, imageHeight + 32]));
    const visible = (items: Shape[]) => items.filter((shape) => shape.bounds.intersects(view));
    const land = makeCanvas(imageWidth, imageHeight, true);
    const countryMask = makeCanvas(imageWidth, imageHeight, true);
    land.context.translate(-origin.x, -origin.y);
    countryMask.context.translate(-origin.x, -origin.y);
    const countryNames = new Set<string>();
    const countryShapes = visible(shapes.countries);
    for (const shape of countryShapes) {
      countryMask.context.clearRect(origin.x, origin.y, imageWidth, imageHeight);
      countryMask.context.fill(shape.path, 'evenodd');
      const pixels = countryMask.context.getImageData(0, 0, imageWidth, imageHeight).data;
      let intersects = false;
      for (let index = 3; index < pixels.length; index += 4) {
        if ((pixels[index] ?? 0) > 0) {
          intersects = true;
          break;
        }
      }
      if (!intersects) continue;
      const name = shape.feature.properties?.name;
      if (name === 'Antarctica') return undefined;
      if (typeof name !== 'string' || name.length === 0) {
        throw new Error('A country in the snippet has no name.');
      }
      countryNames.add(name);
      land.context.fill(shape.path, 'evenodd');
    }
    for (const shape of visible(shapes.lakes)) {
      land.context.fill(shape.path, 'evenodd');
    }
    const oceanPercent = oceanPercentFromLandPixels(land.context.getImageData(0, 0, imageWidth, imageHeight).data);
    if (oceanPercent >= 100 || countryNames.size === 0) return undefined;
    const projectLandmark = (point: { lat: number; lng: number }) => {
      const projected = L.CRS.EPSG3857.latLngToPoint(L.latLng(point.lat, point.lng), imageZoom);
      return { x: (projected.x - origin.x) / imageScale, y: (projected.y - origin.y) / imageScale };
    };
    const shownLandmarks = visibleLandmarks(landmarks, projectLandmark, { x: snippetWidth, y: snippetHeight }, snippetZoom, minZoom);
    const riverShapes = visible(shapes.rivers);
    const snippetBounds = L.bounds(origin, origin.add([imageWidth, imageHeight]));
    const clues = {
      oceanPercent,
      countries: countryNames.size,
      ...countSnippetLandmarks(shownLandmarks, projectLandmark),
      rivers: riverShapes.filter((shape) => riverIntersectsBounds(shape.feature, snippetBounds)).length,
    };

    const base = makeCanvas();
    base.context.fillStyle = '#928D79';
    base.context.fillRect(0, 0, imageWidth, imageHeight);
    base.context.save();
    base.context.translate(imageWidth / 2, imageHeight / 2);
    base.context.scale(imageWidth / 2, imageHeight / 2);
    const vignette = base.context.createRadialGradient(0, 0, 0, 0, 0, Math.SQRT2);
    vignette.addColorStop(0.55, 'transparent');
    vignette.addColorStop(1, 'rgba(71, 38, 14, 0.25)');
    base.context.fillStyle = vignette;
    base.context.fillRect(-1, -1, 2, 2);
    base.context.restore();
    base.context.translate(-origin.x, -origin.y);
    const coast = visible(shapes.coastline);
    base.context.strokeStyle = '#3b2314';
    base.context.filter = 'blur(10px)';
    base.context.globalAlpha = 0.08;
    base.context.lineWidth = 62.4;
    for (const shape of coast) base.context.stroke(shape.path);
    base.context.filter = 'blur(6px)';
    base.context.globalAlpha = 0.16;
    base.context.lineWidth = 34.4;
    for (const shape of coast) base.context.stroke(shape.path);
    base.context.filter = 'none';
    base.context.globalAlpha = 1;
    const color = makeCanvas();
    color.context.translate(-origin.x, -origin.y);
    const water = makeCanvas();
    water.context.translate(-origin.x, -origin.y);
    const river = makeCanvas();
    river.context.translate(-origin.x, -origin.y);
    const edges = makeCanvas();
    edges.context.translate(-origin.x, -origin.y);
    const landmark = makeCanvas();

    const grain = makeCanvas(64, 64);
    grain.context.fillStyle = '#e4c27e';
    grain.context.fillRect(0, 0, 64, 64);
    grain.context.scale(imageScale, imageScale);
    grain.context.strokeStyle = '#754b27';
    grain.context.lineWidth = 0.7;
    const grainPaths: [string, number][] = [
      ['M2 7 C8 5 10 9 16 7 S24 5 30 8', 0.14],
      ['M-3 23 C4 20 9 24 15 22 S24 20 35 23', 0.11],
      ['M6 14 l2 -1 M22 13 l2 1 M17 29 l2 -1', 0.2],
    ];
    for (const [path, opacity] of grainPaths) {
      grain.context.globalAlpha = opacity;
      grain.context.stroke(new Path2D(path));
    }
    const pattern = base.context.createPattern(grain.canvas, 'repeat');
    if (!pattern) throw new Error('Unable to create the snippet parchment texture.');
    base.context.fillStyle = pattern;
    color.context.globalAlpha = 0.68;
    for (const shape of countryShapes) {
      base.context.fill(shape.path, 'evenodd');
      const index = countryColors.get(shape.feature) ?? 0;
      color.context.fillStyle = nationPalette[index] ?? nationPalette[0];
      color.context.fill(shape.path, 'evenodd');
    }

    water.context.fillStyle = '#928D79';
    water.context.strokeStyle = '#5a3d22';
    water.context.lineWidth = 0.45 * imageScale;
    for (const shape of visible(shapes.lakes)) {
      if ((shape.feature.properties?.min_zoom ?? 0) > snippetZoom) continue;
      water.context.globalAlpha = 0.84;
      water.context.fill(shape.path, 'evenodd');
      water.context.globalAlpha = 1;
      water.context.stroke(shape.path);
    }

    const riverStyle = getRiverStyle(snippetZoom, 0);
    river.context.strokeStyle = riverStyle.color;
    river.context.globalAlpha = riverStyle.opacity;
    river.context.lineWidth = riverStyle.weight * imageScale;
    river.context.lineCap = 'round';
    river.context.lineJoin = 'round';
    for (const shape of riverShapes) river.context.stroke(shape.path);

    edges.context.strokeStyle = '#2c1c0e';
    edges.context.globalAlpha = 0.82;
    edges.context.lineWidth = 2.4 * imageScale;
    edges.context.setLineDash([8 * imageScale, 6 * imageScale]);
    for (const shape of visible(shapes.countries)) edges.context.stroke(shape.path);
    edges.context.setLineDash([]);
    edges.context.globalAlpha = 0.9;
    edges.context.lineWidth = 3.2 * imageScale;
    for (const shape of coast) edges.context.stroke(shape.path);

    for (const item of shownLandmarks) {
      const point = projectLandmark(item);
      const icon = icons[item.kind];
      const size = assets[item.kind].size * imageScale;
      landmark.context.drawImage(icon, point.x * imageScale - size / 2, point.y * imageScale - size / 2, size, size);
    }

    const variants: string[] = [];
    for (let index = 0; index < 8; index += 1) {
      const output = makeCanvas();
      for (let row = 0; row < imageScale; row += 1) {
        for (let column = 0; column < imageScale; column += 1) {
          const x = column * tileWidth;
          const y = row * tileHeight;
          const tile = makeCanvas(tileWidth, tileHeight);
          const layers = [
            base.canvas,
            ...(index & 1 ? [color.canvas] : []),
            water.canvas,
            ...(index & 2 ? [river.canvas] : []),
            ...(index & 4 ? [landmark.canvas] : []),
            edges.canvas,
          ];
          for (const layer of layers) {
            tile.context.drawImage(layer, x, y, tileWidth, tileHeight, 0, 0, tileWidth, tileHeight);
          }
          output.context.drawImage(tile.canvas, x, y);
        }
      }
      variants.push(output.canvas.toDataURL('image/png'));
    }
    return { images: variants, clues };
  };
};

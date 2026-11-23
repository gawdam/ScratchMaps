import { describe, expect, it } from 'vitest';
import L from 'leaflet';
import { countSnippetLandmarks, getSnippetBounds, oceanPercentFromLandPixels, riverIntersectsBounds, snippetHeight, snippetVariantIndex, snippetWidth } from './snippet-renderer';

describe('snippet footprint', () => {
  it('covers the same geographic area at every map zoom', () => {
    const center = L.latLng(43.2, 20.1);
    const bounds = getSnippetBounds(center);
    const dimensions = (zoom: number) => {
      const northWest = L.CRS.EPSG3857.latLngToPoint(bounds.getNorthWest(), zoom);
      const southEast = L.CRS.EPSG3857.latLngToPoint(bounds.getSouthEast(), zoom);
      return southEast.subtract(northWest);
    };
    expect(dimensions(5).x).toBeCloseTo(snippetWidth);
    expect(dimensions(5).y).toBeCloseTo(snippetHeight);
    expect(dimensions(6).x).toBeCloseTo(snippetWidth * 2);
    expect(dimensions(6).y).toBeCloseTo(snippetHeight * 2);
    expect(dimensions(4).x).toBeCloseTo(snippetWidth / 2);
    expect(dimensions(4).y).toBeCloseTo(snippetHeight / 2);
  });

  it('selects a distinct image for every filter combination', () => {
    const indices = new Set<number>();
    for (const colors of [false, true]) {
      for (const rivers of [false, true]) {
        for (const landmarks of [false, true]) {
          indices.add(snippetVariantIndex(colors, rivers, landmarks));
        }
      }
    }
    expect([...indices].sort()).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it('calculates the ocean fraction from the land mask, including partially covered pixels', () => {
    expect(oceanPercentFromLandPixels(new Uint8ClampedArray([0, 0, 0, 255, 0, 0, 0, 0]))).toBe(50);
    expect(oceanPercentFromLandPixels(new Uint8ClampedArray([0, 0, 0, 128]))).toBe(49.8);
    expect(oceanPercentFromLandPixels(new Uint8ClampedArray([0, 0, 0, 0]))).toBe(100);
    expect(oceanPercentFromLandPixels(new Uint8ClampedArray([0, 0, 0, 255]))).toBe(0);
  });

  it('counts river geometry crossing the snippet, not just overlapping bounding boxes', () => {
    const project = (lat: number, lng: number) => L.CRS.EPSG3857.latLngToPoint(L.latLng(lat, lng), 6);
    const bounds = L.bounds(project(1, -1), project(-1, 1));
    const line = (coordinates: number[][]) => ({
      type: 'Feature' as const,
      properties: {},
      geometry: { type: 'LineString' as const, coordinates },
    });
    expect(riverIntersectsBounds(line([[-2, 0], [2, 0]]), bounds)).toBe(true);
    expect(riverIntersectsBounds(line([[-2, 0.9], [-0.9, 2]]), bounds)).toBe(false);
    expect(riverIntersectsBounds(line([[0, 0], [2, 2]]), bounds)).toBe(true);
    expect(riverIntersectsBounds({
      type: 'Feature', properties: {},
      geometry: { type: 'MultiLineString', coordinates: [[[-3, 3], [-2, 2]], [[0, -2], [0, 2]]] },
    }, bounds)).toBe(true);
  });

  it('counts landmark centers inside the snippet, including its edges', () => {
    expect(countSnippetLandmarks([
      { name: 'Peak', kind: 'mountain', lat: 0, lng: 0, minZoomOffset: 0 },
      { name: 'Forest', kind: 'forest', lat: snippetHeight, lng: snippetWidth, minZoomOffset: 0 },
      { name: 'Outside', kind: 'mountain', lat: 10, lng: -1, minZoomOffset: 0 },
    ], (item) => ({ x: item.lng, y: item.lat }))).toEqual({ mountains: 1, forests: 1 });
  });
});

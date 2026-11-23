import { describe, expect, it } from 'vitest';
import type { Feature, Polygon } from 'geojson';
import { contains } from './challenge-location';
import { countryLabel, countryLabelInBounds, prepareCountryLabel, showDetailNames } from './map-labels';

describe('map labels', () => {
  it('places a country label inside the largest polygon and outside holes', () => {
    const large: Polygon['coordinates'] = [
      [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],
      [[3, 3], [7, 3], [7, 7], [3, 7], [3, 3]],
    ];
    const feature: Feature = {
      type: 'Feature',
      properties: { name: 'Example' },
      geometry: { type: 'MultiPolygon', coordinates: [[[[20, 0], [21, 0], [21, 1], [20, 1], [20, 0]]], large] },
    };
    const label = countryLabel(feature);
    expect(label?.name).toBe('Example');
    expect(label && contains(large[0] ?? [], label.lng, label.lat)).toBe(true);
    expect(label && contains(large[1] ?? [], label.lng, label.lat)).toBe(false);
  });

  it('places a country name in the visible part when its usual label is offscreen', () => {
    const feature: Feature = {
      type: 'Feature',
      properties: { name: 'Example' },
      geometry: { type: 'Polygon', coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]] },
    };
    const country = prepareCountryLabel(feature);
    expect(country).toBeDefined();
    if (!country) throw new Error('Expected a country label.');
    const label = countryLabelInBounds(country, { west: 0, east: 2, south: 0, north: 2 });
    expect(label).toEqual({ name: 'Example', lng: 1, lat: 1 });
    expect(countryLabelInBounds(country, { west: 20, east: 21, south: 20, north: 21 })).toBeUndefined();
  });

  it('only shows river and landmark names above zoom 5', () => {
    expect(showDetailNames(5)).toBe(false);
    expect(showDetailNames(5.1)).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import type { FeatureCollection } from 'geojson';
import { createLocationPicker } from './challenge-location';

const countries: FeatureCollection = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [
        [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],
        [[4, 4], [6, 4], [6, 6], [4, 6], [4, 4]],
      ],
    },
  }],
};

describe('challenge location picker', () => {
  it('rejects holes and chooses a point on land', () => {
    const values = [0.1, 0.5, 0.5, 0.1, 0.2, 0.3];
    let index = 0;
    const pick = createLocationPicker(countries, () => values[index++] ?? 0);
    expect(pick()).toEqual([3, 2]);
  });

  it('reports an error if no land geometry is available', () => {
    expect(() => createLocationPicker({ type: 'FeatureCollection', features: [] })).toThrow(
      'No country polygons available'
    );
  });

  it('does not sample Antarctica as a target', () => {
    const antarctica: FeatureCollection = {
      type: 'FeatureCollection',
      features: countries.features.map((feature) => ({ ...feature, properties: { name: 'Antarctica' } })),
    };
    expect(() => createLocationPicker(antarctica)).toThrow('No country polygons available');
  });

  it('reports an error when random sampling cannot find land', () => {
    const pick = createLocationPicker(countries, () => 0.5);
    expect(() => pick()).toThrow('Unable to choose a land location');
  });
});

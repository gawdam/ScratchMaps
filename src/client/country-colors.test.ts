import { describe, expect, it } from 'vitest';
import type { FeatureCollection } from 'geojson';
import { colorCountries, getCountryCoastline } from './country-colors';

describe('colorCountries', () => {
  it('assigns different palette colors to countries sharing a border', () => {
    const countries: FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { name: 'West' },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [0, 0],
                [1, 0],
                [1, 1],
                [0, 1],
                [0, 0],
              ],
            ],
          },
        },
        {
          type: 'Feature',
          properties: { name: 'East' },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [1, 0],
                [2, 0],
                [2, 1],
                [1, 1],
                [1, 0],
              ],
            ],
          },
        },
      ],
    };

    const colors = colorCountries(countries);
    const west = countries.features[0];
    const east = countries.features[1];

    expect(west).toBeDefined();
    expect(east).toBeDefined();
    if (west && east) {
      expect(colors.get(west)).not.toBe(colors.get(east));
    }
  });

  it('keeps shared country borders out of the coastline accents', () => {
    const countries: FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { name: 'West' },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [0, 0],
                [1, 0],
                [1, 1],
                [0, 1],
                [0, 0],
              ],
            ],
          },
        },
        {
          type: 'Feature',
          properties: { name: 'East' },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [1, 0],
                [2, 0],
                [2, 1],
                [1, 1],
                [1, 0],
              ],
            ],
          },
        },
      ],
    };

    expect(getCountryCoastline(countries).features).toHaveLength(3);
  });
});

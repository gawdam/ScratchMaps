import { describe, expect, it } from 'vitest';
import { getRiverStyle } from './river-style';
import { worldRivers } from './world-water';

describe('river style', () => {
  it('reveals smaller rivers at zoom 5, but not before their threshold', () => {
    expect(getRiverStyle(4.9, 7).opacity).toBe(0);
    expect(getRiverStyle(5, 7).opacity).toBeGreaterThan(0);
    expect(getRiverStyle(6, 9).opacity).toBeGreaterThan(0);
  });

  it('continues showing major rivers at their earlier visibility threshold', () => {
    expect(getRiverStyle(2.9, 3).opacity).toBe(0);
    expect(getRiverStyle(3, 3).opacity).toBeGreaterThan(0);
  });

  it('shows every bundled river at zoom 5', () => {
    for (const river of worldRivers.features) {
      expect(getRiverStyle(5, river.properties?.min_zoom ?? 0).opacity).toBeGreaterThan(0);
    }
  });

  it('uses a thicker stroke across zoom levels', () => {
    for (const zoom of [2, 5, 12]) {
      expect(getRiverStyle(zoom, 0).weight).toBeGreaterThan(2);
    }
  });
});

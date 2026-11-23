import { describe, expect, it } from 'vitest';
import { visibleLandmarks, type Landmark } from './landmarks';

const landmark = (name: string, x: number, y: number, minZoomOffset = 0): Landmark => ({
  name,
  kind: 'mountain',
  lat: y,
  lng: x,
  minZoomOffset,
});

describe('visibleLandmarks', () => {
  const project = (item: Landmark) => ({ x: item.lng, y: item.lat });
  const size = { x: 200, y: 200 };

  it('reveals less prominent markers on zoom and excludes offscreen markers', () => {
    const primary = landmark('primary', 20, 20);
    const detail = landmark('detail', 120, 120, 1);
    const offscreen = landmark('offscreen', 250, 150);

    expect(visibleLandmarks([primary, detail, offscreen], project, size, 2, 2)).toEqual([primary]);
    expect(visibleLandmarks([primary, detail, offscreen], project, size, 3, 2)).toEqual([primary, detail]);
  });

  it('avoids overlap across and within grid cells, preserving priority', () => {
    const first = landmark('first', 1, 1);
    const second = landmark('second', 51, 51);
    const overlapping = landmark('overlap', 52, 52);

    expect(visibleLandmarks([first, second, overlapping], project, size, 2, 2)).toEqual([first, second]);
  });

  it('shows all onscreen landmarks, including overlaps and lower-priority records, from zoom 5', () => {
    const first = landmark('first', 20, 20);
    const overlap = landmark('overlap', 21, 21, 10);
    const offscreen = landmark('offscreen', 250, 150);
    const candidates = [first, overlap, offscreen];

    expect(visibleLandmarks(candidates, project, size, 4.9, 2)).toEqual([first]);
    expect(visibleLandmarks(candidates, project, size, 5, 2)).toEqual([first, overlap]);
    expect(visibleLandmarks(candidates, project, size, 6, 2)).toEqual([first, overlap]);
  });
});

import { describe, expect, it } from 'vitest';
import { remainingCoverFraction, scoreGuess, scratchMultiplier } from './challenge-score';

describe('challenge scoring', () => {
  it('scores distance from 5,000 down towards zero and applies the displayed multiplier', () => {
    expect(scoreGuess(0, 1)).toEqual({ base: 5000, multiplier: 2, final: 10000 });
    expect(scoreGuess(2030, 0.5)).toEqual({ base: 1839, multiplier: 1.5, final: 2759 });
    expect(scoreGuess(20000, 0)).toEqual({ base: 0, multiplier: 1, final: 0 });
    expect(scoreGuess(100, 0.234).multiplier).toBe(1.23);
  });

  it('awards full base points within 30 km and decays from that boundary', () => {
    expect(scoreGuess(29.9, 0).base).toBe(5000);
    expect(scoreGuess(30, 0).base).toBe(5000);
    expect(scoreGuess(31, 0).base).toBe(4998);
    expect(scoreGuess(30, 0.5)).toEqual({ base: 5000, multiplier: 1.5, final: 7500 });
  });

  it('measures remaining cover using alpha, including partially erased pixels', () => {
    expect(remainingCoverFraction(new Uint8ClampedArray([0, 0, 0, 255, 0, 0, 0, 0]))).toBe(0.5);
    expect(remainingCoverFraction(new Uint8ClampedArray([0, 0, 0, 128]))).toBeCloseTo(128 / 255);
    expect(scratchMultiplier(0)).toBe(1);
    expect(scratchMultiplier(1)).toBe(2);
    expect(() => remainingCoverFraction(new Uint8ClampedArray())).toThrow(RangeError);
  });

  it('uses the initially covered area as the full multiplier baseline', () => {
    const initial = new Uint8ClampedArray([0, 0, 0, 0, 0, 0, 0, 128, 0, 0, 0, 255]);
    const baseline = remainingCoverFraction(initial);
    expect(remainingCoverFraction(initial, baseline)).toBe(1);
    expect(scratchMultiplier(remainingCoverFraction(initial, baseline))).toBe(2);
    expect(remainingCoverFraction(new Uint8ClampedArray([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 128]), baseline))
      .toBeCloseTo(128 / 383);
    expect(remainingCoverFraction(new Uint8ClampedArray(initial.length), baseline)).toBe(0);
    expect(() => remainingCoverFraction(initial, 0)).toThrow(RangeError);
  });
});

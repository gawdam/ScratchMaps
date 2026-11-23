export const remainingCoverFraction = (pixels: Uint8ClampedArray, initialCoverFraction = 1): number => {
  if (pixels.length === 0 || pixels.length % 4 !== 0) throw new RangeError('Invalid scratch-cover pixels.');
  if (!Number.isFinite(initialCoverFraction) || initialCoverFraction <= 0 || initialCoverFraction > 1) {
    throw new RangeError('Initial scratch-cover fraction must be greater than 0 and at most 1.');
  }
  let alpha = 0;
  for (let index = 3; index < pixels.length; index += 4) {
    alpha += pixels[index] ?? 0;
  }
  return Math.min(1, alpha / (255 * (pixels.length / 4) * initialCoverFraction));
};

export const scratchMultiplier = (remaining: number): number => {
  if (!Number.isFinite(remaining) || remaining < 0 || remaining > 1) {
    throw new RangeError('Scratch-cover fraction must be between 0 and 1.');
  }
  return Math.round((1 + remaining) * 100) / 100;
};

export const scoreGuess = (distanceKm: number, remaining: number) => {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) throw new RangeError('Distance must be non-negative.');
  const base = Math.round(5000 * Math.exp(-Math.max(0, distanceKm - 30) / 2000));
  const multiplier = scratchMultiplier(remaining);
  return { base, multiplier, final: Math.round(base * multiplier) };
};

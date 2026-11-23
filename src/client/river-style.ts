export const getRiverStyle = (zoom: number, minZoom: number) => ({
  color: '#92A595',
  opacity: zoom >= Math.min(minZoom, 5) ? 0.88 : 0,
  weight: 2.5,
});

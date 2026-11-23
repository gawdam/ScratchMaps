import '@matita/icons/pencil.css';

import { toSvg, type SketchIconData } from '@matita/icons';

export const matitaSvg = (icon: SketchIconData, color: string, size = 20): string =>
  toSvg(icon, { size, color, strokeWidth: 2, pencil: true });

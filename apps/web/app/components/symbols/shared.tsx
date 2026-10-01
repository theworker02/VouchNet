import type { SVGProps } from 'react';

export type SymbolSize = 'sm' | 'md' | 'lg';

export type SymbolProps = Omit<SVGProps<SVGSVGElement>, 'width' | 'height'> & {
  size?: SymbolSize;
  glowing?: boolean;
};

export const symbolDimensions: Record<SymbolSize, number> = { sm: 20, md: 28, lg: 40 };

export function symbolSize(size: SymbolSize | undefined) {
  return symbolDimensions[size ?? 'md'];
}

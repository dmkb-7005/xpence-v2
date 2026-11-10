/** Inline stroke icons used by the design (24×24 grid, currentColor). */
import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };
const base = (size: number, rest: SVGProps<SVGSVGElement>) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  ...rest,
});

export const BackIcon = ({ size = 22, ...r }: P) => <svg {...base(size, r)}><path d="M15 6l-6 6 6 6" /></svg>;
export const ChevronUp = ({ size = 18, ...r }: P) => <svg {...base(size, r)}><path d="M6 15l6-6 6 6" /></svg>;
export const ChevronDown = ({ size = 18, ...r }: P) => <svg {...base(size, r)}><path d="M6 9l6 6 6-6" /></svg>;
export const CalendarIcon = ({ size = 16, ...r }: P) => (
  <svg {...base(size, r)}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
);
export const RepeatIcon = ({ size = 14, ...r }: P) => (
  <svg {...base(size, r)}><path d="M17 2l4 4-4 4" /><path d="M3 11V9a3 3 0 013-3h15M7 22l-4-4 4-4" /><path d="M21 13v2a3 3 0 01-3 3H3" /></svg>
);
export const BackspaceIcon = ({ size = 24, ...r }: P) => (
  <svg {...base(size, { strokeWidth: 1.8, ...r })}><path d="M21 5H9l-6 7 6 7h12z" /><path d="M13 10l4 4M17 10l-4 4" /></svg>
);
export const TrashIcon = ({ size = 16, ...r }: P) => (
  <svg {...base(size, r)}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
);
export const ClockIcon = ({ size = 12, ...r }: P) => (
  <svg {...base(size, { strokeWidth: 2.5, ...r })}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);
export const RefundIcon = ({ size = 12, ...r }: P) => (
  <svg {...base(size, { strokeWidth: 2.5, ...r })}><path d="M9 14L4 9l5-5" /><path d="M4 9h11a5 5 0 010 10h-3" /></svg>
);
export const AlertIcon = ({ size = 22, ...r }: P) => (
  <svg {...base(size, r)}><circle cx="12" cy="12" r="9" /><path d="M12 7v6M12 16.5v.5" /></svg>
);
export const TagIcon = ({ size = 20, ...r }: P) => (
  <svg {...base(size, r)}><path d="M4 4h7l9 9-7 7-9-9z" /><circle cx="8.5" cy="8.5" r="1.5" /></svg>
);
export const CheckIcon = ({ size = 18, ...r }: P) => <svg {...base(size, { strokeWidth: 3, ...r })}><path d="M5 12l5 5 9-10" /></svg>;
export const SlashIcon = ({ size = 16, ...r }: P) => <svg {...base(size, r)}><path d="M5 19L19 5" /></svg>;
export const CloseIcon = ({ size = 20, ...r }: P) => <svg {...base(size, r)}><path d="M6 6l12 12M18 6L6 18" /></svg>;

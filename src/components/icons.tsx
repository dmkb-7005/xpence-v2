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
export const HomeIcon = ({ size = 20, ...r }: P) => <svg {...base(size, r)}><path d="M4 11l8-7 8 7v9H4z" /><path d="M10 20v-5h4v5" /></svg>;
export const ListIcon = ({ size = 20, ...r }: P) => (
  <svg {...base(size, r)}><path d="M8 6h12M8 12h12M8 18h12" /><circle cx="4" cy="6" r=".6" /><circle cx="4" cy="12" r=".6" /><circle cx="4" cy="18" r=".6" /></svg>
);
export const PieIcon = ({ size = 20, ...r }: P) => (
  <svg {...base(size, r)}><path d="M12 3a9 9 0 1 0 9 9h-9z" /><path d="M15 3.5A9 9 0 0 1 20.5 9H15z" /></svg>
);
export const ArrowUpIcon = ({ size = 20, ...r }: P) => <svg {...base(size, r)}><path d="M12 19V5M6 11l6-6 6 6" /></svg>;
export const ArrowDownIcon = ({ size = 14, ...r }: P) => <svg {...base(size, { strokeWidth: 2.4, ...r })}><path d="M12 5v14M6 13l6 6 6-6" /></svg>;
export const GearIcon = ({ size = 20, ...r }: P) => (
  <svg {...base(size, r)}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>
);
export const PlusIcon = ({ size = 22, ...r }: P) => <svg {...base(size, { strokeWidth: 2.4, ...r })}><path d="M12 5v14M5 12h14" /></svg>;
export const ChevronRight = ({ size = 14, ...r }: P) => <svg {...base(size, r)}><path d="M9 6l6 6-6 6" /></svg>;
export const CloudCheckIcon = ({ size = 16, ...r }: P) => (
  <svg {...base(size, r)}><path d="M7 18a5 5 0 1 1 1-9.9A6 6 0 0 1 19 10a4 4 0 0 1-1 8z" /><path d="M10 14l2 2 3-3" /></svg>
);
export const WarnIcon = ({ size = 14, ...r }: P) => (
  <svg {...base(size, { strokeWidth: 2.2, ...r })}><path d="M12 3l9.5 17h-19z" /><path d="M12 10v4M12 17v.5" /></svg>
);
export const InfoIcon = ({ size = 15, ...r }: P) => <svg {...base(size, r)}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8v.5" /></svg>;
export const RestoreIcon = ({ size = 20, ...r }: P) => <svg {...base(size, r)}><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></svg>;
export const FilterIcon = ({ size = 20, ...r }: P) => <svg {...base(size, { strokeWidth: 2.2, ...r })}><path d="M4 6h16M7 12h10M10 18h4" /></svg>;
export const SearchIcon = ({ size = 18, ...r }: P) => <svg {...base(size, r)}><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>;
export const UploadIcon = ({ size = 18, ...r }: P) => (
  <svg {...base(size, r)}><path d="M12 3v12M7 8l5-5 5 5" /><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" /></svg>
);
export const FolderIcon = ({ size = 20, ...r }: P) => <svg {...base(size, r)}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>;
export const PaletteIcon = ({ size = 20, ...r }: P) => (
  <svg {...base(size, r)}><circle cx="12" cy="12" r="9" /><circle cx="8" cy="10" r="1.2" /><circle cx="12" cy="7.5" r="1.2" /><circle cx="16" cy="10" r="1.2" /></svg>
);
export const FileIcon = ({ size = 20, ...r }: P) => <svg {...base(size, r)}><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4" /></svg>;
export const DownloadIcon = ({ size = 16, ...r }: P) => <svg {...base(size, r)}><path d="M12 4v12M7 11l5 5 5-5" /><path d="M5 20h14" /></svg>;

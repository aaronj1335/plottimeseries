import { isLinkData, type LinkData } from '../dataProcessing.ts';
import { cssVar } from '../theme.ts';

export type CellValue = string | Date | LinkData | undefined;

export const EMPTY_VALUE = '-';

const LINK_COLOR = cssVar('link');

export function cellText(val: CellValue): string {
  if (isLinkData(val)) return val.linkText;
  if (val instanceof Date) return val.toISOString();
  return String(val ?? EMPTY_VALUE);
}

export function renderCellValue(val: CellValue) {
  if (isLinkData(val)) {
    return (
      <a
        href={val.url.toString()}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: LINK_COLOR, textDecoration: 'none' }}
        onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
        onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
      >
        {val.linkText}
      </a>
    );
  }
  return cellText(val);
}

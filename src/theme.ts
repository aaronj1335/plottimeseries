export const THEME = {
  ground: '#000000',
  groundAlt: '#0d0d0d',
  panel: '#111111',
  rowHover: '#333333',

  rule: '#333333',
  ruleStrong: '#555555',
  ruleHover: '#888888',

  text: '#ffffff',
  textMuted: 'rgba(255, 255, 255, 0.87)',
  link: '#4da6ff',

  gridInk: '#cfe0f0',

  plotTop: '#1b2029',
  plotMid: '#0b0d11',
  plotBottom: '#000000',
  cursor: '#ffffff',

  accent: '#3b82f6',
  accentHover: '#2563eb',
} as const;

export type ThemeColor = keyof typeof THEME;

export function cssVar(key: ThemeColor): string {
  return `var(--${key.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`)})`;
}

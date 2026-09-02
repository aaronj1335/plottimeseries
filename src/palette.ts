/**
 * Series palette.
 *
 * d3's `schemeCategory10` is tuned for white paper: its darker members (the
 * navy, the brown, the mid grey) sink into a near-black panel and its pastels
 * read as the same washed-out colour once they are 1.5px wide. These twelve are
 * picked for a dark ground instead -- every one lands in a similar lightness
 * band (roughly 65-80% relative luminance in HSL terms) so no series looks
 * louder than its neighbours, while the hues stay far enough apart to survive
 * being a thin line crossing eleven others.
 *
 * Eleven hues is past the point where categorical colour is reliably
 * distinguishable, so two things are done about it. The hues are spread as
 * evenly around the wheel as twelve entries allow, and the order then jumps
 * across the wheel rather than walking around it -- adjacent columns in the
 * legend are the ones a reader compares, so consecutive entries here are never
 * less than about 70 degrees apart. The two closest pairs that remain (amber
 * and orange, sky and blue) sit several positions apart as a result.
 *
 * The twelfth is a near-white rather than a thirteenth hue: past eleven, a
 * neutral separates better than any colour left on the wheel.
 */
export const SERIES_PALETTE = [
  '#38bdf8', // sky
  '#f472b6', // pink
  '#4ade80', // green
  '#fbbf24', // amber
  '#a78bfa', // violet
  '#2dd4bf', // teal
  '#fb923c', // orange
  '#60a5fa', // blue
  '#a3e635', // lime
  '#e879f9', // fuchsia
  '#f87171', // red
  '#e2e8f0', // near-white
] as const;

/** UI accent, matching the `--accent` token in style.css. */
export const ACCENT = '#22d3ee';

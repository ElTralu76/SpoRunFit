/**
 * SpoRunFit — Design tokens partagés
 * Palette "Premium Dark Athletic"
 */

export const C = {
  // ── Fonds ─────────────────────────────────────────────
  bg:      '#07070e',    // fond principal
  surf:    '#0e0e1d',    // surface carte
  surf2:   '#141428',    // surface élevée / modale

  // ── Bordures ──────────────────────────────────────────
  border:  '#1e1e36',
  border2: '#2a2a48',

  // ── Accents ───────────────────────────────────────────
  orange:    '#f26318',
  orangeDim: '#f2631812',
  orangeLow: '#f2631808',
  purple:    '#a78bfa',
  blue:      '#60a5fa',
  green:     '#4ade80',
  red:       '#f87171',
  yellow:    '#facc15',

  // ── Textes ────────────────────────────────────────────
  t1: '#eaeaf6',   // texte principal
  t2: '#7272a0',   // texte secondaire
  t3: '#3d3d5e',   // texte tertiaire / placeholder

  // ── Radius ────────────────────────────────────────────
  r8:  8,
  r12: 12,
  r14: 14,
  r16: 16,
  r20: 20,
} as const;

/** Label de section en petites capitales */
export const sectionLabel = {
  color: '#505070' as string,
  fontSize: 10,
  fontWeight: '700' as const,
  textTransform: 'uppercase' as const,
  letterSpacing: 1.5,
};

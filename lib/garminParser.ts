// ─────────────────────────────────────────────────────────────────────────────
// Parser CSV Garmin Connect — format "Exporter les intervalles au format CSV"
// Gère : séparateur ; ou , (auto-detect), décimales FR (virgule),
//        en-têtes multi-lignes entre guillemets, valeurs "--", ligne Récapitulatif
// ─────────────────────────────────────────────────────────────────────────────

// ── Parser CSV bas niveau (respecte les guillemets avant de splitter les lignes)
function parseRawCSV(text: string, sep: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = '';
  let inQ = false;
  let i = 0;

  while (i < text.length) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i += 2; }
      else if (c === '"') { inQ = false; i++; }
      else { cur += c; i++; }
    } else {
      if (c === '"') { inQ = true; i++; }
      else if (c === sep) { row.push(cur.trim()); cur = ''; i++; }
      else if (c === '\r' || c === '\n') {
        row.push(cur.trim()); cur = '';
        if (row.some(f => f !== '')) rows.push(row);
        row = [];
        if (c === '\r' && text[i + 1] === '\n') i++;
        i++;
      } else { cur += c; i++; }
    }
  }
  if (cur || row.length) {
    row.push(cur.trim());
    if (row.some(f => f !== '')) rows.push(row);
  }
  return rows;
}

// ── Auto-détecte le séparateur ; vs ,
function detectSep(txt: string): string {
  const sample = txt.slice(0, 500);
  const semis = (sample.match(/;/g) || []).length;
  const commas = (sample.match(/,(?!")/g) || []).length;
  return semis > commas ? ';' : ',';
}

// ── Normalise un en-tête (collapse \n internes, lowercase)
function normHeader(h: string): string {
  return h.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

// ── Convertit une valeur FR en nombre (virgule → point, "--" → null)
function toNum(v: string): number | null {
  if (!v || v === '--' || v === '-') return null;
  const n = parseFloat(v.replace(',', '.').replace(/[^\d.\-]/g, ''));
  return isNaN(n) ? null : n;
}

// ── Extrait une valeur depuis une ligne par liste de noms de colonnes possibles
function get(hdrs: string[], row: string[], ...keys: string[]): string {
  for (const key of keys) {
    const idx = hdrs.findIndex(h => h.includes(key.toLowerCase()));
    if (idx !== -1) return row[idx] ?? '';
  }
  return '';
}

// ─────────────────────────────────────────────────────────────────────────────

export type LapData = {
  index: number;
  step_type: string | null;    // null pour auto-laps
  distance_km: number | null;
  pace: string | null;         // "5:32" min/km
  gap: string | null;          // allure corrigée dénivelé
  avg_hr: number | null;
  max_hr: number | null;
  cadence: number | null;
  contact_ms: number | null;
  vertical_osc_cm: number | null;
  vertical_ratio_pct: number | null;
  stride_m: number | null;
  power_w: number | null;
  ascent_m: number | null;
};

export type GarminRunSummary = {
  format: 'autolaps' | 'intervals';
  // Stats globales (ligne Récapitulatif)
  total_distance_km: number | null;
  avg_pace: string | null;
  avg_hr: number | null;
  max_hr: number | null;
  avg_cadence: number | null;
  avg_power_w: number | null;
  total_ascent_m: number | null;
  avg_vertical_ratio: number | null;
  avg_vertical_osc: number | null;
  avg_contact_ms: number | null;
  // Laps détaillés
  laps: LapData[];
  // Pour intervalles : actifs seulement (hors échauff/récup)
  active_laps: LapData[];
};

const EXCLUDE_STEP_KW = [
  'repos', 'récup', 'rest', 'recovery',
  'échauffement', 'warmup', 'warm up', 'warm-up',
  'retour', 'calme', 'cool', 'cooldown',
];

function isExcludedStep(stepType: string): boolean {
  const s = stepType.toLowerCase();
  return EXCLUDE_STEP_KW.some(k => s.includes(k));
}

// ── Formate une allure stockée en secondes/km → "5:32"
function fmtPace(v: string): string | null {
  if (!v || v === '--') return null;
  // Déjà au format "5:32"
  if (/^\d+:\d{2}$/.test(v.trim())) return v.trim();
  // En secondes
  const s = toNum(v);
  if (!s) return null;
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export function parseGarminIntervalCSV(csvText: string): GarminRunSummary | null {
  const sep = detectSep(csvText);
  const allRows = parseRawCSV(csvText, sep);
  if (allRows.length < 2) return null;

  // Normaliser les en-têtes
  const hdrs = allRows[0].map(normHeader);

  const dataRows = allRows.slice(1);

  // Détecter format intervals vs auto-laps
  const hasStepType = hdrs.some(h => /type.*étape|step.?type/i.test(h));

  // Séparer récapitulatif et lignes de laps
  const summaryRow = dataRows.find(r =>
    (r[0] ?? '').toLowerCase().includes('récap') ||
    (r[0] ?? '').toLowerCase().includes('summary') ||
    (r[0] ?? '').toLowerCase() === 'total'
  );
  const lapRows = dataRows.filter(r => r !== summaryRow);

  // Construire les laps
  const g = (row: string[], ...keys: string[]) => get(hdrs, row, ...keys);

  const laps: LapData[] = lapRows.map((row, i) => {
    const stepType = hasStepType ? g(row, "type d'étape", 'step type') || null : null;
    return {
      index: i + 1,
      step_type: stepType,
      distance_km: toNum(g(row, 'distance')),
      pace: fmtPace(g(row, 'allure moyenne', 'avg pace', 'pace moyenne')),
      gap: fmtPace(g(row, 'gap moyenne', 'gap')),
      avg_hr: toNum(g(row, 'fréquence cardiaque moyenne', 'avg hr', 'fc moy')),
      max_hr: toNum(g(row, 'fréquence cardiaque maximale', 'max hr', 'fc max')),
      cadence: toNum(g(row, 'cadence de course moyenne', 'avg run cadence', 'cadence')),
      contact_ms: toNum(g(row, 'temps de contact', 'ground contact', 'contact sol')),
      vertical_osc_cm: toNum(g(row, 'oscillation verticale', 'vertical oscillation')),
      vertical_ratio_pct: toNum(g(row, 'rapport vertical', 'vertical ratio')),
      stride_m: toNum(g(row, 'longueur moyenne des foulées', 'avg stride', 'foulée')),
      power_w: toNum(g(row, 'puissance moyenne', 'avg power')),
      ascent_m: toNum(g(row, 'ascension totale', 'total ascent')),
    };
  });

  const active_laps = hasStepType
    ? laps.filter(l => !l.step_type || !isExcludedStep(l.step_type))
    : laps;

  // Stats globales depuis le récapitulatif (ou calculées)
  const src = summaryRow ?? (lapRows.length ? lapRows[lapRows.length - 1] : null);
  const gs = (row: string[], ...keys: string[]) => row ? get(hdrs, row, ...keys) : '';

  return {
    format: hasStepType ? 'intervals' : 'autolaps',
    total_distance_km: src ? toNum(gs(src, 'distance')) : null,
    avg_pace: src ? fmtPace(gs(src, 'allure moyenne', 'avg pace')) : null,
    avg_hr: src ? toNum(gs(src, 'fréquence cardiaque moyenne', 'avg hr')) : null,
    max_hr: src ? toNum(gs(src, 'fréquence cardiaque maximale', 'max hr')) : null,
    avg_cadence: src ? toNum(gs(src, 'cadence de course moyenne', 'avg run cadence')) : null,
    avg_power_w: src ? toNum(gs(src, 'puissance moyenne', 'avg power')) : null,
    total_ascent_m: src ? toNum(gs(src, 'ascension totale', 'total ascent')) : null,
    avg_vertical_ratio: src ? toNum(gs(src, 'rapport vertical', 'vertical ratio')) : null,
    avg_vertical_osc: src ? toNum(gs(src, 'oscillation verticale', 'vertical oscillation')) : null,
    avg_contact_ms: src ? toNum(gs(src, 'temps de contact', 'ground contact')) : null,
    laps,
    active_laps,
  };
}

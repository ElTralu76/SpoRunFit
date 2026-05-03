/**
 * prDetection.ts
 * Détecte automatiquement les nouveaux records personnels après une séance.
 */

import { supabase } from './supabase';

export type PRCandidate = {
  category: 'strength' | 'run' | 'crossfit';
  movement: string;          // ex: "Back Squat", "5K", "Fran"
  value: number;             // valeur numérique (kg, secondes, rounds…)
  unit: string;              // "kg", "s", "rounds", "reps"
  previous_value: number | null;
  session_id: string;
  date: string;
};

// ─── Renfo : détecte les PRs de charge ──────────────────────
export async function detectRenfoPRs(
  userId: string,
  sessionId: string,
  sessionDate: string,
  movements: Array<{ name: string; weight: number | null; reps: number | null }>
): Promise<PRCandidate[]> {
  const candidates: PRCandidate[] = [];

  for (const mov of movements) {
    if (!mov.name || !mov.weight || mov.weight <= 0) continue;

    // Cherche le PR existant pour ce mouvement
    const { data: existing } = await supabase
      .from('personal_records')
      .select('value')
      .eq('user_id', userId)
      .eq('movement', mov.name)
      .eq('category', 'strength')
      .order('value', { ascending: false })
      .limit(1)
      .maybeSingle();

    const prevValue = existing?.value ?? null;

    if (prevValue === null || mov.weight > prevValue) {
      candidates.push({
        category: 'strength',
        movement: mov.name,
        value: mov.weight,
        unit: 'kg',
        previous_value: prevValue,
        session_id: sessionId,
        date: sessionDate,
      });
    }
  }

  return candidates;
}

// PRs sur distances fixes : distance minimale requise + distance extrapolée
const SPLIT_PRS: Array<{ movement: string; distKm: number; minDistKm: number }> = [
  { movement: 'Meilleur mile',          distKm: 1.609,  minDistKm: 1.5  },
  { movement: 'Meilleur 5K',            distKm: 5,      minDistKm: 5    },
  { movement: 'Meilleur 10K',           distKm: 10,     minDistKm: 10   },
  { movement: 'Meilleur semi-marathon', distKm: 21.097, minDistKm: 21   },
  { movement: 'Meilleur marathon',      distKm: 42.195, minDistKm: 42   },
];

// ─── Run : détecte les PRs de distance/allure ───────────────
export async function detectRunPRs(
  userId: string,
  sessionId: string,
  sessionDate: string,
  data: { distance?: number | null; pace?: string | null },
  durationMin?: number | null,
): Promise<PRCandidate[]> {
  const candidates: PRCandidate[] = [];

  // ── 1. Durée maximale ──────────────────────────────────────
  if (durationMin && durationMin > 0) {
    const { data: existingDur } = await supabase
      .from('personal_records')
      .select('value')
      .eq('user_id', userId)
      .eq('category', 'run')
      .eq('movement', 'Course la plus longue (durée)')
      .order('value', { ascending: false })
      .limit(1)
      .maybeSingle();

    const prevDur = existingDur?.value ?? null;
    if (prevDur === null || durationMin > prevDur) {
      candidates.push({
        category: 'run',
        movement: 'Course la plus longue (durée)',
        value: durationMin,
        unit: 'min',
        previous_value: prevDur,
        session_id: sessionId,
        date: sessionDate,
      });
    }
  }

  if (!data.distance || data.distance <= 0) return candidates;

  // ── 2. Distance maximale ───────────────────────────────────
  const { data: existingDist } = await supabase
    .from('personal_records')
    .select('value')
    .eq('user_id', userId)
    .eq('category', 'run')
    .eq('movement', 'Course la plus longue (distance)')
    .order('value', { ascending: false })
    .limit(1)
    .maybeSingle();

  const prevDist = existingDist?.value ?? null;
  if (prevDist === null || data.distance > prevDist) {
    candidates.push({
      category: 'run',
      movement: 'Course la plus longue (distance)',
      value: data.distance,
      unit: 'km',
      previous_value: prevDist,
      session_id: sessionId,
      date: sessionDate,
    });
  }

  // ── 3. Allure + splits fixes ───────────────────────────────
  if (data.pace) {
    const paceSeconds = parsePaceToSeconds(data.pace);
    if (paceSeconds > 0) {

      // Allure 1km
      const { data: existingPace } = await supabase
        .from('personal_records')
        .select('value')
        .eq('user_id', userId)
        .eq('category', 'run')
        .eq('movement', 'Km le plus rapide')
        .order('value', { ascending: true })
        .limit(1)
        .maybeSingle();

      const prevPace = existingPace?.value ?? null;
      if (prevPace === null || paceSeconds < prevPace) {
        candidates.push({
          category: 'run',
          movement: 'Km le plus rapide',
          value: paceSeconds,
          unit: 's/km',
          previous_value: prevPace,
          session_id: sessionId,
          date: sessionDate,
        });
      }

      // Mile, 5K, 10K, semi, marathon — seulement si distance suffisante
      for (const pr of SPLIT_PRS) {
        if (data.distance < pr.minDistKm) continue;

        const splitTime = Math.round(paceSeconds * pr.distKm);

        const { data: existing } = await supabase
          .from('personal_records')
          .select('value')
          .eq('user_id', userId)
          .eq('category', 'run')
          .eq('movement', pr.movement)
          .order('value', { ascending: true }) // plus petit = plus rapide
          .limit(1)
          .maybeSingle();

        const prev = existing?.value ?? null;
        if (prev === null || splitTime < prev) {
          candidates.push({
            category: 'run',
            movement: pr.movement,
            value: splitTime,
            unit: 's',
            previous_value: prev,
            session_id: sessionId,
            date: sessionDate,
          });
        }
      }
    }
  }

  return candidates;
}

// ─── CrossFit benchmark : détecte le meilleur score ─────────
export async function detectCrossfitPR(
  userId: string,
  sessionId: string,
  sessionDate: string,
  wodName: string,
  scoreRaw: string
): Promise<PRCandidate | null> {
  if (!wodName || !scoreRaw) return null;

  // Essaie de convertir le score en secondes (format mm:ss ou hh:mm:ss)
  const scoreSeconds = parseTimeToSeconds(scoreRaw);
  if (scoreSeconds === null) return null;

  const { data: existing } = await supabase
    .from('personal_records')
    .select('value')
    .eq('user_id', userId)
    .eq('category', 'crossfit')
    .eq('movement', wodName)
    .order('value', { ascending: true })  // plus petit = plus rapide
    .limit(1)
    .maybeSingle();

  const prevValue = existing?.value ?? null;

  if (prevValue === null || scoreSeconds < prevValue) {
    return {
      category: 'crossfit',
      movement: wodName,
      value: scoreSeconds,
      unit: 's',
      previous_value: prevValue,
      session_id: sessionId,
      date: sessionDate,
    };
  }

  return null;
}

// ─── Sauvegarde les PRs confirmés en base ───────────────────
export async function savePRs(
  userId: string,
  prs: PRCandidate[]
): Promise<void> {
  if (prs.length === 0) return;

  const rows = prs.map(pr => ({
    user_id: userId,
    category: pr.category,
    movement: pr.movement,
    value: pr.value,
    unit: pr.unit,
    session_id: pr.session_id,
    date: pr.date,
  }));

  await supabase.from('personal_records').insert(rows);
}

// ─── Utilitaires ─────────────────────────────────────────────

/** "5:30" → 330 (secondes par km) */
export function parsePaceToSeconds(pace: string): number {
  const match = pace.match(/^(\d+):(\d{2})$/);
  if (!match) return 0;
  return parseInt(match[1]) * 60 + parseInt(match[2]);
}

/** "2:59" ou "1:02:30" → secondes. null si non parseable */
export function parseTimeToSeconds(time: string): number | null {
  const parts = time.trim().split(':').map(Number);
  if (parts.some(isNaN)) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

/** secondes → "mm:ss" */
export function secondsToTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

/** secondes → "hh:mm:ss" si ≥ 1h */
export function secondsToPace(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')} /km`;
}

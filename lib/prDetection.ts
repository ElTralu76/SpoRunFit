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

// ─── Run : détecte les PRs de distance/allure ───────────────
export async function detectRunPRs(
  userId: string,
  sessionId: string,
  sessionDate: string,
  data: { distance?: number | null; pace?: string | null }
): Promise<PRCandidate[]> {
  const candidates: PRCandidate[] = [];

  if (!data.distance || data.distance <= 0) return candidates;

  // PR de distance (distance maximale)
  const { data: existingDist } = await supabase
    .from('personal_records')
    .select('value')
    .eq('user_id', userId)
    .eq('category', 'run')
    .eq('movement', 'Distance max')
    .order('value', { ascending: false })
    .limit(1)
    .maybeSingle();

  const prevDist = existingDist?.value ?? null;
  if (prevDist === null || data.distance > prevDist) {
    candidates.push({
      category: 'run',
      movement: 'Distance max',
      value: data.distance,
      unit: 'km',
      previous_value: prevDist,
      session_id: sessionId,
      date: sessionDate,
    });
  }

  // PR allure (allure la plus rapide = valeur min en s/km)
  if (data.pace) {
    const paceSeconds = parsePaceToSeconds(data.pace);
    if (paceSeconds > 0) {
      const { data: existingPace } = await supabase
        .from('personal_records')
        .select('value')
        .eq('user_id', userId)
        .eq('category', 'run')
        .eq('movement', 'Allure 1km')
        .order('value', { ascending: true })  // ascendant = valeur la plus petite = plus rapide
        .limit(1)
        .maybeSingle();

      const prevPace = existingPace?.value ?? null;
      if (prevPace === null || paceSeconds < prevPace) {
        candidates.push({
          category: 'run',
          movement: 'Allure 1km',
          value: paceSeconds,
          unit: 's/km',
          previous_value: prevPace,
          session_id: sessionId,
          date: sessionDate,
        });
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

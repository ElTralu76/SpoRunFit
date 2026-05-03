import { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { parseGarminIntervalCSV, GarminRunSummary } from '../lib/garminParser';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { detectRunPRs, savePRs } from '../lib/prDetection';

type Step = 'pick' | 'date' | 'preview' | 'importing' | 'done';

/** "5:30" → 5.5 (minutes décimales) */
function parsePaceToMin(pace: string): number {
  const m = pace.match(/^(\d+):(\d{2})$/);
  if (!m) return 0;
  return parseInt(m[1]) + parseInt(m[2]) / 60;
}

export default function ImportCSVScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const { mode, sessionId } = useLocalSearchParams<{ mode?: string; sessionId?: string }>();
  const isUpdateMode = mode === 'update' && !!sessionId;

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [step, setStep] = useState<Step>('pick');
  const [parsed, setParsed] = useState<GarminRunSummary | null>(null);
  const [fileName, setFileName] = useState('');
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [visibility, setVisibility] = useState<'private' | 'friends' | 'public'>('friends');
  const [error, setError] = useState('');

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const result = parseGarminIntervalCSV(text);
      if (!result || result.laps.length === 0) {
        setError('Fichier non reconnu. Assure-toi d\'exporter via Activité → ⋯ → "Exporter les intervalles au format CSV".');
        return;
      }
      setError('');
      setParsed(result);
      setStep('preview');
    };
    reader.readAsText(file, 'UTF-8');
  }

  async function handleImport() {
    if (!session?.user) {
      setError('Tu dois être connecté pour enregistrer une séance.');
      return;
    }
    if (!parsed) return;
    setStep('importing');

    const data = {
      distance: parsed.total_distance_km,
      pace: parsed.avg_pace,
      elevation: parsed.total_ascent_m,
      avg_hr: parsed.avg_hr,
      max_hr: parsed.max_hr,
      avg_cadence: parsed.avg_cadence,
      avg_power_w: parsed.avg_power_w,
      avg_vertical_ratio: parsed.avg_vertical_ratio,
      avg_vertical_osc: parsed.avg_vertical_osc,
      avg_contact_ms: parsed.avg_contact_ms,
      format: parsed.format,
      laps: parsed.laps,
    };

    let dbError: any = null;

    if (isUpdateMode) {
      // Mode mise à jour d'une séance planifiée existante
      const { error } = await supabase
        .from('sessions')
        .update({
          date: sessionDate,
          status: 'completed',
          source: 'manual',
          visibility,
          data,
        })
        .eq('id', sessionId)
        .eq('user_id', session.user.id);
      dbError = error;
    } else {
      // Mode création classique
      const { error } = await supabase.from('sessions').insert({
        user_id: session.user.id,
        date: sessionDate,
        type: 'run',
        source: 'manual',
        status: 'completed',
        visibility,
        notes: fileName.replace('.csv', ''),
        data,
      });
      dbError = error;
    }

    if (dbError) {
      console.error('Supabase error:', dbError);
      setError(`Erreur : ${dbError.message} (code ${dbError.code})`);
      setStep('preview');
    } else {
      // ── Détection automatique des PRs run ──────────────────
      try {
        // Récupère l'ID de la séance (update ou insert)
        let finalSessionId = sessionId ?? null;
        if (!isUpdateMode) {
          const { data: inserted } = await supabase
            .from('sessions')
            .select('id')
            .eq('user_id', session.user.id)
            .eq('date', sessionDate)
            .eq('type', 'run')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          finalSessionId = inserted?.id ?? null;
        }
        if (finalSessionId) {
          const durationMin = parsed.total_distance_km && parsed.avg_pace
            ? Math.round(parsePaceToMin(parsed.avg_pace) * parsed.total_distance_km)
            : null;
          const prs = await detectRunPRs(
            session.user.id, finalSessionId, sessionDate,
            { distance: parsed.total_distance_km, pace: parsed.avg_pace },
            durationMin,
          );
          await savePRs(session.user.id, prs);
        }
      } catch (_) { /* non bloquant */ }
      setStep('done');
    }
  }

  // ─── PICK FILE ──────────────────────────────────────────
  if (step === 'pick') {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.header}>
          {isUpdateMode ? '📂 Compléter la séance' : 'Import CSV Garmin'}
        </Text>
        {isUpdateMode && (
          <View style={styles.updateBanner}>
            <Text style={styles.updateBannerText}>
              ✅ Les données GPS remplaceront la séance planifiée et la marqueront comme terminée.
            </Text>
          </View>
        )}

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Comment exporter</Text>
          <Text style={styles.infoStep}>1. Ouvre l'activité dans Garmin Connect</Text>
          <Text style={styles.infoStep}>2. Menu ⋯ → <Text style={styles.orange}>"Exporter les intervalles au format CSV"</Text></Text>
          <Text style={styles.infoStep}>3. Sélectionne le fichier ci-dessous</Text>
          <Text style={styles.infoNote}>
            ⚡ 1 fichier = 1 séance. Distance, allure, FC, cadence, biomécanique — tout est importé.
          </Text>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {Platform.OS === 'web' ? (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <TouchableOpacity style={styles.pickBtn} onPress={() => fileInputRef.current?.click()}>
              <Text style={styles.pickBtnText}>📂 Choisir un fichier CSV</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={styles.infoNote}>Import CSV disponible sur web uniquement.</Text>
        )}
      </View>
    );
  }

  // ─── PREVIEW ────────────────────────────────────────────
  if (step === 'preview' && parsed) {
    const lapsToShow = parsed.format === 'intervals' ? parsed.active_laps : parsed.laps;

    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setStep('pick')}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.header}>Vérification</Text>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
          {/* Format badge */}
          <View style={styles.formatBadge}>
            <Text style={styles.formatText}>
              {parsed.format === 'intervals' ? '⚡ Séance structurée' : '🔄 Auto-laps (km par km)'}
            </Text>
            <Text style={styles.formatSub}>
              {lapsToShow.length} {parsed.format === 'intervals' ? 'intervalles actifs' : 'km'}
              {parsed.total_distance_km ? ` · ${parsed.total_distance_km.toFixed(2)} km` : ''}
            </Text>
          </View>

          {/* Stats globales */}
          <View style={styles.statsGrid}>
            {parsed.total_distance_km && <StatChip label="Distance" value={`${parsed.total_distance_km.toFixed(2)} km`} />}
            {parsed.avg_pace && <StatChip label="Allure moy." value={`${parsed.avg_pace}/km`} />}
            {parsed.avg_hr && <StatChip label="FC moy." value={`${parsed.avg_hr} bpm`} />}
            {parsed.avg_cadence && <StatChip label="Cadence" value={`${parsed.avg_cadence} spm`} />}
            {parsed.avg_power_w && <StatChip label="Puissance" value={`${parsed.avg_power_w} W`} />}
            {parsed.total_ascent_m && <StatChip label="D+" value={`${parsed.total_ascent_m} m`} />}
            {parsed.avg_vertical_ratio && <StatChip label="Rapport vert." value={`${parsed.avg_vertical_ratio}%`} accent={parsed.avg_vertical_ratio > 9.5} />}
            {parsed.avg_contact_ms && <StatChip label="Contact sol" value={`${parsed.avg_contact_ms} ms`} accent={parsed.avg_contact_ms > 260} />}
          </View>

          {/* Date et visibilité */}
          <Text style={styles.sectionLabel}>Date de la séance</Text>
          {Platform.OS === 'web' && (
            <input
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              style={{
                backgroundColor: '#1c1c1c', border: '1px solid #2a2a2a',
                borderRadius: 10, padding: '12px 14px', color: '#fff',
                fontSize: 15, width: '100%', boxSizing: 'border-box', marginBottom: 16,
              } as React.CSSProperties}
            />
          )}

          <Text style={styles.sectionLabel}>Visibilité</Text>
          <View style={styles.visRow}>
            {(['private', 'friends', 'public'] as const).map((v) => (
              <TouchableOpacity
                key={v}
                style={[styles.visBtn, visibility === v && styles.visBtnActive]}
                onPress={() => setVisibility(v)}
              >
                <Text style={[styles.visBtnText, visibility === v && styles.visBtnTextActive]}>
                  {v === 'private' ? '🔒 Privé' : v === 'friends' ? '👥 Amis' : '🌍 Public'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tableau des laps */}
          <Text style={styles.sectionLabel}>
            {parsed.format === 'intervals' ? 'Intervalles actifs' : 'Kilomètres'}
          </Text>
          <View style={styles.lapTable}>
            <View style={[styles.lapRow, styles.lapHeader]}>
              <Text style={[styles.lapCell, styles.lapCellNum, styles.lapHeaderText]}>#</Text>
              <Text style={[styles.lapCell, styles.lapCellDist, styles.lapHeaderText]}>Dist.</Text>
              <Text style={[styles.lapCell, styles.lapCellPace, styles.lapHeaderText]}>Allure</Text>
              <Text style={[styles.lapCell, styles.lapCellHr, styles.lapHeaderText]}>FC</Text>
              <Text style={[styles.lapCell, styles.lapCellCad, styles.lapHeaderText]}>Cad.</Text>
            </View>
            {lapsToShow.map((lap) => (
              <View key={lap.index} style={styles.lapRow}>
                <Text style={[styles.lapCell, styles.lapCellNum, styles.lapText]}>
                  {lap.step_type ? lap.step_type.slice(0, 6) : lap.index}
                </Text>
                <Text style={[styles.lapCell, styles.lapCellDist, styles.lapText]}>
                  {lap.distance_km != null ? `${lap.distance_km.toFixed(2)}` : '—'}
                </Text>
                <Text style={[styles.lapCell, styles.lapCellPace, styles.lapText, { color: '#e85d04' }]}>
                  {lap.pace ?? '—'}
                </Text>
                <Text style={[styles.lapCell, styles.lapCellHr, styles.lapText]}>
                  {lap.avg_hr ?? '—'}
                </Text>
                <Text style={[styles.lapCell, styles.lapCellCad, styles.lapText]}>
                  {lap.cadence ?? '—'}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>

        {error ? <Text style={[styles.errorText, { marginBottom: 8 }]}>{error}</Text> : null}

        <View style={styles.footer}>
          <TouchableOpacity style={styles.importBtn} onPress={handleImport}>
            <Text style={styles.importBtnText}>
              {isUpdateMode ? '✅ Mettre à jour la séance planifiée' : '✅ Enregistrer cette séance'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── IMPORTING ──────────────────────────────────────────
  if (step === 'importing') {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color="#e85d04" size="large" />
        <Text style={styles.loadingText}>Enregistrement…</Text>
      </View>
    );
  }

  // ─── DONE ───────────────────────────────────────────────
  return (
    <View style={[styles.container, styles.centered]}>
      <Text style={{ fontSize: 52 }}>✅</Text>
      <Text style={styles.doneTitle}>
        {isUpdateMode ? 'Séance mise à jour !' : 'Séance enregistrée !'}
      </Text>
      <Text style={styles.doneSub}>
        {isUpdateMode
          ? 'La séance planifiée est maintenant marquée comme terminée.'
          : 'Elle apparaît dans ton journal.'}
      </Text>
      <TouchableOpacity style={styles.importBtn} onPress={() => router.replace('/(tabs)')}>
        <Text style={styles.importBtnText}>Voir mon journal</Text>
      </TouchableOpacity>
    </View>
  );
}

function StatChip({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={statStyles.chip}>
      <Text style={statStyles.label}>{label}</Text>
      <Text style={[statStyles.value, accent && statStyles.accent]}>{value}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  chip: {
    backgroundColor: '#1c1c1c', borderRadius: 10, padding: 10,
    width: '48%', borderWidth: 1, borderColor: '#2a2a2a', gap: 2,
  },
  label: { color: '#777', fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  value: { color: '#fff', fontSize: 15, fontWeight: '700' },
  accent: { color: '#f87171' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f', paddingTop: 60, paddingHorizontal: 16 },
  centered: { justifyContent: 'center', alignItems: 'center', gap: 16 },
  backBtn: { marginBottom: 8 },
  backText: { color: '#e85d04', fontSize: 15 },
  header: { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 20 },

  updateBanner: {
    backgroundColor: '#1a2a1a', borderRadius: 10,
    borderWidth: 1, borderColor: '#2a4a2a',
    padding: 12, marginBottom: 16,
  },
  updateBannerText: { color: '#4ade80', fontSize: 13, lineHeight: 18 },

  infoCard: {
    backgroundColor: '#1c1c1c', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#2a2a2a', gap: 6, marginBottom: 24,
  },
  infoTitle: { color: '#fff', fontWeight: '700', fontSize: 14, marginBottom: 4 },
  infoStep: { color: '#aaa', fontSize: 13 },
  infoNote: { color: '#e85d04', fontSize: 12, marginTop: 6 },
  orange: { color: '#e85d04', fontWeight: '600' },

  pickBtn: {
    backgroundColor: '#e85d04', borderRadius: 12,
    paddingVertical: 16, alignItems: 'center',
  },
  pickBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  errorText: { color: '#f87171', fontSize: 13, textAlign: 'center', marginTop: 8 },

  formatBadge: {
    backgroundColor: '#1c1c2e', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#3a3a6a', marginBottom: 16, gap: 4,
  },
  formatText: { color: '#a0a0ff', fontWeight: '700', fontSize: 14 },
  formatSub: { color: '#666', fontSize: 12 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },

  sectionLabel: {
    color: '#666', fontSize: 11, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
  },
  visRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  visBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 8,
    backgroundColor: '#1c1c1c', borderWidth: 1, borderColor: '#2a2a2a', alignItems: 'center',
  },
  visBtnActive: { backgroundColor: '#2a1500', borderColor: '#e85d04' },
  visBtnText: { color: '#666', fontSize: 12, fontWeight: '600' },
  visBtnTextActive: { color: '#e85d04' },

  lapTable: { backgroundColor: '#1c1c1c', borderRadius: 12, overflow: 'hidden', marginBottom: 20 },
  lapRow: { flexDirection: 'row', paddingVertical: 9, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#222' },
  lapHeader: { backgroundColor: '#161616' },
  lapHeaderText: { color: '#555', fontWeight: '700', fontSize: 11, textTransform: 'uppercase' },
  lapCell: { fontSize: 13 },
  lapCellNum: { width: 48 },
  lapCellDist: { width: 52 },
  lapCellPace: { flex: 1 },
  lapCellHr: { width: 44 },
  lapCellCad: { width: 44 },
  lapText: { color: '#ccc' },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, backgroundColor: '#0f0f0f',
    borderTopWidth: 1, borderTopColor: '#1c1c1c',
  },
  importBtn: {
    backgroundColor: '#e85d04', borderRadius: 12,
    paddingVertical: 16, alignItems: 'center',
  },
  importBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  loadingText: { color: '#aaa', fontSize: 16 },
  doneTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  doneSub: { color: '#aaa', fontSize: 14 },
});

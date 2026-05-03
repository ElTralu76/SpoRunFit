import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { secondsToTime, secondsToPace } from '../../lib/prDetection';

// ─── Types ────────────────────────────────────────────────

type SessionFull = {
  id: string;
  date: string;
  type: 'run' | 'crossfit' | 'renfo' | 'autre';
  status: 'planned' | 'completed' | 'skipped';
  source: string | null;
  visibility: string;
  duration: number | null;
  notes: string | null;
  data: Record<string, any> | null;
};

// ─── Helpers ──────────────────────────────────────────────

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function formatDuration(minutes: number | null) {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${m} min`;
}

// ─── Mini composants ──────────────────────────────────────

function StatRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={statStyles.row}>
      <Text style={statStyles.label}>{label}</Text>
      <Text style={[statStyles.value, accent && statStyles.accent]}>{value}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={sectionStyles.container}>
      <Text style={sectionStyles.title}>{title}</Text>
      {children}
    </View>
  );
}

// ─── Vues par sport ───────────────────────────────────────

function RunDetail({ data, source }: { data: Record<string, any>; source: string | null }) {
  const isGarmin = source === 'manual' && data.laps;  // import CSV
  const laps = data.laps as any[] | undefined;
  const activeLaps = data.active_laps as any[] | undefined;
  const displayLaps = activeLaps?.length ? activeLaps : laps;

  return (
    <>
      <Section title="Statistiques">
        {data.distance && <StatRow label="Distance" value={`${Number(data.distance).toFixed(2)} km`} />}
        {data.pace && <StatRow label="Allure moy." value={`${data.pace} /km`} accent />}
        {data.avg_hr && <StatRow label="FC moyenne" value={`${data.avg_hr} bpm`} />}
        {data.max_hr && <StatRow label="FC max" value={`${data.max_hr} bpm`} />}
        {data.avg_cadence && <StatRow label="Cadence" value={`${data.avg_cadence} spm`} />}
        {data.avg_power_w && <StatRow label="Puissance" value={`${data.avg_power_w} W`} />}
        {data.elevation && <StatRow label="D+" value={`${data.elevation} m`} />}
        {data.total_ascent_m && <StatRow label="D+" value={`${data.total_ascent_m} m`} />}
      </Section>

      {data.avg_vertical_ratio || data.avg_contact_ms || data.avg_vertical_osc ? (
        <Section title="Biomécanique">
          {data.avg_vertical_ratio && (
            <StatRow
              label="Rapport vertical"
              value={`${data.avg_vertical_ratio}%`}
              accent={data.avg_vertical_ratio > 9.5}
            />
          )}
          {data.avg_vertical_osc && (
            <StatRow label="Oscillation vert." value={`${data.avg_vertical_osc} cm`} />
          )}
          {data.avg_contact_ms && (
            <StatRow
              label="Contact sol"
              value={`${data.avg_contact_ms} ms`}
              accent={data.avg_contact_ms > 260}
            />
          )}
        </Section>
      ) : null}

      {displayLaps && displayLaps.length > 0 && (
        <Section title={activeLaps?.length ? 'Intervalles actifs' : 'Kilomètres'}>
          <View style={tableStyles.container}>
            {/* Header */}
            <View style={[tableStyles.row, tableStyles.header]}>
              <Text style={[tableStyles.cell, tableStyles.cellNum, tableStyles.headerText]}>#</Text>
              <Text style={[tableStyles.cell, tableStyles.cellDist, tableStyles.headerText]}>Dist.</Text>
              <Text style={[tableStyles.cell, tableStyles.cellPace, tableStyles.headerText]}>Allure</Text>
              <Text style={[tableStyles.cell, tableStyles.cellHr, tableStyles.headerText]}>FC</Text>
              <Text style={[tableStyles.cell, tableStyles.cellCad, tableStyles.headerText]}>Cad.</Text>
            </View>
            {displayLaps.map((lap: any, i: number) => (
              <View key={i} style={tableStyles.row}>
                <Text style={[tableStyles.cell, tableStyles.cellNum, tableStyles.text]}>
                  {lap.step_type ? lap.step_type.slice(0, 6) : lap.index ?? i + 1}
                </Text>
                <Text style={[tableStyles.cell, tableStyles.cellDist, tableStyles.text]}>
                  {lap.distance_km != null ? `${Number(lap.distance_km).toFixed(2)}` : '—'}
                </Text>
                <Text style={[tableStyles.cell, tableStyles.cellPace, tableStyles.text, { color: '#e85d04' }]}>
                  {lap.pace ?? '—'}
                </Text>
                <Text style={[tableStyles.cell, tableStyles.cellHr, tableStyles.text]}>
                  {lap.avg_hr ?? '—'}
                </Text>
                <Text style={[tableStyles.cell, tableStyles.cellCad, tableStyles.text]}>
                  {lap.cadence ?? '—'}
                </Text>
              </View>
            ))}
          </View>
        </Section>
      )}
    </>
  );
}

function CrossfitDetail({ data }: { data: Record<string, any> }) {
  const isCustom = data.mode === 'custom';
  const isRx = data.rx === true;

  return (
    <>
      <Section title="WOD">
        <StatRow
          label="Mode"
          value={isCustom ? 'Personnalisé ⚙️' : 'Benchmark 🏆'}
        />
        {data.wod_name && <StatRow label="WOD" value={data.wod_name} accent />}
        {data.score && <StatRow label="Score" value={data.score} accent />}
        <StatRow label="Performance" value={isRx ? 'RX ✅' : 'Scaled'} />
      </Section>

      {isCustom && data.blocks && data.blocks.length > 0 && (
        <Section title="Blocs">
          {(data.blocks as any[]).map((block: any, i: number) => (
            <BlockCard key={i} block={block} />
          ))}
        </Section>
      )}
    </>
  );
}

const FORMAT_ACCENT: Record<string, string> = {
  'AMRAP':    '#60a5fa',
  'FOR TIME': '#e85d04',
  'EMOM':     '#a78bfa',
  'DEATH BY': '#f87171',
  'REST':     '#555',
};
const FORMAT_BG: Record<string, string> = {
  'AMRAP':    '#1a2a4a',
  'FOR TIME': '#2a1500',
  'EMOM':     '#1a1a3a',
  'DEATH BY': '#2a1a1a',
  'REST':     '#1a1a1a',
};

function BlockCard({ block }: { block: any }) {
  const accent = FORMAT_ACCENT[block.format] ?? '#888';
  const bg = FORMAT_BG[block.format] ?? '#1c1c1c';

  let param = '';
  if (block.format === 'AMRAP' || block.format === 'REST') param = block.duration_min ? `${block.duration_min} min` : '';
  if (block.format === 'FOR TIME') {
    const parts = [block.rounds && `${block.rounds} rounds`, block.time_cap_min && `cap ${block.time_cap_min} min`].filter(Boolean);
    param = parts.join(' · ');
  }
  if (block.format === 'EMOM') param = block.duration_min ? `${block.duration_min} min / ${block.every_min} min` : '';
  if (block.format === 'DEATH BY') param = block.death_by_score ? `Score : ${block.death_by_score}` : '';

  return (
    <View style={[blockStyles.card, { borderColor: accent, backgroundColor: bg }]}>
      <View style={blockStyles.header}>
        <Text style={[blockStyles.format, { color: accent }]}>{block.format}</Text>
        {param ? <Text style={blockStyles.param}>{param}</Text> : null}
      </View>
      {block.movements?.map((mov: any, i: number) => (
        <View key={i} style={blockStyles.movRow}>
          <Text style={blockStyles.movName}>{mov.name || '—'}</Text>
          <Text style={blockStyles.movMeta}>
            {[mov.reps && `${mov.reps} reps`, mov.weight_kg && `${mov.weight_kg} kg`]
              .filter(Boolean).join(' · ')}
          </Text>
        </View>
      ))}
    </View>
  );
}

function RenfoDetail({ data }: { data: Record<string, any> }) {
  const movements = data.movements as any[] | undefined;
  if (!movements?.length) return null;

  return (
    <Section title="Mouvements">
      {movements.map((m: any, i: number) => (
        <View key={i} style={renfoStyles.card}>
          <Text style={renfoStyles.name}>{m.name}</Text>
          <View style={renfoStyles.row}>
            {m.sets && <Chip label="Séries" value={String(m.sets)} />}
            {m.reps && <Chip label="Reps" value={String(m.reps)} />}
            {m.weight && <Chip label="Charge" value={`${m.weight} kg`} accent />}
            {m.rpe && <Chip label="RPE" value={String(m.rpe)} />}
          </View>
        </View>
      ))}
    </Section>
  );
}

function Chip({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={chipStyles.chip}>
      <Text style={chipStyles.label}>{label}</Text>
      <Text style={[chipStyles.value, accent && chipStyles.accent]}>{value}</Text>
    </View>
  );
}

// ─── Écran principal ──────────────────────────────────────

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<SessionFull | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    supabase
      .from('sessions')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        setSession(data);
        setLoading(false);
      });
  }, [id]);

  const TYPE_ICON: Record<string, string> = {
    run: '🏃', crossfit: '🔥', renfo: '🏋️', autre: '💪',
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color="#e85d04" size="large" />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={{ color: '#aaa', fontSize: 16 }}>Séance introuvable.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: '#e85d04' }}>← Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const data = session.data ?? {};
  const isPlannedRun = session.type === 'run' && session.status === 'planned';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Back */}
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backText}>← Journal</Text>
      </TouchableOpacity>

      {/* Header */}
      <View style={styles.headerBlock}>
        <Text style={styles.typeIcon}>{TYPE_ICON[session.type] ?? '💪'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.typeLabel}>
            {{ run: 'Run / Cardio', crossfit: 'CrossFit', renfo: 'Renfo', autre: 'Autre' }[session.type] ?? session.type}
          </Text>
          <Text style={styles.dateLabel}>{formatDate(session.date)}</Text>
        </View>
        <View style={[styles.statusBadge, session.status === 'completed' ? styles.statusDone : styles.statusPlanned]}>
          <Text style={[styles.statusText, session.status === 'completed' ? styles.statusDoneText : styles.statusPlannedText]}>
            {session.status === 'completed' ? 'Terminée' : session.status === 'planned' ? 'Planifiée' : 'Passée'}
          </Text>
        </View>
      </View>

      {/* Durée + visibilité */}
      {(session.duration || session.visibility) && (
        <View style={styles.metaRow}>
          {session.duration && (
            <View style={styles.metaChip}>
              <Text style={styles.metaChipText}>⏱ {formatDuration(session.duration)}</Text>
            </View>
          )}
          {session.visibility && (
            <View style={styles.metaChip}>
              <Text style={styles.metaChipText}>
                {session.visibility === 'private' ? '🔒 Privé' : session.visibility === 'friends' ? '👥 Amis' : '🌍 Public'}
              </Text>
            </View>
          )}
          {session.source === 'garmin' && (
            <View style={styles.metaChip}>
              <Text style={styles.metaChipText}>📡 Garmin</Text>
            </View>
          )}
        </View>
      )}

      {/* Bouton import CSV pour les runs planifiés */}
      {isPlannedRun && (
        <TouchableOpacity
          style={styles.importBtn}
          onPress={() =>
            router.push({
              pathname: '/import-csv',
              params: { mode: 'update', sessionId: session.id },
            } as any)
          }
        >
          <Text style={styles.importBtnText}>📂 Importer mes données GPS (CSV Garmin)</Text>
        </TouchableOpacity>
      )}

      {/* Détail par sport */}
      {session.type === 'run' && <RunDetail data={data} source={session.source} />}
      {session.type === 'crossfit' && <CrossfitDetail data={data} />}
      {session.type === 'renfo' && <RenfoDetail data={data} />}

      {/* Notes */}
      {session.notes && (
        <Section title="Notes">
          <Text style={styles.notesText}>{session.notes}</Text>
        </Section>
      )}
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  content: { paddingTop: 60, paddingHorizontal: 16, paddingBottom: 48 },
  centered: { justifyContent: 'center', alignItems: 'center' },

  backBtn: { marginBottom: 16 },
  backText: { color: '#e85d04', fontSize: 15 },

  headerBlock: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12,
  },
  typeIcon: { fontSize: 32 },
  typeLabel: { color: '#fff', fontSize: 20, fontWeight: '800' },
  dateLabel: { color: '#777', fontSize: 13, marginTop: 2, textTransform: 'capitalize' },

  statusBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  statusDone: { backgroundColor: '#1a3a1a' },
  statusPlanned: { backgroundColor: '#1a2a3a' },
  statusText: { fontSize: 12, fontWeight: '700' },
  statusDoneText: { color: '#4ade80' },
  statusPlannedText: { color: '#60a5fa' },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  metaChip: {
    backgroundColor: '#1c1c1c', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  metaChipText: { color: '#aaa', fontSize: 13 },

  notesText: { color: '#aaa', fontSize: 14, lineHeight: 20 },

  importBtn: {
    backgroundColor: '#1a2a1a',
    borderWidth: 1, borderColor: '#2a4a2a',
    borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', marginBottom: 16,
  },
  importBtnText: { color: '#4ade80', fontWeight: '700', fontSize: 14 },
});

const sectionStyles = StyleSheet.create({
  container: {
    backgroundColor: '#141414', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#1c1c1c', marginBottom: 12,
  },
  title: {
    color: '#555', fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
  },
});

const statStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#1c1c1c',
  },
  label: { color: '#666', fontSize: 14 },
  value: { color: '#ddd', fontSize: 14, fontWeight: '600' },
  accent: { color: '#e85d04' },
});

const tableStyles = StyleSheet.create({
  container: { borderRadius: 10, overflow: 'hidden' },
  row: {
    flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 10,
    borderBottomWidth: 1, borderBottomColor: '#1c1c1c',
  },
  header: { backgroundColor: '#0f0f0f' },
  headerText: { color: '#444', fontWeight: '700', fontSize: 11, textTransform: 'uppercase' },
  cell: { fontSize: 13 },
  cellNum: { width: 48 },
  cellDist: { width: 52 },
  cellPace: { flex: 1 },
  cellHr: { width: 44 },
  cellCad: { width: 44 },
  text: { color: '#ccc' },
});

const blockStyles = StyleSheet.create({
  card: {
    borderRadius: 10, borderWidth: 1, padding: 10, marginBottom: 8, gap: 6,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  format: { fontWeight: '800', fontSize: 12, letterSpacing: 1 },
  param: { color: '#888', fontSize: 12 },
  movRow: { flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 4 },
  movName: { color: '#ddd', fontSize: 13, flex: 1 },
  movMeta: { color: '#666', fontSize: 12 },
});

const renfoStyles = StyleSheet.create({
  card: {
    backgroundColor: '#1c1c1c', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#2a2a2a', marginBottom: 8, gap: 8,
  },
  name: { color: '#fff', fontSize: 15, fontWeight: '700' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});

const chipStyles = StyleSheet.create({
  chip: {
    backgroundColor: '#111', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: '#2a2a2a', gap: 2, alignItems: 'center',
  },
  label: { color: '#555', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  value: { color: '#ddd', fontSize: 13, fontWeight: '700' },
  accent: { color: '#e85d04' },
});

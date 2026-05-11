import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import WodCustomBuilder, { WodBlock } from '../../components/WodCustomBuilder';
import { detectRunPRs, detectRenfoPRs, detectCrossfitPR, savePRs } from '../../lib/prDetection';
import LoginGate from '../../components/LoginGate';

type SessionType = 'run' | 'crossfit' | 'renfo' | 'autre';
type Visibility = 'private' | 'friends' | 'public';
type WodMode = 'benchmark' | 'custom';

type BenchmarkWod = { id: string; name: string; description: string | null };

const SESSION_TYPES: { key: SessionType; label: string; icon: string }[] = [
  { key: 'run', label: 'Run / Cardio', icon: '🏃' },
  { key: 'crossfit', label: 'CrossFit', icon: '🔥' },
  { key: 'renfo', label: 'Renfo', icon: '🏋️' },
  { key: 'autre', label: 'Autre', icon: '💪' },
];

const VISIBILITY_OPTIONS: { key: Visibility; label: string }[] = [
  { key: 'private', label: '🔒 Privé' },
  { key: 'friends', label: '👥 Amis' },
  { key: 'public', label: '🌍 Public' },
];

export default function NewSessionScreen() {
  const { session } = useAuth();
  const router = useRouter();

  const [type, setType] = useState<SessionType>('run');
  const [status, setStatus] = useState<'completed' | 'planned'>('completed');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('friends');
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Run fields
  const [distance, setDistance] = useState('');
  const [pace, setPace] = useState('');

  // CrossFit shared
  const [wodMode, setWodMode] = useState<WodMode>('benchmark');
  const [wodScore, setWodScore] = useState('');
  const [rx, setRx] = useState(true);

  // CrossFit — Benchmark
  const [benchmarkWods, setBenchmarkWods] = useState<BenchmarkWod[]>([]);
  const [selectedWodId, setSelectedWodId] = useState<string | null>(null);
  const [loadingWods, setLoadingWods] = useState(false);

  // CrossFit — Personnalisé
  const [wodBlocks, setWodBlocks] = useState<WodBlock[]>([]);

  // Renfo fields
  const [renfoMovements, setRenfoMovements] = useState([
    { name: '', sets: '', reps: '', weight: '', rpe: '' },
  ]);

  // Load benchmark WODs when CrossFit is selected
  useEffect(() => {
    if (type === 'crossfit' && benchmarkWods.length === 0) {
      setLoadingWods(true);
      supabase
        .from('wods')
        .select('id, name, description')
        .order('name')
        .then(({ data }) => {
          if (data) setBenchmarkWods(data);
          setLoadingWods(false);
        });
    }
  }, [type]);

  function addRenfoMovement() {
    setRenfoMovements([...renfoMovements, { name: '', sets: '', reps: '', weight: '', rpe: '' }]);
  }

  function updateRenfoMovement(index: number, field: string, value: string) {
    const updated = [...renfoMovements];
    updated[index] = { ...updated[index], [field]: value };
    setRenfoMovements(updated);
  }

  function buildData() {
    if (type === 'run') {
      return { distance: parseFloat(distance) || null, pace, elevation: null };
    }
    if (type === 'crossfit') {
      if (wodMode === 'benchmark') {
        const wod = benchmarkWods.find(w => w.id === selectedWodId);
        return {
          mode: 'benchmark',
          wod_id: selectedWodId,
          wod_name: wod?.name ?? null,
          score: wodScore,
          rx,
        };
      } else {
        return {
          mode: 'custom',
          blocks: wodBlocks,
          score: wodScore,
          rx,
        };
      }
    }
    if (type === 'renfo') {
      return {
        movements: renfoMovements
          .filter((m) => m.name)
          .map((m) => ({
            name: m.name,
            sets: parseInt(m.sets) || null,
            reps: parseInt(m.reps) || null,
            weight: parseFloat(m.weight) || null,
            rpe: m.rpe ? parseFloat(m.rpe) : null,
          })),
      };
    }
    return {};
  }

  async function handleSave() {
    if (!session?.user) return;
    setLoading(true);
    setSaveError('');
    setSaveSuccess(false);
    const { data: data2, error } = await supabase.from('sessions').insert({
      user_id: session.user.id,
      date,
      type,
      status,
      source: 'manual',
      visibility,
      duration: duration ? parseInt(duration) : null,
      notes: notes || null,
      data: buildData(),
    }).select('id').maybeSingle();
    setLoading(false);
    if (error) {
      setSaveError(error.message);
    } else {
      // ── Détection automatique des PRs (séances terminées uniquement) ──
      if (status === 'completed' && data2?.id && session?.user) {
        const userId = session.user.id;
        const sessionId = data2.id;
        const dur = duration ? parseInt(duration) : null;
        try {
          if (type === 'run') {
            const prs = await detectRunPRs(userId, sessionId, date,
              { distance: parseFloat(distance) || null, pace: pace || null }, dur);
            await savePRs(userId, prs);
          } else if (type === 'renfo') {
            const movs = renfoMovements
              .filter(m => m.name)
              .map(m => ({ name: m.name, weight: parseFloat(m.weight) || null, reps: parseInt(m.reps) || null }));
            const prs = await detectRenfoPRs(userId, sessionId, date, movs);
            await savePRs(userId, prs);
          } else if (type === 'crossfit' && wodMode === 'benchmark' && selectedWodId) {
            const wod = benchmarkWods.find(w => w.id === selectedWodId);
            if (wod) {
              const pr = await detectCrossfitPR(userId, sessionId, date, wod.name, wodScore);
              if (pr) await savePRs(userId, [pr]);
            }
          }
        } catch (_) { /* détection non bloquante */ }
      }
      setSaveSuccess(true);
      setTimeout(() => router.replace('/(tabs)'), 1200);
    }
  }

  const selectedWod = benchmarkWods.find(w => w.id === selectedWodId);

  if (!session) {
    return (
      <View style={styles.container}>
        <Text style={styles.header}>Nouvelle séance</Text>
        <LoginGate
          icon="add-circle-outline"
          title="Connecte-toi pour ajouter"
          subtitle="Crée ton compte pour enregistrer tes séances, suivre ta progression et débloquer tous les programmes."
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>Nouvelle séance</Text>

      {/* Type */}
      <Text style={styles.label}>Type</Text>
      <View style={styles.row}>
        {SESSION_TYPES.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.typeBtn, type === t.key && styles.typeBtnActive]}
            onPress={() => setType(t.key)}
          >
            <Text style={styles.typeIcon}>{t.icon}</Text>
            <Text style={[styles.typeBtnText, type === t.key && styles.typeBtnTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Statut */}
      <Text style={styles.label}>Statut</Text>
      <View style={styles.modeToggle}>
        <TouchableOpacity
          style={[styles.modeBtn, status === 'completed' && styles.modeBtnDone]}
          onPress={() => setStatus('completed')}
        >
          <Text style={[styles.modeBtnText, status === 'completed' && styles.modeBtnTextDone]}>
            ✅ Terminée
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, status === 'planned' && styles.modeBtnPlanned]}
          onPress={() => setStatus('planned')}
        >
          <Text style={[styles.modeBtnText, status === 'planned' && styles.modeBtnTextPlanned]}>
            📅 Planifiée
          </Text>
        </TouchableOpacity>
      </View>

      {/* Date & Durée */}
      <View style={styles.rowFields}>
        <View style={styles.fieldHalf}>
          <Text style={styles.label}>Date</Text>
          <TextInput
            style={styles.input}
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#555"
          />
        </View>
        <View style={styles.fieldHalf}>
          <Text style={styles.label}>Durée (min)</Text>
          <TextInput
            style={styles.input}
            value={duration}
            onChangeText={setDuration}
            placeholder="60"
            placeholderTextColor="#555"
            keyboardType="numeric"
          />
        </View>
      </View>

      {/* ─── RUN ─────────────────────────────────────────── */}
      {type === 'run' && (
        <View style={styles.rowFields}>
          <View style={styles.fieldHalf}>
            <Text style={styles.label}>Distance (km)</Text>
            <TextInput
              style={styles.input}
              value={distance}
              onChangeText={setDistance}
              placeholder="10.5"
              placeholderTextColor="#555"
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.fieldHalf}>
            <Text style={styles.label}>Allure (min/km)</Text>
            <TextInput
              style={styles.input}
              value={pace}
              onChangeText={setPace}
              placeholder="5:30"
              placeholderTextColor="#555"
            />
          </View>
        </View>
      )}

      {/* ─── CROSSFIT ────────────────────────────────────── */}
      {type === 'crossfit' && (
        <>
          {/* Benchmark / Personnalisé toggle */}
          <Text style={styles.label}>Mode WOD</Text>
          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[styles.modeBtn, wodMode === 'benchmark' && styles.modeBtnActive]}
              onPress={() => setWodMode('benchmark')}
            >
              <Text style={[styles.modeBtnText, wodMode === 'benchmark' && styles.modeBtnTextActive]}>
                🏆 Benchmark
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, wodMode === 'custom' && styles.modeBtnActive]}
              onPress={() => setWodMode('custom')}
            >
              <Text style={[styles.modeBtnText, wodMode === 'custom' && styles.modeBtnTextActive]}>
                ⚙️ Personnalisé
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── BENCHMARK ── */}
          {wodMode === 'benchmark' && (
            <>
              <Text style={styles.label}>WOD</Text>
              {loadingWods ? (
                <ActivityIndicator color="#e85d04" style={{ marginVertical: 12 }} />
              ) : (
                <View style={styles.wodGrid}>
                  {benchmarkWods.map((wod) => (
                    <TouchableOpacity
                      key={wod.id}
                      style={[
                        styles.wodChip,
                        selectedWodId === wod.id && styles.wodChipActive,
                      ]}
                      onPress={() =>
                        setSelectedWodId(selectedWodId === wod.id ? null : wod.id)
                      }
                    >
                      <Text
                        style={[
                          styles.wodChipText,
                          selectedWodId === wod.id && styles.wodChipTextActive,
                        ]}
                      >
                        {wod.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Description du WOD sélectionné */}
              {selectedWod?.description && (
                <View style={styles.wodDesc}>
                  <Text style={styles.wodDescText}>{selectedWod.description}</Text>
                </View>
              )}
            </>
          )}

          {/* ── PERSONNALISÉ ── */}
          {wodMode === 'custom' && (
            <>
              <Text style={styles.label}>Blocs WOD</Text>
              <WodCustomBuilder blocks={wodBlocks} onChange={setWodBlocks} />
            </>
          )}

          {/* Score + RX (communs aux deux modes) */}
          <Text style={styles.label}>Score global</Text>
          <TextInput
            style={styles.input}
            value={wodScore}
            onChangeText={setWodScore}
            placeholder={wodMode === 'benchmark' ? '2:59, 15 rounds…' : 'Temps, rounds, notes…'}
            placeholderTextColor="#555"
          />

          <Text style={styles.label}>Performance</Text>
          <View style={styles.row}>
            {(['RX', 'Scaled'] as const).map((val) => (
              <TouchableOpacity
                key={val}
                style={[styles.rxBtn, (val === 'RX') === rx && styles.rxBtnActive]}
                onPress={() => setRx(val === 'RX')}
              >
                <Text
                  style={[styles.rxBtnText, (val === 'RX') === rx && styles.rxBtnTextActive]}
                >
                  {val}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {/* ─── RENFO ───────────────────────────────────────── */}
      {type === 'renfo' && (
        <>
          <Text style={styles.label}>Mouvements</Text>
          {renfoMovements.map((m, i) => (
            <View key={i} style={styles.movementCard}>
              <TextInput
                style={styles.input}
                value={m.name}
                onChangeText={(v) => updateRenfoMovement(i, 'name', v)}
                placeholder="Back squat, Deadlift..."
                placeholderTextColor="#555"
              />
              <View style={styles.rowFields}>
                <View style={styles.fieldThird}>
                  <Text style={styles.labelSmall}>Séries</Text>
                  <TextInput
                    style={styles.inputSmall}
                    value={m.sets}
                    onChangeText={(v) => updateRenfoMovement(i, 'sets', v)}
                    placeholder="5"
                    placeholderTextColor="#555"
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.fieldThird}>
                  <Text style={styles.labelSmall}>Reps</Text>
                  <TextInput
                    style={styles.inputSmall}
                    value={m.reps}
                    onChangeText={(v) => updateRenfoMovement(i, 'reps', v)}
                    placeholder="5"
                    placeholderTextColor="#555"
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.fieldThird}>
                  <Text style={styles.labelSmall}>Charge (kg)</Text>
                  <TextInput
                    style={styles.inputSmall}
                    value={m.weight}
                    onChangeText={(v) => updateRenfoMovement(i, 'weight', v)}
                    placeholder="100"
                    placeholderTextColor="#555"
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
              <View style={styles.rowFields}>
                <View style={styles.fieldHalf}>
                  <Text style={styles.labelSmall}>RPE (1-10)</Text>
                  <TextInput
                    style={styles.inputSmall}
                    value={m.rpe}
                    onChangeText={(v) => updateRenfoMovement(i, 'rpe', v)}
                    placeholder="8"
                    placeholderTextColor="#555"
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
            </View>
          ))}
          <TouchableOpacity style={styles.addMovementBtn} onPress={addRenfoMovement}>
            <Text style={styles.addMovementText}>+ Ajouter un mouvement</Text>
          </TouchableOpacity>
        </>
      )}

      {/* ─── VISIBILITÉ ──────────────────────────────────── */}
      <Text style={styles.label}>Visibilité</Text>
      <View style={styles.row}>
        {VISIBILITY_OPTIONS.map((v) => (
          <TouchableOpacity
            key={v.key}
            style={[styles.visBtn, visibility === v.key && styles.visBtnActive]}
            onPress={() => setVisibility(v.key)}
          >
            <Text
              style={[styles.visBtnText, visibility === v.key && styles.visBtnTextActive]}
            >
              {v.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ─── NOTES ───────────────────────────────────────── */}
      <Text style={styles.label}>Notes</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={notes}
        onChangeText={setNotes}
        placeholder="Ressenti, contexte..."
        placeholderTextColor="#555"
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      {saveError ? (
        <View style={styles.feedbackError}>
          <Text style={styles.feedbackErrorText}>⚠️ {saveError}</Text>
        </View>
      ) : null}

      {saveSuccess ? (
        <View style={styles.feedbackSuccess}>
          <Text style={styles.feedbackSuccessText}>✅ Séance enregistrée !</Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Enregistrer la séance</Text>
          )}
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  content: {
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 8,
  },
  header: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 20,
  },
  label: {
    color: '#aaa',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 6,
  },
  labelSmall: {
    color: '#777',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  rowFields: {
    flexDirection: 'row',
    gap: 10,
  },
  fieldHalf: { flex: 1 },
  fieldThird: { flex: 1 },
  input: {
    backgroundColor: '#1c1c1c',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  inputSmall: {
    backgroundColor: '#1c1c1c',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 14,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  textArea: { minHeight: 90 },

  // Type selector
  typeBtn: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1c1c1c',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    gap: 4,
  },
  typeBtnActive: { backgroundColor: '#2a1500', borderColor: '#e85d04' },
  typeIcon: { fontSize: 22 },
  typeBtnText: { color: '#777', fontSize: 12, fontWeight: '600' },
  typeBtnTextActive: { color: '#e85d04' },

  // WOD mode toggle
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: '#161616',
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  modeBtnActive: { backgroundColor: '#2a1500' },
  modeBtnText: { color: '#555', fontWeight: '700', fontSize: 13 },
  modeBtnTextActive: { color: '#e85d04' },
  // Statut Terminée / Planifiée
  modeBtnDone:         { backgroundColor: '#0d2b1a' },
  modeBtnTextDone:     { color: '#4ade80' },
  modeBtnPlanned:      { backgroundColor: '#0d1a2b' },
  modeBtnTextPlanned:  { color: '#60a5fa' },

  // Benchmark WOD chips
  wodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  wodChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#1c1c1c',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  wodChipActive: { backgroundColor: '#2a1500', borderColor: '#e85d04' },
  wodChipText: { color: '#888', fontSize: 13, fontWeight: '700' },
  wodChipTextActive: { color: '#e85d04' },

  wodDesc: {
    backgroundColor: '#161616',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    marginTop: 4,
  },
  wodDescText: { color: '#777', fontSize: 12, lineHeight: 18 },

  // RX / Scaled
  rxBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#1c1c1c',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  rxBtnActive: { backgroundColor: '#2a1500', borderColor: '#e85d04' },
  rxBtnText: { color: '#777', fontWeight: '700', fontSize: 14 },
  rxBtnTextActive: { color: '#e85d04' },

  // Visibility
  visBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#1c1c1c',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    alignItems: 'center',
  },
  visBtnActive: { backgroundColor: '#2a1500', borderColor: '#e85d04' },
  visBtnText: { color: '#777', fontSize: 13, fontWeight: '600' },
  visBtnTextActive: { color: '#e85d04' },

  // Renfo movement card
  movementCard: {
    backgroundColor: '#161616',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    gap: 8,
    marginBottom: 8,
  },
  addMovementBtn: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#333',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  addMovementText: { color: '#555', fontSize: 14, fontWeight: '600' },

  // Save
  saveButton: {
    backgroundColor: '#e85d04',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  feedbackError: {
    backgroundColor: '#2a0a0a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f87171',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  feedbackErrorText: { color: '#f87171', fontSize: 14, fontWeight: '600' },
  feedbackSuccess: {
    backgroundColor: '#0a2a0a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#4ade80',
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  feedbackSuccessText: { color: '#4ade80', fontSize: 16, fontWeight: '700' },
});

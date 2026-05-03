import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import WodCustomBuilder, { WodBlock } from '../../components/WodCustomBuilder';

type Visibility = 'private' | 'friends' | 'public';

const VISIBILITY_OPTIONS: { key: Visibility; label: string }[] = [
  { key: 'private', label: '🔒 Privé' },
  { key: 'friends', label: '👥 Amis' },
  { key: 'public', label: '🌍 Public' },
];

export default function EditSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Type de la séance (non modifiable, juste pour l'affichage conditionnel)
  const [type, setType] = useState('');

  // Champs communs
  const [status, setStatus] = useState<'completed' | 'planned'>('completed');
  const [date, setDate] = useState('');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('friends');

  // Run
  const [distance, setDistance] = useState('');
  const [pace, setPace] = useState('');

  // CrossFit
  const [wodMode, setWodMode] = useState<'benchmark' | 'custom'>('benchmark');
  const [wodName, setWodName] = useState('');
  const [wodScore, setWodScore] = useState('');
  const [rx, setRx] = useState(true);
  const [wodBlocks, setWodBlocks] = useState<WodBlock[]>([]);

  // Renfo
  const [renfoMovements, setRenfoMovements] = useState<
    { name: string; sets: string; reps: string; weight: string; rpe: string }[]
  >([]);

  useEffect(() => {
    if (!id) return;
    supabase
      .from('sessions')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (!data) { setLoading(false); return; }

        setType(data.type);
        setStatus(data.status === 'planned' ? 'planned' : 'completed');
        setDate(data.date ?? '');
        setDuration(data.duration != null ? String(data.duration) : '');
        setNotes(data.notes ?? '');
        setVisibility((data.visibility as Visibility) ?? 'friends');

        const d = data.data ?? {};

        if (data.type === 'run') {
          setDistance(d.distance != null ? String(d.distance) : '');
          setPace(d.pace ?? '');
        }

        if (data.type === 'crossfit') {
          const mode = d.mode ?? 'benchmark';
          setWodMode(mode);
          setWodName(d.wod_name ?? '');
          setWodScore(d.score ?? '');
          setRx(d.rx !== false);
          if (mode === 'custom' && Array.isArray(d.blocks)) {
            // Normalise les anciens blocs qui n'auraient pas time_cap_min
            setWodBlocks(d.blocks.map((b: any) => ({ time_cap_min: '', ...b })));
          }
        }

        if (data.type === 'renfo' && Array.isArray(d.movements)) {
          setRenfoMovements(
            d.movements.map((m: any) => ({
              name: m.name ?? '',
              sets: m.sets != null ? String(m.sets) : '',
              reps: m.reps != null ? String(m.reps) : '',
              weight: m.weight != null ? String(m.weight) : '',
              rpe: m.rpe != null ? String(m.rpe) : '',
            }))
          );
        }

        setLoading(false);
      });
  }, [id]);

  function buildData() {
    if (type === 'run') {
      return { distance: parseFloat(distance) || null, pace: pace || null };
    }
    if (type === 'crossfit') {
      if (wodMode === 'benchmark') {
        return { mode: 'benchmark', wod_name: wodName, score: wodScore, rx };
      }
      return { mode: 'custom', blocks: wodBlocks, score: wodScore, rx };
    }
    if (type === 'renfo') {
      return {
        movements: renfoMovements
          .filter(m => m.name)
          .map(m => ({
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
    if (!id) return;
    setSaving(true);
    setSaveError('');

    const { error } = await supabase
      .from('sessions')
      .update({
        status,
        date,
        duration: duration ? parseInt(duration) : null,
        notes: notes || null,
        visibility,
        data: buildData(),
      })
      .eq('id', id);

    setSaving(false);
    if (error) {
      setSaveError(error.message);
    } else {
      setSaveSuccess(true);
      setTimeout(() => router.back(), 1000);
    }
  }

  function updateRenfoMovement(i: number, field: string, value: string) {
    const updated = [...renfoMovements];
    updated[i] = { ...updated[i], [field]: value };
    setRenfoMovements(updated);
  }

  function addRenfoMovement() {
    setRenfoMovements([...renfoMovements, { name: '', sets: '', reps: '', weight: '', rpe: '' }]);
  }

  function removeRenfoMovement(i: number) {
    setRenfoMovements(renfoMovements.filter((_, idx) => idx !== i));
  }

  const TYPE_ICON: Record<string, string> = {
    run: '🏃', crossfit: '🔥', renfo: '🏋️', autre: '💪',
  };
  const TYPE_LABEL: Record<string, string> = {
    run: 'Run / Cardio', crossfit: 'CrossFit', renfo: 'Renfo', autre: 'Autre',
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color="#e85d04" size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Back */}
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backText}>← Retour</Text>
      </TouchableOpacity>

      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.header}>
          {TYPE_ICON[type] ?? '💪'} Modifier la séance
        </Text>
        <Text style={styles.typeBadge}>{TYPE_LABEL[type] ?? type}</Text>
      </View>

      {/* ─── Statut ─── */}
      <Text style={styles.label}>Statut</Text>
      <View style={styles.statusToggle}>
        <TouchableOpacity
          style={[styles.statusBtn, status === 'completed' && styles.statusBtnDone]}
          onPress={() => setStatus('completed')}
        >
          <Text style={[styles.statusBtnText, status === 'completed' && styles.statusBtnTextDone]}>
            ✅ Terminée
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.statusBtn, status === 'planned' && styles.statusBtnPlanned]}
          onPress={() => setStatus('planned')}
        >
          <Text style={[styles.statusBtnText, status === 'planned' && styles.statusBtnTextPlanned]}>
            📅 Planifiée
          </Text>
        </TouchableOpacity>
      </View>

      {/* ─── Communs ─── */}
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

      {/* ─── RUN ─── */}
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

      {/* ─── CROSSFIT ─── */}
      {type === 'crossfit' && (
        <>
          {wodMode === 'benchmark' && (
            <>
              <Text style={styles.label}>WOD</Text>
              <TextInput
                style={styles.input}
                value={wodName}
                onChangeText={setWodName}
                placeholder="Fran, Grace…"
                placeholderTextColor="#555"
              />
            </>
          )}

          {wodMode === 'custom' && (
            <>
              <Text style={styles.label}>Blocs WOD</Text>
              <WodCustomBuilder blocks={wodBlocks} onChange={setWodBlocks} />
            </>
          )}

          <Text style={styles.label}>Score global</Text>
          <TextInput
            style={styles.input}
            value={wodScore}
            onChangeText={setWodScore}
            placeholder="2:59, 15 rounds…"
            placeholderTextColor="#555"
          />

          <Text style={styles.label}>Performance</Text>
          <View style={styles.row}>
            {(['RX', 'Scaled'] as const).map(val => (
              <TouchableOpacity
                key={val}
                style={[styles.rxBtn, (val === 'RX') === rx && styles.rxBtnActive]}
                onPress={() => setRx(val === 'RX')}
              >
                <Text style={[styles.rxBtnText, (val === 'RX') === rx && styles.rxBtnTextActive]}>
                  {val}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {/* ─── RENFO ─── */}
      {type === 'renfo' && (
        <>
          <Text style={styles.label}>Mouvements</Text>
          {renfoMovements.map((m, i) => (
            <View key={i} style={styles.movCard}>
              <View style={styles.movNameRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={m.name}
                  onChangeText={v => updateRenfoMovement(i, 'name', v)}
                  placeholder="Back squat…"
                  placeholderTextColor="#555"
                />
                {renfoMovements.length > 1 && (
                  <TouchableOpacity style={styles.removeMov} onPress={() => removeRenfoMovement(i)}>
                    <Text style={styles.removeMovText}>−</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.rowFields}>
                {[
                  { field: 'sets', placeholder: 'Séries', label: 'Séries' },
                  { field: 'reps', placeholder: 'Reps', label: 'Reps' },
                  { field: 'weight', placeholder: 'kg', label: 'Charge' },
                  { field: 'rpe', placeholder: 'RPE', label: 'RPE' },
                ].map(({ field, placeholder, label }) => (
                  <View key={field} style={{ flex: 1 }}>
                    <Text style={styles.labelSmall}>{label}</Text>
                    <TextInput
                      style={styles.inputSmall}
                      value={(m as any)[field]}
                      onChangeText={v => updateRenfoMovement(i, field, v)}
                      placeholder={placeholder}
                      placeholderTextColor="#555"
                      keyboardType="decimal-pad"
                    />
                  </View>
                ))}
              </View>
            </View>
          ))}
          <TouchableOpacity style={styles.addMovBtn} onPress={addRenfoMovement}>
            <Text style={styles.addMovText}>+ Ajouter un mouvement</Text>
          </TouchableOpacity>
        </>
      )}

      {/* ─── VISIBILITÉ ─── */}
      <Text style={styles.label}>Visibilité</Text>
      <View style={styles.row}>
        {VISIBILITY_OPTIONS.map(v => (
          <TouchableOpacity
            key={v.key}
            style={[styles.visBtn, visibility === v.key && styles.visBtnActive]}
            onPress={() => setVisibility(v.key)}
          >
            <Text style={[styles.visBtnText, visibility === v.key && styles.visBtnTextActive]}>
              {v.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ─── NOTES ─── */}
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

      {/* Feedback */}
      {saveError ? (
        <View style={styles.feedbackError}>
          <Text style={styles.feedbackErrorText}>⚠️ {saveError}</Text>
        </View>
      ) : null}

      {saveSuccess ? (
        <View style={styles.feedbackSuccess}>
          <Text style={styles.feedbackSuccessText}>✅ Modifications enregistrées !</Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveButtonText}>Enregistrer les modifications</Text>
          }
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  content: { paddingTop: 60, paddingHorizontal: 16, paddingBottom: 48, gap: 8 },
  centered: { justifyContent: 'center', alignItems: 'center' },

  backBtn: { marginBottom: 8 },
  backText: { color: '#e85d04', fontSize: 15 },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  header: { fontSize: 22, fontWeight: '800', color: '#fff' },
  typeBadge: { color: '#555', fontSize: 13, fontWeight: '600' },

  label: {
    color: '#aaa', fontSize: 13, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 12, marginBottom: 6,
  },
  labelSmall: { color: '#777', fontSize: 11, fontWeight: '600', marginBottom: 4 },

  // Statut toggle
  statusToggle: {
    flexDirection: 'row', backgroundColor: '#161616',
    borderRadius: 10, padding: 4, borderWidth: 1, borderColor: '#2a2a2a',
  },
  statusBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  statusBtnText: { color: '#555', fontWeight: '700', fontSize: 13 },
  statusBtnDone:         { backgroundColor: '#0d2b1a' },
  statusBtnTextDone:     { color: '#4ade80' },
  statusBtnPlanned:      { backgroundColor: '#0d1a2b' },
  statusBtnTextPlanned:  { color: '#60a5fa' },

  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rowFields: { flexDirection: 'row', gap: 10 },
  fieldHalf: { flex: 1 },

  input: {
    backgroundColor: '#1c1c1c', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#fff',
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  inputSmall: {
    backgroundColor: '#1c1c1c', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 10,
    fontSize: 13, color: '#fff',
    borderWidth: 1, borderColor: '#2a2a2a',
    textAlign: 'center',
  },
  textArea: { minHeight: 90 },

  rxBtn: {
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8,
    backgroundColor: '#1c1c1c', borderWidth: 1, borderColor: '#2a2a2a',
  },
  rxBtnActive: { backgroundColor: '#2a1500', borderColor: '#e85d04' },
  rxBtnText: { color: '#777', fontWeight: '700', fontSize: 14 },
  rxBtnTextActive: { color: '#e85d04' },

  visBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 8,
    backgroundColor: '#1c1c1c', borderWidth: 1, borderColor: '#2a2a2a', alignItems: 'center',
  },
  visBtnActive: { backgroundColor: '#2a1500', borderColor: '#e85d04' },
  visBtnText: { color: '#777', fontSize: 13, fontWeight: '600' },
  visBtnTextActive: { color: '#e85d04' },

  movCard: {
    backgroundColor: '#161616', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#2a2a2a', gap: 8, marginBottom: 8,
  },
  movNameRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  removeMov: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: '#2a1a1a',
    justifyContent: 'center', alignItems: 'center',
  },
  removeMovText: { color: '#f87171', fontSize: 20, lineHeight: 22 },
  addMovBtn: {
    borderWidth: 1, borderStyle: 'dashed', borderColor: '#333',
    borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 4,
  },
  addMovText: { color: '#555', fontSize: 14, fontWeight: '600' },

  feedbackError: {
    backgroundColor: '#2a0a0a', borderRadius: 10, borderWidth: 1, borderColor: '#f87171',
    paddingVertical: 12, paddingHorizontal: 16, marginTop: 16,
  },
  feedbackErrorText: { color: '#f87171', fontSize: 14, fontWeight: '600' },
  feedbackSuccess: {
    backgroundColor: '#0a2a0a', borderRadius: 10, borderWidth: 1, borderColor: '#4ade80',
    paddingVertical: 16, alignItems: 'center', marginTop: 24,
  },
  feedbackSuccessText: { color: '#4ade80', fontSize: 16, fontWeight: '700' },

  saveButton: {
    backgroundColor: '#e85d04', borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', marginTop: 24,
  },
  saveButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});

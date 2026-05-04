/**
 * create-program.tsx
 * Création d'un programme personnalisé en 2 étapes :
 *   1. Infos générales (nom, durée, fréquence…)
 *   2. Configuration séance par séance
 */

import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

// ─── Types ────────────────────────────────────────────────

type SessionType = 'run' | 'crossfit' | 'renfo' | 'autre';

type Movement = { name: string; sets: string; reps: string; weight: string; notes: string };

type SessionDraft = {
  uid: string;           // identifiant local unique (pour les clés React)
  week: number;
  day: number;
  title: string;
  type: SessionType;
  notes: string;
  // Renfo
  movements: Movement[];
  // Run
  run_distance: string;
  run_pace_target: string;
  run_duration: string;
  // CrossFit
  crossfit_desc: string;
};

const EMOJIS = ['💪', '🏃', '🔥', '🏋️', '⚡', '🎯', '🏆', '🚀', '🧗', '🤸'];
const LEVELS = ['Débutant', 'Intermédiaire', 'Avancé'];
const TYPE_CONFIG: Record<SessionType, { label: string; icon: string; color: string }> = {
  run:      { label: 'Run',      icon: '🏃', color: '#60a5fa' },
  crossfit: { label: 'CrossFit', icon: '🔥', color: '#e85d04' },
  renfo:    { label: 'Renfo',    icon: '🏋️', color: '#a78bfa' },
  autre:    { label: 'Autre',    icon: '💪', color: '#facc15' },
};

// ─── Helpers ──────────────────────────────────────────────

function makeUid() {
  return Math.random().toString(36).slice(2);
}

function makeEmptySession(week: number, day: number): SessionDraft {
  return {
    uid: makeUid(),
    week, day,
    title: `Semaine ${week} — Séance ${day}`,
    type: 'renfo',
    notes: '',
    movements: [{ name: '', sets: '3', reps: '8', weight: '', notes: '' }],
    run_distance: '',
    run_pace_target: '',
    run_duration: '',
    crossfit_desc: '',
  };
}

function sessionToJson(s: SessionDraft) {
  const base = {
    number: (s.week - 1) * 100 + s.day, // ordinal provisoire
    week: s.week, day: s.day,
    title: s.title, type: s.type, notes: s.notes,
  };
  if (s.type === 'renfo') {
    return { ...base, movements: s.movements.filter(m => m.name).map(m => ({
      name: m.name,
      sets: parseInt(m.sets) || 3,
      reps: m.reps || '8',
      weight: m.weight || null,
      notes: m.notes || null,
    })) };
  }
  if (s.type === 'run') {
    return { ...base, run: {
      distance: parseFloat(s.run_distance) || null,
      pace_target: s.run_pace_target || null,
      duration_min: parseInt(s.run_duration) || null,
    } };
  }
  if (s.type === 'crossfit') {
    return { ...base, crossfit: { description: s.crossfit_desc } };
  }
  return base;
}

// ─── Composant principal ──────────────────────────────────

export default function CreateProgramScreen() {
  const { session } = useAuth();
  const router = useRouter();

  // Étape 1 : infos
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('💪');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState('Intermédiaire');
  const [weeks, setWeeks] = useState('4');
  const [sessionsPerWeek, setSessionsPerWeek] = useState('3');

  // Étape 2 : séances
  const [sessions2, setSessions2] = useState<SessionDraft[]>([]);
  const [editingUid, setEditingUid] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // ── Passage étape 1 → 2 ───────────────────────────────

  function goToStep2() {
    if (!name.trim()) { setError('Donne un nom au programme.'); return; }
    const w = parseInt(weeks) || 0;
    const spw = parseInt(sessionsPerWeek) || 0;
    if (w < 1 || w > 52) { setError('Durée : entre 1 et 52 semaines.'); return; }
    if (spw < 1 || spw > 7) { setError('Fréquence : 1 à 7 séances/sem.'); return; }
    setError('');

    // Générer la grille de séances (en réutilisant les existantes si on revient)
    const total = w * spw;
    const existing = sessions2;
    const next: SessionDraft[] = [];
    for (let i = 0; i < total; i++) {
      const wk = Math.floor(i / spw) + 1;
      const day = (i % spw) + 1;
      const found = existing.find(s => s.week === wk && s.day === day);
      next.push(found ?? makeEmptySession(wk, day));
    }
    setSessions2(next);
    setStep(2);
  }

  // ── Duplication de séance ─────────────────────────────

  function duplicateSession(uid: string) {
    const idx = sessions2.findIndex(s => s.uid === uid);
    if (idx < 0) return;
    const src = sessions2[idx];
    // Met le clone à la place suivante disponible
    const next = idx + 1 < sessions2.length ? sessions2[idx + 1] : null;
    if (!next) return;
    setSessions2(prev => prev.map((s, i) =>
      i === idx + 1
        ? { ...JSON.parse(JSON.stringify(src)), uid: makeUid(), week: next.week, day: next.day, title: next.title }
        : s
    ));
  }

  // ── Mise à jour d'un champ de séance ─────────────────

  function updateSession(uid: string, patch: Partial<SessionDraft>) {
    setSessions2(prev => prev.map(s => s.uid === uid ? { ...s, ...patch } : s));
  }

  function updateMovement(uid: string, idx: number, field: keyof Movement, value: string) {
    setSessions2(prev => prev.map(s => {
      if (s.uid !== uid) return s;
      const movs = [...s.movements];
      movs[idx] = { ...movs[idx], [field]: value };
      return { ...s, movements: movs };
    }));
  }

  function addMovement(uid: string) {
    setSessions2(prev => prev.map(s =>
      s.uid === uid
        ? { ...s, movements: [...s.movements, { name: '', sets: '3', reps: '8', weight: '', notes: '' }] }
        : s
    ));
  }

  function removeMovement(uid: string, idx: number) {
    setSessions2(prev => prev.map(s => {
      if (s.uid !== uid) return s;
      const movs = s.movements.filter((_, i) => i !== idx);
      return { ...s, movements: movs.length ? movs : [{ name: '', sets: '3', reps: '8', weight: '', notes: '' }] };
    }));
  }

  // ── Sauvegarde ────────────────────────────────────────

  async function handleSave() {
    if (!session?.user) return;
    setSaving(true);
    setError('');

    const sessionsJson = sessions2.map(sessionToJson);
    const { error: dbErr } = await supabase.from('custom_programs').insert({
      author_id: session.user.id,
      name: name.trim(),
      emoji,
      description: description.trim() || null,
      level,
      duration_weeks: parseInt(weeks),
      sessions_per_week: parseInt(sessionsPerWeek),
      sessions: sessionsJson,
    });

    setSaving(false);
    if (dbErr) {
      setError(dbErr.message);
    } else {
      router.replace('/(tabs)/programs');
    }
  }

  const editingSession = sessions2.find(s => s.uid === editingUid) ?? null;

  // ────────────────────────────────────────────────────
  //  RENDER
  // ────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => step === 2 ? setStep(1) : router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {step === 1 ? 'Nouveau programme' : 'Configurer les séances'}
        </Text>
        <View style={styles.stepIndicator}>
          <Text style={styles.stepText}>{step}/2</Text>
        </View>
      </View>

      {/* ── ÉTAPE 1 : infos ── */}
      {step === 1 && (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Emoji picker */}
          <Text style={styles.label}>Icône</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <View style={styles.emojiRow}>
              {EMOJIS.map(e => (
                <TouchableOpacity key={e} style={[styles.emojiBtn, emoji === e && styles.emojiBtnActive]}
                  onPress={() => setEmoji(e)}>
                  <Text style={styles.emojiText}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <Text style={styles.label}>Nom du programme</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName}
            placeholder="Mon programme renfo…" placeholderTextColor="#444" />

          <Text style={styles.label}>Description (optionnel)</Text>
          <TextInput style={[styles.input, { minHeight: 70 }]} value={description}
            onChangeText={setDescription} placeholder="Objectif, contexte…"
            placeholderTextColor="#444" multiline textAlignVertical="top" />

          <Text style={styles.label}>Niveau</Text>
          <View style={styles.row}>
            {LEVELS.map(l => (
              <TouchableOpacity key={l} style={[styles.chip, level === l && styles.chipActive]}
                onPress={() => setLevel(l)}>
                <Text style={[styles.chipText, level === l && styles.chipTextActive]}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.rowFields}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Durée (semaines)</Text>
              <TextInput style={styles.input} value={weeks} onChangeText={setWeeks}
                keyboardType="numeric" placeholder="4" placeholderTextColor="#444" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Séances / semaine</Text>
              <TextInput style={styles.input} value={sessionsPerWeek} onChangeText={setSessionsPerWeek}
                keyboardType="numeric" placeholder="3" placeholderTextColor="#444" />
            </View>
          </View>

          {weeks && sessionsPerWeek && (
            <View style={styles.summary}>
              <Ionicons name="layers-outline" size={15} color="#e85d04" />
              <Text style={styles.summaryText}>
                {parseInt(weeks) * parseInt(sessionsPerWeek) || 0} séances au total
              </Text>
            </View>
          )}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity style={styles.nextBtn} onPress={goToStep2}>
            <Text style={styles.nextBtnText}>Configurer les séances →</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ── ÉTAPE 2 : liste des séances ── */}
      {step === 2 && (
        <>
          <ScrollView contentContainerStyle={styles.content}>
            {/* Groupé par semaine */}
            {Array.from({ length: parseInt(weeks) }, (_, wi) => {
              const weekSessions = sessions2.filter(s => s.week === wi + 1);
              return (
                <View key={wi} style={styles.weekGroup}>
                  <Text style={styles.weekLabel}>Semaine {wi + 1}</Text>
                  {weekSessions.map((s, si) => {
                    const tc = TYPE_CONFIG[s.type];
                    return (
                      <View key={s.uid} style={styles.sessionRow}>
                        <TouchableOpacity style={styles.sessionCard}
                          onPress={() => setEditingUid(s.uid)} activeOpacity={0.8}>
                          <View style={[styles.sessionAccent, { backgroundColor: tc.color }]} />
                          <View style={styles.sessionCardBody}>
                            <View style={styles.sessionCardTop}>
                              <Text style={styles.sessionCardIcon}>{tc.icon}</Text>
                              <Text style={styles.sessionCardTitle}>{s.title}</Text>
                            </View>
                            <Text style={[styles.sessionCardType, { color: tc.color }]}>{tc.label}</Text>
                            {s.type === 'renfo' && s.movements.filter(m => m.name).length > 0 && (
                              <Text style={styles.sessionCardPreview} numberOfLines={1}>
                                {s.movements.filter(m => m.name).map(m => m.name).join(' · ')}
                              </Text>
                            )}
                            {s.type === 'run' && s.run_distance && (
                              <Text style={styles.sessionCardPreview}>{s.run_distance} km</Text>
                            )}
                            {s.type === 'crossfit' && s.crossfit_desc && (
                              <Text style={styles.sessionCardPreview} numberOfLines={1}>{s.crossfit_desc}</Text>
                            )}
                          </View>
                          <Ionicons name="chevron-forward" size={16} color="#333" />
                        </TouchableOpacity>

                        {/* Dupliquer vers la séance suivante */}
                        {si < weekSessions.length - 1 || wi < parseInt(weeks) - 1 ? (
                          <TouchableOpacity style={styles.dupBtn}
                            onPress={() => duplicateSession(s.uid)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Ionicons name="copy-outline" size={15} color="#444" />
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              );
            })}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.saveBtnText}>💾 Enregistrer le programme</Text>
              }
            </TouchableOpacity>
          </ScrollView>

          {/* ── Modal édition d'une séance ── */}
          <Modal visible={!!editingSession} animationType="slide" transparent
            onRequestClose={() => setEditingUid(null)}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalSheet}>
                {editingSession && (
                  <SessionEditor
                    session={editingSession}
                    onUpdate={(patch) => updateSession(editingSession.uid, patch)}
                    onUpdateMovement={(idx, field, val) => updateMovement(editingSession.uid, idx, field, val)}
                    onAddMovement={() => addMovement(editingSession.uid)}
                    onRemoveMovement={(idx) => removeMovement(editingSession.uid, idx)}
                    onClose={() => setEditingUid(null)}
                  />
                )}
              </View>
            </View>
          </Modal>
        </>
      )}
    </View>
  );
}

// ─── Éditeur de séance (dans le modal) ───────────────────

function SessionEditor({ session, onUpdate, onUpdateMovement, onAddMovement, onRemoveMovement, onClose }: {
  session: SessionDraft;
  onUpdate: (patch: Partial<SessionDraft>) => void;
  onUpdateMovement: (idx: number, field: keyof Movement, val: string) => void;
  onAddMovement: () => void;
  onRemoveMovement: (idx: number) => void;
  onClose: () => void;
}) {
  const TYPES: SessionType[] = ['renfo', 'run', 'crossfit', 'autre'];

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header modal */}
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>{session.title}</Text>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="checkmark-circle" size={28} color="#4ade80" />
        </TouchableOpacity>
      </View>

      {/* Titre personnalisé */}
      <Text style={styles.label}>Titre</Text>
      <TextInput style={styles.input} value={session.title}
        onChangeText={t => onUpdate({ title: t })} placeholderTextColor="#444" />

      {/* Type */}
      <Text style={styles.label}>Type</Text>
      <View style={styles.row}>
        {TYPES.map(t => {
          const tc = TYPE_CONFIG[t];
          return (
            <TouchableOpacity key={t} style={[styles.typeBtn, session.type === t && { borderColor: tc.color, backgroundColor: tc.color + '15' }]}
              onPress={() => onUpdate({ type: t })}>
              <Text style={styles.typeBtnIcon}>{tc.icon}</Text>
              <Text style={[styles.typeBtnText, session.type === t && { color: tc.color }]}>{tc.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Renfo ── */}
      {session.type === 'renfo' && (
        <>
          <Text style={styles.label}>Mouvements</Text>
          {session.movements.map((m, i) => (
            <View key={i} style={styles.movCard}>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  value={m.name} onChangeText={v => onUpdateMovement(i, 'name', v)}
                  placeholder="Back Squat, Développé…" placeholderTextColor="#444" />
                {session.movements.length > 1 && (
                  <TouchableOpacity onPress={() => onRemoveMovement(i)}>
                    <Ionicons name="close-circle" size={20} color="#f87171" />
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.rowFields}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.labelSm}>Séries</Text>
                  <TextInput style={styles.inputSm} value={m.sets}
                    onChangeText={v => onUpdateMovement(i, 'sets', v)}
                    keyboardType="numeric" placeholder="3" placeholderTextColor="#444" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.labelSm}>Reps</Text>
                  <TextInput style={styles.inputSm} value={m.reps}
                    onChangeText={v => onUpdateMovement(i, 'reps', v)}
                    placeholder="8" placeholderTextColor="#444" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.labelSm}>Charge</Text>
                  <TextInput style={styles.inputSm} value={m.weight}
                    onChangeText={v => onUpdateMovement(i, 'weight', v)}
                    placeholder="80kg" placeholderTextColor="#444" />
                </View>
              </View>
              <TextInput style={[styles.input, { marginTop: 6 }]} value={m.notes}
                onChangeText={v => onUpdateMovement(i, 'notes', v)}
                placeholder="Notes (optionnel)" placeholderTextColor="#444" />
            </View>
          ))}
          <TouchableOpacity style={styles.addMovBtn} onPress={onAddMovement}>
            <Ionicons name="add" size={16} color="#555" />
            <Text style={styles.addMovText}>Ajouter un mouvement</Text>
          </TouchableOpacity>
        </>
      )}

      {/* ── Run ── */}
      {session.type === 'run' && (
        <>
          <View style={styles.rowFields}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Distance (km)</Text>
              <TextInput style={styles.input} value={session.run_distance}
                onChangeText={v => onUpdate({ run_distance: v })}
                keyboardType="decimal-pad" placeholder="10" placeholderTextColor="#444" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Allure cible</Text>
              <TextInput style={styles.input} value={session.run_pace_target}
                onChangeText={v => onUpdate({ run_pace_target: v })}
                placeholder="5:30" placeholderTextColor="#444" />
            </View>
          </View>
          <Text style={styles.label}>Durée (min)</Text>
          <TextInput style={styles.input} value={session.run_duration}
            onChangeText={v => onUpdate({ run_duration: v })}
            keyboardType="numeric" placeholder="60" placeholderTextColor="#444" />
        </>
      )}

      {/* ── CrossFit ── */}
      {session.type === 'crossfit' && (
        <>
          <Text style={styles.label}>Description du WOD</Text>
          <TextInput style={[styles.input, { minHeight: 100 }]}
            value={session.crossfit_desc}
            onChangeText={v => onUpdate({ crossfit_desc: v })}
            placeholder={"21-15-9\nThrusters 43kg\nPull-ups"}
            placeholderTextColor="#444" multiline textAlignVertical="top" />
        </>
      )}

      {/* Notes communes */}
      <Text style={styles.label}>Notes</Text>
      <TextInput style={[styles.input, { minHeight: 60 }]} value={session.notes}
        onChangeText={v => onUpdate({ notes: v })}
        placeholder="Conseils, objectifs…" placeholderTextColor="#444"
        multiline textAlignVertical="top" />

      <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
        <Text style={styles.doneBtnText}>✓ Valider cette séance</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: 16, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: '#1a1a1a',
  },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'center' },
  stepIndicator: {
    backgroundColor: '#1a1a1a', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  stepText: { color: '#e85d04', fontSize: 12, fontWeight: '700' },

  content: { padding: 16, paddingBottom: 40, gap: 6 },

  label: { color: '#888', fontSize: 12, fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 0.5, marginTop: 12, marginBottom: 6 },
  labelSm: { color: '#666', fontSize: 10, fontWeight: '700', marginBottom: 4 },

  input: {
    backgroundColor: '#141414', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    color: '#fff', fontSize: 15, borderWidth: 1, borderColor: '#1e1e1e',
    marginBottom: 4,
  },
  inputSm: {
    backgroundColor: '#141414', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 10,
    color: '#fff', fontSize: 14, borderWidth: 1, borderColor: '#1e1e1e',
  },
  rowFields: { flexDirection: 'row', gap: 10 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  emojiRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  emojiBtn: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#141414', borderWidth: 1, borderColor: '#1e1e1e',
    justifyContent: 'center', alignItems: 'center',
  },
  emojiBtnActive: { borderColor: '#e85d04', backgroundColor: '#1a0e00' },
  emojiText: { fontSize: 22 },

  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: '#1e1e1e', backgroundColor: '#141414',
  },
  chipActive: { backgroundColor: '#1a0e00', borderColor: '#e85d04' },
  chipText: { color: '#555', fontSize: 13, fontWeight: '700' },
  chipTextActive: { color: '#e85d04' },

  summary: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#111', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#1e1e1e', marginTop: 4,
  },
  summaryText: { color: '#888', fontSize: 13 },

  errorText: { color: '#f87171', fontSize: 13, marginTop: 8 },

  nextBtn: {
    backgroundColor: '#e85d04', borderRadius: 12,
    paddingVertical: 15, alignItems: 'center', marginTop: 20,
  },
  nextBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  // Étape 2
  weekGroup: { marginBottom: 20 },
  weekLabel: {
    color: '#333', fontSize: 10, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
  },
  sessionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  sessionCard: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111', borderRadius: 12,
    borderWidth: 1, borderColor: '#1e1e1e', overflow: 'hidden',
  },
  sessionAccent: { width: 3, alignSelf: 'stretch' },
  sessionCardBody: { flex: 1, padding: 12, gap: 2 },
  sessionCardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sessionCardIcon: { fontSize: 16 },
  sessionCardTitle: { color: '#fff', fontSize: 13, fontWeight: '700' },
  sessionCardType: { fontSize: 11, fontWeight: '600' },
  sessionCardPreview: { color: '#444', fontSize: 11, marginTop: 2 },
  dupBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: '#111', borderWidth: 1, borderColor: '#1e1e1e',
    justifyContent: 'center', alignItems: 'center',
  },

  saveBtn: {
    backgroundColor: '#e85d04', borderRadius: 12,
    paddingVertical: 15, alignItems: 'center', marginTop: 16,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#0f0f0f', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '90%', paddingHorizontal: 16, paddingTop: 16,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Session editor
  typeBtn: {
    flex: 1, minWidth: '45%', paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, borderColor: '#1e1e1e', backgroundColor: '#141414',
    alignItems: 'center', gap: 4,
  },
  typeBtnIcon: { fontSize: 20 },
  typeBtnText: { color: '#555', fontSize: 12, fontWeight: '700' },

  movCard: {
    backgroundColor: '#141414', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#1e1e1e', gap: 6, marginBottom: 8,
  },
  addMovBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderStyle: 'dashed', borderColor: '#2a2a2a',
    borderRadius: 10, paddingVertical: 12, justifyContent: 'center', marginBottom: 8,
  },
  addMovText: { color: '#555', fontSize: 13 },

  doneBtn: {
    backgroundColor: '#4ade8020', borderRadius: 12, borderWidth: 1, borderColor: '#4ade8040',
    paddingVertical: 14, alignItems: 'center', marginTop: 8,
  },
  doneBtnText: { color: '#4ade80', fontWeight: '700', fontSize: 15 },
});

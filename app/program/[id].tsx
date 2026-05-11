import { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import {
  getProgramById, ProgramSession,
  generatePavelSessions, generateWendlerSessions, WendlerConfig,
  WENDLER_LIFTS,
  generateForceStricteSessions, ForceStricteConfig,
  FORCE_STRICTE_MOVEMENTS,
} from '../../lib/programs';

// ─── Types ────────────────────────────────────────────────

type UserProgram = {
  id: string;
  program_id: string;
  start_date: string;
  sessions_done: number;
  active: boolean;
  config: Record<string, any> | null;
};

// Programmes qui demandent une config avant le démarrage
const CONFIG_TYPE: Record<string, 'pavel' | 'wendler' | 'force-stricte'> = {
  'tractions-pavel': 'pavel',
  'wendler-531':     'wendler',
  'force-stricte':   'force-stricte',
};

const LEVEL_COLOR: Record<string, string> = {
  'Débutant':      '#4ade80',
  'Intermédiaire': '#facc15',
  'Avancé':        '#f87171',
};

// ─── Helpers ──────────────────────────────────────────────

/** Calcule les sessions effectives à partir de la config enregistrée ou d'un draft */
function computeSessions(
  tpl: ReturnType<typeof getProgramById>,
  config: Record<string, any> | null | undefined,
): ProgramSession[] {
  if (!tpl) return [];
  if (!config) return tpl.sessions;
  if (tpl.id === 'tractions-pavel' && config.pullup_max)
    return generatePavelSessions(config.pullup_max);
  if (tpl.id === 'wendler-531' && config.squat)
    return generateWendlerSessions(config as WendlerConfig);
  if (tpl.id === 'force-stricte')
    return generateForceStricteSessions(config as ForceStricteConfig);
  return tpl.sessions;
}

/** Crée une séance planifiée dans le journal et retourne son ID */
async function createPlannedJournalEntry(
  userId: string,
  tpl: NonNullable<ReturnType<typeof getProgramById>>,
  progSession: ProgramSession,
  date: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      user_id: userId,
      date,
      type: tpl.category === 'Cardio' ? 'run' : 'renfo',
      status: 'planned',
      source: 'manual',
      visibility: 'friends',
      notes: `${tpl.name} — ${progSession.title}`,
      data: {
        program_id: tpl.id,
        session_number: progSession.number,
        movements: progSession.movements.map(m => ({ name: m.name, sets: m.sets, reps: m.reps })),
      },
    })
    .select('id')
    .single();
  if (error) { console.error('createPlannedJournalEntry:', error); return null; }
  return data?.id ?? null;
}

// ─── Écran principal ──────────────────────────────────────

export default function ProgramDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const { session } = useAuth();

  const tpl = getProgramById(id ?? '');

  const [userProgram, setUserProgram] = useState<UserProgram | null>(null);
  const [loading, setLoading]         = useState(true);
  const [starting, setStarting]       = useState(false);
  const [completing, setCompleting]   = useState(false);
  const [feedback, setFeedback]       = useState('');
  const [feedbackOk, setFeedbackOk]   = useState(true);   // true = vert, false = rouge
  const [showAll, setShowAll]         = useState(false);

  // Config avant démarrage
  const [showConfig, setShowConfig]   = useState(false);
  const [configDraft, setConfigDraft] = useState<Record<string, string>>({});

  useEffect(() => { fetchUserProgram(); }, [id, session]);

  async function fetchUserProgram() {
    if (!session?.user || !id) { setLoading(false); return; }
    const { data } = await supabase
      .from('user_programs')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('program_id', id)
      .eq('active', true)
      .maybeSingle();
    setUserProgram(data ?? null);
    setLoading(false);
  }

  function showMsg(msg: string, ok = true, delay = 3000) {
    setFeedback(msg);
    setFeedbackOk(ok);
    setTimeout(() => setFeedback(''), delay);
  }

  // Sessions effectives selon config stockée
  const effectiveSessions = useMemo(
    () => computeSessions(tpl, userProgram?.config),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tpl?.id, JSON.stringify(userProgram?.config)],
  );

  // ── Clic sur "Commencer" ──────────────────────────────
  function handleStartClick() {
    if (!session?.user) {
      router.push('/(auth)/login');
      return;
    }
    const cfgType = tpl ? CONFIG_TYPE[tpl.id] : undefined;
    if (!cfgType) {
      handleStart(undefined);
      return;
    }
    setConfigDraft(
      cfgType === 'pavel'
        ? { pullup_max: '5' }
        : cfgType === 'force-stricte'
          ? { pullup: '', hspu: '', pushup: '', dips: '' }
          : { squat: '100', bench: '80', deadlift: '120', ohp: '60',
              squat_on: 'on', bench_on: 'on', deadlift_on: 'on', ohp_on: 'on' },
    );
    setShowConfig(true);
  }

  // ── Validation du formulaire de config ───────────────
  function handleConfigSubmit() {
    if (!tpl) return;
    const cfgType = CONFIG_TYPE[tpl.id];
    if (cfgType === 'pavel') {
      const max = parseInt(configDraft.pullup_max ?? '', 10);
      if (isNaN(max) || max < 3) {
        showMsg('⚠️ Minimum 3 tractions', false, 3000);
        return;
      }
      handleStart({ pullup_max: max });
    } else if (cfgType === 'wendler') {
      const config: Record<string, any> = {};
      for (const lift of WENDLER_LIFTS) {
        const isOn = configDraft[lift.onKey] !== 'off';
        config[lift.onKey] = isOn;
        if (isOn) {
          const val = parseFloat(configDraft[lift.key] ?? '');
          if (isNaN(val) || val <= 0) {
            showMsg(`⚠️ Entre la charge pour ${lift.label}`, false, 3000);
            return;
          }
          config[lift.key] = val;
        }
      }
      const anyOn = WENDLER_LIFTS.some(l => config[l.onKey] !== false);
      if (!anyOn) {
        showMsg('⚠️ Active au moins un mouvement', false, 3000);
        return;
      }
      handleStart(config);
    } else if (cfgType === 'force-stricte') {
      const fsConfig: Record<string, number> = {};
      for (const mov of FORCE_STRICTE_MOVEMENTS) {
        const raw = configDraft[mov.key] ?? '';
        const val = raw === '' ? 0 : parseInt(raw, 10);
        if (isNaN(val) || val < 0) {
          showMsg(`⚠️ Valeur invalide pour ${mov.label}`, false, 3000);
          return;
        }
        fsConfig[mov.key] = val;
      }
      const anyActive = FORCE_STRICTE_MOVEMENTS.some(m => fsConfig[m.key] > 0);
      if (!anyActive) {
        showMsg('⚠️ Entre ton max sur au moins un mouvement', false, 3000);
        return;
      }
      handleStart(fsConfig);
    }
  }

  // ── Démarrer le programme ─────────────────────────────
  async function handleStart(programConfig?: Record<string, any>) {
    if (!session?.user || !tpl) return;
    setStarting(true);

    // 1. Calculer les sessions correctes dès maintenant (avant que userProgram soit set)
    const sessions = computeSessions(tpl, programConfig ?? null);
    const firstSession = sessions[0];
    const today = new Date().toISOString().split('T')[0];

    // 2. Créer la 1ère séance comme "planifiée" dans le journal
    let journalId: string | null = null;
    if (firstSession) {
      journalId = await createPlannedJournalEntry(session.user.id, tpl, firstSession, today);
    }

    // 3. Config complète = config programme + référence à la séance journal
    const fullConfig: Record<string, any> = {
      ...(programConfig ?? {}),
      ...(journalId ? { current_journal_id: journalId } : {}),
    };

    // 4. Insérer dans user_programs
    const { data, error } = await supabase
      .from('user_programs')
      .insert({
        user_id: session.user.id,
        program_id: tpl.id,
        start_date: today,
        sessions_done: 0,
        active: true,
        config: Object.keys(fullConfig).length > 0 ? fullConfig : null,
      })
      .select()
      .single();

    setStarting(false);

    if (error) {
      // Nettoyer la séance journal créée en cas d'échec
      if (journalId) await supabase.from('sessions').delete().eq('id', journalId);
      const hint = error.message?.includes('config')
        ? '⚠️ Exécute user_programs.sql dans Supabase (colonne config manquante)'
        : `⚠️ Erreur : ${error.message}`;
      showMsg(hint, false, 6000);
      return;
    }

    if (data) {
      setUserProgram(data);
      setShowConfig(false);
      showMsg('✅ Programme démarré ! Séance 1 planifiée dans ton journal.', true, 3500);
    }
  }

  // ── Valider une séance ────────────────────────────────
  async function handleCompleteSession() {
    if (!session?.user || !tpl || !userProgram) return;
    const cur = effectiveSessions[userProgram.sessions_done];
    if (!cur) return;
    setCompleting(true);

    const today    = new Date().toISOString().split('T')[0];
    const journalId = userProgram.config?.current_journal_id as string | undefined;

    // 1. Marquer la séance courante comme terminée dans le journal
    if (journalId) {
      await supabase.from('sessions')
        .update({ status: 'completed', date: today })
        .eq('id', journalId)
        .eq('user_id', session.user.id);
    } else {
      // Fallback : créer une nouvelle entrée terminée
      await supabase.from('sessions').insert({
        user_id: session.user.id,
        date: today,
        type: tpl.category === 'Cardio' ? 'run' : 'renfo',
        status: 'completed',
        source: 'manual',
        visibility: 'friends',
        notes: `${tpl.name} — ${cur.title}`,
        data: {
          program_id: tpl.id,
          session_number: cur.number,
          movements: cur.movements.map(m => ({ name: m.name, sets: m.sets, reps: m.reps })),
        },
      });
    }

    const newDone   = userProgram.sessions_done + 1;
    const isFinished = newDone >= tpl.sessions_total;

    // 2. Créer la prochaine séance comme "planifiée" (si pas fini)
    let nextJournalId: string | null = null;
    if (!isFinished) {
      const next = effectiveSessions[newDone];
      if (next) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        nextJournalId = await createPlannedJournalEntry(
          session.user.id, tpl, next, tomorrow.toISOString().split('T')[0],
        );
      }
    }

    // 3. Mettre à jour user_programs
    const updatedConfig: Record<string, any> = {
      ...(userProgram.config ?? {}),
      current_journal_id: nextJournalId ?? undefined,
    };
    // Supprimer la clé si null pour ne pas polluer
    if (!nextJournalId) delete updatedConfig.current_journal_id;

    await supabase.from('user_programs')
      .update({ sessions_done: newDone, active: !isFinished, config: updatedConfig })
      .eq('id', userProgram.id);

    setUserProgram({ ...userProgram, sessions_done: newDone, active: !isFinished, config: updatedConfig });
    setCompleting(false);
    showMsg(
      isFinished
        ? '🏁 Programme terminé ! Bravo !'
        : '✅ Séance validée ! Prochaine séance planifiée dans le journal.',
      true, 3500,
    );
  }

  // ── Gardes de rendu ───────────────────────────────────
  if (!tpl) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={{ color: '#aaa' }}>Programme introuvable.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: '#e85d04' }}>← Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }
  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color="#e85d04" size="large" />
      </View>
    );
  }

  const done       = userProgram?.sessions_done ?? 0;
  const pct        = Math.round((done / tpl.sessions_total) * 100);
  const curSession = effectiveSessions[done] ?? null;
  const isEnrolled = !!userProgram;
  const isFinished = done >= tpl.sessions_total;
  const toShow     = showAll ? effectiveSessions : effectiveSessions.slice(0, 5);
  const cfgType    = CONFIG_TYPE[tpl.id];
  const userCfg    = userProgram?.config ?? null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Retour */}
      <TouchableOpacity
        onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/programs')}
        style={styles.backBtn}
      >
        <Text style={styles.backText}>← Programmes</Text>
      </TouchableOpacity>

      {/* Header */}
      <View style={styles.headerBlock}>
        <Text style={styles.emoji}>{tpl.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{tpl.name}</Text>
          <Text style={styles.author}>par {tpl.author}</Text>
        </View>
        <View style={[styles.levelBadge, { borderColor: LEVEL_COLOR[tpl.level] }]}>
          <Text style={[styles.levelText, { color: LEVEL_COLOR[tpl.level] }]}>{tpl.level}</Text>
        </View>
      </View>

      {/* Meta chips */}
      <View style={styles.metaRow}>
        <MetaChip icon="⏱" label={`${tpl.duration_weeks} sem.`} />
        <MetaChip icon="📅" label={tpl.frequency} />
        <MetaChip icon="🎯" label={`${tpl.sessions_total} séances`} />
        <MetaChip icon="🏋️" label={tpl.equipment} />
      </View>

      {/* Description */}
      <View style={styles.descCard}>
        <Text style={styles.descText}>{tpl.description}</Text>
        {tpl.goal && (
          <View style={styles.goalRow}>
            <Text style={styles.goalLabel}>Objectif</Text>
            <Text style={styles.goalText}>{tpl.goal}</Text>
          </View>
        )}
      </View>

      {/* ══════════════════════════════════════════════════
          ZONE DÉMARRAGE — config + bouton — en haut, bien visible
      ══════════════════════════════════════════════════ */}
      {!isEnrolled && (
        <>
          {/* Formulaire de config (Pavel / Wendler) */}
          {showConfig && (
            <View style={styles.configCard}>
              {cfgType === 'pavel' && (
                <>
                  <Text style={styles.configTitle}>🎯 Ton niveau actuel</Text>
                  <Text style={styles.configSub}>
                    Combien de tractions peux-tu enchaîner au maximum (prise large) ?
                  </Text>
                  <Text style={styles.configLabel}>Max tractions (min 3)</Text>
                  <TextInput
                    style={styles.configInput}
                    value={configDraft.pullup_max}
                    onChangeText={v => setConfigDraft(p => ({ ...p, pullup_max: v }))}
                    keyboardType="numeric"
                    placeholder="ex : 5"
                    placeholderTextColor="#444"
                    autoFocus
                  />
                  {(() => {
                    const n = parseInt(configDraft.pullup_max ?? '', 10);
                    if (isNaN(n) || n < 3) return null;
                    const preview = Array.from({ length: 5 }, (_, i) => Math.max(n - i, 1));
                    return (
                      <Text style={styles.configHint}>
                        Sem 1 J1 : {preview.join(' / ')} reps · Sem 6 J1 : {preview.map(v => v + 5).join(' / ')} reps
                      </Text>
                    );
                  })()}
                </>
              )}

              {cfgType === 'wendler' && (
                <>
                  <Text style={styles.configTitle}>🏋️ Tes charges maximales (1RM)</Text>
                  <Text style={styles.configSub}>
                    Active les mouvements que tu veux suivre. Le programme calcule ton Training Max (TM = 90% du 1RM) automatiquement.
                  </Text>
                  {WENDLER_LIFTS.map(({ key, onKey, label }) => {
                    const isOn = configDraft[onKey] !== 'off';
                    const val  = parseFloat(configDraft[key] ?? '');
                    const tm   = isOn && !isNaN(val) && val > 0 ? Math.round(val * 0.9 / 2.5) * 2.5 : null;
                    return (
                      <View key={key} style={styles.configRow}>
                        <View style={styles.configLabelRow}>
                          <Text style={[styles.configLabel, !isOn && { color: '#444' }]}>{label}</Text>
                          <TouchableOpacity
                            style={[styles.toggleBtn, isOn ? styles.toggleOn : styles.toggleOff]}
                            onPress={() => setConfigDraft(p => ({ ...p, [onKey]: isOn ? 'off' : 'on' }))}
                          >
                            <Text style={[styles.toggleText, isOn ? styles.toggleOnText : styles.toggleOffText]}>
                              {isOn ? 'ON' : 'OFF'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                        {isOn && (
                          <>
                            <TextInput
                              style={styles.configInput}
                              value={configDraft[key]}
                              onChangeText={v => setConfigDraft(p => ({ ...p, [key]: v }))}
                              keyboardType="numeric"
                              placeholder="1RM en kg (ex : 100)"
                              placeholderTextColor="#444"
                            />
                            {tm !== null && (
                              <Text style={styles.configHint}>TM = {tm} kg</Text>
                            )}
                          </>
                        )}
                      </View>
                    );
                  })}
                </>
              )}

              {cfgType === 'force-stricte' && (
                <>
                  <Text style={styles.configTitle}>🤸 Tes maxes actuels</Text>
                  <Text style={styles.configSub}>
                    Entre ton max de reps sur chaque mouvement. Laisse vide ou mets 0 pour exclure un mouvement du programme.
                  </Text>
                  {FORCE_STRICTE_MOVEMENTS.map(({ key, label }) => {
                    const val = parseInt(configDraft[key] ?? '', 10);
                    const excluded = configDraft[key] === '' || configDraft[key] === '0' || val === 0;
                    return (
                      <View key={key} style={styles.configRow}>
                        <Text style={[styles.configLabel, excluded && { color: '#444' }]}>
                          {label}{excluded ? '  — exclu' : ''}
                        </Text>
                        <TextInput
                          style={[styles.configInput, excluded && { opacity: 0.4 }]}
                          value={configDraft[key]}
                          onChangeText={v => setConfigDraft(p => ({ ...p, [key]: v }))}
                          keyboardType="number-pad"
                          placeholder="0 = exclu du programme"
                          placeholderTextColor="#444"
                        />
                        {!excluded && !isNaN(val) && val > 0 && (
                          <Text style={styles.configHint}>
                            Sem 1 : {Math.max(1, Math.round(val * 0.5))} reps × 3 séries · Sem 7 : {Math.max(1, Math.round(val * 0.75))} reps × 4 séries
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </>
              )}

              {/* Feedback inline */}
              {feedback ? (
                <View style={[styles.feedbackBox, feedbackOk ? styles.feedbackGreen : styles.feedbackRed]}>
                  <Text style={feedbackOk ? styles.feedbackGreenText : styles.feedbackRedText}>{feedback}</Text>
                </View>
              ) : null}

              <View style={styles.configActions}>
                <TouchableOpacity style={styles.configCancelBtn} onPress={() => setShowConfig(false)}>
                  <Text style={styles.configCancelText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.configStartBtn}
                  onPress={handleConfigSubmit}
                  disabled={starting}
                >
                  {starting
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.configStartText}>🚀 Démarrer →</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Bouton Commencer (si le formulaire n'est pas ouvert) */}
          {!showConfig && (
            feedback ? (
              <View style={[styles.feedbackBox, feedbackOk ? styles.feedbackGreen : styles.feedbackRed]}>
                <Text style={feedbackOk ? styles.feedbackGreenText : styles.feedbackRedText}>{feedback}</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.startBtn} onPress={handleStartClick} disabled={starting}>
                {starting
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.startBtnText}>🚀 Commencer ce programme</Text>
                }
              </TouchableOpacity>
            )
          )}
        </>
      )}

      {/* Config badge si inscrit */}
      {isEnrolled && userCfg && cfgType === 'pavel' && (
        <View style={styles.cfgBadge}>
          <Text style={styles.cfgBadgeText}>🎯 Max configuré : {userCfg.pullup_max} tractions</Text>
        </View>
      )}
      {isEnrolled && userCfg && cfgType === 'wendler' && (
        <View style={styles.cfgBadge}>
          <Text style={styles.cfgBadgeText}>
            🏋️ Squat {userCfg.squat} · DC {userCfg.bench} · SDT {userCfg.deadlift} · DM {userCfg.ohp} kg
          </Text>
        </View>
      )}
      {isEnrolled && userCfg && cfgType === 'force-stricte' && (
        <View style={styles.cfgBadge}>
          <Text style={styles.cfgBadgeText}>
            🤸{' '}
            {FORCE_STRICTE_MOVEMENTS.filter(m => (userCfg[m.key] ?? 0) > 0)
              .map(m => `${m.label.split(' ').slice(1).join(' ')} ×${userCfg[m.key]}`)
              .join(' · ')}
          </Text>
        </View>
      )}

      {/* Progression */}
      {isEnrolled && !isFinished && (
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Séance {done + 1} / {tpl.sessions_total}</Text>
            <Text style={styles.progressPct}>{pct}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
          </View>
        </View>
      )}
      {isFinished && (
        <View style={styles.finishedCard}>
          <Text style={styles.finishedText}>🏁 Programme terminé ! Félicitations !</Text>
        </View>
      )}

      {/* Séance du jour */}
      {isEnrolled && !isFinished && curSession && (
        <View style={styles.currentCard}>
          <Text style={styles.currentLabel}>Séance du jour</Text>
          <Text style={styles.currentTitle}>{curSession.title}</Text>
          {curSession.notes && <Text style={styles.currentNotes}>{curSession.notes}</Text>}

          <View style={styles.movList}>
            {curSession.movements.map((mov, i) => (
              <View key={i} style={styles.movRow}>
                <View style={styles.movIndex}>
                  <Text style={styles.movIndexText}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.movName}>{mov.name}</Text>
                  <Text style={styles.movMeta}>
                    {mov.sets > 1 ? `${mov.sets} séries` : '1 série'} · {mov.reps}
                  </Text>
                  {mov.notes && <Text style={styles.movNote}>{mov.notes}</Text>}
                </View>
              </View>
            ))}
          </View>

          {feedback ? (
            <View style={[styles.feedbackBox, feedbackOk ? styles.feedbackGreen : styles.feedbackRed, { marginTop: 4 }]}>
              <Text style={feedbackOk ? styles.feedbackGreenText : styles.feedbackRedText}>{feedback}</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.doneBtn} onPress={handleCompleteSession} disabled={completing}>
              {completing
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.doneBtnText}>✅ Séance terminée !</Text>
              }
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Aperçu des séances */}
      <Text style={styles.sectionLabel}>Aperçu du programme</Text>
      {toShow.map((s, i) => (
        <SessionRow
          key={s.number}
          session={s}
          done={i < done}
          current={i === done && isEnrolled && !isFinished}
        />
      ))}
      {effectiveSessions.length > 5 && (
        <TouchableOpacity style={styles.showMoreBtn} onPress={() => setShowAll(!showAll)}>
          <Text style={styles.showMoreText}>
            {showAll ? 'Afficher moins ▲' : `Voir les ${effectiveSessions.length - 5} autres séances ▼`}
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

// ─── Sous-composants ──────────────────────────────────────

function MetaChip({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={chipStyles.chip}>
      <Text style={chipStyles.icon}>{icon}</Text>
      <Text style={chipStyles.label}>{label}</Text>
    </View>
  );
}

function SessionRow({
  session, done, current,
}: {
  session: ProgramSession; done: boolean; current: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <TouchableOpacity
      style={[rowStyles.row, done && rowStyles.rowDone, current && rowStyles.rowCurrent]}
      onPress={() => setOpen(!open)}
      activeOpacity={0.7}
    >
      <View style={rowStyles.top}>
        <View style={[rowStyles.dot, done && rowStyles.dotDone, current && rowStyles.dotCurrent]} />
        <Text style={[rowStyles.title, done && rowStyles.titleDone]}>{session.title}</Text>
        {current && <Text style={rowStyles.currentBadge}>En cours</Text>}
        {done && <Text style={rowStyles.doneBadge}>✓</Text>}
        <Text style={rowStyles.arrow}>{open ? '▲' : '▼'}</Text>
      </View>
      {open && (
        <View style={rowStyles.detail}>
          {session.notes && <Text style={rowStyles.notes}>{session.notes}</Text>}
          {session.movements.map((m, i) => (
            <View key={i} style={rowStyles.mov}>
              <Text style={rowStyles.movName}>{m.name}</Text>
              <Text style={rowStyles.movMeta}>{m.sets > 1 ? `${m.sets}×` : '1×'} {m.reps}</Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  content: { paddingTop: 60, paddingHorizontal: 16, paddingBottom: 48 },
  centered: { justifyContent: 'center', alignItems: 'center' },

  backBtn: { marginBottom: 16 },
  backText: { color: '#e85d04', fontSize: 15 },

  headerBlock: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  emoji: { fontSize: 36 },
  name: { color: '#fff', fontSize: 22, fontWeight: '800' },
  author: { color: '#555', fontSize: 13, marginTop: 2 },
  levelBadge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  levelText: { fontSize: 12, fontWeight: '700' },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },

  descCard: {
    backgroundColor: '#141414', borderRadius: 12,
    borderWidth: 1, borderColor: '#1c1c1c',
    padding: 14, marginBottom: 16, gap: 10,
  },
  descText: { color: '#aaa', fontSize: 14, lineHeight: 21 },
  goalRow: { borderTopWidth: 1, borderTopColor: '#1c1c1c', paddingTop: 10, gap: 4 },
  goalLabel: { color: '#555', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  goalText: { color: '#ddd', fontSize: 14, fontWeight: '600' },

  // ── Config form ────────────────────────────────────────
  configCard: {
    backgroundColor: '#141414', borderRadius: 16,
    borderWidth: 1, borderColor: '#e85d04',   // bordure orange = bien visible
    padding: 18, marginBottom: 16,
  },
  configTitle: { color: '#fff', fontSize: 17, fontWeight: '800', marginBottom: 4 },
  configSub: { color: '#777', fontSize: 13, lineHeight: 18, marginBottom: 14 },
  configRow: { marginBottom: 12 },
  configLabelRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 6,
  },
  configLabel: {
    color: '#888', fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', flex: 1,
  },
  toggleBtn: {
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 8, borderWidth: 1,
  },
  toggleOn: { backgroundColor: '#1a1a0a', borderColor: '#e85d04' },
  toggleOff: { backgroundColor: '#1c1c1c', borderColor: '#333' },
  toggleText: { fontSize: 11, fontWeight: '800' },
  toggleOnText: { color: '#e85d04' },
  toggleOffText: { color: '#444' },
  configInput: {
    backgroundColor: '#1c1c1c', borderRadius: 10,
    borderWidth: 1, borderColor: '#2a2a2a',
    color: '#fff', fontSize: 20, fontWeight: '700',
    paddingHorizontal: 14, paddingVertical: 12,
  },
  configHint: { color: '#e85d04', fontSize: 12, marginTop: 5, fontStyle: 'italic' },
  configActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  configCancelBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 10,
    backgroundColor: '#1c1c1c', borderWidth: 1, borderColor: '#2a2a2a', alignItems: 'center',
  },
  configCancelText: { color: '#888', fontWeight: '700', fontSize: 14 },
  configStartBtn: {
    flex: 2, paddingVertical: 13, borderRadius: 10,
    backgroundColor: '#e85d04', alignItems: 'center',
  },
  configStartText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  // ── Bouton démarrer ────────────────────────────────────
  startBtn: {
    backgroundColor: '#e85d04', borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', marginBottom: 20,
  },
  startBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  // ── Feedback ───────────────────────────────────────────
  feedbackBox: {
    borderRadius: 10, borderWidth: 1,
    paddingVertical: 13, paddingHorizontal: 14, marginBottom: 16,
  },
  feedbackGreen: { backgroundColor: '#0a2a0a', borderColor: '#1a4a1a' },
  feedbackGreenText: { color: '#4ade80', fontWeight: '700', fontSize: 14 },
  feedbackRed: { backgroundColor: '#2a0a0a', borderColor: '#4a1a1a' },
  feedbackRedText: { color: '#f87171', fontWeight: '700', fontSize: 13 },

  // ── Config badge (inscrit) ──────────────────────────────
  cfgBadge: {
    backgroundColor: '#1a2a1a', borderRadius: 10,
    borderWidth: 1, borderColor: '#2a4a2a',
    padding: 10, marginBottom: 12,
  },
  cfgBadgeText: { color: '#4ade80', fontSize: 12, fontWeight: '600' },

  // ── Progression ────────────────────────────────────────
  progressCard: {
    backgroundColor: '#141414', borderRadius: 12, borderWidth: 1, borderColor: '#2a2a2a',
    padding: 14, marginBottom: 12, gap: 8,
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  progressTitle: { color: '#ddd', fontSize: 14, fontWeight: '600' },
  progressPct: { color: '#e85d04', fontWeight: '700' },
  progressBar: { height: 6, backgroundColor: '#2a2a2a', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: '#e85d04', borderRadius: 3 },

  finishedCard: {
    backgroundColor: '#0a2a0a', borderRadius: 12, borderWidth: 1, borderColor: '#1a4a1a',
    padding: 14, marginBottom: 12, alignItems: 'center',
  },
  finishedText: { color: '#4ade80', fontSize: 15, fontWeight: '700' },

  // ── Séance du jour ─────────────────────────────────────
  currentCard: {
    backgroundColor: '#1c1c1c', borderRadius: 14,
    borderWidth: 1, borderColor: '#e85d04',
    padding: 16, marginBottom: 16, gap: 10,
  },
  currentLabel: { color: '#e85d04', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  currentTitle: { color: '#fff', fontSize: 17, fontWeight: '800' },
  currentNotes: { color: '#888', fontSize: 13, lineHeight: 18 },

  movList: { gap: 8 },
  movRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  movIndex: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#2a2a2a', alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  movIndexText: { color: '#888', fontSize: 11, fontWeight: '700' },
  movName: { color: '#fff', fontSize: 14, fontWeight: '700' },
  movMeta: { color: '#e85d04', fontSize: 13 },
  movNote: { color: '#666', fontSize: 12, marginTop: 2 },

  doneBtn: {
    backgroundColor: '#e85d04', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 4,
  },
  doneBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // ── Aperçu séances ─────────────────────────────────────
  sectionLabel: {
    color: '#444', fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 16,
  },
  showMoreBtn: { alignItems: 'center', paddingVertical: 12 },
  showMoreText: { color: '#555', fontSize: 13, fontWeight: '600' },
});

const chipStyles = StyleSheet.create({
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#1c1c1c', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  icon: { fontSize: 13 },
  label: { color: '#888', fontSize: 12 },
});

const rowStyles = StyleSheet.create({
  row: {
    backgroundColor: '#141414', borderRadius: 10,
    borderWidth: 1, borderColor: '#1c1c1c',
    padding: 12, marginBottom: 6,
  },
  rowDone: { opacity: 0.6 },
  rowCurrent: { borderColor: '#e85d04', backgroundColor: '#1c1c1c' },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#333' },
  dotDone: { backgroundColor: '#4ade80' },
  dotCurrent: { backgroundColor: '#e85d04' },
  title: { flex: 1, color: '#aaa', fontSize: 13, fontWeight: '600' },
  titleDone: { color: '#555' },
  currentBadge: {
    color: '#e85d04', fontSize: 11, fontWeight: '700',
    backgroundColor: '#2a1500', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  doneBadge: { color: '#4ade80', fontSize: 13 },
  arrow: { color: '#444', fontSize: 12 },
  detail: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#1c1c1c', gap: 6 },
  notes: { color: '#666', fontSize: 12, marginBottom: 4, fontStyle: 'italic' },
  mov: { flexDirection: 'row', justifyContent: 'space-between' },
  movName: { color: '#ddd', fontSize: 13 },
  movMeta: { color: '#e85d04', fontSize: 13 },
});

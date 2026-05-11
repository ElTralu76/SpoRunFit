import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, ActivityIndicator, ScrollView,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme, ThemeColors } from '../../lib/ThemeContext';
import { secondsToTime, secondsToPace } from '../../lib/prDetection';
import LoginGate from '../../components/LoginGate';

type PRCategory = 'strength' | 'run' | 'crossfit';

type PR = {
  id: string;
  category: PRCategory;
  movement: string;
  value: number;
  unit: string;
  date: string;
  session_id: string | null;
};

type GroupedPRs = Record<PRCategory, { movement: string; best: PR; history: PR[] }[]>;

const CATEGORY_LABELS: Record<PRCategory, string> = {
  strength: '🏋️ Force',
  run: '🏃 Course',
  crossfit: '🔥 CrossFit',
};

const CATEGORY_ACCENT: Record<PRCategory, string> = {
  strength: '#a78bfa',
  run:      '#60a5fa',
  crossfit: '#f26318',
};

const CATEGORY_BG: Record<PRCategory, string> = {
  strength: '#0f0f1e',
  run:      '#0c1220',
  crossfit: '#130a00',
};

const UNIT_LABELS: Record<string, string> = {
  kg: 'kg',
  km: 'km',
  's': '',          // affiché formaté en temps
  's/km': '',       // affiché formaté en allure
};

function formatValue(value: number, unit: string): string {
  if (unit === 's') return secondsToTime(value);
  if (unit === 's/km') return secondsToPace(value);
  return `${value} ${unit}`;
}

export default function RecordsScreen() {
  const { session } = useAuth();
  const { theme } = useTheme();
  const [prs, setPrs] = useState<PR[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<PRCategory>('strength');

  // Modal ajout manuel
  const [modalVisible, setModalVisible] = useState(false);
  const [newCategory, setNewCategory] = useState<PRCategory>('strength');
  const [newMovement, setNewMovement] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newUnit, setNewUnit] = useState('kg');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  // Historique d'un mouvement
  const [historyMovement, setHistoryMovement] = useState<string | null>(null);
  const styles = useMemo(() => makeStyles(theme), [theme]);

  useFocusEffect(
    useCallback(() => {
      fetchPRs();
    }, [session])
  );

  async function fetchPRs() {
    if (!session?.user) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('personal_records')
      .select('id, category, movement, value, unit, date, session_id')
      .eq('user_id', session.user.id)
      .order('date', { ascending: false });
    if (data) setPrs(data);
    setLoading(false);
  }

  // Regroupe par catégorie → mouvement → meilleur + historique
  function buildGroups(): GroupedPRs {
    const result: GroupedPRs = { strength: [], run: [], crossfit: [] };

    const byCategory = prs.filter(p => p.category === activeCategory);
    const movNames = [...new Set(byCategory.map(p => p.movement))];

    for (const mov of movNames) {
      const history = byCategory
        .filter(p => p.movement === mov)
        .sort((a, b) => {
          // Pour les temps (s, s/km) : plus petit = meilleur
          if (a.unit === 's' || a.unit === 's/km') return a.value - b.value;
          return b.value - a.value;
        });
      if (history.length > 0) {
        result[activeCategory].push({ movement: mov, best: history[0], history });
      }
    }

    return result;
  }

  async function handleSavePR() {
    if (!session?.user || !newMovement.trim() || !newValue.trim()) return;
    const val = parseFloat(newValue.replace(',', '.'));
    if (isNaN(val)) return;

    setSaving(true);
    const { error } = await supabase.from('personal_records').insert({
      user_id: session.user.id,
      category: newCategory,
      movement: newMovement.trim(),
      value: val,
      unit: newUnit,
      date: newDate,
      session_id: null,
    });
    setSaving(false);

    if (!error) {
      setModalVisible(false);
      setNewMovement('');
      setNewValue('');
      fetchPRs();
    }
  }

  function openModal() {
    setNewCategory(activeCategory);
    setNewUnit(activeCategory === 'strength' ? 'kg' : activeCategory === 'run' ? 'km' : 's');
    setNewDate(new Date().toISOString().split('T')[0]);
    setModalVisible(true);
  }

  const groups = buildGroups();
  const items = groups[activeCategory];
  const accent = CATEGORY_ACCENT[activeCategory];

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color="#f26318" size="large" />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.header}>Records</Text>
        </View>
        {/* Onglets catégorie visibles mais contenu protégé */}
        <View style={styles.tabs}>
          {(Object.keys(CATEGORY_LABELS) as PRCategory[]).map(cat => (
            <View key={cat} style={[styles.tab, activeCategory === cat && { borderBottomColor: CATEGORY_ACCENT[cat], borderBottomWidth: 2 }]}>
              <Text style={[styles.tabText, activeCategory === cat && { color: CATEGORY_ACCENT[cat] }]}>
                {CATEGORY_LABELS[cat]}
              </Text>
            </View>
          ))}
        </View>
        <LoginGate
          icon="trophy-outline"
          title="Tes records personnels"
          subtitle="Connecte-toi pour suivre tes PRs en force, course et CrossFit — détectés automatiquement après chaque séance."
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.header}>Records</Text>
        <TouchableOpacity style={[styles.addBtn, { borderColor: accent + '80' }]} onPress={openModal}>
          <Ionicons name="add" size={16} color={accent} />
          <Text style={[styles.addBtnText, { color: accent }]}>PR</Text>
        </TouchableOpacity>
      </View>

      {/* Category tabs */}
      <View style={styles.tabs}>
        {(Object.keys(CATEGORY_LABELS) as PRCategory[]).map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.tab, activeCategory === cat && { borderBottomColor: CATEGORY_ACCENT[cat], borderBottomWidth: 2 }]}
            onPress={() => { setActiveCategory(cat); setHistoryMovement(null); }}
          >
            <Text style={[styles.tabText, activeCategory === cat && { color: CATEGORY_ACCENT[cat] }]}>
              {CATEGORY_LABELS[cat]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Liste des PRs */}
      {items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Aucun PR dans cette catégorie.</Text>
          <Text style={styles.emptyHint}>Appuie sur + PR pour en ajouter un manuellement.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => item.movement}
          contentContainerStyle={{ paddingBottom: 32 }}
          renderItem={({ item }) => {
            const isOpen = historyMovement === item.movement;
            return (
              <TouchableOpacity
                style={[styles.prCard, { borderColor: CATEGORY_ACCENT[activeCategory], backgroundColor: CATEGORY_BG[activeCategory] }]}
                onPress={() => setHistoryMovement(isOpen ? null : item.movement)}
                activeOpacity={0.8}
              >
                <View style={styles.prCardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.prMovement}>{item.movement}</Text>
                    <Text style={[styles.prValue, { color: CATEGORY_ACCENT[activeCategory] }]}>
                      {formatValue(item.best.value, item.best.unit)}
                    </Text>
                  </View>
                  <View style={styles.prMeta}>
                    <Text style={styles.prDate}>{formatDate(item.best.date)}</Text>
                    <Text style={styles.prCount}>{item.history.length} entrée{item.history.length > 1 ? 's' : ''}</Text>
                    <Text style={styles.prArrow}>{isOpen ? '▲' : '▼'}</Text>
                  </View>
                </View>

                {/* Historique déroulant */}
                {isOpen && (
                  <View style={styles.history}>
                    {item.history.map((h, i) => (
                      <View key={h.id} style={[styles.historyRow, i === 0 && styles.historyBest]}>
                        <Text style={[styles.historyValue, i === 0 && { color: CATEGORY_ACCENT[activeCategory] }]}>
                          {formatValue(h.value, h.unit)}
                        </Text>
                        <Text style={styles.historyDate}>{formatDate(h.date)}</Text>
                        {i === 0 && <Text style={[styles.prBadge, { color: CATEGORY_ACCENT[activeCategory], borderColor: CATEGORY_ACCENT[activeCategory] }]}>PR</Text>}
                      </View>
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Modal ajout manuel */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouveau PR</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Catégorie */}
            <Text style={styles.modalLabel}>Catégorie</Text>
            <View style={styles.modalRow}>
              {(Object.keys(CATEGORY_LABELS) as PRCategory[]).map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.modalCatBtn, newCategory === cat && { backgroundColor: CATEGORY_BG[cat], borderColor: CATEGORY_ACCENT[cat] }]}
                  onPress={() => {
                    setNewCategory(cat);
                    setNewUnit(cat === 'strength' ? 'kg' : cat === 'run' ? 'km' : 's');
                  }}
                >
                  <Text style={[styles.modalCatText, newCategory === cat && { color: CATEGORY_ACCENT[cat] }]}>
                    {CATEGORY_LABELS[cat]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Mouvement */}
            <Text style={styles.modalLabel}>Mouvement / WOD / Distance</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Back Squat, Fran, 10K…"
              placeholderTextColor="#555"
              value={newMovement}
              onChangeText={setNewMovement}
            />

            {/* Valeur + unité */}
            <View style={styles.modalRow}>
              <View style={{ flex: 2 }}>
                <Text style={styles.modalLabel}>Valeur</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="100"
                  placeholderTextColor="#555"
                  value={newValue}
                  onChangeText={setNewValue}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalLabel}>Unité</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="kg"
                  placeholderTextColor="#555"
                  value={newUnit}
                  onChangeText={setNewUnit}
                />
              </View>
            </View>

            {/* Date */}
            <Text style={styles.modalLabel}>Date</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#555"
              value={newDate}
              onChangeText={setNewDate}
            />

            <TouchableOpacity
              style={[styles.modalSave, (!newMovement.trim() || !newValue.trim()) && { opacity: 0.4 }]}
              onPress={handleSavePR}
              disabled={!newMovement.trim() || !newValue.trim() || saving}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSaveText}>Enregistrer le PR</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' });
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg, paddingTop: 56, paddingHorizontal: 16 },
    centered: { justifyContent: 'center', alignItems: 'center' },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
    header: { fontSize: 32, fontWeight: '900', color: c.t1, letterSpacing: -1 },
    addBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      borderWidth: 1, borderRadius: 100,
      paddingHorizontal: 14, paddingVertical: 8,
      backgroundColor: c.surf, borderColor: c.border,
    },
    addBtnText: { fontWeight: '700', fontSize: 12, letterSpacing: 0.3 },

    tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: c.border, marginBottom: 18 },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomColor: 'transparent', borderBottomWidth: 2 },
    tabText: { color: c.t3, fontWeight: '700', fontSize: 11, letterSpacing: 0.3 },

    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
    emptyText: { color: c.t2, fontSize: 15, fontWeight: '600' },
    emptyHint: { color: c.t3, fontSize: 13 },

    prCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 10 },
    prCardTop: { flexDirection: 'row', alignItems: 'flex-start' },
    prMovement: { color: c.t1, fontSize: 14, fontWeight: '700', marginBottom: 4, letterSpacing: -0.1 },
    prValue: { fontSize: 28, fontWeight: '900', letterSpacing: -1 },
    prMeta: { alignItems: 'flex-end', gap: 3 },
    prDate: { color: c.t2, fontSize: 11 },
    prCount: { color: c.t3, fontSize: 11 },
    prArrow: { color: c.t3, fontSize: 11, marginTop: 4 },

    history: { marginTop: 14, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 12, gap: 8 },
    historyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    historyBest: {},
    historyValue: { color: c.t1, fontWeight: '700', fontSize: 14, width: 96 },
    historyDate: { color: c.t2, fontSize: 12, flex: 1 },
    prBadge: {
      fontSize: 9, fontWeight: '800',
      borderWidth: 1, borderRadius: 100,
      paddingHorizontal: 7, paddingVertical: 2, letterSpacing: 0.5,
    },

    modalOverlay: { flex: 1, backgroundColor: c.isDark ? 'rgba(4,4,12,0.85)' : 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalSheet: {
      backgroundColor: c.surf, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      padding: 22, paddingBottom: 44, gap: 4,
      borderWidth: 1, borderColor: c.border,
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    modalTitle: { color: c.t1, fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
    modalClose: { color: c.t3, fontSize: 20 },
    modalLabel: {
      color: c.t3, fontSize: 10, fontWeight: '700',
      textTransform: 'uppercase', letterSpacing: 1.5,
      marginTop: 14, marginBottom: 7,
    },
    modalRow: { flexDirection: 'row', gap: 10 },
    modalInput: {
      backgroundColor: c.surf2, borderRadius: 12,
      paddingHorizontal: 14, paddingVertical: 13,
      color: c.t1, fontSize: 15,
      borderWidth: 1, borderColor: c.border2,
    },
    modalCatBtn: {
      flex: 1, paddingVertical: 9, borderRadius: 100, alignItems: 'center',
      backgroundColor: c.surf2, borderWidth: 1, borderColor: c.border2,
    },
    modalCatText: { color: c.t3, fontWeight: '700', fontSize: 10, letterSpacing: 0.3 },
    modalSave: {
      backgroundColor: c.orange, borderRadius: 14,
      paddingVertical: 16, alignItems: 'center', marginTop: 18,
    },
    modalSaveText: { color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 0.2 },
  });
}

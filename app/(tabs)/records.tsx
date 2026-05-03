import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, ActivityIndicator, ScrollView,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { secondsToTime, secondsToPace } from '../../lib/prDetection';

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
  run: '#60a5fa',
  crossfit: '#e85d04',
};

const CATEGORY_BG: Record<PRCategory, string> = {
  strength: '#1a1a3a',
  run: '#1a2a4a',
  crossfit: '#2a1500',
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
        <ActivityIndicator color="#e85d04" size="large" />
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a', paddingTop: 56, paddingHorizontal: 16 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  header: { fontSize: 28, fontWeight: '800', color: '#fff' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: '#111',
  },
  addBtnText: { fontWeight: '700', fontSize: 13 },

  // Tabs
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#1c1c1c', marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomColor: 'transparent', borderBottomWidth: 2 },
  tabText: { color: '#555', fontWeight: '700', fontSize: 12 },

  // Empty
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  emptyText: { color: '#aaa', fontSize: 16 },
  emptyHint: { color: '#555', fontSize: 13 },

  // PR card
  prCard: {
    borderRadius: 12, borderWidth: 1, padding: 14,
    marginBottom: 10,
  },
  prCardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  prMovement: { color: '#ddd', fontSize: 15, fontWeight: '700', marginBottom: 2 },
  prValue: { fontSize: 22, fontWeight: '800' },
  prMeta: { alignItems: 'flex-end', gap: 2 },
  prDate: { color: '#666', fontSize: 11 },
  prCount: { color: '#444', fontSize: 11 },
  prArrow: { color: '#444', fontSize: 12, marginTop: 4 },

  // History
  history: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#ffffff15', paddingTop: 10, gap: 6 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  historyBest: {},
  historyValue: { color: '#aaa', fontWeight: '700', fontSize: 14, width: 90 },
  historyDate: { color: '#555', fontSize: 12, flex: 1 },
  prBadge: {
    fontSize: 10, fontWeight: '800',
    borderWidth: 1, borderRadius: 4,
    paddingHorizontal: 5, paddingVertical: 1,
  },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#141414', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 40, gap: 4,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  modalClose: { color: '#666', fontSize: 20 },
  modalLabel: { color: '#666', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginTop: 12, marginBottom: 6 },
  modalRow: { flexDirection: 'row', gap: 10 },
  modalInput: {
    backgroundColor: '#1c1c1c', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    color: '#fff', fontSize: 15,
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  modalCatBtn: {
    flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: 'center',
    backgroundColor: '#1c1c1c', borderWidth: 1, borderColor: '#2a2a2a',
  },
  modalCatText: { color: '#555', fontWeight: '700', fontSize: 11 },
  modalSave: {
    backgroundColor: '#e85d04', borderRadius: 12,
    paddingVertical: 15, alignItems: 'center', marginTop: 16,
  },
  modalSaveText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});

import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import MovementPicker from './MovementPicker';

// ─── Types ────────────────────────────────────────────────

export type WodFormat = 'AMRAP' | 'FOR TIME' | 'EMOM' | 'DEATH BY' | 'REST';

export type WodMovement = {
  id: string;
  name: string;
  reps: string;
  weight_kg: string;
};

export type WodBlock = {
  id: string;
  format: WodFormat;
  duration_min: string;   // AMRAP, EMOM, REST
  rounds: string;         // FOR TIME
  time_cap_min: string;   // FOR TIME : time cap optionnel
  every_min: string;      // EMOM : toutes les X min
  movements: WodMovement[];
  death_by_score: string; // DEATH BY : rounds atteints
};

type Props = {
  blocks: WodBlock[];
  onChange: (blocks: WodBlock[]) => void;
};

// ─── Constantes ───────────────────────────────────────────

const FORMAT_OPTIONS: WodFormat[] = ['AMRAP', 'FOR TIME', 'EMOM', 'DEATH BY'];

const FORMAT_COLORS: Record<WodFormat, string> = {
  'AMRAP':    '#1a2a4a',
  'FOR TIME': '#2a1500',
  'EMOM':     '#1a1a3a',
  'DEATH BY': '#2a1a1a',
  'REST':     '#1a1a1a',
};
const FORMAT_ACCENT: Record<WodFormat, string> = {
  'AMRAP':    '#60a5fa',
  'FOR TIME': '#e85d04',
  'EMOM':     '#a78bfa',
  'DEATH BY': '#f87171',
  'REST':     '#555',
};

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function emptyMovement(): WodMovement {
  return { id: uid(), name: '', reps: '', weight_kg: '' };
}

function emptyBlock(format: WodFormat): WodBlock {
  return {
    id: uid(), format,
    duration_min: '', rounds: '', time_cap_min: '', every_min: '1',
    movements: format === 'REST' ? [] : [emptyMovement()],
    death_by_score: '',
  };
}

// ─── Composant principal ──────────────────────────────────

export default function WodCustomBuilder({ blocks, onChange }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<{ blockId: string; movId: string } | null>(null);

  function updateBlock(id: string, patch: Partial<WodBlock>) {
    onChange(blocks.map(b => b.id === id ? { ...b, ...patch } : b));
  }

  function removeBlock(id: string) {
    onChange(blocks.filter(b => b.id !== id));
  }

  function addBlock(format: WodFormat) {
    onChange([...blocks, emptyBlock(format)]);
  }

  function addRest() {
    onChange([...blocks, emptyBlock('REST')]);
  }

  // Mouvement
  function updateMovement(blockId: string, movId: string, patch: Partial<WodMovement>) {
    onChange(blocks.map(b => {
      if (b.id !== blockId) return b;
      return { ...b, movements: b.movements.map(m => m.id === movId ? { ...m, ...patch } : m) };
    }));
  }

  function addMovementToBlock(blockId: string) {
    onChange(blocks.map(b => {
      if (b.id !== blockId) return b;
      return { ...b, movements: [...b.movements, emptyMovement()] };
    }));
  }

  function removeMovement(blockId: string, movId: string) {
    onChange(blocks.map(b => {
      if (b.id !== blockId) return b;
      return { ...b, movements: b.movements.filter(m => m.id !== movId) };
    }));
  }

  function openPicker(blockId: string, movId: string) {
    setPickerTarget({ blockId, movId });
    setPickerOpen(true);
  }

  function handlePickerSelect(name: string) {
    if (pickerTarget) {
      updateMovement(pickerTarget.blockId, pickerTarget.movId, { name });
    }
    setPickerOpen(false);
    setPickerTarget(null);
  }

  return (
    <View style={styles.container}>
      {/* ── Blocs ─────────────────────────────────────── */}
      {blocks.map((block, idx) => {
        const accent = FORMAT_ACCENT[block.format];
        const bg = FORMAT_COLORS[block.format];

        return (
          <View key={block.id} style={[styles.block, { borderColor: accent, backgroundColor: bg }]}>
            {/* En-tête du bloc */}
            <View style={styles.blockHeader}>
              <Text style={[styles.blockFormat, { color: accent }]}>{block.format}</Text>
              <TouchableOpacity onPress={() => removeBlock(block.id)} style={styles.removeBlockBtn}>
                <Text style={styles.removeBlockText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Paramètres selon le format */}
            {block.format === 'AMRAP' && (
              <View style={styles.paramRow}>
                <Text style={styles.paramLabel}>Durée (min)</Text>
                <TextInput
                  style={styles.paramInput}
                  value={block.duration_min}
                  onChangeText={v => updateBlock(block.id, { duration_min: v })}
                  placeholder="20"
                  placeholderTextColor="#444"
                  keyboardType="numeric"
                />
              </View>
            )}

            {block.format === 'FOR TIME' && (
              <View style={styles.paramRow}>
                <View style={styles.paramHalf}>
                  <Text style={styles.paramLabel}>Rounds</Text>
                  <TextInput
                    style={styles.paramInput}
                    value={block.rounds}
                    onChangeText={v => updateBlock(block.id, { rounds: v })}
                    placeholder="3"
                    placeholderTextColor="#444"
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.paramHalf}>
                  <Text style={styles.paramLabel}>Time cap (min)</Text>
                  <TextInput
                    style={styles.paramInput}
                    value={block.time_cap_min}
                    onChangeText={v => updateBlock(block.id, { time_cap_min: v })}
                    placeholder="—"
                    placeholderTextColor="#444"
                    keyboardType="numeric"
                  />
                </View>
              </View>
            )}

            {block.format === 'EMOM' && (
              <View style={styles.paramRow}>
                <View style={styles.paramHalf}>
                  <Text style={styles.paramLabel}>Durée (min)</Text>
                  <TextInput
                    style={styles.paramInput}
                    value={block.duration_min}
                    onChangeText={v => updateBlock(block.id, { duration_min: v })}
                    placeholder="20"
                    placeholderTextColor="#444"
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.paramHalf}>
                  <Text style={styles.paramLabel}>Toutes les X min</Text>
                  <TextInput
                    style={styles.paramInput}
                    value={block.every_min}
                    onChangeText={v => updateBlock(block.id, { every_min: v })}
                    placeholder="1"
                    placeholderTextColor="#444"
                    keyboardType="numeric"
                  />
                </View>
              </View>
            )}

            {block.format === 'DEATH BY' && (
              <View style={styles.paramRow}>
                <Text style={styles.paramLabel}>Rounds atteints (score)</Text>
                <TextInput
                  style={styles.paramInput}
                  value={block.death_by_score}
                  onChangeText={v => updateBlock(block.id, { death_by_score: v })}
                  placeholder="14"
                  placeholderTextColor="#444"
                  keyboardType="numeric"
                />
              </View>
            )}

            {block.format === 'REST' && (
              <View style={styles.paramRow}>
                <Text style={styles.paramLabel}>Durée (min)</Text>
                <TextInput
                  style={styles.paramInput}
                  value={block.duration_min}
                  onChangeText={v => updateBlock(block.id, { duration_min: v })}
                  placeholder="3"
                  placeholderTextColor="#444"
                  keyboardType="numeric"
                />
              </View>
            )}

            {/* Mouvements (hors REST) */}
            {block.format !== 'REST' && (
              <>
                {block.movements.map((mov, mIdx) => (
                  <View key={mov.id} style={styles.movRow}>
                    {/* Sélecteur mouvement */}
                    <TouchableOpacity
                      style={styles.movName}
                      onPress={() => openPicker(block.id, mov.id)}
                    >
                      <Text style={mov.name ? styles.movNameText : styles.movNamePlaceholder} numberOfLines={1}>
                        {mov.name || 'Choisir un mouvement…'}
                      </Text>
                    </TouchableOpacity>

                    {/* Reps */}
                    <TextInput
                      style={styles.movSmall}
                      value={mov.reps}
                      onChangeText={v => updateMovement(block.id, mov.id, { reps: v })}
                      placeholder="Reps"
                      placeholderTextColor="#444"
                      keyboardType="numeric"
                    />

                    {/* Poids */}
                    <TextInput
                      style={styles.movSmall}
                      value={mov.weight_kg}
                      onChangeText={v => updateMovement(block.id, mov.id, { weight_kg: v })}
                      placeholder="kg"
                      placeholderTextColor="#444"
                      keyboardType="decimal-pad"
                    />

                    {/* Supprimer mouvement */}
                    {block.movements.length > 1 && (
                      <TouchableOpacity
                        onPress={() => removeMovement(block.id, mov.id)}
                        style={styles.removeMov}
                      >
                        <Text style={styles.removeMovText}>−</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}

                {/* Ajouter un mouvement */}
                <TouchableOpacity
                  style={[styles.addMovBtn, { borderColor: accent }]}
                  onPress={() => addMovementToBlock(block.id)}
                >
                  <Text style={[styles.addMovText, { color: accent }]}>+ Mouvement</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        );
      })}

      {/* ── Boutons d'ajout ───────────────────────────── */}
      <Text style={styles.addSectionLabel}>Ajouter un bloc</Text>
      <View style={styles.addBlockRow}>
        {FORMAT_OPTIONS.map(fmt => (
          <TouchableOpacity
            key={fmt}
            style={[styles.addBlockBtn, { borderColor: FORMAT_ACCENT[fmt] }]}
            onPress={() => addBlock(fmt)}
          >
            <Text style={[styles.addBlockText, { color: FORMAT_ACCENT[fmt] }]}>{fmt}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.addBlockBtn, { borderColor: FORMAT_ACCENT['REST'] }]}
          onPress={addRest}
        >
          <Text style={[styles.addBlockText, { color: FORMAT_ACCENT['REST'] }]}>REPOS</Text>
        </TouchableOpacity>
      </View>

      {/* Modal picker */}
      <MovementPicker
        visible={pickerOpen}
        onSelect={handlePickerSelect}
        onClose={() => { setPickerOpen(false); setPickerTarget(null); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  block: {
    borderRadius: 12, borderWidth: 1, padding: 14, gap: 10,
  },
  blockHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  blockFormat: { fontWeight: '800', fontSize: 13, letterSpacing: 1 },
  removeBlockBtn: { padding: 2 },
  removeBlockText: { color: '#555', fontSize: 16 },
  paramRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  paramHalf: { flex: 1, gap: 4 },
  paramLabel: { color: '#666', fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  paramInput: {
    flex: 1, backgroundColor: '#0f0f0f', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 9, color: '#fff', fontSize: 15,
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  movRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  movName: {
    flex: 1, backgroundColor: '#0f0f0f', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 10,
    borderWidth: 1, borderColor: '#2a2a2a',
    justifyContent: 'center',
  },
  movNameText: { color: '#fff', fontSize: 13 },
  movNamePlaceholder: { color: '#444', fontSize: 13 },
  movSmall: {
    width: 52, backgroundColor: '#0f0f0f', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 10, color: '#fff',
    fontSize: 13, textAlign: 'center',
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  removeMov: {
    width: 28, height: 28, borderRadius: 6, backgroundColor: '#2a1a1a',
    justifyContent: 'center', alignItems: 'center',
  },
  removeMovText: { color: '#f87171', fontSize: 18, lineHeight: 20 },
  addMovBtn: {
    borderWidth: 1, borderStyle: 'dashed', borderRadius: 8,
    paddingVertical: 8, alignItems: 'center',
  },
  addMovText: { fontSize: 12, fontWeight: '700' },
  addSectionLabel: {
    color: '#444', fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4,
  },
  addBlockRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  addBlockBtn: {
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: '#111',
  },
  addBlockText: { fontSize: 12, fontWeight: '700' },
});

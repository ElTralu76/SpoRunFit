import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { loadMovements, addMovement, getMovements } from '../lib/movements';

type Props = {
  visible: boolean;
  onSelect: (name: string) => void;
  onClose: () => void;
};

export default function MovementPicker({ visible, onSelect, onClose }: Props) {
  const [movements, setMovements] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (visible) {
      loadMovements().then(setMovements);
      setSearch('');
      setNewName('');
    }
  }, [visible]);

  const filtered = movements.filter(m =>
    m.toLowerCase().includes(search.toLowerCase())
  );

  async function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const updated = await addMovement(trimmed);
    setMovements(updated);
    onSelect(trimmed);
    setNewName('');
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.sheet}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Mouvement</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Search */}
          <TextInput
            style={styles.search}
            placeholder="Rechercher…"
            placeholderTextColor="#555"
            value={search}
            onChangeText={setSearch}
            autoFocus
          />

          {/* Liste */}
          <FlatList
            data={filtered}
            keyExtractor={(item) => item}
            style={styles.list}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.item}
                onPress={() => { onSelect(item); setSearch(''); }}
              >
                <Text style={styles.itemText}>{item}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={styles.empty}>Aucun mouvement trouvé.</Text>
            }
          />

          {/* Nouveau mouvement */}
          <View style={styles.newSection}>
            <Text style={styles.newLabel}>Nouveau mouvement</Text>
            <View style={styles.newRow}>
              <TextInput
                style={styles.newInput}
                placeholder="Nom du mouvement"
                placeholderTextColor="#555"
                value={newName}
                onChangeText={setNewName}
                onSubmitEditing={handleAdd}
              />
              <TouchableOpacity
                style={[styles.addBtn, !newName.trim() && styles.addBtnDisabled]}
                onPress={handleAdd}
                disabled={!newName.trim()}
              >
                <Text style={styles.addBtnText}>Créer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#141414', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '80%', paddingBottom: 32,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12,
  },
  title: { color: '#fff', fontSize: 17, fontWeight: '700' },
  closeBtn: { padding: 4 },
  closeText: { color: '#666', fontSize: 18 },
  search: {
    backgroundColor: '#1c1c1c', marginHorizontal: 16, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, color: '#fff', fontSize: 15,
    borderWidth: 1, borderColor: '#2a2a2a', marginBottom: 8,
  },
  list: { flexGrow: 0, maxHeight: 320 },
  item: {
    paddingHorizontal: 20, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: '#1c1c1c',
  },
  itemText: { color: '#ddd', fontSize: 15 },
  empty: { color: '#555', textAlign: 'center', padding: 24, fontSize: 14 },
  newSection: {
    borderTopWidth: 1, borderTopColor: '#222',
    paddingHorizontal: 16, paddingTop: 14, gap: 8,
  },
  newLabel: { color: '#666', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  newRow: { flexDirection: 'row', gap: 10 },
  newInput: {
    flex: 1, backgroundColor: '#1c1c1c', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 11, color: '#fff', fontSize: 15,
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  addBtn: {
    backgroundColor: '#e85d04', borderRadius: 10,
    paddingHorizontal: 16, justifyContent: 'center',
  },
  addBtnDisabled: { opacity: 0.4 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

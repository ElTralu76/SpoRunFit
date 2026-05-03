import { View, Text, StyleSheet } from 'react-native';

export default function FeedScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Feed</Text>
      <Text style={styles.placeholder}>Le feed arrive avec la fonctionnalité sociale (étape 4).</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
    paddingTop: 60,
    paddingHorizontal: 16,
  },
  header: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 16,
  },
  placeholder: {
    color: '#555',
    fontSize: 14,
  },
});

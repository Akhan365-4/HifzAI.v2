import { StyleSheet, View, Text } from 'react-native';

export default function QuranScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quran</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});

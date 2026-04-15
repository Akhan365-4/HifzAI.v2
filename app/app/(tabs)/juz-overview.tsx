import { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { router } from 'expo-router';

import { mockJuzData, STATUS_CYCLE, type PageStatus, type JuzData } from '@/data/mock-juz-data';

const statusColors: Record<PageStatus, string> = {
  'Strong': '#d4edda',
  'Needs Review': '#fff3cd',
  'Retest Needed': '#f8d7da',
  'Not Tested': '#e2e3e5',
};

const statusTextColors: Record<PageStatus, string> = {
  'Strong': '#155724',
  'Needs Review': '#856404',
  'Retest Needed': '#721c24',
  'Not Tested': '#383d41',
};

export default function JuzOverviewScreen() {
  const [selectedJuz, setSelectedJuz] = useState(1);
  const [juzDataState, setJuzDataState] = useState<JuzData[]>(() =>
    mockJuzData.map((juz) => ({ ...juz, pages: juz.pages.map((p) => ({ ...p })) })),
  );
  const juzData = juzDataState[selectedJuz - 1];

  const handlePagePress = (pageNumber: number) => {
    setJuzDataState((prev) =>
      prev.map((juz) => ({
        ...juz,
        pages: juz.pages.map((p) => {
          if (p.pageNumber !== pageNumber) return p;
          const nextIndex = (STATUS_CYCLE.indexOf(p.status) + 1) % STATUS_CYCLE.length;
          return { ...p, status: STATUS_CYCLE[nextIndex] };
        }),
      })),
    );
    router.navigate({ pathname: '/(tabs)/quran', params: { page: String(pageNumber) } });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Text style={styles.header}>Juz Overview</Text>

      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={selectedJuz}
          onValueChange={(value) => setSelectedJuz(value)}
          style={styles.picker}
        >
          {Array.from({ length: 30 }, (_, i) => (
            <Picker.Item key={i + 1} label={`Juz ${i + 1}`} value={i + 1} />
          ))}
        </Picker>
      </View>

      <ScrollView contentContainerStyle={styles.grid}>
        {juzData.pages.map((page) => (
          <TouchableOpacity
            key={page.pageNumber}
            style={[styles.tile, { backgroundColor: statusColors[page.status] }]}
            onPress={() => handlePagePress(page.pageNumber)}
            activeOpacity={0.7}
          >
            <Text style={[styles.pageNumber, { color: statusTextColors[page.status] }]}>
              Page {page.pageNumber}
            </Text>
            <Text style={[styles.statusLabel, { color: statusTextColors[page.status] }]}>
              {page.status}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingTop: 16,
    paddingBottom: 8,
  },
  pickerContainer: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  tile: {
    width: '46%',
    margin: '2%',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageNumber: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  statusLabel: {
    fontSize: 12,
  },
});

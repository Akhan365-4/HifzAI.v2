import { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';

import { usePageStatus } from '@/contexts/page-status-context';
import {
  evaluateTest,
  DIFFICULTIES,
  MAX_MISTAKES,
  type Difficulty,
} from '@/utils/evaluate-test';

type Mode = 'Read' | 'Test';

const MAX_PAGE = 604;

export default function QuranScreen() {
  const { page: pageParam } = useLocalSearchParams<{ page?: string }>();
  const { setPageStatus } = usePageStatus();
  const [mode, setMode] = useState<Mode>('Read');
  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [difficulty, setDifficulty] = useState<Difficulty>('Easy');
  const [mistakeCount, setMistakeCount] = useState(0);

  useEffect(() => {
    if (pageParam) {
      const parsed = parseInt(pageParam, 10);
      if (!isNaN(parsed)) {
        goToPage(parsed);
      }
    }
  }, [pageParam]);

  useEffect(() => {
    setMistakeCount(0);
  }, [page, difficulty]);

  const goToPage = (target: number) => {
    const clamped = Math.max(1, Math.min(MAX_PAGE, target));
    setPage(clamped);
    setPageInput(String(clamped));
  };

  const handlePageInputSubmit = () => {
    const parsed = parseInt(pageInput, 10);
    if (!isNaN(parsed)) {
      goToPage(parsed);
    } else {
      setPageInput(String(page));
    }
  };

  const handleCompleteTest = () => {
    const result = evaluateTest(mistakeCount, difficulty);
    setPageStatus(page, result);
    router.navigate('/(tabs)/juz-overview');
  };

  const maxMistakes = MAX_MISTAKES[difficulty];

  return (
    <SafeAreaView style={styles.safeArea}>
      <Text style={styles.header}>Quran</Text>

      <View style={styles.modeRow}>
        {(['Read', 'Test'] as Mode[]).map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.modeButton, mode === m && styles.modeButtonActive]}
            onPress={() => setMode(m)}
            activeOpacity={0.7}
          >
            <Text style={[styles.modeText, mode === m && styles.modeTextActive]}>
              {m}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.pageInputRow}>
        <Text style={styles.pageInputLabel}>Page:</Text>
        <TextInput
          style={styles.pageInput}
          value={pageInput}
          onChangeText={setPageInput}
          onSubmitEditing={handlePageInputSubmit}
          onBlur={handlePageInputSubmit}
          keyboardType="number-pad"
          returnKeyType="go"
          selectTextOnFocus
        />
        <Text style={styles.pageTotal}>/ {MAX_PAGE}</Text>
      </View>

      {mode === 'Test' && (
        <View style={styles.difficultyRow}>
          {DIFFICULTIES.map((d) => (
            <TouchableOpacity
              key={d}
              style={[styles.difficultyButton, difficulty === d && styles.difficultyButtonActive]}
              onPress={() => setDifficulty(d)}
              activeOpacity={0.7}
            >
              <Text style={[styles.difficultyText, difficulty === d && styles.difficultyTextActive]}>
                {d}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.pageArea}>
        <Text style={styles.pageTitle}>Quran Page {page}</Text>
        <Text style={styles.pagePlaceholder}>
          15-line Uthmani Madina Mushaf placeholder
        </Text>
        <Text style={styles.modeIndicator}>Mode: {mode}</Text>
      </View>

      {mode === 'Test' && (
        <View style={styles.testControls}>
          <View style={styles.mistakeRow}>
            <Text style={styles.mistakeText}>
              Mistakes: {mistakeCount} / {maxMistakes === Infinity ? '∞' : maxMistakes}
            </Text>
            <TouchableOpacity
              style={styles.addMistakeButton}
              onPress={() => setMistakeCount((c) => c + 1)}
              activeOpacity={0.7}
            >
              <Text style={styles.addMistakeText}>+ Add Mistake</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.completeTestButton}
            onPress={handleCompleteTest}
            activeOpacity={0.7}
          >
            <Text style={styles.completeTestText}>Complete Test</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.navRow}>
        <TouchableOpacity
          style={[styles.navButton, page <= 1 && styles.navButtonDisabled]}
          onPress={() => goToPage(page - 1)}
          disabled={page <= 1}
          activeOpacity={0.7}
        >
          <Text style={[styles.navButtonText, page <= 1 && styles.navButtonTextDisabled]}>
            ← Previous Page
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, page >= MAX_PAGE && styles.navButtonDisabled]}
          onPress={() => goToPage(page + 1)}
          disabled={page >= MAX_PAGE}
          activeOpacity={0.7}
        >
          <Text style={[styles.navButtonText, page >= MAX_PAGE && styles.navButtonTextDisabled]}>
            Next Page →
          </Text>
        </TouchableOpacity>
      </View>
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
  modeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  modeButton: {
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#f5f5f5',
  },
  modeButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  modeText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  modeTextActive: {
    color: '#fff',
  },
  pageInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  pageInputLabel: {
    fontSize: 15,
    color: '#333',
  },
  pageInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 15,
    width: 64,
    textAlign: 'center',
  },
  pageTotal: {
    fontSize: 15,
    color: '#666',
  },
  difficultyRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  difficultyButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#f5f5f5',
  },
  difficultyButtonActive: {
    backgroundColor: '#5856D6',
    borderColor: '#5856D6',
  },
  difficultyText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
  },
  difficultyTextActive: {
    color: '#fff',
  },
  pageArea: {
    flex: 1,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fafafa',
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  pagePlaceholder: {
    fontSize: 14,
    color: '#888',
    marginBottom: 12,
  },
  modeIndicator: {
    fontSize: 13,
    color: '#aaa',
  },
  testControls: {
    paddingHorizontal: 16,
    marginTop: 12,
  },
  mistakeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  mistakeText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  addMistakeButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
    backgroundColor: '#FF3B30',
  },
  addMistakeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  completeTestButton: {
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#34C759',
    alignItems: 'center',
  },
  completeTestText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  navButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  navButtonDisabled: {
    backgroundColor: '#e0e0e0',
  },
  navButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  navButtonTextDisabled: {
    color: '#999',
  },
});

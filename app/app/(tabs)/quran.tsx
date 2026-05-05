import { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';

import { usePageStatus } from '@/contexts/page-status-context';
import { fetchFullQuranUthmani, PAGE_TO_SURAH, type SurahData } from '@/services/quran-api';
import { MISTAKE_TYPES, type Mistake, type MistakeType, type PageStatus } from '@/data/mock-juz-data';
import {
  evaluateTest,
  DIFFICULTIES,
  MAX_MISTAKES,
  type Difficulty,
} from '@/utils/evaluate-test';

type Mode = 'Read' | 'Test';

interface TestFeedback {
  result: PageStatus;
  totalMistakes: number;
  breakdown: Record<MistakeType, number>;
}

const RECOMMENDATIONS: Record<string, string> = {
  'Strong': 'Great job. You can move forward or review once more for confidence.',
  'Needs Review': 'Review this page again before moving on.',
  'Retest Needed': 'Retest this page after focused review.',
};

const feedbackColors: Record<string, { bg: string; text: string }> = {
  'Strong': { bg: '#d4edda', text: '#155724' },
  'Needs Review': { bg: '#fff3cd', text: '#856404' },
  'Retest Needed': { bg: '#f8d7da', text: '#721c24' },
};

const tagColors: Record<MistakeType, { bg: string; text: string }> = {
  'missed word': { bg: '#fde8e8', text: '#b91c1c' },
  'pronunciation': { bg: '#fff4e5', text: '#c2410c' },
  'wrong ayah': { bg: '#fce4ec', text: '#ad1457' },
  'hesitation': { bg: '#fff8e1', text: '#f57f17' },
};

const MAX_PAGE = 604;

const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

function toArabicDigits(n: number): string {
  return String(n)
    .split('')
    .map((d) => ARABIC_DIGITS[Number(d)] ?? d)
    .join('');
}

let mistakeIdCounter = 0;

export default function QuranScreen() {
  const { page: pageParam } = useLocalSearchParams<{ page?: string }>();
  const { isLoaded, getPageMistakes, setPageMistakes, setPageStatus } = usePageStatus();
  const [mode, setMode] = useState<Mode>('Read');
  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [difficulty, setDifficulty] = useState<Difficulty>('Easy');
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [feedback, setFeedback] = useState<TestFeedback | null>(null);
  const [isFeedbackExpanded, setIsFeedbackExpanded] = useState(true);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [surah, setSurah] = useState<SurahData | null>(null);
  const [isLoadingText, setIsLoadingText] = useState(false);
  const [textError, setTextError] = useState<string | null>(null);

  useEffect(() => {
    const surahNumber = PAGE_TO_SURAH[page];
    if (!surahNumber || mode !== 'Read') {
      setSurah(null);
      setTextError(null);
      return;
    }
    let cancelled = false;
    setIsLoadingText(true);
    setTextError(null);
    fetchFullQuranUthmani()
      .then((quran) => {
        if (cancelled) return;
        const found = quran.surahs.find((s) => s.number === surahNumber);
        if (!found) {
          setTextError(`Surah ${surahNumber} not found`);
          setSurah(null);
        } else {
          setSurah(found);
        }
      })
      .catch((err) => {
        if (!cancelled) setTextError(err.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingText(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, mode]);

  useEffect(() => {
    if (pageParam) {
      const parsed = parseInt(pageParam, 10);
      if (!isNaN(parsed)) {
        goToPage(parsed);
      }
    }
  }, [pageParam]);

  useEffect(() => {
    if (!isLoaded) return;
    setMistakes(getPageMistakes(page));
    setFeedback(null);
    setSelectedLine(null);
  }, [page, isLoaded, mode]);

  const hasMountedDifficulty = useRef(false);
  useEffect(() => {
    if (!hasMountedDifficulty.current) {
      hasMountedDifficulty.current = true;
      return;
    }
    setMistakes([]);
    setPageMistakes(page, []);
    setSelectedLine(null);
  }, [difficulty]);

  const addMistakeToLine = (type: MistakeType) => {
    if (selectedLine === null) return;
    mistakeIdCounter += 1;
    const newMistake: Mistake = { id: String(mistakeIdCounter), position: selectedLine, type };
    const updated = [...mistakes, newMistake];
    setMistakes(updated);
    setPageMistakes(page, updated);
  };

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
    const result = evaluateTest(mistakes.length, difficulty);
    setPageStatus(page, result);
    setPageMistakes(page, mistakes);

    const breakdown: Record<MistakeType, number> = {
      'missed word': 0,
      'pronunciation': 0,
      'wrong ayah': 0,
      'hesitation': 0,
    };
    for (const m of mistakes) {
      breakdown[m.type]++;
    }

    setFeedback({ result, totalMistakes: mistakes.length, breakdown });
    setIsFeedbackExpanded(true);
  };

  const maxMistakes = MAX_MISTAKES[difficulty];

  const mistakesByLine = useMemo(() => {
    const map = new Map<number, string[]>();
    for (const m of mistakes) {
      const existing = map.get(m.position) ?? [];
      existing.push(m.type);
      map.set(m.position, existing);
    }
    return map;
  }, [mistakes]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
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
          <View style={styles.pageHeader}>
            <Text style={styles.pageTitle}>Page {page}</Text>
            <Text style={styles.modeIndicator}>{mode} Mode</Text>
          </View>
          {mode === 'Read' && PAGE_TO_SURAH[page] ? (
            <View style={styles.mushafPage}>
              {isLoadingText && (
                <Text style={styles.loadingText}>Loading Quran text...</Text>
              )}
              {textError && (
                <Text style={styles.errorText}>Error: {textError}</Text>
              )}
              {!isLoadingText && !textError && surah && (
                <>
                  <View style={styles.surahHeader}>
                    <Text style={styles.surahNameArabic}>{surah.name}</Text>
                    <View style={styles.surahMetaRow}>
                      <Text style={styles.surahMetaText}>{surah.englishName}</Text>
                      <Text style={styles.surahMetaDot}>·</Text>
                      <Text style={styles.surahMetaText}>{surah.englishNameTranslation}</Text>
                    </View>
                    <View style={styles.surahMetaRow}>
                      <Text style={styles.surahMetaSubtle}>
                        {surah.revelationType}  ·  {surah.numberOfAyahs} ayahs
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.mushafText}>
                    {surah.ayahs.map((ayah, idx) => (
                      <Text key={ayah.number}>
                        {idx > 0 ? ' ' : ''}
                        {ayah.text}
                        <Text style={styles.ayahMarker}>
                          {' '}﴿{toArabicDigits(ayah.numberInSurah)}﴾{' '}
                        </Text>
                      </Text>
                    ))}
                  </Text>
                </>
              )}
            </View>
          ) : mode === 'Read' ? (
            <View style={styles.pageLines}>
              {Array.from({ length: 15 }, (_, i) => (
                <View key={i} style={styles.pageLine}>
                  <View style={styles.pageLineBar} />
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.pageLines}>
              {Array.from({ length: 15 }, (_, i) => {
                const lineNum = i + 1;
                const hasError = mistakesByLine.has(lineNum);
                const isSelected = selectedLine === lineNum;
                return (
                  <TouchableOpacity
                    key={i}
                    style={styles.pageLine}
                    onPress={() => setSelectedLine((prev) => prev === lineNum ? null : lineNum)}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.pageLineBar,
                      hasError && !isSelected && styles.pageLineBarError,
                      isSelected && styles.pageLineBarSelected,
                    ]} />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {mode === 'Test' && (
          <View style={styles.testControls}>
            <View style={styles.mistakeRow}>
              <Text style={styles.mistakeText}>
                Mistakes: {mistakes.length} / {maxMistakes === Infinity ? '∞' : maxMistakes}
              </Text>
              {selectedLine !== null && (
                <Text style={styles.selectedLineLabel}>Line {selectedLine}</Text>
              )}
            </View>

            {selectedLine !== null ? (
              <View style={styles.mistakeTypeRow}>
                {MISTAKE_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.mistakeTypeButton, { backgroundColor: tagColors[type].bg }]}
                    onPress={() => addMistakeToLine(type)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.mistakeTypeText, { color: tagColors[type].text }]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text style={styles.selectLinePrompt}>Tap a line above to add a mistake</Text>
            )}

            <View style={styles.linePanel}>
              {Array.from({ length: 15 }, (_, i) => {
                const lineNum = i + 1;
                const lineErrors = mistakesByLine.get(lineNum);
                const hasError = !!lineErrors;
                return (
                  <View
                    key={lineNum}
                    style={[styles.lineRow, hasError && styles.lineRowError]}
                  >
                    <Text style={[styles.lineNumber, hasError && styles.lineNumberError]}>
                      Line {lineNum}
                    </Text>
                    {hasError && (
                      <View style={styles.tagContainer}>
                        {lineErrors.map((type, idx) => (
                          <View
                            key={`${lineNum}-${type}-${idx}`}
                            style={[styles.tag, { backgroundColor: tagColors[type as MistakeType].bg }]}
                          >
                            <Text style={[styles.tagText, { color: tagColors[type as MistakeType].text }]}>
                              {type}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
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

        {feedback && (
          <View style={[styles.feedbackCard, { backgroundColor: feedbackColors[feedback.result].bg }]}>
            <View style={styles.feedbackHeader}>
              <Text style={[styles.feedbackResult, { color: feedbackColors[feedback.result].text }]}>
                Result: {feedback.result}
              </Text>
              <TouchableOpacity
                onPress={() => setIsFeedbackExpanded((prev) => !prev)}
                activeOpacity={0.7}
              >
                <Text style={styles.feedbackToggle}>
                  {isFeedbackExpanded ? 'Hide Details' : 'Show Details'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.feedbackDetail, { color: feedbackColors[feedback.result].text }]}>
              Total Mistakes: {feedback.totalMistakes}
            </Text>

            {isFeedbackExpanded && (
              <>
                {feedback.totalMistakes > 0 && (
                  <View style={styles.feedbackBreakdown}>
                    {MISTAKE_TYPES.map((type) =>
                      feedback.breakdown[type] > 0 ? (
                        <Text key={type} style={styles.feedbackBreakdownItem}>
                          {type}: {feedback.breakdown[type]}
                        </Text>
                      ) : null,
                    )}
                  </View>
                )}
                <Text style={styles.feedbackRecommendation}>
                  {RECOMMENDATIONS[feedback.result]}
                </Text>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => router.navigate('/(tabs)/juz-overview')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.backButtonText}>Back to Juz Overview</Text>
                </TouchableOpacity>
              </>
            )}
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingTop: 16,
    paddingBottom: 12,
  },
  modeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
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
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#d5d0c8',
    borderRadius: 8,
    backgroundColor: '#fdf9f3',
    padding: 14,
  },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  pageTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#444',
  },
  modeIndicator: {
    fontSize: 12,
    color: '#999',
  },
  pageLines: {
    gap: 8,
  },
  pageLine: {
    justifyContent: 'center',
    height: 18,
  },
  loadingText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    paddingVertical: 40,
  },
  errorText: {
    fontSize: 14,
    color: '#c0392b',
    textAlign: 'center',
    paddingVertical: 40,
  },
  mushafPage: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  surahHeader: {
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#d9c9a3',
    borderRadius: 10,
    backgroundColor: '#f7efde',
  },
  surahNameArabic: {
    fontSize: 26,
    color: '#3a2e1a',
    textAlign: 'center',
    writingDirection: 'rtl',
    fontWeight: '600',
    marginBottom: 6,
  },
  surahMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 2,
  },
  surahMetaText: {
    fontSize: 13,
    color: '#6b5a3a',
    fontWeight: '600',
  },
  surahMetaDot: {
    fontSize: 13,
    color: '#a89473',
  },
  surahMetaSubtle: {
    fontSize: 11,
    color: '#a89473',
    fontStyle: 'italic',
  },
  mushafText: {
    fontSize: 22,
    lineHeight: 44,
    textAlign: 'center',
    writingDirection: 'rtl',
    color: '#2a2419',
    fontWeight: '400',
    paddingHorizontal: 6,
  },
  ayahMarker: {
    fontSize: 16,
    color: '#9a7b3e',
    fontWeight: '700',
  },
  pageLineBar: {
    height: 8,
    borderRadius: 3,
    backgroundColor: '#e8e2d9',
  },
  pageLineBarError: {
    backgroundColor: '#f0c4c4',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d4a0a0',
  },
  pageLineBarSelected: {
    backgroundColor: '#b3d4fc',
    borderWidth: 1,
    borderColor: '#4a90d9',
  },
  testControls: {
    paddingHorizontal: 16,
    marginBottom: 16,
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
  selectedLineLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4a90d9',
  },
  mistakeTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  mistakeTypeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  mistakeTypeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  selectLinePrompt: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  linePanel: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    overflow: 'hidden',
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  lineRowError: {
    backgroundColor: '#fefafa',
  },
  lineNumber: {
    fontSize: 13,
    fontWeight: '500',
    color: '#999',
    width: 48,
  },
  lineNumberError: {
    color: '#555',
    fontWeight: '700',
  },
  tagContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
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
  feedbackCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 10,
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  feedbackResult: {
    fontSize: 18,
    fontWeight: '700',
  },
  feedbackToggle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
  },
  feedbackDetail: {
    fontSize: 14,
    marginBottom: 4,
  },
  feedbackBreakdown: {
    marginTop: 4,
    marginBottom: 8,
  },
  feedbackBreakdownItem: {
    fontSize: 13,
    color: '#555',
    paddingVertical: 1,
  },
  feedbackRecommendation: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#444',
    marginBottom: 12,
  },
  backButton: {
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 15,
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

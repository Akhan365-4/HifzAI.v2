import { useMemo } from 'react';
import { StyleSheet, View, Text, SafeAreaView, ScrollView } from 'react-native';

import { usePageStatus } from '@/contexts/page-status-context';
import { type PageStatus } from '@/data/mock-juz-data';

const statusConfig: { status: PageStatus; color: string; textColor: string }[] = [
  { status: 'Strong', color: '#d4edda', textColor: '#155724' },
  { status: 'Needs Review', color: '#fff3cd', textColor: '#856404' },
  { status: 'Retest Needed', color: '#f8d7da', textColor: '#721c24' },
  { status: 'Not Tested', color: '#e2e3e5', textColor: '#383d41' },
];

function pct(count: number, total: number): string {
  if (total === 0) return '0%';
  return `${Math.round((count / total) * 100)}%`;
}

export default function ProgressScreen() {
  const { juzData } = usePageStatus();

  const stats = useMemo(() => {
    const allPages = juzData.flatMap((juz) => juz.pages);
    const total = allPages.length;
    const counts: Record<PageStatus, number> = {
      'Strong': 0,
      'Needs Review': 0,
      'Retest Needed': 0,
      'Not Tested': 0,
    };
    for (const p of allPages) {
      counts[p.status]++;
    }
    const tested = total - counts['Not Tested'];
    return { total, counts, tested };
  }, [juzData]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.header}>Progress</Text>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Overview</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Tracked Pages</Text>
            <Text style={styles.summaryValue}>{stats.total}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Completion</Text>
            <Text style={styles.summaryValue}>
              {stats.tested} / {stats.total} ({pct(stats.tested, stats.total)})
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Strong Rate</Text>
            <Text style={styles.summaryValue}>
              {pct(stats.counts['Strong'], stats.total)}
            </Text>
          </View>
        </View>

        <View style={styles.breakdownCard}>
          <Text style={styles.summaryTitle}>Status Breakdown</Text>
          {statusConfig.map(({ status, color, textColor }) => (
            <View key={status} style={[styles.breakdownRow, { backgroundColor: color }]}>
              <Text style={[styles.breakdownLabel, { color: textColor }]}>{status}</Text>
              <Text style={[styles.breakdownCount, { color: textColor }]}>
                {stats.counts[status]}  ({pct(stats.counts[status], stats.total)})
              </Text>
            </View>
          ))}
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
  scroll: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  summaryCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#eee',
  },
  summaryTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  summaryLabel: {
    fontSize: 15,
    color: '#555',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  breakdownCard: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eee',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  breakdownLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  breakdownCount: {
    fontSize: 15,
    fontWeight: '600',
  },
});

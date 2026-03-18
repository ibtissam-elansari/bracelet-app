import { Colors, Radius } from '@/constants/theme';
import { useSensor } from '@/context/SensorContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_W } = Dimensions.get('window');
const CHART_W = SCREEN_W - 32;
type Tab = 'hr' | 'temp';

export default function HistoryScreen() {
  const { history } = useSensor();
  const [tab, setTab] = useState<Tab>('hr');

  const slice = history.slice(-20);
  const labels = slice.map((_, i) => (i % 5 === 0 ? `${i}s` : ''));
  const hrData   = slice.map((d) => d.hr   || 0);
  const tempData = slice.map((d) => d.temp || 0);

  const activeData  = tab === 'hr' ? hrData : tempData;
  const activeColor = tab === 'hr' ? Colors.heart : Colors.warning;
  const activeLabel = tab === 'hr' ? 'Heart Rate (BPM)' : 'Temperature (°C)';
  const hasData = slice.length >= 2;

  const avg = hasData ? (activeData.reduce((a, b) => a + b, 0) / activeData.length).toFixed(1) : '—';
  const max = hasData ? Math.max(...activeData).toFixed(1) : '—';
  const min = hasData ? Math.min(...activeData).toFixed(1) : '—';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>HEALTH HISTORY</Text>
        <Text style={styles.subtitle}>{history.length} readings stored</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Tabs */}
        <View style={styles.tabs}>
          {([
            { key: 'hr' as Tab, iconName: 'heart-pulse' as const, label: 'Heart Rate' },
            { key: 'temp' as Tab, iconName: 'thermometer' as const, label: 'Temperature' },
          ]).map(({ key, iconName, label }) => (
            <TouchableOpacity
              key={key}
              style={[styles.tab, tab === key && styles.tabActive]}
              onPress={() => setTab(key)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name={iconName}
                size={16}
                color={tab === key ? Colors.textPrimary : Colors.textMuted}
              />
              <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>{activeLabel}</Text>
          {hasData ? (
            <LineChart
              data={{
                labels,
                datasets: [{ data: activeData, color: () => activeColor, strokeWidth: 2.5 }],
              }}
              width={CHART_W - 32}
              height={180}
              chartConfig={{
                backgroundColor: 'transparent',
                backgroundGradientFrom: Colors.bgCard,
                backgroundGradientTo: Colors.bgCard,
                decimalPlaces: tab === 'temp' ? 1 : 0,
                color: (opacity = 1) =>
                  tab === 'hr'
                    ? `rgba(255,64,129,${opacity})`
                    : `rgba(255,179,0,${opacity})`,
                labelColor: () => Colors.textMuted,
                propsForDots: { r: '3', strokeWidth: '1.5', stroke: activeColor },
                propsForBackgroundLines: { stroke: Colors.border, strokeDasharray: '4 4' },
              }}
              bezier
              withInnerLines
              withOuterLines={false}
              withShadow={false}
              style={{ borderRadius: Radius.md, marginTop: 8 }}
            />
          ) : (
            <View style={styles.noData}>
              <MaterialCommunityIcons name="timer-sand" size={40} color={Colors.textMuted} />
              <Text style={styles.noDataText}>Collecting data…</Text>
              <Text style={styles.noDataSub}>At least 2 readings needed</Text>
            </View>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { label: 'AVG', value: avg, icon: 'chart-bell-curve' as const },
            { label: 'MAX', value: max, icon: 'arrow-up-bold' as const },
            { label: 'MIN', value: min, icon: 'arrow-down-bold' as const },
          ].map((s) => (
            <View key={s.label} style={styles.statCard}>
              <MaterialCommunityIcons name={s.icon} size={14} color={Colors.textMuted} />
              <Text style={styles.statLabel}>{s.label}</Text>
              <Text style={[styles.statValue, { color: activeColor }]}>{s.value}</Text>
              <Text style={styles.statUnit}>{tab === 'hr' ? 'bpm' : '°C'}</Text>
            </View>
          ))}
        </View>

        {/* Recent readings log */}
        <View style={styles.logSection}>
          <View style={styles.logHeader}>
            <MaterialCommunityIcons name="format-list-bulleted" size={14} color={Colors.textLabel} />
            <Text style={styles.logTitle}>RECENT READINGS</Text>
          </View>
          {[...history].reverse().slice(0, 15).map((d, i) => (
            <View key={i} style={styles.logRow}>
              <Text style={styles.logTime}>
                {new Date(d.timestamp).toLocaleTimeString()}
              </Text>
              <View style={styles.logChips}>
                <Text style={[styles.logChip, { color: Colors.heart }]}>{d.hr} BPM</Text>
                <Text style={[styles.logChip, { color: Colors.warning }]}>{d.temp}°C</Text>
                {d.fall && <Text style={[styles.logChip, { color: Colors.danger }]}>FALL</Text>}
                {d.sos  && <Text style={[styles.logChip, { color: Colors.danger }]}>SOS</Text>}
              </View>
            </View>
          ))}
          {history.length === 0 && (
            <Text style={styles.noDataText}>No data yet…</Text>
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: {
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  title: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, letterSpacing: 2 },
  subtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 3 },
  scroll: { padding: 16, gap: 16 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1, paddingVertical: 10,
    borderRadius: Radius.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  tabActive: {
    backgroundColor: Colors.bgSurface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  tabText: { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  tabTextActive: { color: Colors.textPrimary },
  chartCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
  },
  chartTitle: {
    fontSize: 12, fontWeight: '700',
    color: Colors.textLabel, letterSpacing: 1, textTransform: 'uppercase',
  },
  noData: { alignItems: 'center', paddingVertical: 36, gap: 8 },
  noDataText: { fontSize: 15, color: Colors.textSecondary, fontWeight: '600' },
  noDataSub: { fontSize: 12, color: Colors.textMuted },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    alignItems: 'center',
    gap: 3,
  },
  statLabel: { fontSize: 10, fontWeight: '700', color: Colors.textLabel, letterSpacing: 1.2 },
  statValue: { fontSize: 26, fontWeight: '700' },
  statUnit: { fontSize: 11, color: Colors.textMuted },
  logSection: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  logTitle: {
    fontSize: 10, fontWeight: '700', color: Colors.textLabel, letterSpacing: 1.5,
  },
  logRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: `${Colors.border}80`,
  },
  logTime: { fontSize: 12, color: Colors.textMuted, fontFamily: 'Courier New', minWidth: 80 },
  logChips: { flexDirection: 'row', gap: 10 },
  logChip: { fontSize: 12, fontWeight: '600' },
});
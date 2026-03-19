import { Colors, Radius } from '@/constants/theme';
import { AlertRecord, useSensor } from '@/context/SensorContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { SafeAreaView } from 'react-native-safe-area-context';

type MCIcon = React.ComponentProps<typeof MaterialCommunityIcons>['name'];
type Tab = 'hr' | 'temp';
type View_ = 'charts' | 'events';

const W = Dimensions.get('window').width;

const ALERT_CFG: Record<string, { icon: MCIcon; color: string; label: string }> = {
  fall:      { icon: 'alert-circle',  color: Colors.danger,  label: 'Fall Detected'    },
  sos:       { icon: 'alarm-light',   color: Colors.danger,  label: 'SOS Activated'    },
  hr_high:   { icon: 'heart-pulse',   color: Colors.heart,   label: 'High Heart Rate'  },
  hr_low:    { icon: 'heart-pulse',   color: Colors.heart,   label: 'Low Heart Rate'   },
  temp_high: { icon: 'thermometer',   color: Colors.warning, label: 'High Temperature' },
};

function AlertItem({ a }: { a: AlertRecord }) {
  const cfg  = ALERT_CFG[a.type] ?? ALERT_CFG.fall;
  const time = new Date(a.timestamp);
  return (
    <View style={[s.alertItem, { borderLeftColor: cfg.color, borderLeftWidth: 3 }]}>
      <View style={[s.alertIcon, { backgroundColor: `${cfg.color}15` }]}>
        <MaterialCommunityIcons name={cfg.icon} size={18} color={cfg.color} />
      </View>
      <View style={s.alertBody}>
        <Text style={[s.alertTitle, { color: cfg.color }]}>{cfg.label}</Text>
        <Text style={s.alertDetail} numberOfLines={2}>{a.detail}</Text>
        {a.smsSentByBracelet && (
          <View style={s.smsBadge}>
            <MaterialCommunityIcons name="message-check-outline" size={11} color={Colors.success} />
            <Text style={s.smsBadgeText}>SMS sent</Text>
          </View>
        )}
      </View>
      <View style={s.alertTime}>
        <Text style={s.alertTimeText}>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
        <Text style={s.alertDateText}>{time.toLocaleDateString([], { month: 'short', day: 'numeric' })}</Text>
      </View>
    </View>
  );
}

export default function HistoryScreen() {
  const { history, alertLog, unreadAlertCount, clearUnreadAlerts } = useSensor();
  const [tab,  setTab]  = useState<Tab>('hr');
  const [view, setView] = useState<View_>('charts');

  useEffect(() => {
    if (view === 'events') clearUnreadAlerts();
  }, [view]);

  const pts   = history.slice(-24);
  const lbls  = pts.map((_, i) => (i % 6 === 0 ? `${i}s` : ''));
  const hrPts = pts.map(d => d.hr || 0);
  const tPts  = pts.map(d => d.temp || 0);

  const data  = tab === 'hr' ? hrPts : tPts;
  const color = tab === 'hr' ? Colors.heart : Colors.warning;
  const hasData = pts.length >= 2;

  const avg = hasData ? (data.reduce((a, b) => a + b, 0) / data.length).toFixed(1) : '—';
  const max = hasData ? Math.max(...data).toFixed(tab === 'temp' ? 1 : 0) : '—';
  const min = hasData ? Math.min(...data).toFixed(tab === 'temp' ? 1 : 0) : '—';

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>HEALTH HISTORY</Text>
        <Text style={s.sub}>{history.length} readings</Text>
      </View>

      {/* View switcher */}
      <View style={s.switcher}>
        {(['charts', 'events'] as View_[]).map(v => (
          <TouchableOpacity
            key={v} style={[s.switchBtn, view === v && s.switchBtnActive]}
            onPress={() => setView(v)} activeOpacity={0.75}
          >
            <MaterialCommunityIcons
              name={v === 'charts' ? 'chart-line' : 'bell-ring'}
              size={14}
              color={view === v ? Colors.accent : Colors.textMuted}
            />
            <Text style={[s.switchText, view === v && s.switchTextActive]}>
              {v === 'charts' ? 'Charts' : 'Events'}
            </Text>
            {v === 'events' && unreadAlertCount > 0 && (
              <View style={s.badge}>
                <Text style={s.badgeText}>{unreadAlertCount > 9 ? '9+' : unreadAlertCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {view === 'charts' ? (
          <>
            {/* Tab selector */}
            <View style={s.tabs}>
              {([
                { key: 'hr' as Tab, icon: 'heart-pulse' as MCIcon, label: 'Heart Rate' },
                { key: 'temp' as Tab, icon: 'thermometer' as MCIcon, label: 'Temperature' },
              ]).map(t => (
                <TouchableOpacity
                  key={t.key}
                  style={[s.tabBtn, tab === t.key && s.tabBtnActive]}
                  onPress={() => setTab(t.key)} activeOpacity={0.75}
                >
                  <MaterialCommunityIcons name={t.icon} size={15} color={tab === t.key ? Colors.textPrimary : Colors.textMuted} />
                  <Text style={[s.tabText, tab === t.key && s.tabTextActive]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Chart */}
            <View style={s.chartCard}>
              <Text style={s.chartLabel}>{tab === 'hr' ? 'Heart Rate (BPM)' : 'Temperature (°C)'}</Text>
              {hasData ? (
                <LineChart
                  data={{ labels: lbls, datasets: [{ data, color: () => color, strokeWidth: 2.5 }] }}
                  width={W - 64}
                  height={175}
                  chartConfig={{
                    backgroundColor: 'transparent',
                    backgroundGradientFrom: Colors.bgCard,
                    backgroundGradientTo: Colors.bgCard,
                    decimalPlaces: tab === 'temp' ? 1 : 0,
                    color: (o = 1) => tab === 'hr' ? `rgba(255,77,138,${o})` : `rgba(255,140,0,${o})`,
                    labelColor: () => Colors.textMuted,
                    propsForDots: { r: '3', strokeWidth: '1.5', stroke: color },
                    propsForBackgroundLines: { stroke: Colors.chartGrid, strokeDasharray: '4 6' },
                  }}
                  bezier withInnerLines withOuterLines={false} withShadow={false}
                  style={{ borderRadius: Radius.md, marginTop: 10, marginLeft: -8 }}
                />
              ) : (
                <View style={s.noData}>
                  <MaterialCommunityIcons name="timer-sand" size={36} color={Colors.textMuted} />
                  <Text style={s.noDataText}>Collecting data…</Text>
                </View>
              )}
            </View>

            {/* Stats row */}
            <View style={s.statsRow}>
              {[
                { l: 'AVG', v: avg, i: 'chart-bell-curve' as MCIcon },
                { l: 'MAX', v: max, i: 'arrow-up-bold' as MCIcon },
                { l: 'MIN', v: min, i: 'arrow-down-bold' as MCIcon },
              ].map(st => (
                <View key={st.l} style={s.statCard}>
                  <MaterialCommunityIcons name={st.i} size={13} color={Colors.textMuted} />
                  <Text style={s.statLabel}>{st.l}</Text>
                  <Text style={[s.statVal, { color }]}>{st.v}</Text>
                  <Text style={s.statUnit}>{tab === 'hr' ? 'bpm' : '°C'}</Text>
                </View>
              ))}
            </View>

            {/* Raw readings log */}
            <View style={s.logCard}>
              <View style={s.logHeader}>
                <MaterialCommunityIcons name="table" size={13} color={Colors.textLabel} />
                <Text style={s.logTitle}>RAW READINGS</Text>
              </View>
              {[...history].reverse().slice(0, 12).map((d, i) => (
                <View key={i} style={[s.logRow, i % 2 === 0 && s.logRowAlt]}>
                  <Text style={s.logTime}>{new Date(d.timestamp).toLocaleTimeString()}</Text>
                  <Text style={[s.logChip, { color: Colors.heart }]}>{d.hr} bpm</Text>
                  <Text style={[s.logChip, { color: Colors.warning }]}>{d.temp}°C</Text>
                  <Text style={[s.logChip, { color: d.move ? Colors.success : Colors.textMuted }]}>{d.move ? 'MOV' : 'STILL'}</Text>
                  {d.fall && <Text style={[s.logChip, { color: Colors.danger }]}>FALL</Text>}
                  {d.sos  && <Text style={[s.logChip, { color: Colors.danger }]}>SOS</Text>}
                </View>
              ))}
              {history.length === 0 && <Text style={[s.noDataText, { padding: 20 }]}>No readings yet</Text>}
            </View>
          </>
        ) : (
          <>
            {alertLog.length === 0 ? (
              <View style={s.emptyEvents}>
                <MaterialCommunityIcons name="bell-sleep-outline" size={48} color={Colors.textMuted} />
                <Text style={s.emptyTitle}>No events yet</Text>
                <Text style={s.emptySub}>Fall, SOS, and health anomaly alerts will appear here</Text>
              </View>
            ) : (
              <View style={s.eventList}>
                {alertLog.map(a => <AlertItem key={a.id} a={a} />)}
              </View>
            )}
          </>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title:  { fontSize: 19, fontWeight: '800', color: Colors.textPrimary, letterSpacing: 2 },
  sub:    { fontSize: 11, color: Colors.textSecondary },

  switcher:       { flexDirection: 'row', margin: 16, backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: 4, gap: 4 },
  switchBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: Radius.md },
  switchBtnActive:{ backgroundColor: Colors.bgSurface, borderWidth: 1, borderColor: Colors.borderLight },
  switchText:     { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  switchTextActive:{ color: Colors.textPrimary },
  badge:          { minWidth: 16, height: 16, borderRadius: 8, backgroundColor: Colors.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeText:      { fontSize: 9, fontWeight: '800', color: '#fff' },

  scroll: { paddingHorizontal: 16, gap: 14 },

  tabs:         { flexDirection: 'row', backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: 4, gap: 4 },
  tabBtn:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: Radius.md },
  tabBtnActive: { backgroundColor: Colors.bgSurface, borderWidth: 1, borderColor: Colors.borderLight },
  tabText:      { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  tabTextActive:{ color: Colors.textPrimary },

  chartCard:  { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: 16 },
  chartLabel: { fontSize: 11, fontWeight: '700', color: Colors.textLabel, letterSpacing: 1, textTransform: 'uppercase' },
  noData:     { alignItems: 'center', paddingVertical: 32, gap: 8 },
  noDataText: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },

  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: 14, alignItems: 'center', gap: 3 },
  statLabel:{ fontSize: 9, fontWeight: '700', color: Colors.textLabel, letterSpacing: 1.2 },
  statVal:  { fontSize: 24, fontWeight: '800' },
  statUnit: { fontSize: 10, color: Colors.textMuted },

  logCard:   { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  logHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  logTitle:  { fontSize: 9, fontWeight: '700', color: Colors.textLabel, letterSpacing: 1.5 },
  logRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: `${Colors.border}60` },
  logRowAlt: { backgroundColor: `${Colors.bgSurface}60` },
  logTime:   { fontSize: 11, color: Colors.textMuted, fontFamily: 'Courier New', minWidth: 78 },
  logChip:   { fontSize: 11, fontWeight: '600' },

  // Events tab
  emptyEvents:{ alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.textSecondary },
  emptySub:   { fontSize: 13, color: Colors.textMuted, textAlign: 'center', paddingHorizontal: 32, lineHeight: 18 },
  eventList:  { gap: 8 },
  alertItem:  { flexDirection: 'row', gap: 12, backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: 13, alignItems: 'flex-start', overflow: 'hidden' },
  alertIcon:  { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  alertBody:  { flex: 1, gap: 3 },
  alertTitle: { fontSize: 13, fontWeight: '700' },
  alertDetail:{ fontSize: 12, color: Colors.textSecondary, lineHeight: 16 },
  smsBadge:   { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  smsBadgeText:{ fontSize: 10, color: Colors.success, fontWeight: '600' },
  alertTime:  { alignItems: 'flex-end', gap: 2 },
  alertTimeText:{ fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
  alertDateText:{ fontSize: 10, color: Colors.textMuted },
});
import { AlertBox } from '@/components/AlertBox';
import { SensorCard } from '@/components/SensorCard';
import { Colors, Radius } from '@/constants/theme';
import { useSensor } from '@/context/SensorContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── Animated connection indicator ───────────────────────────────────────────
function ConnectionDot({ connected }: { connected: boolean }) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (connected) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.8, duration: 900, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1,   duration: 900, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [connected]);
  return (
    <View style={styles.dotWrap}>
      <Animated.View
        style={[styles.dotRing, {
          transform: [{ scale: pulse }],
          borderColor: connected ? Colors.success : Colors.textMuted,
          opacity: connected ? 0.4 : 0,
        }]}
      />
      <View style={[styles.dot, { backgroundColor: connected ? Colors.success : Colors.textMuted }]} />
    </View>
  );
}

export default function DashboardScreen() {
  const { current, connected, alert, dismissAlert } = useSensor();
  const now = new Date();

  const hrStatus =
    !current           ? 'inactive' :
    current.hr > 110 || current.hr < 50 ? 'danger' :
    current.hr > 95    ? 'warning'  : 'normal';

  const tempStatus =
    !current           ? 'inactive' :
    current.temp > 38.5 ? 'danger'  :
    current.temp > 37.5 ? 'warning' : 'normal';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>VITAL MONITOR</Text>
          <Text style={styles.headerSub}>
            {now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </Text>
        </View>
        <View style={styles.connectionBadge}>
          <ConnectionDot connected={connected} />
          <Text style={[styles.connectionText, { color: connected ? Colors.success : Colors.textMuted }]}>
            {connected ? 'LIVE' : 'CONNECTING…'}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero — Heart Rate */}
        <SensorCard
          label="Heart Rate"
          value={current?.hr ?? '––'}
          unit="BPM"
          iconName="heart-pulse"
          glowColor={Colors.heart}
          status={hrStatus}
          subtitle={
            !current        ? 'Waiting for device…'    :
            hrStatus === 'danger'  ? 'Abnormal — check patient' :
            hrStatus === 'warning' ? 'Slightly elevated'        :
            'Normal sinus rhythm'
          }
          large
        />

        {/* Row 1 */}
        <View style={styles.row}>
          <SensorCard
            label="Temperature"
            value={current?.temp ?? '––'}
            unit="°C"
            iconName="thermometer"
            glowColor={Colors.warning}
            status={tempStatus}
            subtitle={
              tempStatus === 'danger'  ? 'Fever detected'  :
              tempStatus === 'warning' ? 'Elevated'         :
              'Normal'
            }
          />
          <View style={{ width: 12 }} />
          <SensorCard
            label="Movement"
            value={current ? (current.move ? 'ACTIVE' : 'REST') : '––'}
            iconName="run"
            glowColor={Colors.success}
            status={current ? (current.move ? 'normal' : 'inactive') : 'inactive'}
            subtitle={current?.move ? 'Patient is moving' : 'No movement'}
          />
        </View>

        {/* Row 2 */}
        <View style={styles.row}>
          <SensorCard
            label="Fall Detection"
            value={current ? (current.fall ? 'FALL!' : 'SAFE') : '––'}
            iconName="shield-check"
            glowColor={current?.fall ? Colors.danger : Colors.success}
            status={current?.fall ? 'danger' : 'normal'}
            subtitle={current?.fall ? 'EMERGENCY — fall event!' : 'No fall detected'}
          />
          <View style={{ width: 12 }} />
          <SensorCard
            label="SOS Button"
            value={current ? (current.sos ? 'SOS!' : 'OK') : '––'}
            iconName="alarm-light"
            glowColor={current?.sos ? Colors.danger : Colors.success}
            status={current?.sos ? 'danger' : 'normal'}
            subtitle={current?.sos ? 'Button pressed!' : 'Not triggered'}
          />
        </View>

        {/* GPS quick info */}
        <View style={[styles.gpsBar, { borderColor: Colors.border }]}>
          <View style={styles.gpsLeft}>
            <MaterialCommunityIcons name="map-marker" size={16} color={Colors.accent} />
            <Text style={styles.gpsLabel}>GPS COORDINATES</Text>
          </View>
          <Text style={styles.gpsCoords}>
            {current
              ? `${current.lat.toFixed(5)},  ${current.lon.toFixed(5)}`
              : 'Awaiting signal…'}
          </Text>
        </View>

        {/* Thresholds legend */}
        <View style={styles.thresholdsCard}>
          <View style={styles.thresholdsHeader}>
            <MaterialCommunityIcons name="tune" size={14} color={Colors.textLabel} />
            <Text style={styles.thresholdsTitle}>ALERT THRESHOLDS</Text>
          </View>
          <View style={styles.thresholdRow}>
            <View style={[styles.thresholdDot, { backgroundColor: Colors.danger }]} />
            <Text style={styles.thresholdText}>HR &gt; 110 BPM or &lt; 50 BPM</Text>
          </View>
          <View style={styles.thresholdRow}>
            <View style={[styles.thresholdDot, { backgroundColor: Colors.warning }]} />
            <Text style={styles.thresholdText}>Temp &gt; 38.5 °C (fever)</Text>
          </View>
          <View style={styles.thresholdRow}>
            <View style={[styles.thresholdDot, { backgroundColor: Colors.danger }]} />
            <Text style={styles.thresholdText}>Fall detected or SOS pressed</Text>
          </View>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* ── Alert overlay (shown on caregiver's device) ── */}
      {alert && (
        <AlertBox
          visible={!!alert}
          alert={alert}
          onDismiss={dismissAlert}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, letterSpacing: 2 },
  headerSub:   { fontSize: 12, color: Colors.textSecondary, marginTop: 2, letterSpacing: 0.5 },
  connectionBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.bgSurface,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border,
  },
  connectionText: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  dotWrap:  { width: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
  dotRing:  { position: 'absolute', width: 14, height: 14, borderRadius: 7, borderWidth: 1.5 },
  dot:      { width: 8, height: 8, borderRadius: 4 },
  divider:  { height: 1, backgroundColor: Colors.border, marginHorizontal: 20 },
  scroll:   { padding: 16, gap: 12 },
  row:      { flexDirection: 'row' },
  gpsBar: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md, borderWidth: 1,
    padding: 16, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center', marginTop: 4,
  },
  gpsLeft:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gpsLabel: { fontSize: 11, fontWeight: '600', color: Colors.textLabel, letterSpacing: 1 },
  gpsCoords:{ fontSize: 13, color: Colors.accent, fontWeight: '600', fontFamily: 'Courier New' },
  thresholdsCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
    padding: 14, gap: 8, marginTop: 4,
  },
  thresholdsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  thresholdsTitle:  { fontSize: 10, fontWeight: '700', color: Colors.textLabel, letterSpacing: 1.5 },
  thresholdRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  thresholdDot:     { width: 6, height: 6, borderRadius: 3 },
  thresholdText:    { fontSize: 12, color: Colors.textSecondary },
});

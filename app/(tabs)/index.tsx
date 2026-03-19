import { AlertBox } from '@/components/AlertBox';
import { HRGauge } from '@/components/HRGauge';
import { SensorCard } from '@/components/SensorCard';
import { Colors, Radius } from '@/constants/theme';
import { useSensor } from '@/context/SensorContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── Connection badge ─────────────────────────────────────────────────────────
function StatusBadge({ mqttStatus, usingSimulator }: {
  mqttStatus: string; usingSimulator: boolean;
}) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (mqttStatus === 'connected') {
      Animated.loop(Animated.sequence([
        Animated.timing(pulse, { toValue: 2.0, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,   duration: 900, useNativeDriver: true }),
      ])).start();
    } else {
      pulse.setValue(1);
    }
  }, [mqttStatus]);

  const isConn = mqttStatus === 'connected';
  const isPend = mqttStatus === 'connecting' || mqttStatus === 'reconnecting';
  const dotColor = isConn ? Colors.success : isPend ? Colors.warning : Colors.danger;
  const label =
    isConn              ? 'MQTT LIVE'  :
    isPend              ? 'CONNECTING' :
    usingSimulator      ? 'SIMULATOR'  : 'OFFLINE';

  return (
    <View style={[s.badge, { borderColor: `${dotColor}45` }]}>
      <View style={s.dotWrap}>
        <Animated.View style={[
          s.dotRing,
          { transform: [{ scale: pulse }], borderColor: dotColor, opacity: isConn ? 0.4 : 0 },
        ]} />
        <View style={[s.dot, { backgroundColor: dotColor }]} />
      </View>
      <Text style={[s.badgeText, { color: dotColor }]}>{label}</Text>
    </View>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { current, mqttStatus, usingSimulator, activeAlert, dismissAlert } = useSensor();

  type Status = 'normal' | 'warning' | 'danger' | 'inactive';

  const hrStatus: Status =
    !current                                  ? 'inactive' :
    (current.hr > 110 || current.hr < 50)    ? 'danger'   :
    current.hr > 95                           ? 'warning'  : 'normal';

  const tempStatus: Status =
    !current              ? 'inactive' :
    current.temp > 38.5   ? 'danger'   :
    current.temp > 37.5   ? 'warning'  : 'normal';

  const tempColor =
    tempStatus === 'danger'   ? Colors.danger  :
    tempStatus === 'warning'  ? Colors.warning :
    tempStatus === 'inactive' ? Colors.textMuted :
    Colors.temp;

  const hrStatusColor =
    hrStatus === 'danger'   ? Colors.danger  :
    hrStatus === 'warning'  ? Colors.warning :
    hrStatus === 'inactive' ? Colors.textMuted :
    Colors.success;

  const hrStatusText =
    !current              ? 'Waiting for bracelet data…'    :
    hrStatus === 'danger' ? 'Abnormal heart rate — rest now' :
    hrStatus === 'warning'? 'Heart rate slightly elevated'   :
    'Heart rate within normal range';

  return (
    <SafeAreaView style={s.safe} edges={['top']}>

      {/* ── Header ── */}
      <View style={s.header}>
        <View>
          <Text style={s.appName}>VITAL MONITOR</Text>
          <Text style={s.date}>
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long', month: 'short', day: 'numeric',
            })}
          </Text>
        </View>
        <StatusBadge mqttStatus={mqttStatus} usingSimulator={usingSimulator} />
      </View>

      <View style={s.divider} />

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Hero card: gauge sits ABOVE the mini-cards ── */}
        <View style={s.heroCard}>

          {/* Gauge row — centred, enough room to breathe */}
          <View style={s.gaugeRow}>
            <HRGauge bpm={current?.hr ?? 0} status={hrStatus} size={160} />
          </View>

          {/* Mini cards — temperature + movement side by side */}
          <View style={s.miniRow}>
            {/* Temperature */}
            <View style={[s.mini, { borderColor: `${tempColor}30` }]}>
              <View style={s.miniHeader}>
                <MaterialCommunityIcons name="thermometer" size={14} color={tempColor} />
                <Text style={s.miniLabel}>TEMP</Text>
              </View>
              <Text style={[s.miniValue, { color: tempColor }]}>
                {current?.temp ?? '–'}
                <Text style={s.miniUnit}> °C</Text>
              </Text>
              <Text style={[s.miniSub, { color: tempStatus === 'normal' ? Colors.textMuted : tempColor }]}>
                {tempStatus === 'danger' ? 'Fever' : tempStatus === 'warning' ? 'Elevated' : 'Normal'}
              </Text>
            </View>

            {/* Movement */}
            <View style={[s.mini, { borderColor: `${current?.move ? Colors.move : Colors.textMuted}30` }]}>
              <View style={s.miniHeader}>
                <MaterialCommunityIcons
                  name={current?.move ? 'run' : 'human-handsdown'}
                  size={14}
                  color={current?.move ? Colors.move : Colors.textMuted}
                />
                <Text style={s.miniLabel}>MOVEMENT</Text>
              </View>
              <Text style={[s.miniValue, { color: current?.move ? Colors.move : Colors.textSecondary }]}>
                {current ? (current.move ? 'ACTIVE' : 'REST') : '––'}
              </Text>
              <Text style={s.miniSub}>
                {current?.move ? 'In motion' : 'Stationary'}
              </Text>
            </View>
          </View>

          {/* HR status strip */}
          <View style={[s.hrStrip, { backgroundColor: `${hrStatusColor}12` }]}>
            <MaterialCommunityIcons
              name={hrStatus === 'normal' ? 'check-circle-outline' : 'alert-circle-outline'}
              size={13}
              color={hrStatusColor}
            />
            <Text style={[s.hrStripText, { color: hrStatusColor }]}>
              {hrStatusText}
            </Text>
          </View>
        </View>

        {/* ── Safety sensors ── */}
        <Text style={s.sectionLabel}>SAFETY SENSORS</Text>
        <View style={s.row}>
          <SensorCard
            label="Fall Detection"
            value={current ? (current.fall ? 'FALL' : 'SAFE') : '––'}
            iconName="shield-check"
            color={current?.fall ? Colors.danger : Colors.success}
            status={current?.fall ? 'danger' : 'normal'}
            subtitle={current?.fall ? 'Fall event detected!' : 'No fall detected'}
          />
          <View style={{ width: 10 }} />
          <SensorCard
            label="SOS Button"
            value={current ? (current.sos ? 'SOS' : 'OK') : '––'}
            iconName="alarm-light"
            color={current?.sos ? Colors.danger : Colors.success}
            status={current?.sos ? 'danger' : 'normal'}
            subtitle={current?.sos ? 'Button pressed!' : 'Not triggered'}
          />
        </View>

        {/* ── GPS strip ── */}
        <View style={s.gpsBar}>
          <View style={[s.gpsIconWrap, { backgroundColor: Colors.accentGlow }]}>
            <MaterialCommunityIcons name="map-marker" size={15} color={Colors.accent} />
          </View>
          <Text style={s.gpsLabel}>GPS</Text>
          <Text style={s.gpsCoords} numberOfLines={1}>
            {current
              ? `${current.lat.toFixed(5)},  ${current.lon.toFixed(5)}`
              : 'Awaiting signal…'}
          </Text>
          <View style={[
            s.gpsPill,
            { backgroundColor: current ? Colors.successGlow : Colors.border },
          ]}>
            <Text style={[s.gpsPillText, { color: current ? Colors.success : Colors.textMuted }]}>
              {current ? 'LIVE' : '—'}
            </Text>
          </View>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* ── Alert modal ── */}
      {activeAlert && (
        <AlertBox visible={!!activeAlert} alert={activeAlert} onDismiss={dismissAlert} />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.bg },

  // Header
  header:  {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14,
  },
  appName: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, letterSpacing: 2 },
  date:    { fontSize: 11, color: Colors.textSecondary, marginTop: 2, letterSpacing: 0.3 },
  divider: { height: 1, backgroundColor: Colors.border },

  // Status badge
  badge:    {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    borderWidth: 1, borderRadius: Radius.full,
    paddingHorizontal: 12, paddingVertical: 7,
    backgroundColor: Colors.bgSurface,
  },
  dotWrap:  { width: 12, height: 12, alignItems: 'center', justifyContent: 'center' },
  dotRing:  { position: 'absolute', width: 12, height: 12, borderRadius: 6, borderWidth: 1.5 },
  dot:      { width: 7, height: 7, borderRadius: 3.5 },
  badgeText:{ fontSize: 10, fontWeight: '700', letterSpacing: 1.1 },

  scroll:   { padding: 16, gap: 12 },

  // ── Hero card ──────────────────────────────────────────────────────────────
  // NO overflow:hidden so the gauge shadow isn't clipped
  heroCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  // Gauge sits in its own centred row with generous vertical padding
  gaugeRow: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 24,
    paddingBottom: 16,
  },

  // Mini cards sit in a horizontal row below the gauge
  miniRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  mini: {
    flex: 1,
    backgroundColor: Colors.bgSurface,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  miniHeader: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  miniLabel:  { fontSize: 9, fontWeight: '700', color: Colors.textLabel, letterSpacing: 1.2 },
  miniValue:  { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  miniUnit:   { fontSize: 12, fontWeight: '500' },
  miniSub:    { fontSize: 10, color: Colors.textMuted, fontWeight: '500' },

  // HR status strip at bottom of hero card
  hrStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    borderBottomLeftRadius: Radius.xl,
    borderBottomRightRadius: Radius.xl,
  },
  hrStripText: { fontSize: 12, fontWeight: '600' },

  // Safety sensors
  sectionLabel: {
    fontSize: 9, fontWeight: '700',
    color: Colors.textLabel, letterSpacing: 1.8,
    paddingHorizontal: 2, marginTop: 4,
  },
  row: { flexDirection: 'row' },

  // GPS bar
  gpsBar: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  gpsIconWrap: {
    width: 28, height: 28,
    borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  gpsLabel:    { fontSize: 10, fontWeight: '700', color: Colors.textLabel, letterSpacing: 1 },
  gpsCoords:   { flex: 1, fontSize: 12, color: Colors.accent, fontWeight: '600', fontFamily: 'Courier New' },
  gpsPill:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  gpsPillText: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
});

import { Colors, Radius } from '@/constants/theme';
import { useSensor } from '@/context/SensorContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type MCIcon = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

function Section({ title, icon, color = Colors.textLabel, children }: {
  title: string; icon: MCIcon; color?: string; children: React.ReactNode;
}) {
  return (
    <View style={s.section}>
      <View style={s.sectionHead}>
        <MaterialCommunityIcons name={icon} size={12} color={color} />
        <Text style={[s.sectionTitle, { color }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function Card({ children, borderColor }: { children: React.ReactNode; borderColor?: string }) {
  return <View style={[s.card, borderColor ? { borderColor } : null]}>{children}</View>;
}

function Row({ icon, iconColor = Colors.textSecondary, label, value, valueColor, last }: {
  icon: MCIcon; iconColor?: string; label: string; value?: string; valueColor?: string; last?: boolean;
}) {
  return (
    <View style={[s.row, !last && s.rowBorder]}>
      <View style={s.rowLeft}>
        <MaterialCommunityIcons name={icon} size={17} color={iconColor} />
        <Text style={s.rowLabel}>{label}</Text>
      </View>
      {value && <Text style={[s.rowVal, valueColor ? { color: valueColor } : null]}>{value}</Text>}
    </View>
  );
}

function Field({ label, value, onChange, placeholder, keyboard, icon }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder: string; keyboard?: any; icon: MCIcon;
}) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <View style={s.fieldRow}>
        <MaterialCommunityIcons name={icon} size={16} color={Colors.textMuted} />
        <TextInput
          style={s.fieldInput}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          keyboardType={keyboard ?? 'default'}
          returnKeyType="done"
          autoCapitalize="none"
        />
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const {
    mqttStatus, usingSimulator,
    emergencyContact, setEmergencyContact,
    brokerConfig, setBrokerConfig, reconnect,
    history,
  } = useSensor();

  // Emergency contact form
  const [eName,  setEName]  = useState(emergencyContact.name);
  const [ePhone, setEPhone] = useState(emergencyContact.phone);
  const [eSaved, setESaved] = useState(false);

  // Broker config form
  const [bHost, setBHost] = useState(brokerConfig.host);
  const [bPort, setBPort] = useState(String(brokerConfig.port));
  const [bSaved, setBSaved] = useState(false);

  function saveContact() {
    if (!ePhone.trim()) { Alert.alert('Required', 'Please enter a phone number.'); return; }
    setEmergencyContact({ name: eName.trim() || 'Emergency Contact', phone: ePhone.trim() });
    setESaved(true); setTimeout(() => setESaved(false), 2000);
  }

  function saveBroker() {
    const port = parseInt(bPort);
    if (!bHost.trim() || isNaN(port)) { Alert.alert('Invalid', 'Enter a valid IP address and port.'); return; }
    setBrokerConfig({ host: bHost.trim(), port });
    setBSaved(true); setTimeout(() => setBSaved(false), 2000);
  }

  const connected   = mqttStatus === 'connected';
  const hasContact  = !!emergencyContact.phone;

  const mqttColor =
    connected ? Colors.success :
    mqttStatus === 'connecting' || mqttStatus === 'reconnecting' ? Colors.warning :
    Colors.danger;

  const mqttLabel =
    connected ? 'Connected' :
    mqttStatus === 'connecting' ? 'Connecting…' :
    mqttStatus === 'reconnecting' ? 'Reconnecting…' :
    usingSimulator ? 'Simulator (no broker)' : 'Disconnected';

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>SETTINGS</Text>
        <Text style={s.sub}>ESP32 + SIM800L + MQTT</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* ── Emergency Contact ── */}
          <Section title="EMERGENCY CONTACT" icon="account-alert" color={Colors.danger}>
            <Card borderColor={`${Colors.danger}30`}>
              {/* Status banner */}
              <View style={[s.banner, { backgroundColor: hasContact ? Colors.successGlow : Colors.warningGlow, borderColor: hasContact ? `${Colors.success}35` : `${Colors.warning}35` }]}>
                <MaterialCommunityIcons
                  name={hasContact ? 'check-circle-outline' : 'alert-circle-outline'}
                  size={15} color={hasContact ? Colors.success : Colors.warning}
                />
                <Text style={[s.bannerText, { color: hasContact ? Colors.success : Colors.warning }]}>
                  {hasContact ? `${emergencyContact.name}  ·  ${emergencyContact.phone}` : 'No contact saved — SMS alerts disabled'}
                </Text>
              </View>

              <View style={s.cardContent}>
                <Text style={s.hint}>
                  When the bracelet detects a fall or SOS, its SIM800L module sends an SMS with your GPS location to this number.
                </Text>
                <Field label="NAME" value={eName} onChange={setEName} placeholder="Mom, Dad, Brother…" icon="account" />
                <Field label="PHONE NUMBER" value={ePhone} onChange={setEPhone} placeholder="+212 6XX XXX XXX" keyboard="phone-pad" icon="phone" />
                <TouchableOpacity style={[s.saveBtn, eSaved && s.saveBtnSuccess]} onPress={saveContact} activeOpacity={0.75}>
                  <MaterialCommunityIcons name={eSaved ? 'check-circle' : 'content-save'} size={15} color={eSaved ? Colors.success : Colors.danger} />
                  <Text style={[s.saveBtnText, { color: eSaved ? Colors.success : Colors.danger }]}>
                    {eSaved ? 'SAVED!' : 'SAVE CONTACT'}
                  </Text>
                </TouchableOpacity>
              </View>
            </Card>
          </Section>

          {/* ── MQTT Broker ── */}
          <Section title="MQTT BROKER" icon="access-point" color={Colors.accent}>
            <Card borderColor={`${Colors.accent}25`}>
              {/* Connection status */}
              <View style={[s.mqttStatus, { backgroundColor: `${mqttColor}12`, borderBottomColor: Colors.border }]}>
                <View style={[s.mqttDot, { backgroundColor: mqttColor }]} />
                <Text style={[s.mqttStatusText, { color: mqttColor }]}>{mqttLabel}</Text>
                <View style={{ flex: 1 }} />
                <TouchableOpacity onPress={reconnect} style={s.reconnectBtn} activeOpacity={0.75}>
                  <MaterialCommunityIcons name="refresh" size={14} color={Colors.accent} />
                  <Text style={s.reconnectText}>RECONNECT</Text>
                </TouchableOpacity>
              </View>

              <View style={s.cardContent}>
                <Text style={s.hint}>
                  On your MacBook: run{'\n'}
                  <Text style={s.code}>/opt/homebrew/sbin/mosquitto -c /opt/homebrew/etc/mosquitto/mosquitto.conf</Text>
                  {'\n'}Then enter its LAN IP below (run{' '}
                  <Text style={s.code}>ipconfig getifaddr en0</Text> to find it).
                </Text>
                <Field label="BROKER IP / HOST" value={bHost} onChange={setBHost} placeholder="192.168.1.10" keyboard="url" icon="server-network" />
                <Field label="WEBSOCKET PORT" value={bPort} onChange={setBPort} placeholder="9001" keyboard="numeric" icon="numeric" />
                <TouchableOpacity style={[s.saveBtn, s.saveBtnAccent, bSaved && s.saveBtnSuccess]} onPress={saveBroker} activeOpacity={0.75}>
                  <MaterialCommunityIcons name={bSaved ? 'check-circle' : 'access-point'} size={15} color={bSaved ? Colors.success : Colors.accent} />
                  <Text style={[s.saveBtnText, { color: bSaved ? Colors.success : Colors.accent }]}>
                    {bSaved ? 'SAVED & RECONNECTING' : 'SAVE & CONNECT'}
                  </Text>
                </TouchableOpacity>
              </View>
            </Card>
          </Section>

          {/* ── Session stats ── */}
          <Section title="SESSION STATS" icon="chart-bar">
            <Card>
              <Row icon="database"    iconColor={Colors.accent}   label="Readings"        value={`${history.length}`} />
              <Row icon="heart-pulse" iconColor={Colors.heart}    label="Avg Heart Rate"  value={history.length ? `${Math.round(history.reduce((a,b)=>a+b.hr,0)/history.length)} BPM` : '—'} valueColor={Colors.heart} />
              <Row icon="thermometer" iconColor={Colors.warning}  label="Avg Temperature" value={history.length ? `${(history.reduce((a,b)=>a+b.temp,0)/history.length).toFixed(1)} °C` : '—'} valueColor={Colors.warning} />
              <Row icon="alert-circle" iconColor={Colors.danger}  label="Events"          value={`${history.filter(d=>d.fall||d.sos).length}`} valueColor={Colors.danger} last />
            </Card>
          </Section>

          {/* ── Sensor hardware ── */}
          <Section title="BRACELET HARDWARE" icon="chip">
            <Card>
              <Row icon="heart-pulse"     iconColor={Colors.heart}        label="Heart Rate"      value="MAX30102" />
              <Row icon="thermometer"     iconColor={Colors.warning}      label="Temperature"     value="DS18B20" />
              <Row icon="run"             iconColor={Colors.success}      label="Accelerometer"   value="MPU-6050" />
              <Row icon="map-marker"      iconColor={Colors.accent}       label="GPS"             value="NEO-6M" />
              <Row icon="cellphone-basic" iconColor={Colors.success}      label="GSM / SMS"       value="SIM800L" />
              <Row icon="wifi"            iconColor={Colors.accent}       label="WiFi + MQTT"     value="ESP32 Built-in" />
              <Row icon="bell-ring"       iconColor={Colors.textSecondary} label="Vibration"      value="ERM Motor" last />
            </Card>
          </Section>

          <Text style={s.version}>VITAL MONITOR v2.0  ·  ESP32 + SIM800L + MQTT</Text>
          <View style={{ height: 24 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.bg },
  header:  { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title:   { fontSize: 19, fontWeight: '800', color: Colors.textPrimary, letterSpacing: 2 },
  sub:     { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  scroll:  { padding: 16, gap: 18 },

  section:     { gap: 8 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 2 },
  sectionTitle:{ fontSize: 9, fontWeight: '700', letterSpacing: 1.6 },

  card: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },

  banner:     { flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: Colors.border, paddingHorizontal: 14, paddingVertical: 11, borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg },
  bannerText: { fontSize: 12, fontWeight: '600', flex: 1, lineHeight: 17 },

  cardContent:{ padding: 14, gap: 12 },
  hint:       { fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },
  code:       { fontFamily: 'Courier New', color: Colors.accent, fontSize: 11 },

  field:      { gap: 5 },
  fieldLabel: { fontSize: 8, fontWeight: '700', color: Colors.textLabel, letterSpacing: 1.5 },
  fieldRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.bgSurface, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 11, paddingVertical: 10 },
  fieldInput: { flex: 1, fontSize: 14, color: Colors.textPrimary, fontWeight: '500' },

  saveBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: Radius.full, borderWidth: 1.5, borderColor: `${Colors.danger}45`, backgroundColor: Colors.dangerGlow, paddingVertical: 10 },
  saveBtnAccent:  { borderColor: `${Colors.accent}40`, backgroundColor: Colors.accentGlow },
  saveBtnSuccess: { borderColor: `${Colors.success}45`, backgroundColor: Colors.successGlow },
  saveBtnText:    { fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },

  mqttStatus:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1 },
  mqttDot:        { width: 8, height: 8, borderRadius: 4 },
  mqttStatusText: { fontSize: 13, fontWeight: '600' },
  reconnectBtn:   { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: Radius.full, borderWidth: 1, borderColor: `${Colors.accent}40`, backgroundColor: Colors.accentGlow, paddingHorizontal: 10, paddingVertical: 5 },
  reconnectText:  { fontSize: 10, fontWeight: '700', color: Colors.accent, letterSpacing: 1 },

  row:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: `${Colors.border}70` },
  rowLeft:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowLabel:  { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  rowVal:    { fontSize: 13, color: Colors.textPrimary, fontWeight: '600' },

  version: { textAlign: 'center', fontSize: 10, color: Colors.textMuted, letterSpacing: 0.8, paddingTop: 4 },
});
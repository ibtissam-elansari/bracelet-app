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

function InfoRow({
  iconName, iconColor = Colors.textSecondary,
  label, value, valueColor, last,
}: {
  iconName: MCIcon; iconColor?: string;
  label: string; value?: string; valueColor?: string; last?: boolean;
}) {
  return (
    <View style={[styles.infoRow, !last && styles.infoRowBorder]}>
      <View style={styles.infoLeft}>
        <MaterialCommunityIcons name={iconName} size={18} color={iconColor} />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      {value !== undefined && (
        <Text style={[styles.infoValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
      )}
    </View>
  );
}

export default function ProfileScreen() {
  const { connected, history, emergencyContact, setEmergencyContact } = useSensor();

  const [editName,  setEditName]  = useState(emergencyContact.name);
  const [editPhone, setEditPhone] = useState(emergencyContact.phone);
  const [saved,     setSaved]     = useState(false);

  function saveContact() {
    const trimmedPhone = editPhone.trim();
    const trimmedName  = editName.trim();
    if (!trimmedPhone) {
      Alert.alert('Phone required', 'Please enter a valid phone number.');
      return;
    }
    setEmergencyContact({ name: trimmedName || 'Emergency Contact', phone: trimmedPhone });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const hasContact = !!emergencyContact.phone;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>DEVICE & PROFILE</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              <MaterialCommunityIcons name="heart-pulse" size={42} color={Colors.accent} />
            </View>
            <Text style={styles.patientName}>Bracelet Wearer</Text>
            <Text style={styles.patientSub}>IoT Health Monitoring System</Text>
          </View>

          {/* ── Emergency Contact ──────────────────────────────────────────── */}
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <MaterialCommunityIcons name="account-alert" size={13} color={Colors.danger} />
              <Text style={[styles.sectionTitle, { color: Colors.danger }]}>EMERGENCY CONTACT</Text>
            </View>

            <View style={[styles.card, { borderColor: `${Colors.danger}35`, padding: 16, gap: 14 }]}>

              {/* Status banner */}
              <View style={[
                styles.statusBanner,
                {
                  borderColor:     hasContact ? `${Colors.success}40` : `${Colors.warning}40`,
                  backgroundColor: hasContact ? Colors.successGlow    : Colors.warningGlow,
                },
              ]}>
                <MaterialCommunityIcons
                  name={hasContact ? 'check-circle-outline' : 'alert-circle-outline'}
                  size={16}
                  color={hasContact ? Colors.success : Colors.warning}
                />
                <Text style={[styles.statusText, { color: hasContact ? Colors.success : Colors.warning }]}>
                  {hasContact
                    ? `Active: ${emergencyContact.name}  ${emergencyContact.phone}`
                    : 'No contact saved — SMS alerts cannot be sent'}
                </Text>
              </View>

              {/* Explanation */}
              <Text style={styles.contactHint}>
                When the bracelet detects a fall or SOS, the SIM800L GSM module sends an SMS with your GPS location to this number.
              </Text>

              {/* Name field */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>CONTACT NAME</Text>
                <View style={styles.inputRow}>
                  <MaterialCommunityIcons name="account" size={17} color={Colors.textMuted} />
                  <TextInput
                    style={styles.input}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="e.g. Mom, Dad, Brother…"
                    placeholderTextColor={Colors.textMuted}
                    returnKeyType="next"
                  />
                </View>
              </View>

              {/* Phone field */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>PHONE NUMBER</Text>
                <View style={styles.inputRow}>
                  <MaterialCommunityIcons name="phone" size={17} color={Colors.textMuted} />
                  <TextInput
                    style={styles.input}
                    value={editPhone}
                    onChangeText={setEditPhone}
                    placeholder="+212 6XX XXX XXX"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="phone-pad"
                    returnKeyType="done"
                  />
                </View>
              </View>

              {/* Save */}
              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  saved && { borderColor: `${Colors.success}60`, backgroundColor: Colors.successGlow },
                ]}
                onPress={saveContact}
                activeOpacity={0.75}
              >
                <MaterialCommunityIcons
                  name={saved ? 'check-circle' : 'content-save'}
                  size={16}
                  color={saved ? Colors.success : Colors.danger}
                />
                <Text style={[styles.saveBtnText, { color: saved ? Colors.success : Colors.danger }]}>
                  {saved ? 'SAVED!' : 'SAVE CONTACT'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Device Status ──────────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>DEVICE STATUS</Text>
            <View style={styles.card}>
              <InfoRow
                iconName="bluetooth-connect"
                iconColor={connected ? Colors.success : Colors.warning}
                label="BLE Connection"
                value={connected ? 'Connected' : 'Searching…'}
                valueColor={connected ? Colors.success : Colors.warning}
              />
              <InfoRow iconName="watch"      iconColor={Colors.accent}        label="Device Name"     value="ESP32-BLE-001" />
              <InfoRow iconName="battery-80" iconColor={Colors.success}       label="Battery Level"   value="87%" valueColor={Colors.success} />
              <InfoRow iconName="wifi"       iconColor={Colors.textSecondary} label="Signal Strength" value="-62 dBm" last />
            </View>
          </View>

          {/* ── Session Stats ──────────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SESSION STATS</Text>
            <View style={styles.card}>
              <InfoRow iconName="database"    iconColor={Colors.accent}
                label="Data Points" value={`${history.length} readings`} />
              <InfoRow iconName="heart-pulse" iconColor={Colors.heart}
                label="Avg Heart Rate"
                value={history.length
                  ? `${Math.round(history.reduce((a, b) => a + b.hr, 0) / history.length)} BPM`
                  : '—'}
                valueColor={Colors.heart}
              />
              <InfoRow iconName="thermometer" iconColor={Colors.warning}
                label="Avg Temperature"
                value={history.length
                  ? `${(history.reduce((a, b) => a + b.temp, 0) / history.length).toFixed(1)}°C`
                  : '—'}
                valueColor={Colors.warning}
              />
              <InfoRow iconName="alert-circle" iconColor={Colors.danger}
                label="Events Detected"
                value={`${history.filter(d => d.fall || d.sos).length}`}
                valueColor={Colors.danger} last
              />
            </View>
          </View>

          {/* ── Sensor Hardware ────────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SENSOR HARDWARE</Text>
            <View style={styles.card}>
              <InfoRow iconName="heart-pulse"     iconColor={Colors.heart}         label="Heart Rate"      value="MAX30102" />
              <InfoRow iconName="thermometer"     iconColor={Colors.warning}       label="Temperature"     value="DS18B20" />
              <InfoRow iconName="run"             iconColor={Colors.success}       label="Accelerometer"   value="MPU-6050" />
              <InfoRow iconName="map-marker"      iconColor={Colors.accent}        label="GPS"             value="NEO-6M" />
              <InfoRow iconName="cellphone-basic" iconColor={Colors.success}       label="GSM / SMS"       value="SIM800L" />
              <InfoRow iconName="bell-ring"       iconColor={Colors.textSecondary} label="Vibration Motor" value="ERM 3V" last />
            </View>
          </View>

          {/* Reconnect */}
          <TouchableOpacity style={styles.reconnectBtn} activeOpacity={0.75}>
            <MaterialCommunityIcons name="bluetooth-transfer" size={18} color={Colors.accent} />
            <Text style={styles.reconnectText}>SCAN FOR DEVICE</Text>
          </TouchableOpacity>

          <Text style={styles.version}>VITAL MONITOR v1.0  ·  ESP32 + SIM800L</Text>
          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.bg },
  header: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title:  { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, letterSpacing: 2 },
  scroll: { padding: 16, gap: 20 },

  avatarSection: { alignItems: 'center', paddingVertical: 20, gap: 6 },
  avatar: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: Colors.bgSurface,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
  },
  patientName: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  patientSub:  { fontSize: 12, color: Colors.textSecondary },

  section:    { gap: 8 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 4 },
  sectionTitle: { fontSize: 10, fontWeight: '700', color: Colors.textLabel, letterSpacing: 1.5, paddingHorizontal: 4 },

  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg, borderWidth: 1,
    borderColor: Colors.border, overflow: 'hidden',
  },

  statusBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: Radius.md, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  statusText: { fontSize: 12, fontWeight: '600', flex: 1, lineHeight: 17 },

  contactHint: { fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },

  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 9, fontWeight: '700', color: Colors.textLabel, letterSpacing: 1.4, paddingHorizontal: 2 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.bgSurface,
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 12, paddingVertical: 11,
  },
  input: { flex: 1, fontSize: 14, color: Colors.textPrimary, fontWeight: '500' },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: Radius.full, borderWidth: 1.5,
    borderColor: `${Colors.danger}55`,
    backgroundColor: Colors.dangerGlow,
    paddingVertical: 11,
  },
  saveBtnText: { fontSize: 13, fontWeight: '700', letterSpacing: 1.5 },

  infoRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: `${Colors.border}80` },
  infoLeft:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoLabel:     { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  infoValue:     { fontSize: 14, color: Colors.textPrimary,   fontWeight: '600' },

  reconnectBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.accentGlow, borderRadius: Radius.full,
    borderWidth: 1.5, borderColor: `${Colors.accent}50`, paddingVertical: 14,
  },
  reconnectText: { fontSize: 13, fontWeight: '700', color: Colors.accent, letterSpacing: 1.5 },
  version:       { textAlign: 'center', fontSize: 11, color: Colors.textMuted, letterSpacing: 1 },
});
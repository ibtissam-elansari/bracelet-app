import { ActiveAlert, AlertType } from '@/context/SensorContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import {
  Animated, Modal, StyleSheet, Text,
  TouchableOpacity, Vibration, View,
} from 'react-native';
import { Colors, Radius } from '../constants/theme';

type MCIcon = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const CONFIG: Record<AlertType, {
  icon: MCIcon; color: string; glowColor: string; vibrate: number[];
}> = {
  fall:      { icon: 'alert-circle', color: Colors.danger,  glowColor: Colors.dangerGlow,  vibrate: [0,400,150,400,150,500] },
  sos:       { icon: 'alarm-light',  color: Colors.danger,  glowColor: Colors.dangerGlow,  vibrate: [0,500,100,500,100,600] },
  hr_high:   { icon: 'heart-pulse',  color: Colors.heart,   glowColor: Colors.heartGlow,   vibrate: [0,300,200,300] },
  hr_low:    { icon: 'heart-pulse',  color: Colors.heart,   glowColor: Colors.heartGlow,   vibrate: [0,300,200,300] },
  temp_high: { icon: 'thermometer',  color: Colors.warning, glowColor: Colors.warningGlow, vibrate: [0,250,200,250] },
};

type Props = { visible: boolean; alert: ActiveAlert; onDismiss: () => void };

export function AlertBox({ visible, alert, onDismiss }: Props) {
  const scaleAnim   = useRef(new Animated.Value(0.78)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim   = useRef(new Animated.Value(1)).current;

  const cfg         = CONFIG[alert.type];
  const isEmergency = alert.type === 'fall' || alert.type === 'sos';

  useEffect(() => {
    if (!visible) return;
    Vibration.vibrate(cfg.vibrate);
    Animated.parallel([
      Animated.spring(scaleAnim,   { toValue: 1, useNativeDriver: true, tension: 110, friction: 7 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 260, useNativeDriver: true }),
    ]).start();
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.022, duration: 700, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1,     duration: 700, useNativeDriver: true }),
    ]));
    pulse.start();
    return () => pulse.stop();
  }, [visible]);

  const time = new Date(alert.timestamp).toLocaleTimeString();

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <View style={styles.overlay}>
        <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]} />

        <Animated.View style={[
          styles.card,
          {
            transform: [{ scale: scaleAnim }, { scale: pulseAnim }],
            opacity: opacityAnim,
            borderColor: `${cfg.color}50`,
            shadowColor: cfg.color,
          },
        ]}>
          {/* Top color bar */}
          <View style={[styles.topBar, { backgroundColor: cfg.color }]} />

          {/* Icon circle — vector icon only, no emoji */}
          <View style={[styles.iconCircle, {
            backgroundColor: cfg.glowColor,
            borderColor: `${cfg.color}50`,
          }]}>
            <MaterialCommunityIcons name={cfg.icon} size={48} color={cfg.color} />
          </View>

          {/* Title — plain text only */}
          <Text style={[styles.title, { color: cfg.color }]}>{alert.title}</Text>
          <Text style={styles.timestamp}>{time}</Text>

          {/* Detail */}
          <Text style={styles.detail}>{alert.detail}</Text>

          {/* SMS status — only for fall / SOS (bracelet fires SIM800L) */}
          {isEmergency && (
            <View style={[
              styles.smsBox,
              {
                borderColor:     alert.smsSentByBracelet ? `${Colors.success}40` : `${Colors.warning}40`,
                backgroundColor: alert.smsSentByBracelet ? Colors.successGlow    : Colors.warningGlow,
              },
            ]}>
              <MaterialCommunityIcons
                name={alert.smsSentByBracelet ? 'message-check-outline' : 'message-alert-outline'}
                size={18}
                color={alert.smsSentByBracelet ? Colors.success : Colors.warning}
              />
              <View style={styles.smsTextWrap}>
                <Text style={[styles.smsTitle, {
                  color: alert.smsSentByBracelet ? Colors.success : Colors.warning,
                }]}>
                  {alert.smsSentByBracelet ? 'SMS sent by bracelet' : 'SMS sending via bracelet…'}
                </Text>
                <Text style={styles.smsSub}>
                  {alert.smsSentByBracelet
                    ? 'Your emergency contact was notified with your GPS location.'
                    : 'The SIM800L module is contacting your emergency contact.'}
                </Text>
              </View>
            </View>
          )}

          {/* Emergency services note */}
          {isEmergency && (
            <Text style={styles.emergencyNote}>
              If needed, call emergency services:{' '}
              <Text style={{ color: cfg.color, fontWeight: '700' }}>112</Text>
            </Text>
          )}

          <View style={styles.divider} />

          <TouchableOpacity
            style={[styles.ackBtn, {
              borderColor: `${cfg.color}50`,
              backgroundColor: cfg.glowColor,
            }]}
            onPress={onDismiss}
            activeOpacity={0.75}
          >
            <MaterialCommunityIcons name="check-circle-outline" size={18} color={cfg.color} />
            <Text style={[styles.ackText, { color: cfg.color }]}>I'M AWARE</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(6,10,18,0.95)' },
  card: {
    width: '100%', maxWidth: 370,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.xl, borderWidth: 1.5,
    alignItems: 'center', overflow: 'hidden',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 32,
    elevation: 22, paddingBottom: 26,
  },
  topBar:     { width: '100%', height: 4, marginBottom: 22 },
  iconCircle: {
    width: 90, height: 90, borderRadius: 45, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  title: {
    fontSize: 20, fontWeight: '800', letterSpacing: 2.2,
    marginBottom: 3, textAlign: 'center',
  },
  timestamp: { fontSize: 11, color: Colors.textMuted, letterSpacing: 0.5, marginBottom: 10 },
  detail: {
    fontSize: 13, color: Colors.textSecondary, textAlign: 'center',
    paddingHorizontal: 22, lineHeight: 20, marginBottom: 14,
  },
  smsBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    marginHorizontal: 18, padding: 12,
    borderRadius: Radius.md, borderWidth: 1, marginBottom: 2,
  },
  smsTextWrap: { flex: 1, gap: 3 },
  smsTitle:    { fontSize: 13, fontWeight: '700' },
  smsSub:      { fontSize: 11, color: Colors.textMuted, lineHeight: 15 },
  emergencyNote: {
    marginTop: 10, marginHorizontal: 24,
    fontSize: 12, color: Colors.textSecondary,
    textAlign: 'center', lineHeight: 18,
  },
  divider: { width: '80%', height: 1, backgroundColor: Colors.border, marginVertical: 18 },
  ackBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 12, paddingHorizontal: 40,
    borderRadius: Radius.full, borderWidth: 1.5,
  },
  ackText: { fontSize: 13, fontWeight: '700', letterSpacing: 2 },
});
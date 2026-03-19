import { AlertRecord, AlertType } from '@/context/SensorContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Modal, StyleSheet, Text, TouchableOpacity, Vibration, View } from 'react-native';
import { Colors, Radius } from '../constants/theme';

type MCIcon = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const CFG: Record<AlertType, { icon: MCIcon; color: string; glow: string; vibe: number[] }> = {
  fall:      { icon: 'alert-circle',  color: Colors.danger,  glow: Colors.dangerGlow,  vibe: [0,400,150,400,150,500] },
  sos:       { icon: 'alarm-light',   color: Colors.danger,  glow: Colors.dangerGlow,  vibe: [0,500,100,500,100,600] },
  hr_high:   { icon: 'heart-pulse',   color: Colors.heart,   glow: Colors.heartGlow,   vibe: [0,300,200,300] },
  hr_low:    { icon: 'heart-pulse',   color: Colors.heart,   glow: Colors.heartGlow,   vibe: [0,300,200,300] },
  temp_high: { icon: 'thermometer',   color: Colors.warning, glow: Colors.warningGlow, vibe: [0,250,200,250] },
};

type Props = { visible: boolean; alert: AlertRecord; onDismiss: () => void };

export function AlertBox({ visible, alert, onDismiss }: Props) {
  const scaleAnim   = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim   = useRef(new Animated.Value(1)).current;

  const cfg         = CFG[alert.type];
  const isEmergency = alert.type === 'fall' || alert.type === 'sos';

  useEffect(() => {
    if (!visible) return;
    Vibration.vibrate(cfg.vibe);
    Animated.parallel([
      Animated.spring(scaleAnim,   { toValue: 1, useNativeDriver: true, tension: 120, friction: 8 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 240, useNativeDriver: true }),
    ]).start();
    const p = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.018, duration: 750, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1,     duration: 750, useNativeDriver: true }),
    ]));
    p.start();
    return () => p.stop();
  }, [visible]);

  const time = new Date(alert.timestamp).toLocaleTimeString();

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <View style={s.overlay}>
        <Animated.View style={[s.backdrop, { opacity: opacityAnim }]} />

        <Animated.View style={[
          s.card,
          {
            transform: [{ scale: scaleAnim }, { scale: pulseAnim }],
            opacity: opacityAnim,
            borderColor: `${cfg.color}45`,
            shadowColor: cfg.color,
          },
        ]}>
          <View style={[s.topBar, { backgroundColor: cfg.color }]} />

          <View style={[s.iconRing, { backgroundColor: cfg.glow, borderColor: `${cfg.color}40` }]}>
            <MaterialCommunityIcons name={cfg.icon} size={46} color={cfg.color} />
          </View>

          <Text style={[s.title, { color: cfg.color }]}>{alert.title}</Text>
          <Text style={s.time}>{time}</Text>
          <Text style={s.detail}>{alert.detail}</Text>

          {/* SMS status — only for bracelet emergencies */}
          {isEmergency && (
            <View style={[
              s.smsRow,
              {
                borderColor:     alert.smsSentByBracelet ? `${Colors.success}35` : `${Colors.warning}35`,
                backgroundColor: alert.smsSentByBracelet ? Colors.successGlow    : Colors.warningGlow,
              },
            ]}>
              <MaterialCommunityIcons
                name={alert.smsSentByBracelet ? 'message-check-outline' : 'message-alert-outline'}
                size={17}
                color={alert.smsSentByBracelet ? Colors.success : Colors.warning}
              />
              <View style={{ flex: 1 }}>
                <Text style={[s.smsTitle, { color: alert.smsSentByBracelet ? Colors.success : Colors.warning }]}>
                  {alert.smsSentByBracelet ? 'SMS sent by bracelet' : 'Sending SMS via bracelet…'}
                </Text>
                <Text style={s.smsSub}>
                  {alert.smsSentByBracelet
                    ? 'Emergency contact notified with GPS location.'
                    : 'SIM800L GSM module is contacting your emergency contact.'}
                </Text>
              </View>
            </View>
          )}

          {isEmergency && (
            <Text style={s.callNote}>
              Emergency services: <Text style={[s.callNum, { color: cfg.color }]}>112</Text>
            </Text>
          )}

          <View style={s.divider} />

          <TouchableOpacity
            style={[s.btn, { borderColor: `${cfg.color}45`, backgroundColor: cfg.glow }]}
            onPress={onDismiss}
            activeOpacity={0.75}
          >
            <MaterialCommunityIcons name="check-circle-outline" size={18} color={cfg.color} />
            <Text style={[s.btnText, { color: cfg.color }]}>I'M AWARE</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(5,8,14,0.96)' },
  card: {
    width: '100%', maxWidth: 365,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.xxl, borderWidth: 1.5,
    alignItems: 'center', overflow: 'hidden',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55, shadowRadius: 30, elevation: 20,
    paddingBottom: 24,
  },
  topBar:   { width: '100%', height: 3.5, marginBottom: 24 },
  iconRing: {
    width: 88, height: 88, borderRadius: 44, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  title:   { fontSize: 19, fontWeight: '800', letterSpacing: 2, textAlign: 'center', marginBottom: 3 },
  time:    { fontSize: 11, color: Colors.textMuted, letterSpacing: 0.4, marginBottom: 10 },
  detail:  { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: 22, lineHeight: 19, marginBottom: 14 },
  smsRow:  { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginHorizontal: 16, padding: 11, borderRadius: Radius.md, borderWidth: 1, marginBottom: 4 },
  smsTitle:{ fontSize: 12, fontWeight: '700', marginBottom: 2 },
  smsSub:  { fontSize: 11, color: Colors.textMuted, lineHeight: 15 },
  callNote:{ marginTop: 10, fontSize: 12, color: Colors.textSecondary },
  callNum: { fontWeight: '800' },
  divider: { width: '75%', height: 1, backgroundColor: Colors.border, marginVertical: 18 },
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 12, paddingHorizontal: 40,
    borderRadius: Radius.full, borderWidth: 1.5,
  },
  btnText: { fontSize: 13, fontWeight: '700', letterSpacing: 2 },
});
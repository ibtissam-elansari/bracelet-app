import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Colors, Radius } from '../constants/theme';

export type MCIcon = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

type Props = {
  label:       string;
  value:       string | number;
  unit?:       string;
  iconName:    MCIcon;
  color:       string;
  status?:     'normal' | 'warning' | 'danger' | 'inactive';
  subtitle?:   string;
  flex?:       number;
};

export function SensorCard({ label, value, unit, iconName, color, status = 'normal', subtitle, flex = 1 }: Props) {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const loopRef   = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    loopRef.current?.stop();
    if (status === 'danger') {
      loopRef.current = Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.03, duration: 550, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 550, useNativeDriver: true }),
      ]));
      loopRef.current.start();
    } else {
      pulseAnim.setValue(1);
    }
    return () => loopRef.current?.stop();
  }, [status]);

  const displayColor =
    status === 'danger'   ? Colors.danger  :
    status === 'warning'  ? Colors.warning :
    status === 'inactive' ? Colors.textMuted :
    color;

  const glowColor = `${displayColor}18`;
  const borderColor = `${displayColor}35`;

  return (
    <Animated.View style={[
      styles.card,
      { flex, opacity: fadeAnim, transform: [{ scale: pulseAnim }] },
      { borderColor, backgroundColor: Colors.bgCard },
      status === 'danger' && {
        shadowColor: displayColor,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 8,
      },
    ]}>
      {/* Left color bar */}
      <View style={[styles.colorBar, { backgroundColor: displayColor }]} />

      <View style={styles.inner}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconWrap, { backgroundColor: glowColor }]}>
            <MaterialCommunityIcons name={iconName} size={16} color={displayColor} />
          </View>
          <Text style={styles.label}>{label}</Text>
        </View>

        {/* Value */}
        <View style={styles.valueRow}>
          <Text style={[styles.value, { color: displayColor }]} numberOfLines={1} adjustsFontSizeToFit>
            {value}
          </Text>
          {unit && <Text style={[styles.unit, { color: displayColor + '99' }]}>{unit}</Text>}
        </View>

        {/* Subtitle */}
        {subtitle && <Text style={styles.sub} numberOfLines={1}>{subtitle}</Text>}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  colorBar: {
    width: 3,
    borderTopLeftRadius: Radius.lg,
    borderBottomLeftRadius: Radius.lg,
  },
  inner: { flex: 1, padding: 14, gap: 6 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  iconWrap: {
    width: 28, height: 28,
    borderRadius: 7,
    alignItems: 'center', justifyContent: 'center',
  },
  label: {
    fontSize: 10, fontWeight: '700',
    color: Colors.textLabel,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    flex: 1,
  },
  valueRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  value: {
    fontSize: 28, fontWeight: '800',
    letterSpacing: -0.5, lineHeight: 32,
  },
  unit: { fontSize: 12, fontWeight: '600', marginBottom: 3 },
  sub: { fontSize: 11, color: Colors.textSecondary, fontWeight: '500' },
});
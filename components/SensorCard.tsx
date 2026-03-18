import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Colors, Radius } from '../constants/theme';

export type MCIcon = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

type SensorCardProps = {
  label: string;
  value: string | number;
  unit?: string;
  iconName: MCIcon;
  glowColor?: string;
  status?: 'normal' | 'warning' | 'danger' | 'inactive';
  subtitle?: string;
  large?: boolean;
};

export function SensorCard({
  label,
  value,
  unit,
  iconName,
  glowColor = Colors.accent,
  status = 'normal',
  subtitle,
  large = false,
}: SensorCardProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (status === 'danger') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.04, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [status]);

  const statusColor =
    status === 'danger'   ? Colors.danger  :
    status === 'warning'  ? Colors.warning :
    status === 'inactive' ? Colors.textMuted :
    glowColor;

  const statusGlow =
    status === 'danger'  ? Colors.dangerGlow  :
    status === 'warning' ? Colors.warningGlow :
    `${glowColor}20`;

  return (
    <Animated.View
      style={[
        styles.card,
        large && styles.cardLarge,
        {
          transform: [{ scale: pulseAnim }],
          opacity: fadeAnim,
          borderColor: `${statusColor}40`,
          backgroundColor: Colors.bgCard,
          shadowColor: statusColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: status === 'danger' ? 0.5 : 0.2,
          shadowRadius: 14,
          elevation: 6,
        },
      ]}
    >
      {/* Top accent line */}
      <View style={[styles.accentLine, { backgroundColor: statusColor }]} />

      {/* Header row */}
      <View style={styles.header}>
        <View style={[styles.iconBadge, { backgroundColor: statusGlow }]}>
          <MaterialCommunityIcons name={iconName} size={18} color={statusColor} />
        </View>
        <Text style={styles.label}>{label}</Text>
      </View>

      {/* Value */}
      <View style={styles.valueRow}>
        <Text style={[styles.value, large && styles.valueLarge, { color: statusColor }]}>
          {value}
        </Text>
        {unit ? <Text style={[styles.unit, { color: statusColor + 'AA' }]}>{unit}</Text> : null}
      </View>

      {/* Subtitle */}
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: 16,
    overflow: 'hidden',
    flex: 1,
  },
  cardLarge: {
    padding: 20,
  },
  accentLine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 2,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    marginTop: 4,
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textLabel,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  value: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: Colors.textPrimary,
  },
  valueLarge: {
    fontSize: 42,
  },
  unit: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 5,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
});
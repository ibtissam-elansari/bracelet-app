import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Circle, G, Svg } from 'react-native-svg';
import { Colors } from '../constants/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  bpm:    number;
  status: 'normal' | 'warning' | 'danger' | 'inactive';
  size?:  number;
};

const MIN_BPM = 40;
const MAX_BPM = 140;

export function HRGauge({ bpm, status, size = 160 }: Props) {
  const strokeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim  = useRef(new Animated.Value(1)).current;
  const loopRef    = useRef<Animated.CompositeAnimation | null>(null);

  const color =
    status === 'danger'   ? Colors.danger   :
    status === 'warning'  ? Colors.warning  :
    status === 'inactive' ? Colors.textMuted :
    Colors.heart;

  const R            = (size / 2) - 16;
  const circumference = 2 * Math.PI * R;
  const progress     = Math.min(Math.max((bpm - MIN_BPM) / (MAX_BPM - MIN_BPM), 0), 1);

  useEffect(() => {
    Animated.timing(strokeAnim, {
      toValue: progress * circumference,
      duration: 700,
      useNativeDriver: false,
    }).start();
  }, [progress, circumference]);

  useEffect(() => {
    loopRef.current?.stop();
    if (status === 'danger' || status === 'warning') {
      loopRef.current = Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 500, useNativeDriver: true }),
      ]));
      loopRef.current.start();
    } else {
      pulseAnim.setValue(1);
    }
    return () => loopRef.current?.stop();
  }, [status]);

  const dashOffset = strokeAnim.interpolate({
    inputRange:  [0, circumference],
    outputRange: [circumference, 0],
  });

  return (
    <Animated.View
      style={[
        // ✅ Explicit width + height — prevents parent collapsing to zero
        { width: size, height: size },
        { transform: [{ scale: pulseAnim }] },
      ]}
    >
      {/* SVG ring — fills the entire sized view */}
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          {/* Track */}
          <Circle
            cx={size / 2} cy={size / 2} r={R}
            stroke={Colors.border}
            strokeWidth={9}
            fill="none"
            strokeLinecap="round"
          />
          {/* Animated arc */}
          <AnimatedCircle
            cx={size / 2} cy={size / 2} r={R}
            stroke={color}
            strokeWidth={9}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </G>
      </Svg>

      {/* Centre label — absolutely overlaid on the SVG */}
      <View style={[StyleSheet.absoluteFillObject, styles.center]}>
        <MaterialCommunityIcons name="heart-pulse" size={20} color={color} />
        <Text style={[styles.bpm, { color }]}>
          {status === 'inactive' ? '––' : bpm}
        </Text>
        <Text style={styles.unit}>BPM</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  bpm: {
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 46,
  },
  unit: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 2.5,
  },
});
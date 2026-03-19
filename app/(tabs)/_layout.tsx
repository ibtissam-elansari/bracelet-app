import { Colors } from '@/constants/theme';
import { useSensor } from '@/context/SensorContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

type MCIcon = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

// Dead-simple tab icon — no wrapper tricks, no flex magic.
// The icon renders at its natural size inside a fixed-size View.
function Icon({
  name, focused, label, badge,
}: {
  name: MCIcon; focused: boolean; label: string; badge?: number;
}) {
  return (
    <View style={styles.iconWrap}>
      {/* Icon */}
      <MaterialCommunityIcons
        name={name}
        size={26}
        color={focused ? Colors.accent : Colors.textMuted}
      />

      {/* Unread badge */}
      {!!badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      )}

      {/* Active label below icon */}
      {focused && (
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      )}
    </View>
  );
}

export default function TabLayout() {
  const { unreadAlertCount } = useSensor();

  return (
    <Tabs
      screenOptions={{
        headerShown:       false,
        tabBarShowLabel:   false,
        tabBarStyle:       styles.bar,
        tabBarHideOnKeyboard: true,
        // Let the icon component handle colours — disable Expo's default tinting
        tabBarActiveTintColor:   Colors.accent,
        tabBarInactiveTintColor: Colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <Icon name="view-dashboard-outline" focused={focused} label="Dashboard" />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          tabBarIcon: ({ focused }) => (
            <Icon name="map-outline" focused={focused} label="Map" />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          tabBarIcon: ({ focused }) => (
            <Icon
              name="chart-line"
              focused={focused}
              label="History"
              badge={unreadAlertCount}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <Icon name="cog-outline" focused={focused} label="Settings" />
          ),
        }}
      />
    </Tabs>
  );
}

const BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 68;

const styles = StyleSheet.create({
  bar: {
    backgroundColor: Colors.bgCard,
    borderTopColor:  Colors.border,
    borderTopWidth:  1,
    height:          BAR_HEIGHT,
    paddingBottom:   Platform.OS === 'ios' ? 28 : 10,
    paddingTop:      8,
  },

  // Fixed square container — prevents layout collapse
  iconWrap: {
    width:          54,
    alignItems:     'center',
    justifyContent: 'center',
    position:       'relative',
  },

  // Active label sits below the icon
  label: {
    fontSize:      10,
    fontWeight:    '700',
    color:         Colors.accent,
    letterSpacing: 0.3,
    marginTop:     2,
  },

  // Badge floats top-right of the icon
  badge: {
    position:        'absolute',
    top:             -3,
    right:           2,
    minWidth:        16,
    height:          16,
    borderRadius:    8,
    backgroundColor: Colors.danger,
    alignItems:      'center',
    justifyContent:  'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize:   9,
    fontWeight: '800',
    color:      '#fff',
  },
});
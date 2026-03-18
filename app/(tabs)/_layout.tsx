import { Colors, Radius } from '@/constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

type MCIcon = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

// Simple, flat icon renderer — no wrapper View with flex or padding that
// could intercept taps or clip the icon outside the tab bar hit rect.
function TabIcon({ name, focused, label }: { name: MCIcon; focused: boolean; label: string }) {
  return (
    <View style={styles.tabIcon}>
      <View style={[styles.tabPill, focused && styles.tabPillActive]}>
        <MaterialCommunityIcons
          name={name}
          size={22}
          color={focused ? Colors.accent : Colors.textMuted}
        />
        {focused && (
          <Text style={styles.tabLabel} numberOfLines={1}>{label}</Text>
        )}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.textMuted,
        // Remove default tab bar background on iOS to avoid double bg
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="heart-pulse" focused={focused} label="Dashboard" />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="map" focused={focused} label="Map" />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="chart-line" focused={focused} label="History" />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="account-circle" focused={focused} label="Profile" />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.bgCard,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 84 : 64,
    paddingBottom: Platform.OS === 'ios' ? 26 : 6,
    paddingTop: 6,
    paddingHorizontal: 4,
  },
  // The outer view fills the full tab cell — must NOT have flex or paddingVertical
  // that would make it taller than the tab bar item, causing invisible overflow.
  tabIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.full,
    minWidth: 44,
  },
  tabPillActive: {
    backgroundColor: Colors.accentGlow,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.accent,
    maxWidth: 72,
  },
});
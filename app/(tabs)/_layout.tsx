import React from 'react';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, fontFamily, fontSize } from '@/src/core/theme';
import { AnimatedTabIcon } from '@/src/core/ui/AnimatedTabIcon';

type TabIconPair = {
  outline: keyof typeof Ionicons.glyphMap;
  filled: keyof typeof Ionicons.glyphMap;
};

const ICONS: Record<string, TabIconPair> = {
  'intake-qc': { outline: 'checkmark-done-outline', filled: 'checkmark-done' },
  'intake-qc-inspection': { outline: 'clipboard-outline', filled: 'clipboard' },
  'grading-qc': { outline: 'ribbon-outline', filled: 'ribbon' },
  'inspection-log': { outline: 'checkbox-outline', filled: 'checkbox' },
  'stock-check': { outline: 'swap-horizontal-outline', filled: 'swap-horizontal' },
  'configure-station': { outline: 'settings-outline', filled: 'settings' },
};

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        // Each tab's screen renders its own <Screen> with header,
        // so the Tabs navigator itself doesn't draw a header.
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          height: 64 + insets.bottom,
          paddingTop: 10,
          paddingBottom: insets.bottom,
        },
        tabBarItemStyle: { paddingTop: 4 },
        tabBarLabelStyle: { fontFamily: fontFamily.medium, fontSize: fontSize.xs },
        tabBarIcon: ({ focused, size }) => {
          const pair = ICONS[route.name];
          if (!pair) return null;
          return (
            <AnimatedTabIcon outline={pair.outline} filled={pair.filled} focused={focused} size={size} />
          );
        },
      })}
    >
      <Tabs.Screen name="intake-qc" options={{ title: 'Intake QC' }} />
      <Tabs.Screen name="intake-qc-inspection" options={{ title: 'Inspection' }} />
      <Tabs.Screen name="grading-qc" options={{ title: 'Grading' }} />
      <Tabs.Screen name="inspection-log" options={{ title: 'Inspection Log' }} />
      <Tabs.Screen name="stock-check" options={{ title: 'Stock Check' }} />
      <Tabs.Screen name="configure-station" options={{ title: 'Station' }} />
    </Tabs>
  );
}

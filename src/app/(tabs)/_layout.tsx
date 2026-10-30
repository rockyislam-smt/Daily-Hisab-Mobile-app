import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useTranslation } from '../../hooks/useTranslation';

export default function TabLayout() {
  const { colors } = useThemeColors();
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.borderSubtle,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 8,
          elevation: 8,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      {/* 1. Home / Dashboard */}
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabHome'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'wallet' : 'wallet-outline'}
              size={22}
              color={color as string}
            />
          ),
        }}
      />

      {/* 2. Transactions */}
      <Tabs.Screen
        name="transactions"
        options={{
          title: t('tabTransactions'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'receipt' : 'receipt-outline'}
              size={22}
              color={color as string}
            />
          ),
        }}
      />

      {/* 3. Add (Prominent Center Button) */}
      <Tabs.Screen
        name="add"
        options={{
          title: t('tabAdd'),
          tabBarIcon: ({ focused }) => (
            <View style={[styles.centerAddBtn, { backgroundColor: colors.primary }]}>
              <Ionicons name="add" size={28} color="#FFFFFF" />
            </View>
          ),
          tabBarLabelStyle: {
            display: 'none', // Hide label for center floating button
          },
        }}
      />

      {/* 4. Analytics */}
      <Tabs.Screen
        name="analytics"
        options={{
          title: t('tabAnalytics'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'bar-chart' : 'bar-chart-outline'}
              size={22}
              color={color as string}
            />
          ),
        }}
      />

      {/* 5. Planning */}
      <Tabs.Screen
        name="planning"
        options={{
          title: t('tabPlanning'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'calendar' : 'calendar-outline'}
              size={22}
              color={color as string}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  centerAddBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Platform.OS === 'ios' ? 12 : 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});

import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { initDatabase } from '../database/db';
import { RecurringRepository } from '../database/repositories/recurring.repository';
import { useAppStore } from '../store/useAppStore';
import { NotificationService } from '../services/notification.service';
import { LockScreenModal } from '../components/LockScreenModal';
import { useThemeColors } from '../hooks/useThemeColors';

// Prevent native splash screen from auto-hiding until initialization completes
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const { colors, isDark } = useThemeColors();
  const { loadAppSettings, language } = useAppStore();

  useEffect(() => {
    async function prepareApp() {
      try {
        // 1. Initialize SQLite Database & run schema migrations
        await initDatabase();

        // 2. Load stored user settings
        await loadAppSettings();

        // 3. Process any due recurring transactions automatically
        await RecurringRepository.processDueRecurringTransactions();

        // 4. Request notification permission & schedule daily reminder
        await NotificationService.requestPermissions();
        await NotificationService.scheduleDailyExpenseReminder('21:00', language);
      } catch (e) {
        console.warn('Initialization error:', e);
      } finally {
        setIsReady(true);
        await SplashScreen.hideAsync().catch(() => {});
      }
    }

    prepareApp();
  }, []);

  if (!isReady) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: '#0D3B2E' }]}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="daily-cash-tracker"
          options={{
            presentation: 'card',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="money-diary"
          options={{
            presentation: 'card',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="calendar"
          options={{
            presentation: 'card',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="accounts-manager"
          options={{
            presentation: 'card',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="debts-manager"
          options={{
            presentation: 'card',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="savings-manager"
          options={{
            presentation: 'card',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="budgets-manager"
          options={{
            presentation: 'card',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="recurring-manager"
          options={{
            presentation: 'card',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            presentation: 'card',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="onboarding"
          options={{
            presentation: 'fullScreenModal',
            headerShown: false,
          }}
        />
      </Stack>

      {/* Top-level security lock screen */}
      <LockScreenModal />
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

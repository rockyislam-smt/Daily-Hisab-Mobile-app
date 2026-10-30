import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../hooks/useThemeColors';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from '../hooks/useTranslation';

export default function OnboardingScreen() {
  const router = useRouter();
  const { colors } = useThemeColors();
  const { t } = useTranslation();
  const { setOnboardingCompleted } = useAppStore();

  const handleGetStarted = async () => {
    await setOnboardingCompleted(true);
    router.replace('/(tabs)/');
  };

  const features = [
    {
      icon: 'shield-checkmark',
      color: colors.primary,
      title: t('feature1Title'),
      desc: t('feature1Sub'),
    },
    {
      icon: 'book',
      color: colors.planning,
      title: t('feature2Title'),
      desc: t('feature2Sub'),
    },
    {
      icon: 'sparkles',
      color: colors.savings,
      title: t('feature3Title'),
      desc: t('feature3Sub'),
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Banner */}
      <View style={styles.topSection}>
        <View style={[styles.logoWrap, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="wallet" size={48} color={colors.primary} />
        </View>
        <Text style={[styles.appName, { color: colors.text }]}>{t('welcomeTitle')}</Text>
        <Text style={[styles.tagline, { color: colors.textSecondary }]}>{t('welcomeSub')}</Text>
      </View>

      {/* Feature Highlights */}
      <View style={styles.featuresSection}>
        {features.map((f, i) => (
          <View key={i} style={styles.featureRow}>
            <View style={[styles.featureIconBox, { backgroundColor: `${f.color}20` }]}>
              <Ionicons name={f.icon as any} size={24} color={f.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.featureTitle, { color: colors.text }]}>{f.title}</Text>
              <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>{f.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Bottom Action */}
      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={[styles.startBtn, { backgroundColor: colors.primary }]}
          onPress={handleGetStarted}
          activeOpacity={0.8}
        >
          <Text style={styles.startBtnText}>{t('getStarted')}</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  topSection: {
    alignItems: 'center',
    marginTop: 40,
  },
  logoWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  appName: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
    maxWidth: 300,
  },
  featuresSection: {
    gap: 24,
    marginVertical: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  featureIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  featureDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  bottomSection: {
    marginBottom: 30,
  },
  startBtn: {
    flexDirection: 'row',
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  startBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});


import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Switch,
  Modal,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../hooks/useThemeColors';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from '../hooks/useTranslation';
import { Header } from '../components/Header';
import { SecurityService } from '../services/security.service';
import { BackupService } from '../services/backup.service';
import { resetDatabase } from '../database/db';
import { SettingsRepository } from '../database/repositories/settings.repository';

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, isDark } = useThemeColors();
  const { t } = useTranslation();
  const {
    language,
    setLanguage,
    baseCurrency,
    setBaseCurrency,
    themeMode,
    setThemeMode,
    isAppLockEnabled,
    isBiometricsEnabled,
    lockType,
    checkLockStatus,
    triggerRefresh,
  } = useAppStore();

  // PIN / Password setup modal
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [isSettingPassword, setIsSettingPassword] = useState(false);

  // Encrypted backup modal
  const [encryptModalVisible, setEncryptModalVisible] = useState(false);
  const [backupPassword, setBackupPassword] = useState('');

  // Restore password modal
  const [restoreModalVisible, setRestoreModalVisible] = useState(false);
  const [restoreFileContent, setRestoreFileContent] = useState('');
  const [restorePassword, setRestorePassword] = useState('');

  // Handle App Lock toggle
  const handleToggleLock = async (enabled: boolean) => {
    if (enabled) {
      // Open modal to set PIN
      setPinInput('');
      setConfirmPinInput('');
      setPinModalVisible(true);
    } else {
      // Prompt for confirmation / verification before disabling
      Alert.prompt
        ? Alert.prompt(
            'Disable App Lock',
            'Enter your current PIN/Password to disable security:',
            [
              { text: t('cancel'), style: 'cancel' },
              {
                text: t('confirm'),
                onPress: async (entered?: string) => {
                  if (!entered) return;
                  const success = await SecurityService.disableAppLock(entered);
                  if (success) {
                    await checkLockStatus();
                    Alert.alert('App Lock Disabled', 'Security protection has been removed.');
                  } else {
                    Alert.alert('Verification Failed', 'Incorrect PIN/Password.');
                  }
                },
              },
            ],
            'secure-text'
          )
        : Alert.alert('Verification Required', 'Please authenticate to disable App Lock.', [
            { text: t('cancel'), style: 'cancel' },
            {
              text: 'Authenticate',
              onPress: async () => {
                const verified = await SecurityService.authenticateWithBiometrics(
                  'Confirm removing App Lock'
                );
                if (verified) {
                  // Direct bypass via verified biometrics
                  await SecurityService.clearAppLock();
                  await checkLockStatus();
                  Alert.alert('App Lock Disabled');
                }
              },
            },
          ]);
    }
  };

  const handleSavePin = async () => {
    if (pinInput.length < 4) {
      Alert.alert('Validation Error', 'PIN must be at least 4 digits.');
      return;
    }
    if (pinInput !== confirmPinInput) {
      Alert.alert('Error', t('pinsDoNotMatch'));
      return;
    }

    try {
      await SecurityService.setLockCredentials('pin', pinInput, true);
      await checkLockStatus();
      setPinModalVisible(false);
      setPinInput('');
      setConfirmPinInput('');
      Alert.alert('Success', 'App Lock PIN successfully configured!');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not set PIN');
    }
  };

  const handleExportJson = async () => {
    try {
      await BackupService.exportJsonBackup();
    } catch (err: any) {
      Alert.alert('Backup Error', err.message || 'Could not export backup');
    }
  };

  const handleExportEncryptedJson = async () => {
    if (!backupPassword.trim()) {
      Alert.alert('Validation Error', 'Password cannot be empty.');
      return;
    }
    try {
      await BackupService.exportJsonBackup(backupPassword.trim());
      setEncryptModalVisible(false);
      setBackupPassword('');
    } catch (err: any) {
      Alert.alert('Backup Error', err.message || 'Could not export encrypted backup');
    }
  };

  const handlePickAndRestore = async () => {
    try {
      const picked = await BackupService.pickBackupFile();
      if (!picked) return;

      if (picked.isEncrypted) {
        setRestoreFileContent(picked.content);
        setRestorePassword('');
        setRestoreModalVisible(true);
      } else {
        Alert.alert(t('restore'), t('restoreWarning'), [
          { text: t('cancel'), style: 'cancel' },
          {
            text: t('restore'),
            style: 'destructive',
            onPress: async () => {
              await BackupService.restoreBackupPayload(picked.content);
              triggerRefresh();
              Alert.alert('Success', t('restoreSuccess'));
            },
          },
        ]);
      }
    } catch (err: any) {
      Alert.alert('Restore Failed', err.message || 'Invalid backup file.');
    }
  };

  const handleConfirmEncryptedRestore = async () => {
    try {
      await BackupService.restoreBackupPayload(restoreFileContent, restorePassword.trim());
      setRestoreModalVisible(false);
      setRestoreFileContent('');
      setRestorePassword('');
      triggerRefresh();
      Alert.alert('Success', t('restoreSuccess'));
    } catch (err: any) {
      Alert.alert('Restore Failed', err.message || 'Incorrect password.');
    }
  };

  const handleResetAllData = () => {
    Alert.alert(t('resetAllData'), t('resetWarning'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: 'Erase Everything',
        style: 'destructive',
        onPress: async () => {
          await resetDatabase();
          triggerRefresh();
          Alert.alert('App Reset', 'All local financial records have been reset.');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Header title={t('settings')} subtitle="Preferences & Data Control" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* ==================== 1. PREFERENCES SECTION ==================== */}
        <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>General</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
          {/* Language Switch */}
          <View style={styles.settingRow}>
            <View style={styles.rowLeft}>
              <Ionicons name="language-outline" size={20} color={colors.primary} />
              <Text style={[styles.settingLabel, { color: colors.text }]}>{t('language')}</Text>
            </View>
            <View style={styles.chipRow}>
              <TouchableOpacity
                style={[
                  styles.chip,
                  {
                    backgroundColor: language === 'bn' ? colors.primary : colors.cardSecondary,
                  },
                ]}
                onPress={() => setLanguage('bn')}
              >
                <Text style={{ color: language === 'bn' ? '#FFF' : colors.text, fontWeight: '700', fontSize: 12 }}>
                  বাংলা
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.chip,
                  {
                    backgroundColor: language === 'en' ? colors.primary : colors.cardSecondary,
                  },
                ]}
                onPress={() => setLanguage('en')}
              >
                <Text style={{ color: language === 'en' ? '#FFF' : colors.text, fontWeight: '700', fontSize: 12 }}>
                  English
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Currency Switch */}
          <View style={styles.settingRow}>
            <View style={styles.rowLeft}>
              <Ionicons name="cash-outline" size={20} color={colors.savings} />
              <Text style={[styles.settingLabel, { color: colors.text }]}>{t('baseCurrency')}</Text>
            </View>
            <View style={styles.chipRow}>
              {['BDT', 'USD', 'EUR', 'GBP'].map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: baseCurrency === c ? colors.primary : colors.cardSecondary,
                    },
                  ]}
                  onPress={() => setBaseCurrency(c)}
                >
                  <Text style={{ color: baseCurrency === c ? '#FFF' : colors.text, fontWeight: '700', fontSize: 11 }}>
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.divider} />

          {/* Theme Switch */}
          <View style={styles.settingRow}>
            <View style={styles.rowLeft}>
              <Ionicons name="moon-outline" size={20} color={colors.planning} />
              <Text style={[styles.settingLabel, { color: colors.text }]}>{t('theme')}</Text>
            </View>
            <View style={styles.chipRow}>
              {(['system', 'light', 'dark'] as const).map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: themeMode === m ? colors.primary : colors.cardSecondary,
                    },
                  ]}
                  onPress={() => setThemeMode(m)}
                >
                  <Text style={{ color: themeMode === m ? '#FFF' : colors.text, fontWeight: '700', fontSize: 11 }}>
                    {m.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* ==================== 2. SECURITY & PRIVACY ==================== */}
        <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>
          {t('securityTitle')}
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
          {/* App Lock Switch */}
          <View style={styles.settingRow}>
            <View style={styles.rowLeft}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.primary} />
              <View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>{t('appLock')}</Text>
                <Text style={[styles.subNote, { color: colors.textMuted }]}>{t('appLockDesc')}</Text>
              </View>
            </View>
            <Switch
              value={isAppLockEnabled}
              onValueChange={handleToggleLock}
              trackColor={{ false: colors.cardSecondary, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          {isAppLockEnabled && (
            <>
              <View style={styles.divider} />
              <TouchableOpacity
                style={styles.settingRow}
                onPress={() => {
                  setPinInput('');
                  setConfirmPinInput('');
                  setPinModalVisible(true);
                }}
              >
                <View style={styles.rowLeft}>
                  <Ionicons name="keypad-outline" size={20} color={colors.textSecondary} />
                  <Text style={[styles.settingLabel, { color: colors.text }]}>Change PIN</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* ==================== 3. BACKUP & RESTORE ==================== */}
        <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>
          {t('backupAndRestore')}
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
          <Text style={[styles.backupNote, { color: colors.textSecondary }]}>
            {t('backupSubtitle')}
          </Text>

          {/* Export Full JSON */}
          <TouchableOpacity style={styles.menuItem} onPress={handleExportJson}>
            <Ionicons name="cloud-upload-outline" size={20} color={colors.primary} />
            <Text style={[styles.menuText, { color: colors.text }]}>{t('createBackup')}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Export Encrypted JSON */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setEncryptModalVisible(true)}
          >
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.savings} />
            <Text style={[styles.menuText, { color: colors.text }]}>
              {t('createEncryptedBackup')}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Restore Backup */}
          <TouchableOpacity style={styles.menuItem} onPress={handlePickAndRestore}>
            <Ionicons name="cloud-download-outline" size={20} color={colors.warning} />
            <Text style={[styles.menuText, { color: colors.text }]}>{t('restoreBackup')}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* ==================== 4. DATA MANAGEMENT ==================== */}
        <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>Danger Zone</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
          <TouchableOpacity style={styles.menuItem} onPress={handleResetAllData}>
            <Ionicons name="trash-bin-outline" size={20} color={colors.danger} />
            <Text style={[styles.menuText, { color: colors.danger, fontWeight: '700' }]}>
              {t('resetAllData')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Offline notice and App Version */}
        <View style={styles.footerNotice}>
          <Text style={[styles.developerCredit, { color: colors.primary }]}>
            {t('developedBy')}
          </Text>
          <Text style={[styles.offlineText, { color: colors.textMuted }]}>{t('offlineNotice')}</Text>
          <Text style={[styles.versionText, { color: colors.textMuted }]}>
            PocketFlow v1.0.0 (Production Release)
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal: Set PIN */}
      <Modal visible={pinModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('setPin')}</Text>
              <TouchableOpacity onPress={() => setPinModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              Enter 4 or 6-digit PIN
            </Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.cardSecondary, borderColor: colors.border, color: colors.text }]}
              value={pinInput}
              onChangeText={setPinInput}
              keyboardType="number-pad"
              maxLength={6}
              secureTextEntry
              placeholder="••••"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 12 }]}>
              {t('confirmPin')}
            </Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.cardSecondary, borderColor: colors.border, color: colors.text }]}
              value={confirmPinInput}
              onChangeText={setConfirmPinInput}
              keyboardType="number-pad"
              maxLength={6}
              secureTextEntry
              placeholder="••••"
              placeholderTextColor={colors.textMuted}
            />

            <TouchableOpacity
              style={[styles.modalSaveBtn, { backgroundColor: colors.primary, marginTop: 18 }]}
              onPress={handleSavePin}
            >
              <Text style={styles.modalSaveText}>{t('save')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal: Export Encrypted Password */}
      <Modal visible={encryptModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Password-Protected Backup
              </Text>
              <TouchableOpacity onPress={() => setEncryptModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              Set Backup Encryption Password
            </Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.cardSecondary, borderColor: colors.border, color: colors.text }]}
              value={backupPassword}
              onChangeText={setBackupPassword}
              secureTextEntry
              placeholder="Choose a strong password..."
              placeholderTextColor={colors.textMuted}
            />

            <TouchableOpacity
              style={[styles.modalSaveBtn, { backgroundColor: colors.savings, marginTop: 18 }]}
              onPress={handleExportEncryptedJson}
            >
              <Text style={styles.modalSaveText}>Export Encrypted File</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal: Decrypt & Restore */}
      <Modal visible={restoreModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t('enterBackupPassword')}
              </Text>
              <TouchableOpacity onPress={() => setRestoreModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              Decryption Password
            </Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.cardSecondary, borderColor: colors.border, color: colors.text }]}
              value={restorePassword}
              onChangeText={setRestorePassword}
              secureTextEntry
              placeholder="Enter backup password..."
              placeholderTextColor={colors.textMuted}
            />

            <TouchableOpacity
              style={[styles.modalSaveBtn, { backgroundColor: colors.primary, marginTop: 18 }]}
              onPress={handleConfirmEncryptedRestore}
            >
              <Text style={styles.modalSaveText}>{t('restore')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 18,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    marginVertical: 4,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  subNote: {
    fontSize: 11,
    marginTop: 2,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginVertical: 8,
  },
  backupNote: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  menuText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  footerNotice: {
    alignItems: 'center',
    marginTop: 28,
    marginBottom: 10,
  },
  developerCredit: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  offlineText: {
    fontSize: 12,
    textAlign: 'center',
  },
  versionText: {
    fontSize: 11,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  modalInput: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  modalSaveBtn: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

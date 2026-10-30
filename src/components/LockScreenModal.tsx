import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/useAppStore';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../hooks/useTranslation';
import { SecurityService } from '../services/security.service';

export const LockScreenModal: React.FC = () => {
  const { colors } = useThemeColors();
  const { t } = useTranslation();
  const { isAppLockEnabled, isUnlocked, lockType, isBiometricsEnabled, setUnlocked } =
    useAppStore();

  const [enteredPin, setEnteredPin] = useState('');
  const [enteredPassword, setEnteredPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Automatically prompt biometrics on appear if enabled
  useEffect(() => {
    if (isAppLockEnabled && !isUnlocked && isBiometricsEnabled) {
      triggerBiometrics();
    }
  }, [isAppLockEnabled, isUnlocked]);

  const triggerBiometrics = async () => {
    const success = await SecurityService.authenticateWithBiometrics(
      'Authenticate to access PocketFlow'
    );
    if (success) {
      setUnlocked(true);
      setErrorMessage('');
    }
  };

  const handleKeyPress = (num: string) => {
    if (enteredPin.length >= 6) return;
    const newPin = enteredPin + num;
    setEnteredPin(newPin);
    setErrorMessage('');

    // Check automatically when 4 or 6 digits entered
    if (newPin.length === 4 || newPin.length === 6) {
      verifyPin(newPin);
    }
  };

  const handleDelete = () => {
    setEnteredPin((prev) => prev.slice(0, -1));
    setErrorMessage('');
  };

  const verifyPin = async (pinToCheck: string) => {
    const valid = await SecurityService.verifyCredentials(pinToCheck);
    if (valid) {
      setUnlocked(true);
      setEnteredPin('');
      setErrorMessage('');
    } else {
      setErrorMessage(t('incorrectPin'));
      setEnteredPin('');
    }
  };

  const verifyPassword = async () => {
    const valid = await SecurityService.verifyCredentials(enteredPassword);
    if (valid) {
      setUnlocked(true);
      setEnteredPassword('');
      setErrorMessage('');
    } else {
      setErrorMessage(t('incorrectPassword'));
    }
  };

  if (!isAppLockEnabled || isUnlocked) {
    return null;
  }

  return (
    <Modal visible={!isUnlocked} animationType="fade" transparent={false}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* App Logo & Lock Icon */}
        <View style={styles.header}>
          <View style={[styles.lockIconCircle, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="lock-closed" size={32} color={colors.primary} />
          </View>
          <Text style={[styles.appName, { color: colors.text }]}>{t('appName')}</Text>
          <Text style={[styles.prompt, { color: colors.textSecondary }]}>
            {lockType === 'pin' ? t('enterPin') : t('enterPassword')}
          </Text>
        </View>

        {/* Error message */}
        {errorMessage ? (
          <Text style={[styles.errorText, { color: colors.danger }]}>{errorMessage}</Text>
        ) : null}

        {/* PIN Dots Display */}
        {lockType === 'pin' ? (
          <View style={styles.pinDotsRow}>
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={[
                  styles.pinDot,
                  {
                    backgroundColor:
                      enteredPin.length > i ? colors.primary : colors.cardSecondary,
                    borderColor: colors.border,
                  },
                ]}
              />
            ))}
          </View>
        ) : (
          <View style={styles.passwordContainer}>
            <TextInput
              style={[
                styles.passwordInput,
                { backgroundColor: colors.card, borderColor: colors.border, color: colors.text },
              ]}
              secureTextEntry
              placeholder="Enter password..."
              placeholderTextColor={colors.textMuted}
              value={enteredPassword}
              onChangeText={setEnteredPassword}
              onSubmitEditing={verifyPassword}
            />
            <TouchableOpacity
              style={[styles.unlockBtn, { backgroundColor: colors.primary }]}
              onPress={verifyPassword}
            >
              <Text style={styles.unlockBtnText}>Unlock</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Keypad for PIN */}
        {lockType === 'pin' && (
          <View style={styles.keypad}>
            {[
              ['1', '2', '3'],
              ['4', '5', '6'],
              ['7', '8', '9'],
              ['bio', '0', 'del'],
            ].map((row, rIdx) => (
              <View key={rIdx} style={styles.keypadRow}>
                {row.map((btn) => {
                  if (btn === 'bio') {
                    return (
                      <TouchableOpacity
                        key={btn}
                        style={styles.keypadBtn}
                        onPress={triggerBiometrics}
                      >
                        {isBiometricsEnabled ? (
                          <Ionicons name="finger-print" size={28} color={colors.primary} />
                        ) : null}
                      </TouchableOpacity>
                    );
                  }
                  if (btn === 'del') {
                    return (
                      <TouchableOpacity
                        key={btn}
                        style={styles.keypadBtn}
                        onPress={handleDelete}
                      >
                        <Ionicons name="backspace-outline" size={26} color={colors.text} />
                      </TouchableOpacity>
                    );
                  }
                  return (
                    <TouchableOpacity
                      key={btn}
                      style={[styles.keypadBtn, { backgroundColor: colors.card }]}
                      onPress={() => handleKeyPress(btn)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.keypadNumber, { color: colors.text }]}>{btn}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  lockIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  prompt: {
    fontSize: 14,
    marginTop: 6,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  pinDotsRow: {
    flexDirection: 'row',
    gap: 16,
    marginVertical: 20,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  passwordContainer: {
    width: '100%',
    maxWidth: 300,
    marginTop: 10,
    gap: 12,
  },
  passwordInput: {
    height: 50,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  unlockBtn: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unlockBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  keypad: {
    width: '100%',
    maxWidth: 280,
    marginTop: 20,
    gap: 14,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  keypadBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keypadNumber: {
    fontSize: 26,
    fontWeight: '600',
  },
});


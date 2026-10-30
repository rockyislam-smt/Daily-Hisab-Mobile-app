import React from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { useThemeColors } from '../hooks/useThemeColors';
import { useAppStore } from '../store/useAppStore';
import { getCurrencySymbol, formatAmountInput, toBengaliNumerals } from '../utils/money';

interface AmountInputProps {
  value: string;
  onChangeText: (text: string) => void;
  currency?: string;
  autoFocus?: boolean;
}

export const AmountInput: React.FC<AmountInputProps> = ({
  value,
  onChangeText,
  currency = 'BDT',
  autoFocus = false,
}) => {
  const { colors } = useThemeColors();
  const { language } = useAppStore();
  const symbol = getCurrencySymbol(currency);

  const shortcuts = [50, 100, 200, 500, 1000];

  const handleShortcutPress = (val: number) => {
    const currentNum = parseFloat(value) || 0;
    const newNum = currentNum === 0 ? val : currentNum + val;
    onChangeText(String(newNum));
  };

  return (
    <View style={styles.container}>
      {/* Big Display Input */}
      <View style={[styles.inputBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.currencySymbol, { color: colors.primary }]}>{symbol}</Text>
        <TextInput
          style={[styles.input, { color: colors.text }]}
          value={value}
          onChangeText={(txt) => onChangeText(formatAmountInput(txt))}
          placeholder="0.00"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
          autoFocus={autoFocus}
          maxLength={10}
        />
      </View>

      {/* Quick Shortcuts */}
      <View style={styles.shortcutsRow}>
        {shortcuts.map((sc) => {
          const displayLabel =
            language === 'bn'
              ? `${symbol}${toBengaliNumerals(String(sc))}`
              : `${symbol}${sc}`;

          return (
            <TouchableOpacity
              key={sc}
              style={[
                styles.shortcutPill,
                { backgroundColor: colors.cardSecondary, borderColor: colors.borderSubtle },
              ]}
              onPress={() => handleShortcutPress(sc)}
              activeOpacity={0.7}
            >
              <Text style={[styles.shortcutText, { color: colors.textSecondary }]}>
                +{displayLabel}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1.5,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  currencySymbol: {
    fontSize: 28,
    fontWeight: '700',
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 32,
    fontWeight: '800',
    padding: 0,
    letterSpacing: -0.5,
  },
  shortcutsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 6,
  },
  shortcutPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutText: {
    fontSize: 12,
    fontWeight: '700',
  },
});


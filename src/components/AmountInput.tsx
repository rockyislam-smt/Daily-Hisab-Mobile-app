import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../hooks/useThemeColors';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from '../hooks/useTranslation';
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
  const { t } = useTranslation();
  const symbol = getCurrencySymbol(currency);

  const [showCalculator, setShowCalculator] = useState(false);
  const [calcExpression, setCalcExpression] = useState('');
  const [calcPreview, setCalcPreview] = useState<number | null>(null);

  const shortcuts = [50, 100, 200, 500, 1000];

  const handleShortcutPress = (val: number) => {
    const currentNum = parseFloat(value) || 0;
    const newNum = currentNum === 0 ? val : currentNum + val;
    onChangeText(String(newNum));
  };

  const evaluateMath = (expr: string): number | null => {
    if (!expr || expr.trim() === '') return null;
    const sanitized = expr.replace(/×/g, '*').replace(/÷/g, '/');
    if (!/^[\d\s\+\-\*\/\.\(\)]+$/.test(sanitized)) return null;

    try {
      // Safe mathematical expression evaluation
      const res = new Function(`'use strict'; return (${sanitized})`)();
      if (typeof res === 'number' && !isNaN(res) && isFinite(res)) {
        return Math.round(res * 100) / 100;
      }
      return null;
    } catch {
      return null;
    }
  };

  const handleCalcButton = (char: string) => {
    if (char === 'C') {
      setCalcExpression('');
      setCalcPreview(null);
      return;
    }

    if (char === '⌫') {
      const next = calcExpression.slice(0, -1);
      setCalcExpression(next);
      setCalcPreview(evaluateMath(next));
      return;
    }

    if (char === '=') {
      const result = evaluateMath(calcExpression);
      if (result !== null) {
        onChangeText(String(result));
        setCalcExpression(String(result));
        setCalcPreview(null);
      }
      return;
    }

    const nextExpr = calcExpression + char;
    setCalcExpression(nextExpr);
    setCalcPreview(evaluateMath(nextExpr));
  };

  const toggleCalculator = () => {
    if (!showCalculator) {
      setCalcExpression(value && value !== '0' ? value : '');
      setCalcPreview(null);
    }
    setShowCalculator(!showCalculator);
  };

  return (
    <View style={styles.container}>
      {/* Big Display Input with Calculator Toggle Button */}
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
          maxLength={12}
        />

        <TouchableOpacity
          style={[
            styles.calcToggleBtn,
            { backgroundColor: showCalculator ? colors.primary : colors.cardSecondary },
          ]}
          onPress={toggleCalculator}
          activeOpacity={0.7}
          accessibilityLabel="Toggle Calculator"
        >
          <Ionicons
            name="calculator"
            size={20}
            color={showCalculator ? '#FFFFFF' : colors.primary}
          />
        </TouchableOpacity>
      </View>

      {/* Built-in Interactive Fintech Calculator */}
      {showCalculator && (
        <View style={[styles.calcContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Expression Display */}
          <View style={[styles.calcDisplay, { backgroundColor: colors.cardSecondary }]}>
            <Text style={[styles.calcExprText, { color: colors.textSecondary }]} numberOfLines={1}>
              {calcExpression || '0'}
            </Text>
            {calcPreview !== null && (
              <Text style={[styles.calcResultPreview, { color: colors.primary }]}>
                = {symbol}{calcPreview}
              </Text>
            )}
          </View>

          {/* Keypad Grid */}
          <View style={styles.calcGrid}>
            {[
              ['C', '(', ')', '÷'],
              ['7', '8', '9', '×'],
              ['4', '5', '6', '-'],
              ['1', '2', '3', '+'],
              ['0', '.', '⌫', '='],
            ].map((row, rIdx) => (
              <View key={rIdx} style={styles.calcRow}>
                {row.map((btn) => {
                  const isOp = ['÷', '×', '-', '+', '='].includes(btn);
                  const isClear = btn === 'C' || btn === '⌫';
                  const isEquals = btn === '=';

                  const btnBg = isEquals
                    ? colors.primary
                    : isOp
                    ? colors.primaryLight
                    : isClear
                    ? colors.expenseBg
                    : colors.cardSecondary;

                  const btnTextColor = isEquals
                    ? '#FFFFFF'
                    : isOp
                    ? colors.primary
                    : isClear
                    ? colors.expense
                    : colors.text;

                  return (
                    <TouchableOpacity
                      key={btn}
                      style={[styles.calcBtn, { backgroundColor: btnBg }]}
                      onPress={() => handleCalcButton(btn)}
                      activeOpacity={0.6}
                    >
                      <Text style={[styles.calcBtnText, { color: btnTextColor }]}>{btn}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      )}

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
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  currencySymbol: {
    fontSize: 28,
    fontWeight: '700',
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 30,
    fontWeight: '800',
    padding: 0,
    letterSpacing: -0.5,
  },
  calcToggleBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
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
  calcContainer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginTop: 10,
  },
  calcDisplay: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
    alignItems: 'flex-end',
  },
  calcExprText: {
    fontSize: 16,
    fontWeight: '600',
  },
  calcResultPreview: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  calcGrid: {
    gap: 8,
  },
  calcRow: {
    flexDirection: 'row',
    gap: 8,
  },
  calcBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calcBtnText: {
    fontSize: 18,
    fontWeight: '700',
  },
});

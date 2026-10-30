import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Circle, G, Text as SvgText } from 'react-native-svg';
import { useThemeColors } from '../hooks/useThemeColors';
import { useAppStore } from '../store/useAppStore';
import { formatCurrency } from '../utils/money';

// ==================== INCOME VS EXPENSE BAR CHART ====================

interface IncomeVsExpenseBarProps {
  income: number;
  expense: number;
  height?: number;
}

export const IncomeVsExpenseBar: React.FC<IncomeVsExpenseBarProps> = ({
  income,
  expense,
  height = 140,
}) => {
  const { colors } = useThemeColors();
  const { baseCurrency, language, hideBalances } = useAppStore();

  const maxVal = Math.max(income, expense, 100);
  const incomeHeight = Math.round((income / maxVal) * 80);
  const expenseHeight = Math.round((expense / maxVal) * 80);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
      <Text style={[styles.cardTitle, { color: colors.text }]}>Income vs Expense</Text>

      <View style={{ height, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={240} height={height} viewBox="0 0 240 140">
          {/* Base horizontal line */}
          <Rect x="20" y="105" width="200" height="2" fill={colors.border} rx="1" />

          {/* Income Bar */}
          <Rect
            x="50"
            y={105 - incomeHeight}
            width="45"
            height={Math.max(4, incomeHeight)}
            fill={colors.income}
            rx="6"
          />

          {/* Expense Bar */}
          <Rect
            x="145"
            y={105 - expenseHeight}
            width="45"
            height={Math.max(4, expenseHeight)}
            fill={colors.expense}
            rx="6"
          />

          {/* Labels */}
          <SvgText
            x="72"
            y="125"
            fontSize="11"
            fontWeight="bold"
            fill={colors.income}
            textAnchor="middle"
          >
            Income
          </SvgText>

          <SvgText
            x="167"
            y="125"
            fontSize="11"
            fontWeight="bold"
            fill={colors.expense}
            textAnchor="middle"
          >
            Expense
          </SvgText>
        </Svg>
      </View>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.income }]} />
          <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>Income: </Text>
          <Text style={[styles.legendVal, { color: colors.income }]}>
            {hideBalances ? '••••••' : formatCurrency(income, baseCurrency, language)}
          </Text>
        </View>

        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.expense }]} />
          <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>Expense: </Text>
          <Text style={[styles.legendVal, { color: colors.expense }]}>
            {hideBalances ? '••••••' : formatCurrency(expense, baseCurrency, language)}
          </Text>
        </View>
      </View>
    </View>
  );
};

// ==================== CATEGORY DONUT / PROGRESS CHART ====================

interface CategoryItem {
  categoryName: string;
  categoryColor: string;
  totalAmount: number;
  percentage: number;
}

interface CategoryBreakdownChartProps {
  items: CategoryItem[];
  title?: string;
}

export const CategoryBreakdownChart: React.FC<CategoryBreakdownChartProps> = ({
  items,
  title = 'Expense Breakdown',
}) => {
  const { colors } = useThemeColors();
  const { baseCurrency, language, hideBalances } = useAppStore();

  const total = items.reduce((sum, it) => sum + it.totalAmount, 0);

  if (items.length === 0 || total === 0) {
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          No expense transactions in this period.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
      <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>

      {/* Multi-segment horizontal bar */}
      <View style={styles.multiBar}>
        {items.slice(0, 5).map((it, idx) => (
          <View
            key={idx}
            style={{
              flex: Math.max(0.05, it.percentage),
              height: 12,
              backgroundColor: it.categoryColor || colors.primary,
              borderTopLeftRadius: idx === 0 ? 6 : 0,
              borderBottomLeftRadius: idx === 0 ? 6 : 0,
              borderTopRightRadius: idx === items.slice(0, 5).length - 1 ? 6 : 0,
              borderBottomRightRadius: idx === items.slice(0, 5).length - 1 ? 6 : 0,
            }}
          />
        ))}
      </View>

      {/* Category breakdown rows */}
      <View style={styles.breakdownList}>
        {items.slice(0, 6).map((it, idx) => (
          <View key={idx} style={styles.catRow}>
            <View style={styles.catLeft}>
              <View style={[styles.legendDot, { backgroundColor: it.categoryColor || colors.primary }]} />
              <Text style={[styles.catName, { color: colors.text }]} numberOfLines={1}>
                {it.categoryName}
              </Text>
            </View>

            <View style={styles.catRight}>
              <Text style={[styles.catAmount, { color: colors.text }]}>
                {hideBalances ? '••••••' : formatCurrency(it.totalAmount, baseCurrency, language)}
              </Text>
              <Text style={[styles.catPercentage, { color: colors.textSecondary }]}>
                {it.percentage}%
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 18,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  emptyText: {
    fontSize: 13,
    paddingVertical: 14,
    textAlign: 'center',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  legendVal: {
    fontSize: 13,
    fontWeight: '700',
  },
  multiBar: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  breakdownList: {
    marginTop: 10,
    gap: 10,
  },
  catRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  catLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  catName: {
    fontSize: 13,
    fontWeight: '600',
  },
  catRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  catAmount: {
    fontSize: 13,
    fontWeight: '700',
  },
  catPercentage: {
    fontSize: 12,
    fontWeight: '500',
    minWidth: 32,
    textAlign: 'right',
  },
});


import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { DateFilterType } from '../types';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../hooks/useTranslation';

interface DateFilterTabsProps {
  selectedFilter: DateFilterType;
  onSelectFilter: (filter: DateFilterType) => void;
}

export const DateFilterTabs: React.FC<DateFilterTabsProps> = ({
  selectedFilter,
  onSelectFilter,
}) => {
  const { colors } = useThemeColors();
  const { t } = useTranslation();

  const filters: Array<{ id: DateFilterType; label: string }> = [
    { id: 'today', label: t('today') },
    { id: 'yesterday', label: t('yesterday') },
    { id: 'this_week', label: t('thisWeek') },
    { id: 'this_month', label: t('thisMonth') },
    { id: 'last_month', label: t('lastMonth') },
    { id: 'this_year', label: t('thisYear') },
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {filters.map((item) => {
        const isSelected = selectedFilter === item.id;
        return (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.tab,
              {
                backgroundColor: isSelected ? colors.primary : colors.card,
                borderColor: isSelected ? colors.primary : colors.border,
              },
            ]}
            onPress={() => onSelectFilter(item.id)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                { color: isSelected ? '#FFFFFF' : colors.textSecondary },
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
  },
});


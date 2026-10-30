import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Category } from '../types';
import { useThemeColors } from '../hooks/useThemeColors';
import { useAppStore } from '../store/useAppStore';

interface CategorySelectorProps {
  categories: Category[];
  selectedCategoryId?: string | null;
  onSelectCategory: (category: Category) => void;
  onPressAddCategory?: () => void;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
  onPressAddCategory,
}) => {
  const { colors } = useThemeColors();
  const { language } = useAppStore();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContainer}
    >
      {categories.map((cat) => {
        const isSelected = selectedCategoryId === cat.id;
        const displayName = language === 'bn' && cat.name_bn ? cat.name_bn : cat.name;

        return (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.item,
              {
                backgroundColor: isSelected ? colors.primary : colors.card,
                borderColor: isSelected ? colors.primary : colors.border,
              },
            ]}
            onPress={() => onSelectCategory(cat)}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.iconWrap,
                {
                  backgroundColor: isSelected
                    ? 'rgba(255, 255, 255, 0.2)'
                    : `${cat.color}20`,
                },
              ]}
            >
              <Ionicons
                name={cat.icon as any}
                size={18}
                color={isSelected ? '#FFFFFF' : cat.color}
              />
            </View>
            <Text
              style={[
                styles.label,
                { color: isSelected ? '#FFFFFF' : colors.text },
              ]}
              numberOfLines={1}
            >
              {displayName}
            </Text>
          </TouchableOpacity>
        );
      })}

      {onPressAddCategory && (
        <TouchableOpacity
          style={[styles.item, styles.addItem, { borderColor: colors.border, backgroundColor: colors.cardSecondary }]}
          onPress={onPressAddCategory}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={20} color={colors.textSecondary} />
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            {language === 'bn' ? '+ নতুন' : '+ Add'}
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    paddingVertical: 6,
    gap: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 24,
    borderWidth: 1,
    gap: 8,
  },
  addItem: {
    borderStyle: 'dashed',
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
});


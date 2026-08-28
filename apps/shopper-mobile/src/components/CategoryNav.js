import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { CATEGORIES } from '../data/mockData';

export default function CategoryNav({ activeCategoryId, onSelectCategory }) {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {CATEGORIES.map((cat) => {
          const isActive = activeCategoryId === cat.id;

          return (
            <TouchableOpacity
              key={cat.id}
              activeOpacity={0.7}
              onPress={() => onSelectCategory(cat.id)}
              style={styles.categoryItem}
            >
              <View
                style={[
                  styles.iconCircle,
                  isActive ? styles.activeIconCircle : styles.inactiveIconCircle,
                ]}
              >
                <Ionicons
                  name={cat.iconName}
                  size={22}
                  color={isActive ? COLORS.white : COLORS.textPrimary}
                />
              </View>
              <Text
                style={[
                  styles.categoryText,
                  isActive ? styles.activeCategoryText : styles.inactiveCategoryText,
                ]}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  categoryItem: {
    alignItems: 'center',
    width: 72,
  },
  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  activeIconCircle: {
    backgroundColor: COLORS.emeraldPrimary,
  },
  inactiveIconCircle: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  categoryText: {
    fontSize: 11.5,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  activeCategoryText: {
    fontWeight: '700',
    color: COLORS.emeraldPrimary,
  },
  inactiveCategoryText: {
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
});

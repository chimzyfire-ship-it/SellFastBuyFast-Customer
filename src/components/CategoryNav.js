import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

import { ScrollView } from 'react-native';
import { CATEGORIES as DEFAULT_CATEGORIES } from '../data/mockData';

export default function CategoryNav({ categories, activeCategoryId, onSelectCategory }) {
  const displayList = [
    { id: 'all', name: 'All', icon: 'grid-outline' },
    ...((categories && categories.length > 0)
      ? categories.filter((c) => c.id !== 'all').map((c) => ({
          id: c.id || c.slug,
          name: c.name,
          icon: c.iconName || c.icon || 'apps-outline',
        }))
      : DEFAULT_CATEGORIES.map((c) => ({
          id: c.id || c.slug,
          name: c.name,
          icon: c.iconName || 'apps-outline',
        }))),
  ];

  return (
    <View style={styles.outerContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.cardContainer}
      >
        {displayList.map((cat) => {
          const isActive = activeCategoryId === cat.id;

          return (
            <TouchableOpacity
              key={cat.id}
              activeOpacity={0.8}
              onPress={() => onSelectCategory(cat.id)}
              style={[
                styles.navItem,
                isActive && styles.activeNavItem,
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            >
              <Ionicons
                name={cat.icon}
                size={18}
                color={isActive ? COLORS.white : '#3E423B'}
                style={styles.navIcon}
              />
              <Text
                style={[
                  styles.navText,
                  isActive ? styles.activeNavText : styles.inactiveNavText,
                ]}
                numberOfLines={1}
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
  outerContainer: {
    marginTop: 8,
    marginBottom: 10,
  },
  cardContainer: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECE8E1',
    minWidth: 70,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  activeNavItem: {
    backgroundColor: '#0F382C',
    borderColor: '#0F382C',
    shadowColor: '#0F382C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  navIcon: {
    marginBottom: 4,
  },
  navText: {
    fontSize: 10.5,
    fontFamily: 'PlusJakartaSans-Medium',
    includeFontPadding: false,
    textAlign: 'center',
  },
  activeNavText: {
    color: COLORS.white,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  inactiveNavText: {
    color: '#3E423B',
    fontWeight: '600',
  },
});

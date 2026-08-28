import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

const NAV_CATEGORIES = [
  { id: 'all', name: 'All', icon: 'grid-outline' },
  { id: 'electronics', name: 'Electronics', icon: 'headset-outline' },
  { id: 'fashion', name: 'Fashion', icon: 'bag-handle-outline' },
  { id: 'home', name: 'Home & Living', icon: 'home-outline' },
  { id: 'beauty', name: 'Beauty', icon: 'sparkles-outline' },
];

export default function CategoryNav({ activeCategoryId, onSelectCategory }) {
  return (
    <View style={styles.cardContainer}>
      {NAV_CATEGORIES.map((cat) => {
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
              size={20}
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
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#ECE8E1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderRadius: 14,
  },
  activeNavItem: {
    backgroundColor: '#0F382C',
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

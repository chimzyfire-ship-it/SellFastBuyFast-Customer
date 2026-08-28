import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

export default function BottomNav({
  activeTab,
  onSelectTab,
  cartCount = 0,
  wishlistCount = 0,
}) {
  const tabs = [
    { id: 'home', label: 'Home', icon: 'home-outline', activeIcon: 'home' },
    { id: 'categories', label: 'Categories', icon: 'grid-outline', activeIcon: 'grid' },
    { id: 'cart', label: 'Cart', icon: 'cart-outline', activeIcon: 'cart', badge: cartCount },
    { id: 'wishlist', label: 'Wishlist', icon: 'heart-outline', activeIcon: 'heart', badge: wishlistCount },
    { id: 'account', label: 'Account', icon: 'person-outline', activeIcon: 'person' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.floatingBar}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <TouchableOpacity
              key={tab.id}
              activeOpacity={0.7}
              onPress={() => onSelectTab(tab.id)}
              style={styles.tabItem}
            >
              <View style={styles.iconWrapper}>
                <Ionicons
                  name={isActive ? tab.activeIcon : tab.icon}
                  size={22}
                  color={isActive ? COLORS.emeraldPrimary : COLORS.textSecondary}
                />
                {tab.badge > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{tab.badge}</Text>
                  </View>
                )}
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  isActive ? styles.activeTabLabel : styles.inactiveTabLabel,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  floatingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justify.content: 'space-around',
    height: 56,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  iconWrapper: {
    position: 'relative',
    marginBottom: 3,
  },
  tabLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  activeTabLabel: {
    color: COLORS.emeraldPrimary,
    fontWeight: '700',
  },
  inactiveTabLabel: {
    color: COLORS.textSecondary,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: COLORS.emeraldPrimary,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justify: 'center',
    paddingHorizontal: 3,
    borderWidth: 1,
    borderColor: COLORS.white,
  },
  badgeText: {
    color: COLORS.goldLight,
    fontSize: 9,
    fontWeight: '700',
  },
});

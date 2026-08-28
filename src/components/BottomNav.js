import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

export default function BottomNav({ activeTab, onSelectTab, cartCount = 0, activeOrdersCount = 0 }) {
  const TABS = [
    {
      id: 'home',
      label: 'Home',
      iconOutline: 'home-outline',
      iconFilled: 'home',
    },
    {
      id: 'search',
      label: 'Search',
      iconOutline: 'search-outline',
      iconFilled: 'search',
    },
    {
      id: 'cart',
      label: 'Bag',
      iconOutline: 'bag-handle-outline',
      iconFilled: 'bag-handle',
      badge: cartCount,
    },
    {
      id: 'orders',
      label: 'Orders',
      iconOutline: 'receipt-outline',
      iconFilled: 'receipt',
      badge: activeOrdersCount,
    },
    {
      id: 'account',
      label: 'Account',
      iconOutline: 'person-outline',
      iconFilled: 'person',
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.navBar}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tabButton}
              activeOpacity={0.75}
              onPress={() => onSelectTab(tab.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            >
              <View style={styles.iconWrapper}>
                <Ionicons
                  name={isActive ? tab.iconFilled : tab.iconOutline}
                  size={23}
                  color={isActive ? COLORS.emeraldPrimary : '#7E827A'}
                />
                {tab.badge > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{tab.badge > 99 ? '99+' : tab.badge}</Text>
                  </View>
                )}
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  isActive && styles.tabLabelActive,
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: Platform.OS === 'ios' ? 12 : 0,
    paddingBottom: Platform.OS === 'ios' ? 10 : 0,
  },
  navBar: {
    flexDirection: 'row',
    height: Platform.OS === 'ios' ? 70 : 64,
    backgroundColor: '#FFFFFF',
    borderRadius: Platform.OS === 'ios' ? 28 : 0,
    borderTopWidth: 1,
    borderTopColor: '#ECE8E1',
    borderWidth: Platform.OS === 'ios' ? 1 : 0,
    borderColor: '#ECE8E1',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 8 : 6,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -8,
    backgroundColor: COLORS.badgeRed,
    minWidth: 15,
    height: 15,
    borderRadius: 7.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 8.5,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-ExtraBold',
  },
  tabLabel: {
    fontSize: 10.5,
    fontFamily: 'PlusJakartaSans-Medium',
    fontWeight: '500',
    color: '#7E827A',
    marginTop: 2,
    includeFontPadding: false,
  },
  tabLabelActive: {
    color: COLORS.emeraldPrimary,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
});

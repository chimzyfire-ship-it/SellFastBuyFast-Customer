import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

export default function Header({ notificationCount = 0, onNotificationPress }) {
  return (
    <View style={styles.headerContainer}>
      <Image
        source={require('../../assets/sellfastbuyfast-logo.png')}
        style={styles.logoImage}
        resizeMode="contain"
        accessibilityLabel="SellFastBuyFast"
      />

      <TouchableOpacity
        style={styles.notificationButton}
        activeOpacity={0.75}
        onPress={onNotificationPress}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        accessibilityLabel="Notifications"
      >
        <Ionicons name="notifications-outline" size={24} color={COLORS.emeraldPrimary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 8 : 12,
    paddingBottom: 6,
    backgroundColor: 'transparent',
    minHeight: 52,
  },
  logoImage: {
    height: 38,
    width: 152,
  },
  notificationButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

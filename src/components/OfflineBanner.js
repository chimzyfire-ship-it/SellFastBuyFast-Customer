import React from 'react';
import { StyleSheet, Text, View, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

export default function OfflineBanner({ isOffline }) {
  if (!isOffline) return null;

  return (
    <View style={styles.banner}>
      <Ionicons name="cloud-offline-outline" size={16} color={COLORS.white} />
      <Text style={styles.bannerText}>
        Offline Mode — Showing cached SellFastBuyFast catalogue
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#323232',
    paddingVertical: 6,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justify: 'center',
    gap: 8,
    zIndex: 1000,
  },
  bannerText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
});

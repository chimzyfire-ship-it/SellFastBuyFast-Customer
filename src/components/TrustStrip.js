import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

export default function TrustStrip() {
  return (
    <View style={styles.container}>
      {/* 1. Verified Merchants */}
      <View style={styles.item}>
        <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.emeraldPrimary} style={styles.icon} />
        <View style={styles.textCol}>
          <Text style={styles.title}>Verified Merchants</Text>
          <Text style={styles.subtitle}>Trusted & reliable sellers</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* 2. Secure Payments */}
      <View style={styles.item}>
        <Ionicons name="lock-closed-outline" size={20} color={COLORS.emeraldPrimary} style={styles.icon} />
        <View style={styles.textCol}>
          <Text style={styles.title}>Secure Payments</Text>
          <Text style={styles.subtitle}>Safe & protected</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* 3. Fast Delivery */}
      <View style={styles.item}>
        <Ionicons name="car-outline" size={20} color={COLORS.emeraldPrimary} style={styles.icon} />
        <View style={styles.textCol}>
          <Text style={styles.title}>Fast Delivery</Text>
          <Text style={styles.subtitle}>Nationwide coverage</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
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
  item: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 2,
  },
  icon: {
    marginTop: 1,
  },
  textCol: {
    flex: 1,
  },
  title: {
    fontSize: 10.5,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#0F382C',
    includeFontPadding: false,
  },
  subtitle: {
    fontSize: 9,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#7E827A',
    marginTop: 1,
    includeFontPadding: false,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: '#ECE8E1',
    marginHorizontal: 4,
  },
});

import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { useApp } from '../../context/AppContext';

export default function MerchantConflictModal() {
  const {
    isMerchantConflictOpen,
    pendingConflictProduct,
    cart,
    replaceCartWithProduct,
    cancelMerchantConflict,
  } = useApp();

  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isMerchantConflictOpen) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.92);
      fadeAnim.setValue(0);
    }
  }, [isMerchantConflictOpen]);

  if (!isMerchantConflictOpen || !pendingConflictProduct) return null;

  const currentMerchant = cart[0]?.product?.merchant || 'SellFast Tech';
  const newMerchant = pendingConflictProduct.product?.merchant || 'Luxe Footwear NG';

  return (
    <Modal visible={isMerchantConflictOpen} transparent animationType="none">
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.dialog,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Store Icon Badge */}
          <View style={styles.iconCircle}>
            <Ionicons name="storefront" size={26} color="#C69B56" />
          </View>

          <Text style={styles.title}>Single-Merchant Bag Notice</Text>
          <Text style={styles.subtitle}>
            SellFastBuyFast orders are dispatched and fulfilled by a single merchant per checkout package.
          </Text>

          {/* Visual Merchant Comparison Box */}
          <View style={styles.comparisonBox}>
            <View style={styles.merchantRowItem}>
              <Text style={styles.comparisonLabel}>CURRENT BAG</Text>
              <Text style={styles.currentMerchantText}>{currentMerchant}</Text>
            </View>

            <View style={styles.switchArrowBadge}>
              <Ionicons name="arrow-down" size={14} color="#0F382C" />
            </View>

            <View style={styles.merchantRowItem}>
              <Text style={styles.comparisonLabel}>NEW MERCHANT</Text>
              <Text style={styles.newMerchantText}>{newMerchant}</Text>
            </View>
          </View>

          <Text style={styles.helperText}>
            Adding this item will start a new cart with products from{' '}
            <Text style={{ fontWeight: '700', color: '#0F382C' }}>{newMerchant}</Text>.
          </Text>

          {/* Action Buttons */}
          <View style={styles.actionColumn}>
            <TouchableOpacity
              style={styles.replaceBtn}
              activeOpacity={0.88}
              onPress={replaceCartWithProduct}
            >
              <Text style={styles.replaceBtnText}>Replace Bag Items</Text>
              <View style={styles.btnIconBadge}>
                <Ionicons name="arrow-forward" size={13} color="#0F382C" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.keepBtn}
              activeOpacity={0.75}
              onPress={cancelMerchantConflict}
            >
              <Text style={styles.keepBtnText}>Keep Current Bag</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(7, 32, 25, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 22,
  },
  dialog: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0F382C',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#C69B56',
  },
  title: {
    fontSize: 21,
    fontFamily: 'PlayfairDisplay-Bold',
    fontWeight: '700',
    color: '#0F382C',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12.5,
    fontFamily: 'PlusJakartaSans-Medium',
    color: '#7E827A',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  comparisonBox: {
    backgroundColor: '#FAF7F0',
    borderRadius: 18,
    padding: 14,
    width: '100%',
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#ECE8E1',
    alignItems: 'center',
    gap: 8,
  },
  merchantRowItem: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#ECE8E1',
  },
  comparisonLabel: {
    fontSize: 9.5,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    color: '#C69B56',
    letterSpacing: 0.8,
  },
  currentMerchantText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#5C6057',
    marginTop: 2,
  },
  switchArrowBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FAF7F0',
    borderWidth: 1,
    borderColor: '#ECE8E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newMerchantText: {
    fontSize: 13.5,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    color: '#0F382C',
    marginTop: 2,
  },
  helperText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#5C6057',
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  actionColumn: {
    width: '100%',
    gap: 8,
  },
  replaceBtn: {
    backgroundColor: '#0F382C',
    height: 50,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#0F382C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  replaceBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  btnIconBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#C69B56',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keepBtn: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keepBtnText: {
    color: '#7E827A',
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
});

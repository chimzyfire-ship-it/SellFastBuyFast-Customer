import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { useNavigation } from '../../navigation/NavigationContext';
import { useApp } from '../../context/AppContext';

export default function OrderConfirmationScreen() {
  const { currentRoute, navigate, reset } = useNavigation();
  const { showToast } = useApp();

  const orderId = currentRoute.params?.orderId || 'ORD-2026-8891';
  const order = currentRoute.params?.order;

  // Spring & Stagger Animations
  const scaleCheckAnim = useRef(new Animated.Value(0)).current;
  const fadeContentAnim = useRef(new Animated.Value(0)).current;
  const slideContentAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    // 1. Elastic Pop for Checkmark
    Animated.spring(scaleCheckAnim, {
      toValue: 1,
      friction: 5,
      tension: 50,
      useNativeDriver: true,
    }).start();

    // 2. Staggered Fade & Slide In for Content
    Animated.parallel([
      Animated.timing(fadeContentAnim, {
        toValue: 1,
        duration: 500,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.spring(slideContentAnim, {
        toValue: 0,
        friction: 7,
        tension: 40,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleCopyRef = () => {
    showToast && showToast('Order ID copied to clipboard');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Animated Checkmark Pop */}
        <Animated.View
          style={[
            styles.successBadgeOuter,
            { transform: [{ scale: scaleCheckAnim }] },
          ]}
        >
          <View style={styles.successBadgeInner}>
            <Ionicons name="checkmark" size={38} color="#FFFFFF" />
          </View>
        </Animated.View>

        {/* Staggered Content Area */}
        <Animated.View
          style={[
            styles.animatedContentWrapper,
            {
              opacity: fadeContentAnim,
              transform: [{ translateY: slideContentAnim }],
            },
          ]}
        >
          <Text style={styles.titleText}>Payment Verified & Escrow Held!</Text>
          <Text style={styles.subtitleText}>
            Your payment of <Text style={styles.highlightAmount}>₦ {order?.totalAmount?.toLocaleString() || '154,500'}</Text> has been authorized and secured in Paystack escrow.
          </Text>

          {/* Order Reference Box */}
          <TouchableOpacity style={styles.orderRefBox} onPress={handleCopyRef} activeOpacity={0.8}>
            <View style={styles.refTextCol}>
              <Text style={styles.refLabel}>ORDER REFERENCE ID</Text>
              <Text style={styles.refValue}>{orderId}</Text>
            </View>
            <View style={styles.copyIconBadge}>
              <Ionicons name="copy-outline" size={15} color="#0F382C" />
            </View>
          </TouchableOpacity>

          {/* Delivery & Merchant Summary Card */}
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <View style={styles.cardIconCircle}>
                <Ionicons name="storefront-outline" size={16} color={COLORS.emeraldPrimary} />
              </View>
              <View style={styles.cardRowText}>
                <Text style={styles.cardRowLabel}>Fulfilling Merchant</Text>
                <Text style={styles.cardRowValue}>{order?.merchantName || 'SellFast Direct Official'}</Text>
              </View>
              <View style={styles.verifiedBadge}>
                <Ionicons name="shield-checkmark" size={11} color="#0F382C" />
                <Text style={styles.verifiedBadgeText}>Verified</Text>
              </View>
            </View>

            <View style={styles.cardDivider} />

            <View style={styles.cardRow}>
              <View style={styles.cardIconCircle}>
                <Ionicons name="time-outline" size={16} color={COLORS.emeraldPrimary} />
              </View>
              <View style={styles.cardRowText}>
                <Text style={styles.cardRowLabel}>Estimated Door Delivery</Text>
                <Text style={styles.cardRowValue}>{order?.estimatedDelivery || 'Within 2 to 3 Business Days'}</Text>
              </View>
            </View>

            <View style={styles.cardDivider} />

            <View style={styles.cardRow}>
              <View style={styles.cardIconCircle}>
                <Ionicons name="location-outline" size={16} color={COLORS.emeraldPrimary} />
              </View>
              <View style={styles.cardRowText}>
                <Text style={styles.cardRowLabel}>Delivery Destination</Text>
                <Text style={styles.cardRowValue}>
                  {order?.shippingAddress?.recipient || 'Amina Bello'} ({order?.shippingAddress?.street || '14b Admiralty Way, Lagos'})
                </Text>
              </View>
            </View>
          </View>

          {/* Buyer Protection Guarantee Notice */}
          <View style={styles.protectionBox}>
            <Ionicons name="shield-checkmark" size={16} color="#0F382C" />
            <Text style={styles.protectionText}>
              Funds will only be released to merchant after you inspect and accept your delivery.
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsColumn}>
            <TouchableOpacity
              style={styles.trackBtn}
              activeOpacity={0.88}
              onPress={() => navigate('order-tracking', { orderId })}
            >
              <Ionicons name="compass-outline" size={18} color="#FFFFFF" />
              <Text style={styles.trackBtnText}>Track Order Status Live</Text>
              <View style={styles.trackBtnIconBadge}>
                <Ionicons name="arrow-forward" size={13} color="#0F382C" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.detailBtn}
              activeOpacity={0.8}
              onPress={() => navigate('order-detail', { orderId })}
            >
              <Text style={styles.detailBtnText}>View Order Details & Receipt</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.continueShoppingBtn}
              activeOpacity={0.7}
              onPress={() => reset('home')}
            >
              <Text style={styles.continueShoppingText}>Continue Shopping</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    padding: 22,
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 60,
  },
  successBadgeOuter: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: '#EAF6EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    borderWidth: 2,
    borderColor: '#157347',
    shadowColor: '#157347',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  successBadgeInner: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#157347',
    alignItems: 'center',
    justifyContent: 'center',
  },
  animatedContentWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  titleText: {
    fontSize: 24,
    fontFamily: 'PlayfairDisplay-Bold',
    fontWeight: '700',
    color: '#0F382C',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  subtitleText: {
    fontSize: 13.5,
    fontFamily: 'PlusJakartaSans-Medium',
    color: '#5C6057',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  highlightAmount: {
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    color: '#0F382C',
  },
  orderRefBox: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 18,
    borderWidth: 1,
    borderColor: '#ECE8E1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  refTextCol: {
    flex: 1,
  },
  refLabel: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    color: '#C69B56',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  refValue: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#0F382C',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  copyIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F3ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ECE8E1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 14,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(15, 56, 44, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardRowText: {
    flex: 1,
  },
  cardRowLabel: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#7E827A',
  },
  cardRowValue: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#1A1D1A',
    marginTop: 1,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FAF7F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ECE8E1',
  },
  verifiedBadgeText: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#0F382C',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F0ECE4',
    marginVertical: 12,
  },
  protectionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FAF7F0',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#ECE8E1',
    marginBottom: 22,
    width: '100%',
  },
  protectionText: {
    flex: 1,
    fontSize: 11.5,
    fontFamily: 'PlusJakartaSans-Medium',
    color: '#5C6057',
    lineHeight: 16,
  },
  actionsColumn: {
    width: '100%',
    gap: 10,
  },
  trackBtn: {
    backgroundColor: '#0F382C',
    height: 52,
    borderRadius: 26,
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
  trackBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  trackBtnIconBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#C69B56',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  detailBtn: {
    backgroundColor: '#FFFFFF',
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ECE8E1',
  },
  detailBtnText: {
    color: '#0F382C',
    fontSize: 13.5,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  continueShoppingBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  continueShoppingText: {
    color: '#7E827A',
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
});

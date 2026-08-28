import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { useApp } from '../../context/AppContext';
import { useNavigation } from '../../navigation/NavigationContext';

export default function BagScreen() {
  const { cart, updateCartQuantity, removeFromCart, selectedDeliveryMethod, showToast } = useApp();
  const { navigate, goBack, openModal } = useNavigation();

  const [promoCode, setPromoCode] = useState('');
  const [activeDiscountPct, setActiveDiscountPct] = useState(0);

  const subtotal = cart.reduce((acc, item) => acc + (item.product?.price || 0) * (item.quantity || 1), 0);
  const deliveryFee = cart.length > 0 ? (selectedDeliveryMethod === 'express' ? 7500 : 4500) : 0;
  const discount = activeDiscountPct > 0 ? (subtotal * activeDiscountPct) / 100 : 0;
  const total = Math.max(0, subtotal + deliveryFee - discount);
  const currentMerchantName = cart[0]?.product?.merchant || 'SellFast Verified Merchant';

  const handleApplyPromo = () => {
    const code = promoCode.trim().toUpperCase();
    if (code === 'SELLFAST5' || code === 'WELCOME5') {
      setActiveDiscountPct(5);
      showToast && showToast('5% discount applied!');
    } else if (code === 'WELCOME10' || code === 'LUXE10') {
      setActiveDiscountPct(10);
      showToast && showToast('10% discount applied!');
    } else if (code.length > 0) {
      showToast && showToast('Invalid voucher code');
    }
  };

  const handleOpenVouchers = () => {
    openModal('voucher-selector', {
      onSelectVoucher: (v) => {
        setPromoCode(v.code);
        setActiveDiscountPct(v.discountPct);
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={goBack}
          activeOpacity={0.75}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.emeraldPrimary} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          Shopping Bag ({cart.reduce((a, b) => a + b.quantity, 0)})
        </Text>

        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {cart.length > 0 ? (
          <>
            {/* Merchant Fulfillment Banner Card */}
            <View style={styles.merchantCard}>
              <View style={styles.merchantIconWrapper}>
                <Ionicons name="storefront-outline" size={17} color={COLORS.emeraldPrimary} />
              </View>
              <View style={styles.merchantTextWrap}>
                <Text style={styles.merchantSubLabel}>Fulfilling Merchant</Text>
                <Text style={styles.merchantNameText}>{currentMerchantName}</Text>
              </View>
              <View style={styles.verifiedTag}>
                <Ionicons name="shield-checkmark" size={11} color="#0F382C" />
                <Text style={styles.verifiedTagText}>Verified</Text>
              </View>
            </View>

            {/* Cart Items List */}
            <View style={styles.itemsSection}>
              {cart.map((item, idx) => (
                <View key={idx} style={styles.cartItemCard}>
                  <View style={styles.itemImgWrapper}>
                    <Image source={{ uri: item.product.image }} style={styles.itemImg} resizeMode="cover" />
                  </View>

                  <View style={styles.itemDetailsCol}>
                    <Text style={styles.itemName} numberOfLines={2}>
                      {item.product.name}
                    </Text>

                    <Text style={styles.itemVariant}>
                      Variant: {item.size || 'Standard'} {item.color ? '• Color' : ''}
                    </Text>

                    <Text style={styles.itemPrice}>{item.product.formattedPrice}</Text>

                    {/* Quantity Stepper & Remove */}
                    <View style={styles.actionRow}>
                      <View style={styles.qtyControlBox}>
                        <TouchableOpacity
                          style={styles.qtyBtn}
                          onPress={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="remove" size={14} color="#0F382C" />
                        </TouchableOpacity>

                        <Text style={styles.qtyCount}>{item.quantity}</Text>

                        <TouchableOpacity
                          style={styles.qtyBtn}
                          onPress={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="add" size={14} color="#0F382C" />
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity
                        style={styles.trashBtn}
                        onPress={() => removeFromCart(item.product.id)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons name="trash-outline" size={17} color={COLORS.badgeRed} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            {/* Promo Code Card */}
            <View style={styles.cardContainer}>
              <View style={styles.cardHeaderBetween}>
                <Text style={styles.cardKicker}>PROMO CODE / VOUCHER</Text>
                <TouchableOpacity onPress={handleOpenVouchers} activeOpacity={0.7}>
                  <Text style={styles.browseLink}>Browse Vouchers ›</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.promoInputRow}>
                <TextInput
                  style={styles.promoInput}
                  placeholder="e.g. WELCOME10 or SELLFAST5"
                  placeholderTextColor="#8F948B"
                  value={promoCode}
                  onChangeText={setPromoCode}
                  autoCapitalize="characters"
                />
                <TouchableOpacity
                  style={[styles.applyBtn, activeDiscountPct > 0 && styles.applyBtnDone]}
                  onPress={handleApplyPromo}
                  activeOpacity={0.85}
                >
                  <Text style={styles.applyBtnText}>
                    {activeDiscountPct > 0 ? 'Applied ✓' : 'Apply'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Order Summary Card */}
            <View style={styles.cardContainer}>
              <Text style={styles.summaryTitle}>Order Summary</Text>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>₦ {subtotal.toLocaleString()}</Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Estimated Delivery Fee</Text>
                <Text style={styles.summaryValue}>₦ {deliveryFee.toLocaleString()}</Text>
              </View>

              {activeDiscountPct > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: COLORS.successGreen }]}>
                    {activeDiscountPct}% Promo Discount
                  </Text>
                  <Text style={[styles.summaryValue, { color: COLORS.successGreen }]}>
                    - ₦ {discount.toLocaleString()}
                  </Text>
                </View>
              )}

              <View style={styles.divider} />

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total (NGN)</Text>
                <Text style={styles.totalValue}>₦ {total.toLocaleString()}</Text>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="bag-handle-outline" size={44} color="#7E827A" />
            </View>
            <Text style={styles.emptyTitle}>Your Bag is Empty</Text>
            <Text style={styles.emptySub}>
              Discover curated luxury items from top verified Nigerian creators and merchants.
            </Text>
            <TouchableOpacity
              style={styles.startShopBtn}
              activeOpacity={0.88}
              onPress={() => navigate('home')}
            >
              <Text style={styles.startShopText}>Start Shopping</Text>
              <Ionicons name="arrow-forward" size={15} color="#C69B56" />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Sticky Bottom Checkout Action */}
      {cart.length > 0 && (
        <View style={styles.bottomCheckoutBar}>
          <TouchableOpacity
            style={styles.checkoutBtn}
            activeOpacity={0.88}
            onPress={() => navigate('checkout-address')}
          >
            <Text style={styles.checkoutBtnText}>
              Proceed to Checkout • ₦ {total.toLocaleString()}
            </Text>
            <View style={styles.checkoutIconBadge}>
              <Ionicons name="arrow-forward" size={14} color="#0F382C" />
            </View>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#ECE8E1',
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F5F3ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#0F382C',
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 110,
  },
  merchantCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ECE8E1',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  merchantIconWrapper: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(15, 56, 44, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  merchantTextWrap: {
    flex: 1,
  },
  merchantSubLabel: {
    fontSize: 10.5,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#7E827A',
  },
  merchantNameText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#0F382C',
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FAF7F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ECE8E1',
  },
  verifiedTagText: {
    fontSize: 10.5,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#0F382C',
  },
  itemsSection: {
    gap: 12,
    marginBottom: 14,
  },
  cartItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#ECE8E1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  itemImgWrapper: {
    width: 84,
    height: 84,
    borderRadius: 14,
    backgroundColor: '#F5F3ED',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemImg: {
    width: '100%',
    height: '100%',
  },
  itemDetailsCol: {
    flex: 1,
    justifyContent: 'space-between',
  },
  itemName: {
    fontSize: 13.5,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#1A1D1A',
    lineHeight: 18,
  },
  itemVariant: {
    fontSize: 11.5,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#7E827A',
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 14.5,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    color: '#0F382C',
    marginTop: 3,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  qtyControlBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3ED',
    borderRadius: 14,
    paddingHorizontal: 6,
    paddingVertical: 3,
    gap: 8,
  },
  qtyBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  qtyCount: {
    fontSize: 12.5,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#0F382C',
    minWidth: 16,
    textAlign: 'center',
  },
  trashBtn: {
    padding: 6,
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ECE8E1',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeaderBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardKicker: {
    fontSize: 10.5,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    color: '#C69B56',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  browseLink: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#0F382C',
  },
  promoInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  promoInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#F5F3ED',
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 12.5,
    fontFamily: 'PlusJakartaSans-Medium',
    color: '#1A1D1A',
    borderWidth: 1,
    borderColor: '#E8E4DA',
  },
  applyBtn: {
    backgroundColor: '#0F382C',
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnDone: {
    backgroundColor: COLORS.successGreen,
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  summaryTitle: {
    fontSize: 16,
    fontFamily: 'PlayfairDisplay-Bold',
    fontWeight: '700',
    color: '#0F382C',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Medium',
    color: '#5C6057',
  },
  summaryValue: {
    fontSize: 13.5,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#1A1D1A',
  },
  divider: {
    height: 1,
    backgroundColor: '#ECE8E1',
    marginVertical: 10,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  totalLabel: {
    fontSize: 14.5,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#0F382C',
  },
  totalValue: {
    fontSize: 17,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    color: '#0F382C',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F5F3ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'PlayfairDisplay-Bold',
    fontWeight: '700',
    color: '#0F382C',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#7E827A',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  startShopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0F382C',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 24,
  },
  startShopText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  bottomCheckoutBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#ECE8E1',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 10,
  },
  checkoutBtn: {
    backgroundColor: '#0F382C',
    height: 52,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#0F382C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  checkoutBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  checkoutIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#C69B56',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { useApp } from '../../context/AppContext';
import { useNavigation } from '../../navigation/NavigationContext';

export default function CheckoutReviewScreen() {
  const { cart, addresses, selectedAddressId, selectedDeliveryMethod } = useApp();
  const { navigate, goBack, openModal } = useNavigation();

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId) || addresses[0] || {
    recipient: 'Amina Bello',
    phone: '+234 803 123 4567',
    street: '14b Admiralty Way, Victoria Island',
    city: 'Lagos',
    state: 'Lagos State',
  };

  const merchantName = cart[0]?.product?.merchant || 'SellFast Verified Merchant';

  const subtotal = cart.reduce((acc, item) => acc + (item.product?.price || 0) * (item.quantity || 1), 0);
  const deliveryFee = selectedDeliveryMethod === 'express' ? 7500 : 4500;
  const total = subtotal + deliveryFee;

  const handlePayPress = () => {
    openModal('checkout-paystack', { totalAmount: total });
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

        <Text style={styles.headerTitle}>Order Review</Text>

        <View style={{ width: 38 }} />
      </View>

      {/* Centered Stepper Progress Indicator */}
      <View style={styles.stepperContainer}>
        <View style={styles.stepItem}>
          <View style={[styles.stepCircle, styles.stepCircleCompleted]}>
            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
          </View>
          <Text style={[styles.stepLabel, styles.stepLabelCompleted]}>Address</Text>
        </View>

        <View style={[styles.stepConnector, styles.stepConnectorActive]} />

        <View style={styles.stepItem}>
          <View style={[styles.stepCircle, styles.stepCircleCompleted]}>
            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
          </View>
          <Text style={[styles.stepLabel, styles.stepLabelCompleted]}>Delivery</Text>
        </View>

        <View style={[styles.stepConnector, styles.stepConnectorActive]} />

        <View style={styles.stepItem}>
          <View style={[styles.stepCircle, styles.stepCircleActive]}>
            <Text style={styles.stepNumActive}>3</Text>
          </View>
          <Text style={[styles.stepLabel, styles.stepLabelActive]}>Review</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Editorial Section Title */}
        <View style={styles.titleSection}>
          <Text style={styles.titleText}>Review & Confirm</Text>
          <Text style={styles.titleSub}>Verify your order items and destination before payment.</Text>
        </View>

        {/* Fulfilling Merchant Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardIconCircle}>
              <Ionicons name="storefront-outline" size={16} color={COLORS.emeraldPrimary} />
            </View>
            <View style={styles.cardTitleWrap}>
              <Text style={styles.cardKicker}>FULFILLING MERCHANT</Text>
              <Text style={styles.merchantTitleText}>{merchantName}</Text>
            </View>
            <View style={styles.verifiedBadge}>
              <Ionicons name="shield-checkmark" size={11} color="#0F382C" />
              <Text style={styles.verifiedBadgeText}>Verified</Text>
            </View>
          </View>
        </View>

        {/* Destination Address Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardIconCircle}>
              <Ionicons name="location-outline" size={16} color={COLORS.emeraldPrimary} />
            </View>
            <View style={styles.cardTitleWrap}>
              <Text style={styles.cardKicker}>DELIVERY DESTINATION</Text>
              <Text style={styles.boldDetailText}>{selectedAddress.recipient} • {selectedAddress.phone}</Text>
              <Text style={styles.subDetailText}>{selectedAddress.street}, {selectedAddress.city}, {selectedAddress.state}</Text>
            </View>
            <TouchableOpacity onPress={() => navigate('checkout-address')} style={styles.changeLinkBtn}>
              <Text style={styles.changeLinkText}>Change</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Logistics Method Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardIconCircle}>
              <Ionicons name="car-outline" size={16} color={COLORS.emeraldPrimary} />
            </View>
            <View style={styles.cardTitleWrap}>
              <Text style={styles.cardKicker}>LOGISTICS METHOD</Text>
              <Text style={styles.boldDetailText}>
                {selectedDeliveryMethod === 'express'
                  ? 'Express Priority (DHL Nigeria)'
                  : 'Standard Doorstep (GIG Logistics)'}
              </Text>
              <Text style={styles.subDetailText}>
                {selectedDeliveryMethod === 'express'
                  ? 'Estimated next business day • ₦ 7,500'
                  : '2-3 business days • ₦ 4,500'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => navigate('checkout-delivery')} style={styles.changeLinkBtn}>
              <Text style={styles.changeLinkText}>Change</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Items Summary Card */}
        <View style={styles.card}>
          <Text style={styles.summarySectionTitle}>Order Items ({cart.length})</Text>
          <View style={styles.itemsList}>
            {cart.map((item, idx) => (
              <View key={idx} style={styles.itemRow}>
                <View style={styles.itemThumbWrapper}>
                  <Image source={{ uri: item.product.image }} style={styles.itemThumb} resizeMode="cover" />
                </View>
                <View style={styles.itemInfoCol}>
                  <Text style={styles.itemNameText} numberOfLines={1}>
                    {item.product.name}
                  </Text>
                  <Text style={styles.itemMetaText}>Qty: {item.quantity} {item.size ? `• Size ${item.size}` : ''}</Text>
                  <Text style={styles.itemPriceText}>{item.product.formattedPrice}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Final Price Breakdown Card */}
        <View style={styles.card}>
          <Text style={styles.summarySectionTitle}>Payment Breakdown</Text>

          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Items Subtotal</Text>
            <Text style={styles.priceVal}>₦ {subtotal.toLocaleString()}</Text>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Shipping & Handling</Text>
            <Text style={styles.priceVal}>₦ {deliveryFee.toLocaleString()}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalPriceRow}>
            <Text style={styles.totalPriceLabel}>Total Payable (NGN)</Text>
            <Text style={styles.totalPriceVal}>₦ {total.toLocaleString()}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Action */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.payBtn}
          activeOpacity={0.88}
          onPress={handlePayPress}
        >
          <Ionicons name="lock-closed" size={16} color="#C69B56" />
          <Text style={styles.payBtnText}>Pay with Paystack • ₦ {total.toLocaleString()}</Text>
          <View style={styles.btnIconBadge}>
            <Ionicons name="arrow-forward" size={14} color="#0F382C" />
          </View>
        </TouchableOpacity>
      </View>
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
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#ECE8E1',
  },
  stepItem: {
    alignItems: 'center',
    gap: 4,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F5F3ED',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ECE8E1',
  },
  stepCircleActive: {
    backgroundColor: '#0F382C',
    borderColor: '#0F382C',
  },
  stepCircleCompleted: {
    backgroundColor: '#157347',
    borderColor: '#157347',
  },
  stepNumActive: {
    fontSize: 11.5,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepLabel: {
    fontSize: 10.5,
    fontFamily: 'PlusJakartaSans-Medium',
    color: '#7E827A',
  },
  stepLabelActive: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#0F382C',
  },
  stepLabelCompleted: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#157347',
  },
  stepConnector: {
    width: 36,
    height: 2,
    marginHorizontal: 8,
    marginTop: -16,
  },
  stepConnectorActive: {
    backgroundColor: '#157347',
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 110,
    gap: 14,
  },
  titleSection: {
    marginBottom: 4,
  },
  titleText: {
    fontSize: 22,
    fontFamily: 'PlayfairDisplay-Bold',
    fontWeight: '700',
    color: '#0F382C',
    letterSpacing: -0.3,
  },
  titleSub: {
    fontSize: 12.5,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#7E827A',
    marginTop: 3,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ECE8E1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  cardTitleWrap: {
    flex: 1,
  },
  cardKicker: {
    fontSize: 9.5,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    color: '#C69B56',
    letterSpacing: 1,
    marginBottom: 3,
  },
  merchantTitleText: {
    fontSize: 13.5,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#0F382C',
  },
  boldDetailText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#1A1D1A',
  },
  subDetailText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#5C6057',
    marginTop: 2,
    lineHeight: 16,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FAF7F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ECE8E1',
  },
  verifiedBadgeText: {
    fontSize: 10.5,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#0F382C',
  },
  changeLinkBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  changeLinkText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#0F382C',
  },
  summarySectionTitle: {
    fontSize: 15,
    fontFamily: 'PlayfairDisplay-Bold',
    fontWeight: '700',
    color: '#0F382C',
    marginBottom: 12,
  },
  itemsList: {
    gap: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  itemThumbWrapper: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#F5F3ED',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemThumb: {
    width: '100%',
    height: '100%',
  },
  itemInfoCol: {
    flex: 1,
  },
  itemNameText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#1A1D1A',
  },
  itemMetaText: {
    fontSize: 11.5,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#7E827A',
    marginTop: 2,
  },
  itemPriceText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    color: '#0F382C',
    marginTop: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Medium',
    color: '#5C6057',
  },
  priceVal: {
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
  totalPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  totalPriceLabel: {
    fontSize: 14.5,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#0F382C',
  },
  totalPriceVal: {
    fontSize: 17,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    color: '#0F382C',
  },
  bottomBar: {
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
  payBtn: {
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
  payBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  btnIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#C69B56',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

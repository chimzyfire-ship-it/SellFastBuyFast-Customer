import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { useApp } from '../../context/AppContext';
import { useNavigation } from '../../navigation/NavigationContext';

export default function OrderDetailScreen() {
  const { orders } = useApp();
  const { currentRoute, goBack, navigate, openModal } = useNavigation();

  const orderId = currentRoute.params?.orderId || 'ORD-2026-8891';
  const order = orders.find((o) => o.id === orderId) || currentRoute.params?.order || orders[0] || {
    id: orderId,
    status: 'Placed',
    merchantName: 'SellFast Tech',
    estimatedDelivery: '3 Days',
    totalAmount: 154500,
    deliveryFee: 4500,
    items: [],
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Delivered':
        return { bg: '#EAF6EC', color: '#157347', icon: 'checkmark-circle' };
      case 'Shipped':
      case 'Out for Delivery':
        return { bg: '#EBF4F6', color: '#0F382C', icon: 'car-outline' };
      case 'Cancelled':
      case 'Returned':
        return { bg: '#FDF2F2', color: COLORS.badgeRed, icon: 'close-circle' };
      default:
        return { bg: '#FAF4E8', color: '#B58105', icon: 'time-outline' };
    }
  };

  const statusStyle = getStatusBadge(order.status);
  const items = order.items || [];
  const subtotal = order.totalAmount ? order.totalAmount - (order.deliveryFee || 4500) : 150000;
  const deliveryFee = order.deliveryFee || 4500;
  const totalAmount = order.totalAmount || 154500;

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

        <Text style={styles.headerTitle}>Order Details</Text>

        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() => openModal('invoice-viewer', { order })}
          activeOpacity={0.75}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="document-text-outline" size={20} color={COLORS.emeraldPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Order Status Hero Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusTopRow}>
            <View>
              <Text style={styles.orderRefKicker}>ORDER REFERENCE</Text>
              <Text style={styles.orderIdText}>{order.id}</Text>
            </View>

            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
              <Ionicons name={statusStyle.icon} size={12} color={statusStyle.color} />
              <Text style={[styles.statusBadgeText, { color: statusStyle.color }]}>
                {order.status}
              </Text>
            </View>
          </View>

          <View style={styles.deliveryEtaRow}>
            <Ionicons name="calendar-outline" size={15} color="#7E827A" />
            <Text style={styles.deliveryEtaText}>
              Estimated Delivery:{' '}
              <Text style={styles.deliveryEtaBold}>{order.estimatedDelivery || 'Within 2 to 3 Business Days'}</Text>
            </Text>
          </View>

          {/* Quick Tracking Button */}
          <TouchableOpacity
            style={styles.trackBtn}
            activeOpacity={0.88}
            onPress={() => navigate('order-tracking', { orderId: order.id })}
          >
            <Ionicons name="compass-outline" size={18} color="#FFFFFF" />
            <Text style={styles.trackBtnText}>Live Logistics Tracking</Text>
            <View style={styles.btnIconBadge}>
              <Ionicons name="arrow-forward" size={13} color="#0F382C" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Merchant & Tax Receipt Card */}
        <View style={styles.merchantCard}>
          <View style={styles.merchantHeader}>
            <View style={styles.merchantIconWrap}>
              <Ionicons name="storefront-outline" size={16} color={COLORS.emeraldPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.merchantKicker}>FULFILLING MERCHANT</Text>
              <Text style={styles.merchantName}>{order.merchantName || 'SellFast Direct Official'}</Text>
            </View>
            <View style={styles.verifiedTag}>
              <Ionicons name="shield-checkmark" size={11} color="#0F382C" />
              <Text style={styles.verifiedTagText}>Verified</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.invoiceActionRow}
            activeOpacity={0.75}
            onPress={() => openModal('invoice-viewer', { order })}
          >
            <Ionicons name="receipt-outline" size={17} color="#C69B56" />
            <Text style={styles.invoiceActionText}>View Official Tax Invoice / Receipt</Text>
            <Ionicons name="chevron-forward" size={15} color="#7E827A" />
          </TouchableOpacity>
        </View>

        {/* Ordered Items List */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>
            Ordered Items ({items.length || 1})
          </Text>

          <View style={styles.itemsList}>
            {items.length > 0 ? (
              items.map((item, idx) => {
                const productName = item.product?.name || item.name || 'Smart Watch Series 9';
                const productImage =
                  item.product?.image ||
                  item.image ||
                  'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=800&q=80';
                const priceFormatted =
                  item.product?.formattedPrice ||
                  (item.price ? `₦ ${item.price.toLocaleString()}` : '₦ 150,000');
                const variantText = `${item.size || item.product?.sizes?.[0] || 'Standard'}${
                  item.color ? ' • Color' : ''
                }`;

                return (
                  <View key={idx} style={styles.itemRow}>
                    <View style={styles.itemThumbWrap}>
                      <Image source={{ uri: productImage }} style={styles.itemThumb} resizeMode="cover" />
                    </View>

                    <View style={styles.itemDetailsCol}>
                      <Text style={styles.itemName} numberOfLines={2}>
                        {productName}
                      </Text>
                      <Text style={styles.itemVariant}>Variant: {variantText}</Text>
                      <View style={styles.priceQtyRow}>
                        <Text style={styles.itemPrice}>{priceFormatted}</Text>
                        <View style={styles.qtyBadge}>
                          <Text style={styles.qtyBadgeText}>Qty: {item.quantity || 1}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={styles.itemRow}>
                <View style={styles.itemThumbWrap}>
                  <Image
                    source={{
                      uri: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=800&q=80',
                    }}
                    style={styles.itemThumb}
                    resizeMode="cover"
                  />
                </View>

                <View style={styles.itemDetailsCol}>
                  <Text style={styles.itemName}>Smart Watch Series 9</Text>
                  <Text style={styles.itemVariant}>Variant: 41mm • Aluminum</Text>
                  <View style={styles.priceQtyRow}>
                    <Text style={styles.itemPrice}>₦ 150,000</Text>
                    <View style={styles.qtyBadge}>
                      <Text style={styles.qtyBadgeText}>Qty: 1</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Payment & Price Breakdown */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>Payment Breakdown</Text>

          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Items Subtotal</Text>
            <Text style={styles.priceVal}>₦ {subtotal.toLocaleString()}</Text>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Logistics Delivery Fee</Text>
            <Text style={styles.priceVal}>₦ {deliveryFee.toLocaleString()}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Paid (NGN)</Text>
            <Text style={styles.totalVal}>₦ {totalAmount.toLocaleString()}</Text>
          </View>

          <View style={styles.escrowNoticeRow}>
            <Ionicons name="shield-checkmark" size={13} color="#157347" />
            <Text style={styles.escrowNoticeText}>
              Protected by Paystack Escrow • Ref: {order.paymentReference || 'PSTK-889123-NG'}
            </Text>
          </View>
        </View>

        {/* Actions Grid (Request Return & Support Ticket) */}
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            activeOpacity={0.8}
            onPress={() => navigate('return-request', { orderId: order.id })}
          >
            <View style={styles.actionIconCircle}>
              <Ionicons name="return-up-back-outline" size={20} color="#0F382C" />
            </View>
            <Text style={styles.actionCardTitle}>Request Return</Text>
            <Text style={styles.actionCardSub}>14-day buyer protection</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            activeOpacity={0.8}
            onPress={() => navigate('create-ticket', { orderId: order.id })}
          >
            <View style={styles.actionIconCircle}>
              <Ionicons name="chatbubbles-outline" size={20} color="#0F382C" />
            </View>
            <Text style={styles.actionCardTitle}>Support Ticket</Text>
            <Text style={styles.actionCardSub}>24/7 VIP concierge help</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    gap: 14,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#ECE8E1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statusTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  orderRefKicker: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    color: '#C69B56',
    letterSpacing: 1,
  },
  orderIdText: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#0F382C',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  deliveryEtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  deliveryEtaText: {
    fontSize: 12.5,
    fontFamily: 'PlusJakartaSans-Medium',
    color: '#5C6057',
  },
  deliveryEtaBold: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#0F382C',
  },
  trackBtn: {
    backgroundColor: '#0F382C',
    height: 48,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#0F382C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  trackBtnText: {
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
    marginLeft: 4,
  },
  merchantCard: {
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
  merchantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0ECE4',
  },
  merchantIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(15, 56, 44, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  merchantKicker: {
    fontSize: 9.5,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    color: '#C69B56',
    letterSpacing: 0.8,
  },
  merchantName: {
    fontSize: 13.5,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#0F382C',
    marginTop: 1,
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FAF7F0',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ECE8E1',
  },
  verifiedTagText: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#0F382C',
  },
  invoiceActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
  },
  invoiceActionText: {
    fontSize: 12.5,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#0F382C',
    flex: 1,
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
  cardSectionTitle: {
    fontSize: 14.5,
    fontFamily: 'PlayfairDisplay-Bold',
    fontWeight: '700',
    color: '#0F382C',
    marginBottom: 12,
  },
  itemsList: {
    gap: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemThumbWrap: {
    width: 60,
    height: 60,
    borderRadius: 14,
    backgroundColor: '#F5F3ED',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemThumb: {
    width: '100%',
    height: '100%',
  },
  itemDetailsCol: {
    flex: 1,
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 13.5,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#1A1D1A',
    lineHeight: 18,
  },
  itemVariant: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#7E827A',
    marginTop: 2,
  },
  priceQtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  itemPrice: {
    fontSize: 13.5,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    color: '#0F382C',
  },
  qtyBadge: {
    backgroundColor: '#F5F3ED',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  qtyBadgeText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#5C6057',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 12.5,
    fontFamily: 'PlusJakartaSans-Medium',
    color: '#5C6057',
  },
  priceVal: {
    fontSize: 13,
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
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#0F382C',
  },
  totalVal: {
    fontSize: 16.5,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    color: '#0F382C',
  },
  escrowNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FAF7F0',
    padding: 10,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#ECE8E1',
  },
  escrowNoticeText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Medium',
    color: '#5C6057',
    flex: 1,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ECE8E1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  actionIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F5F3ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionCardTitle: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#0F382C',
  },
  actionCardSub: {
    fontSize: 10.5,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#7E827A',
    marginTop: 2,
    textAlign: 'center',
  },
});

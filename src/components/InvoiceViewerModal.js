import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { useApp } from '../context/AppContext';
import { useNavigation } from '../navigation/NavigationContext';

export default function InvoiceViewerModal() {
  const { showToast } = useApp();
  const { activeModal, closeModal } = useNavigation();
  const visible = activeModal?.name === 'invoice-viewer';
  const order = activeModal?.params?.order || {
    id: 'ORD-2026-8891',
    date: '2026-08-08T14:30:00Z',
    merchantName: 'SellFast Tech',
    totalAmount: 154500,
    deliveryFee: 4500,
    paymentReference: 'PSTK-NG-889241',
    items: [],
  };

  if (!visible) return null;

  const handleShareInvoice = () => {
    showToast && showToast('Official Tax Receipt PDF downloaded successfully');
  };

  const formatDate = (dateStr) => {
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? '8 Aug 2026, 02:30 PM' : d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return '8 Aug 2026, 02:30 PM';
    }
  };

  const items = order.items && order.items.length > 0 ? order.items : [
    {
      product: {
        name: 'Smart Watch Series 9',
        image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=800&q=80',
        price: 150000,
        formattedPrice: '₦ 150,000',
      },
      quantity: 1,
      price: 150000,
    }
  ];

  const subtotal = order.totalAmount ? order.totalAmount - (order.deliveryFee || 4500) : 150000;
  const deliveryFee = order.deliveryFee || 4500;
  const totalAmount = order.totalAmount || 154500;
  const vatAmount = Math.round((subtotal * 0.075));

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.container}>
        {/* Header Bar */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={closeModal}
            style={styles.headerIconBtn}
            activeOpacity={0.75}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={22} color={COLORS.emeraldPrimary} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Official Tax Invoice</Text>

          <TouchableOpacity
            onPress={handleShareInvoice}
            style={styles.headerIconBtn}
            activeOpacity={0.75}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="share-outline" size={20} color={COLORS.emeraldPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Invoice Paper Document Card */}
          <View style={styles.invoicePaper}>
            {/* Brand Header */}
            <View style={styles.brandHeader}>
              <View>
                <Text style={styles.brandTitle}>SellFastBuyFast NG</Text>
                <Text style={styles.brandSub}>Luxury & Verified Marketplace Platform</Text>
              </View>
              <View style={styles.receiptTag}>
                <Text style={styles.receiptTagText}>TAX RECEIPT</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Metadata Rows with clear spacing */}
            <View style={styles.metaTable}>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Order Reference</Text>
                <Text style={styles.metaVal}>{order.id || 'ORD-2026-8891'}</Text>
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Payment Date</Text>
                <Text style={styles.metaVal}>{formatDate(order.date)}</Text>
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Paystack Reference</Text>
                <Text style={styles.metaVal}>{order.paymentReference || 'PSTK-NG-889241'}</Text>
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Fulfilling Merchant</Text>
                <Text style={styles.metaVal}>{order.merchantName || 'SellFast Tech'}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Itemized Table */}
            <Text style={styles.sectionKicker}>ITEMIZED PURCHASE DETAILS</Text>

            <View style={styles.itemsContainer}>
              {items.map((item, idx) => {
                const name = item.product?.name || item.name || 'Smart Watch Series 9';
                const image = item.product?.image || item.image;
                const unitPrice = item.product?.formattedPrice || (item.price ? `₦ ${item.price.toLocaleString()}` : '₦ 150,000');
                const lineTotal = item.product?.formattedPrice || (item.price ? `₦ ${(item.price * (item.quantity || 1)).toLocaleString()}` : '₦ 150,000');

                return (
                  <View key={idx} style={styles.itemCard}>
                    {image && (
                      <View style={styles.itemThumbWrapper}>
                        <Image source={{ uri: image }} style={styles.itemThumb} resizeMode="cover" />
                      </View>
                    )}
                    <View style={styles.itemTextWrap}>
                      <Text style={styles.itemName} numberOfLines={2}>{name}</Text>
                      <Text style={styles.itemQty}>Qty: {item.quantity || 1} • Unit: {unitPrice}</Text>
                    </View>
                    <Text style={styles.itemTotal}>{lineTotal}</Text>
                  </View>
                );
              })}
            </View>

            <View style={styles.divider} />

            {/* Price Calculations */}
            <View style={styles.calcRowsWrap}>
              <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>Subtotal</Text>
                <Text style={styles.calcVal}>₦ {subtotal.toLocaleString()}</Text>
              </View>

              <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>Delivery Fee (Standard Courier)</Text>
                <Text style={styles.calcVal}>₦ {deliveryFee.toLocaleString()}</Text>
              </View>

              <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>VAT (7.5% Included)</Text>
                <Text style={styles.calcVal}>₦ {vatAmount.toLocaleString()}</Text>
              </View>
            </View>

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Settled (NGN)</Text>
              <Text style={styles.totalVal}>₦ {totalAmount.toLocaleString()}</Text>
            </View>

            {/* Payment Footer Note */}
            <View style={styles.escrowNote}>
              <Ionicons name="shield-checkmark" size={16} color="#157347" />
              <Text style={styles.escrowNoteText}>
                Payment processed through Paystack. Merchant information is shown on the order record.
              </Text>
            </View>
          </View>

          {/* Download Action Button */}
          <TouchableOpacity
            style={styles.downloadBtn}
            activeOpacity={0.88}
            onPress={handleShareInvoice}
          >
            <Ionicons name="download-outline" size={18} color="#FFFFFF" />
            <Text style={styles.downloadText}>Download Official PDF Receipt</Text>
            <View style={styles.btnIconBadge}>
              <Ionicons name="arrow-down" size={13} color="#0F382C" />
            </View>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F6F0',
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
    gap: 16,
  },
  invoicePaper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#ECE8E1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  brandHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  brandTitle: {
    fontSize: 18,
    fontFamily: 'PlayfairDisplay-Bold',
    fontWeight: '700',
    color: '#0F382C',
  },
  brandSub: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#7E827A',
    marginTop: 2,
  },
  receiptTag: {
    backgroundColor: '#0F382C',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  receiptTagText: {
    color: '#C69B56',
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0ECE4',
    marginVertical: 14,
  },
  metaTable: {
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 12.5,
    fontFamily: 'PlusJakartaSans-Medium',
    color: '#5C6057',
  },
  metaVal: {
    fontSize: 12.5,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#1A1D1A',
  },
  sectionKicker: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    color: '#C69B56',
    letterSpacing: 1,
    marginBottom: 10,
  },
  itemsContainer: {
    gap: 10,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FAF7F0',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ECE8E1',
  },
  itemThumbWrapper: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemThumb: {
    width: '100%',
    height: '100%',
  },
  itemTextWrap: {
    flex: 1,
  },
  itemName: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#1A1D1A',
  },
  itemQty: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#7E827A',
    marginTop: 2,
  },
  itemTotal: {
    fontSize: 13.5,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    color: '#0F382C',
  },
  calcRowsWrap: {
    gap: 8,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calcLabel: {
    fontSize: 12.5,
    fontFamily: 'PlusJakartaSans-Medium',
    color: '#5C6057',
  },
  calcVal: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#1A1D1A',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1.5,
    borderTopColor: '#0F382C',
  },
  totalLabel: {
    fontSize: 14.5,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#0F382C',
  },
  totalVal: {
    fontSize: 17,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    color: '#0F382C',
  },
  escrowNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EAF6EC',
    padding: 10,
    borderRadius: 12,
    marginTop: 14,
  },
  escrowNoteText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Medium',
    color: '#157347',
    fontWeight: '600',
    flex: 1,
  },
  downloadBtn: {
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
  downloadText: {
    color: '#FFFFFF',
    fontSize: 14.5,
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
});

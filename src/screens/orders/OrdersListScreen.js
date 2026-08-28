import React, { useState } from 'react';
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

const PRODUCT_ARCH_IMAGES = {
  p1: require('../../../assets/product-smartwatch-arch.jpg'),
  p2: require('../../../assets/product-sneakers-arch.jpg'),
  p3: require('../../../assets/product-perfume-arch.jpg'),
  p4: require('../../../assets/product-handbag-arch.jpg'),
};

export default function OrdersListScreen() {
  const { orders } = useApp();
  const { navigate, goBack } = useNavigation();

  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'active' | 'completed'

  const filteredOrders = orders.filter((o) => {
    if (activeTab === 'active') return ['Placed', 'Accepted', 'Shipped', 'Out for Delivery'].includes(o.status);
    if (activeTab === 'completed') return ['Delivered', 'Returned', 'Cancelled'].includes(o.status);
    return true;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Delivered':
        return {
          bg: '#EAF6EC',
          color: '#157347',
          icon: 'checkmark-circle',
        };
      case 'Shipped':
      case 'Out for Delivery':
        return {
          bg: '#EBF4F6',
          color: '#0F382C',
          icon: 'car-outline',
        };
      case 'Cancelled':
        return {
          bg: '#FDF2F2',
          color: COLORS.badgeRed,
          icon: 'close-circle',
        };
      default:
        return {
          bg: '#FAF4E8',
          color: '#B58105',
          icon: 'time-outline',
        };
    }
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
          <Ionicons name="arrow-back" size={22} color="#0F382C" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>My Orders</Text>

        <View style={{ width: 38 }} />
      </View>

      {/* Modern Segmented Navigation Tabs */}
      <View style={styles.tabsContainer}>
        {[
          { id: 'all', label: 'All Orders' },
          { id: 'active', label: 'In Progress' },
          { id: 'completed', label: 'Past Orders' },
        ].map((t) => {
          const isActive = activeTab === t.id;
          return (
            <TouchableOpacity
              key={t.id}
              style={[styles.tabBtn, isActive && styles.tabBtnActive]}
              onPress={() => setActiveTab(t.id)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredOrders.map((item) => {
          const statusStyle = getStatusBadge(item.status);
          const firstItem = item.items?.[0];
          const firstProduct = firstItem?.product || firstItem;
          const imageSrc = firstProduct?.id && PRODUCT_ARCH_IMAGES[firstProduct.id]
            ? PRODUCT_ARCH_IMAGES[firstProduct.id]
            : firstProduct?.image
            ? { uri: firstProduct.image }
            : null;

          return (
            <TouchableOpacity
              key={item.id}
              style={styles.orderCard}
              activeOpacity={0.88}
              onPress={() => navigate('order-detail', { orderId: item.id, order: item })}
            >
              {/* Card Header: Merchant & Status */}
              <View style={styles.cardHeader}>
                <View style={styles.merchantRow}>
                  <Ionicons name="storefront-outline" size={15} color="#0F382C" />
                  <Text style={styles.merchantName}>{item.merchantName}</Text>
                </View>

                <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                  <Ionicons name={statusStyle.icon} size={12} color={statusStyle.color} />
                  <Text style={[styles.statusText, { color: statusStyle.color }]}>
                    {item.status}
                  </Text>
                </View>
              </View>

              {/* Card Body: Thumbnail & Details */}
              <View style={styles.cardBody}>
                {imageSrc && (
                  <View style={styles.thumbWrapper}>
                    <Image source={imageSrc} style={styles.thumbImg} resizeMode="cover" />
                  </View>
                )}

                <View style={styles.infoCol}>
                  <Text style={styles.orderIdText}>{item.id}</Text>
                  <Text style={styles.productNames} numberOfLines={2}>
                    {item.items.map((i) => i.product?.name || i.name || 'Item').join(', ')}
                  </Text>
                  <Text style={styles.dateText}>
                    Ordered on{' '}
                    {new Date(item.date).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
              </View>

              {/* Card Footer: Amount & Action Button */}
              <View style={styles.cardFooter}>
                <View>
                  <Text style={styles.amountLabel}>Total Amount</Text>
                  <Text style={styles.amountValue}>₦ {item.totalAmount.toLocaleString()}</Text>
                </View>

                <View style={styles.viewActionBtn}>
                  <Text style={styles.viewActionText}>
                    {item.status === 'Delivered' ? 'View Details' : 'Track Order'}
                  </Text>
                  <Ionicons name="chevron-forward" size={13} color="#0F382C" />
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        {filteredOrders.length === 0 && (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="receipt-outline" size={44} color="#7E827A" />
            </View>
            <Text style={styles.emptyTitle}>No Orders Found</Text>
            <Text style={styles.emptySub}>
              You don't have any orders in this category yet.
            </Text>
            <TouchableOpacity
              style={styles.startShopBtn}
              activeOpacity={0.88}
              onPress={() => navigate('home')}
            >
              <Text style={styles.startShopText}>Explore Marketplace</Text>
              <Ionicons name="arrow-forward" size={15} color="#C69B56" />
            </TouchableOpacity>
          </View>
        )}
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
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ECE8E1',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: '#0F382C',
  },
  tabText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Medium',
    color: '#7E827A',
  },
  tabTextActive: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#0F382C',
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 110,
    gap: 14,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ECE8E1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0ECE4',
  },
  merchantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  merchantName: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#0F382C',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  cardBody: {
    flexDirection: 'row',
    paddingVertical: 12,
    alignItems: 'center',
    gap: 12,
  },
  thumbWrapper: {
    width: 62,
    height: 62,
    borderRadius: 12,
    backgroundColor: '#F5F3ED',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbImg: {
    width: '100%',
    height: '100%',
  },
  infoCol: {
    flex: 1,
  },
  orderIdText: {
    fontSize: 10.5,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    color: '#C69B56',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  productNames: {
    fontSize: 13.5,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#1A1D1A',
    lineHeight: 18,
  },
  dateText: {
    fontSize: 11.5,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#7E827A',
    marginTop: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0ECE4',
  },
  amountLabel: {
    fontSize: 10.5,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#7E827A',
  },
  amountValue: {
    fontSize: 15.5,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    color: '#0F382C',
    marginTop: 1,
  },
  viewActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F5F3ED',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ECE8E1',
  },
  viewActionText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
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
});

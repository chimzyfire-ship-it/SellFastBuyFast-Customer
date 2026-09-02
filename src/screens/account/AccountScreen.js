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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { useApp } from '../../context/AppContext';
import { useNavigation } from '../../navigation/NavigationContext';

export default function AccountScreen() {
  const { user, signOut, orders, wishlist, notifications, showToast } = useApp();
  const { navigate, openModal } = useNavigation();

  const unreadNotifsCount = notifications.filter((n) => !n.read).length;

  const handleOpenVouchers = () => {
    openModal('voucher-selector', {
      onSelectVoucher: (v) => showToast && showToast(`Voucher ${v.code} applied`),
    });
  };

  const handleSellerInfo = () => {
    Alert.alert(
      'Sell on SellFastBuyFast',
      'Join Nigeria’s premier verified luxury and tech merchants. Our merchant vetting team will review your CAC and RC credentials within 48 hours.',
      [{ text: 'Learn More', onPress: () => showToast && showToast('Merchant inquiry submitted') }, { text: 'Cancel', style: 'cancel' }]
    );
  };

  const handleBuyerProtection = () => {
    Alert.alert(
      'SellFast Buyer Protection',
      '• Merchant review and catalogue moderation\n• Server-controlled order and inventory operations\n• Delivery and return handling under the marketplace policy\n\nLive payment protection will be documented when the dedicated payment module is enabled.',
      [{ text: 'Understood' }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Bar */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Account & Settings</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile & VIP Membership Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileTopRow}>
            <View style={styles.avatarWrapper}>
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
              <View style={styles.verifiedBadgeCircle}>
                <Ionicons name="checkmark" size={10} color="#FFFFFF" />
              </View>
            </View>

            <View style={styles.profileTextCol}>
              <View style={styles.nameRow}>
                <Text style={styles.nameText}>{user.name}</Text>
                <View style={styles.buyerTierPill}>
                  <Ionicons name="sparkles" size={10} color="#C69B56" />
                  <Text style={styles.buyerTierText}>Verified</Text>
                </View>
              </View>

              <Text style={styles.emailText}>{user.email}</Text>
              <Text style={styles.phoneText}>{user.phone}</Text>
            </View>
          </View>

          {/* Gold Concierge Membership Banner */}
          <View style={styles.membershipBanner}>
            <View style={styles.memberBadgeWrap}>
              <Ionicons name="diamond-outline" size={14} color="#C69B56" />
              <Text style={styles.memberTierText}>GOLD CONCIERGE MEMBER</Text>
            </View>
            <Text style={styles.memberPerksText}>
              1,450 Member Points • Delivery options shown at checkout
            </Text>
          </View>
        </View>

        {/* BENTO GROUP 1: COMMERCE & ORDERS */}
        <View style={styles.bentoSection}>
          <Text style={styles.sectionKicker}>COMMERCE & ORDERS</Text>
          <View style={styles.menuContainer}>
            <TouchableOpacity
              style={styles.menuItem}
              activeOpacity={0.75}
              onPress={() => navigate('orders-list')}
            >
              <View style={styles.iconCircle}>
                <Ionicons name="receipt-outline" size={19} color="#0F382C" />
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={styles.menuTitle}>My Orders & Deliveries</Text>
                <Text style={styles.menuSub}>{orders.length} orders placed</Text>
              </View>
              <View style={[styles.badgePill, { backgroundColor: '#EAF6EC' }]}>
                <Text style={[styles.badgeText, { color: '#157347' }]}>1 In Transit</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#7E827A" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              activeOpacity={0.75}
              onPress={() => navigate('account-saved')}
            >
              <View style={styles.iconCircle}>
                <Ionicons name="heart-outline" size={19} color="#0F382C" />
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={styles.menuTitle}>Saved Items & Wishlist</Text>
                <Text style={styles.menuSub}>{wishlist.length} saved luxury pieces</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#7E827A" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              activeOpacity={0.75}
              onPress={() => navigate('return-status')}
            >
              <View style={styles.iconCircle}>
                <Ionicons name="return-up-back-outline" size={19} color="#0F382C" />
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={styles.menuTitle}>Returns & Refunds</Text>
                <Text style={styles.menuSub}>Track return requests and refund updates</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#7E827A" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, { borderBottomWidth: 0 }]}
              activeOpacity={0.75}
              onPress={handleOpenVouchers}
            >
              <View style={styles.iconCircle}>
                <Ionicons name="pricetag-outline" size={19} color="#0F382C" />
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={styles.menuTitle}>Vouchers & Store Credits</Text>
                <Text style={styles.menuSub}>Apply promo codes & view balances</Text>
              </View>
              <View style={[styles.badgePill, { backgroundColor: '#FAF4E8' }]}>
                <Text style={[styles.badgeText, { color: '#8C682A' }]}>₦ 15,000</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#7E827A" />
            </TouchableOpacity>
          </View>
        </View>

        {/* BENTO GROUP 2: ACCOUNT & SETTINGS */}
        <View style={styles.bentoSection}>
          <Text style={styles.sectionKicker}>ACCOUNT & PREFERENCES</Text>
          <View style={styles.menuContainer}>
            <TouchableOpacity
              style={styles.menuItem}
              activeOpacity={0.75}
              onPress={() => navigate('account-addresses')}
            >
              <View style={styles.iconCircle}>
                <Ionicons name="location-outline" size={19} color="#0F382C" />
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={styles.menuTitle}>Saved Delivery Addresses</Text>
                <Text style={styles.menuSub}>Manage home & office delivery points</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#7E827A" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              activeOpacity={0.75}
              onPress={() => showToast && showToast('Payment methods will be available when the payment module is enabled')}
            >
              <View style={styles.iconCircle}>
                <Ionicons name="card-outline" size={19} color="#0F382C" />
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={styles.menuTitle}>Payment Methods</Text>
                <Text style={styles.menuSub}>Setup deferred to the payment module</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#7E827A" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              activeOpacity={0.75}
              onPress={() => navigate('account-notifications')}
            >
              <View style={styles.iconCircle}>
                <Ionicons name="notifications-outline" size={19} color="#0F382C" />
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={styles.menuTitle}>Notification Center</Text>
                <Text style={styles.menuSub}>Order tracking & curated promotions</Text>
              </View>
              {unreadNotifsCount > 0 && (
                <View style={[styles.badgePill, { backgroundColor: '#FAF4E8' }]}>
                  <Text style={[styles.badgeText, { color: '#8C682A' }]}>
                    {unreadNotifsCount} New
                  </Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={16} color="#7E827A" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, { borderBottomWidth: 0 }]}
              activeOpacity={0.75}
              onPress={() => navigate('account-privacy')}
            >
              <View style={styles.iconCircle}>
                <Ionicons name="shield-outline" size={19} color="#0F382C" />
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={styles.menuTitle}>Privacy & Security Settings</Text>
                <Text style={styles.menuSub}>2FA, data consent & account management</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#7E827A" />
            </TouchableOpacity>
          </View>
        </View>

        {/* BENTO GROUP 3: SUPPORT & MARKETPLACE TRUST */}
        <View style={styles.bentoSection}>
          <Text style={styles.sectionKicker}>SUPPORT & MARKETPLACE TRUST</Text>

          {/* VIP Concierge Banner */}
          <TouchableOpacity
            style={styles.conciergeBanner}
            activeOpacity={0.88}
            onPress={() => navigate('create-ticket')}
          >
            <View style={styles.conciergeIconWrapper}>
              <Ionicons name="headset" size={22} color="#C69B56" />
            </View>
            <View style={styles.conciergeTextCol}>
              <Text style={styles.conciergeTitle}>24/7 Priority VIP Concierge</Text>
              <Text style={styles.conciergeSub}>
                Dedicated assistance for payment, delivery, and merchant-order questions.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.menuContainer}>
            <TouchableOpacity
              style={styles.menuItem}
              activeOpacity={0.75}
              onPress={handleBuyerProtection}
            >
              <View style={styles.iconCircle}>
                <Ionicons name="shield-checkmark-outline" size={19} color="#0F382C" />
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={styles.menuTitle}>SellFast Buyer Protection Policy</Text>
                <Text style={styles.menuSub}>See how payments, delivery, and returns are handled</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#7E827A" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, { borderBottomWidth: 0 }]}
              activeOpacity={0.75}
              onPress={handleSellerInfo}
            >
              <View style={styles.iconCircle}>
                <Ionicons name="storefront-outline" size={19} color="#0F382C" />
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={styles.menuTitle}>Sell on SellFastBuyFast</Text>
                <Text style={styles.menuSub}>Apply as a verified brand or merchant partner</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#7E827A" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Sign Out Action Button */}
        <TouchableOpacity
          style={styles.signOutBtn}
          activeOpacity={0.8}
          onPress={signOut}
        >
          <Ionicons name="log-out-outline" size={18} color={COLORS.badgeRed} />
          <Text style={styles.signOutText}>Sign Out of SellFastBuyFast</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>
          SellFastBuyFast Shopper App • v1.0.0 (Build 2026)
        </Text>
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
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#ECE8E1',
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'PlayfairDisplay-Bold',
    fontWeight: '700',
    color: '#0F382C',
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 120,
    gap: 16,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#ECE8E1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: 14,
  },
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 2,
    borderColor: '#C69B56',
  },
  verifiedBadgeCircle: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#157347',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileTextCol: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nameText: {
    fontSize: 17,
    fontFamily: 'PlayfairDisplay-Bold',
    fontWeight: '700',
    color: '#0F382C',
  },
  buyerTierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FAF7F0',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ECE8E1',
  },
  buyerTierText: {
    fontSize: 9.5,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#C69B56',
  },
  emailText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Medium',
    color: '#7E827A',
    marginTop: 2,
  },
  phoneText: {
    fontSize: 12.5,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#0F382C',
    marginTop: 3,
  },
  membershipBanner: {
    backgroundColor: '#0F382C',
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  memberBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  memberTierText: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    color: '#C69B56',
    letterSpacing: 0.8,
  },
  memberPerksText: {
    fontSize: 11.5,
    fontFamily: 'PlusJakartaSans-Medium',
    color: '#FFFFFF',
  },
  bentoSection: {
    gap: 6,
  },
  sectionKicker: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    color: '#C69B56',
    letterSpacing: 1,
    paddingLeft: 4,
  },
  menuContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ECE8E1',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0ECE4',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F3ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTextWrap: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 13.5,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#1A1D1A',
  },
  menuSub: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#7E827A',
    marginTop: 1,
  },
  badgePill: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginRight: 4,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  conciergeBanner: {
    backgroundColor: '#0F382C',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
    shadowColor: '#0F382C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  conciergeIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  conciergeTextCol: {
    flex: 1,
  },
  conciergeTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  conciergeSub: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Regular',
    marginTop: 2,
    lineHeight: 15,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF5F5',
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#FED7D7',
    marginTop: 6,
  },
  signOutText: {
    color: COLORS.badgeRed,
    fontSize: 13.5,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  versionText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Medium',
    color: '#8F948B',
    textAlign: 'center',
    marginTop: 14,
  },
});

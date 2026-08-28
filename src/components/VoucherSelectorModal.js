import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { useApp } from '../context/AppContext';
import { useNavigation } from '../navigation/NavigationContext';

export default function VoucherSelectorModal() {
  const { showToast } = useApp();
  const { activeModal, closeModal } = useNavigation();
  const visible = activeModal?.name === 'voucher-selector';
  const onSelectVoucher = activeModal?.params?.onSelectVoucher;

  const VOUCHERS = [
    {
      code: 'WELCOME10',
      title: '10% Welcome Discount',
      desc: 'Valid on first checkout on SellFastBuyFast marketplace',
      discountPct: 10,
      badge: 'POPULAR',
    },
    {
      code: 'SELLFAST5',
      title: '5% Curated Voucher',
      desc: 'Applicable across all tech, fashion, and beauty collections',
      discountPct: 5,
      badge: 'VERIFIED',
    },
    {
      code: 'FREESHIP',
      title: 'Free Standard Delivery',
      desc: 'Waives ₦ 4,500 standard logistics delivery fee',
      discountPct: 5,
      badge: 'LIMITED TIME',
    },
  ];

  if (!visible) return null;

  const handleApply = (voucher) => {
    if (onSelectVoucher) {
      onSelectVoucher(voucher);
    }
    showToast(`Voucher "${voucher.code}" applied!`);
    closeModal();
  };

  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={closeModal} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={COLORS.emeraldPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Available Vouchers & Offers</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {VOUCHERS.map((v) => (
            <View key={v.code} style={styles.voucherCard}>
              <View style={styles.cardHeader}>
                <View style={styles.badgePill}>
                  <Ionicons name="pricetag" size={12} color={COLORS.goldLight} />
                  <Text style={styles.badgeText}>{v.badge}</Text>
                </View>
                <Text style={styles.codeText}>{v.code}</Text>
              </View>

              <Text style={styles.voucherTitle}>{v.title}</Text>
              <Text style={styles.voucherDesc}>{v.desc}</Text>

              <TouchableOpacity
                style={styles.applyBtn}
                activeOpacity={0.85}
                onPress={() => handleApply(v)}
              >
                <Text style={styles.applyText}>Apply Voucher</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justify: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  closeBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.emeraldPrimary,
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  voucherCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justify: 'space-between',
    marginBottom: 10,
  },
  badgePill: {
    backgroundColor: COLORS.emeraldPrimary,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeText: {
    color: COLORS.goldLight,
    fontSize: 10,
    fontWeight: '800',
  },
  codeText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.goldDark,
    letterSpacing: 1,
  },
  voucherTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.emeraldPrimary,
  },
  voucherDesc: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    marginTop: 4,
    marginBottom: 16,
  },
  applyBtn: {
    backgroundColor: COLORS.emeraldPrimary,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justify: 'center',
  },
  applyText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
});

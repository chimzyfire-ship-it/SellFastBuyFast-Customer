import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { useNavigation } from '../../navigation/NavigationContext';

export default function ReturnStatusScreen() {
  const { currentRoute, goBack, navigate } = useNavigation();

  const returnId = currentRoute.params?.returnId || 'RET-8812';
  const orderId = currentRoute.params?.orderId || 'ORD-2026-7740';

  const STEPS = [
    { title: 'Return Requested', sub: 'Evidence uploaded & submitted', done: true },
    { title: 'Merchant Review', sub: 'Merchant approved return label', done: true },
    { title: 'Return Pickup', sub: 'GIG Logistics courier retrieved package', done: true },
    { title: 'Inspection Complete', sub: 'Item verified in warehouse', done: true },
    { title: 'Refund Dispatched', sub: 'Paystack refund initiated', done: true },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Ionicons name="arrow-back" size={22} color={COLORS.emeraldPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Return Timeline #{returnId}</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.statusBanner}>
          <Ionicons name="checkmark-circle" size={32} color={COLORS.goldAccent} />
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Return Approved & Refund Processed</Text>
            <Text style={styles.bannerSub}>Order reference: {orderId}</Text>
          </View>
        </View>

        <View style={styles.timelineCard}>
          <Text style={styles.cardTitle}>Case Lifecycle</Text>

          {STEPS.map((s, idx) => (
            <View key={idx} style={styles.stepRow}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.successGreen} />
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>{s.title}</Text>
                <Text style={styles.stepSub}>{s.sub}</Text>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.refundBtn}
          onPress={() => navigate('refund-status', { refundId: 'RFD-9901', returnId })}
        >
          <Ionicons name="wallet-outline" size={18} color={COLORS.white} />
          <Text style={styles.refundText}>View Refund Settlement Summary</Text>
        </TouchableOpacity>
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
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justify: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  backButton: {
    padding: 6,
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
  statusBanner: {
    backgroundColor: COLORS.emeraldPrimary,
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bannerTitle: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
  bannerSub: {
    color: COLORS.goldLight,
    fontSize: 12,
    marginTop: 2,
  },
  timelineCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    gap: 14,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.emeraldPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  stepSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  refundBtn: {
    backgroundColor: COLORS.emeraldPrimary,
    height: 50,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justify: 'center',
    gap: 8,
    marginTop: 10,
  },
  refundText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
});

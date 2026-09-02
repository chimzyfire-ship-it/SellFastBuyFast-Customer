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

export default function RefundStatusScreen() {
  const { currentRoute, goBack, navigate } = useNavigation();

  const refundId = currentRoute.params?.refundId;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Ionicons name="arrow-back" size={22} color={COLORS.emeraldPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{refundId ? `Refund #${refundId}` : 'Payment Adjustments'}</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name="wallet-outline" size={32} color={COLORS.goldAccent} />
          </View>
          <Text style={styles.amountText}>Not enabled</Text>
          <Text style={styles.statusLabel}>Payment adjustments are intentionally deferred</Text>
        </View>

        <View style={styles.detailsCard}>
          <Text style={styles.cardTitle}>Current Build Boundary</Text>
          <Text style={styles.rowLabel}>
            No provider request, refund reference, settlement amount, or completion date is fabricated in this build. Those records will appear only after the dedicated payment module is implemented and tested.
          </Text>
        </View>

        <TouchableOpacity style={styles.btn} onPress={() => navigate('orders')}>
          <Text style={styles.btnText}>Back to My Orders</Text>
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
  card: {
    backgroundColor: COLORS.emeraldPrimary,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.emeraldDark,
    alignItems: 'center',
    justify: 'center',
    marginBottom: 12,
  },
  amountText: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.goldLight,
  },
  statusLabel: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
  },
  detailsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    gap: 12,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.emeraldPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    justify: 'space-between',
  },
  rowLabel: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
  },
  rowVal: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  btn: {
    backgroundColor: COLORS.emeraldPrimary,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justify: 'center',
    marginTop: 10,
  },
  btnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
});

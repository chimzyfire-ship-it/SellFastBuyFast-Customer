import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { useApp } from '../../context/AppContext';
import { useNavigation } from '../../navigation/NavigationContext';

export default function ReturnStatusScreen() {
  const { returnRequests, isLoadingCustomerCare, refreshCustomerCare } = useApp();
  const { currentRoute, goBack, navigate } = useNavigation();

  const returnId = currentRoute.params?.returnId;
  const orderId = currentRoute.params?.orderId;
  const request = returnRequests.find((item) => item.id === returnId);

  if (!returnId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={goBack}>
            <Ionicons name="arrow-back" size={22} color={COLORS.emeraldPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Returns</Text>
          <View style={{ width: 22 }} />
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {isLoadingCustomerCare && returnRequests.length === 0 && (
            <ActivityIndicator color={COLORS.emeraldPrimary} />
          )}
          {returnRequests.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.returnCard}
              onPress={() => navigate('return-status', { returnId: item.id, orderId: item.orderId })}
              accessibilityRole="button"
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>Return #{item.id}</Text>
                <Text style={styles.stepSub}>Order #{item.orderId}</Text>
              </View>
              <Text style={styles.returnStatus}>{item.status.replace('_', ' ')}</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          ))}
          {!isLoadingCustomerCare && returnRequests.length === 0 && (
            <View style={styles.timelineCard}>
              <Text style={styles.stepTitle}>No return requests</Text>
              <Text style={styles.stepSub}>Eligible delivered orders can start a return from Order Details.</Text>
              <TouchableOpacity style={styles.listRefreshButton} onPress={() => refreshCustomerCare().catch(() => {})}>
                <Text style={styles.refundText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  const statusOrder = ['requested', 'approved', 'received', 'refund_initiated', 'completed'];
  const currentIndex = request ? statusOrder.indexOf(request.status) : -1;
  const steps = [
    { title: 'Return Requested', sub: 'Submitted for review', status: 'requested' },
    { title: 'Merchant Review', sub: 'Waiting for an approval decision', status: 'approved' },
    { title: 'Item Received', sub: 'Return arrival and inspection recorded', status: 'received' },
    { title: 'Payment Review', sub: 'Handled in the separate payment workflow', status: 'refund_initiated' },
    { title: 'Case Complete', sub: 'Return case closed', status: 'completed' },
  ];

  const bannerTitle = !request
    ? 'Return request unavailable'
    : request.status === 'rejected'
      ? 'Return request not approved'
      : request.status === 'completed'
        ? 'Return case complete'
        : 'Return request in review';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Ionicons name="arrow-back" size={22} color={COLORS.emeraldPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{returnId ? `Return Timeline #${returnId}` : 'Returns'}</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.statusBanner}>
          <Ionicons name="checkmark-circle" size={32} color={COLORS.goldAccent} />
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>{bannerTitle}</Text>
            <Text style={styles.bannerSub}>{orderId ? `Order reference: ${orderId}` : 'Open a return from an eligible order.'}</Text>
          </View>
        </View>

        <View style={styles.timelineCard}>
          <Text style={styles.cardTitle}>Case Lifecycle</Text>

          {steps.map((step, idx) => {
            const done = currentIndex >= idx;
            return (
            <View key={idx} style={styles.stepRow}>
              <Ionicons
                name={done ? 'checkmark-circle' : 'ellipse-outline'}
                size={20}
                color={done ? COLORS.successGreen : COLORS.textMuted}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepSub}>{step.sub}</Text>
              </View>
            </View>
          )})}
        </View>

        <View style={styles.pendingNote}>
          <Ionicons name="information-circle-outline" size={18} color={COLORS.emeraldPrimary} />
          <Text style={styles.pendingNoteText}>
            This page does not claim or initiate a refund. Payment adjustments will be added in the dedicated payment module.
          </Text>
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
  pendingNote: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  pendingNoteText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 12.5,
    lineHeight: 18,
  },
  returnCard: {
    minHeight: 76,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  returnStatus: {
    color: COLORS.emeraldPrimary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  listRefreshButton: {
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: COLORS.emeraldPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
});

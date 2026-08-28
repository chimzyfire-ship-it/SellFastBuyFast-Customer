import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { useApp } from '../../context/AppContext';
import { useNavigation } from '../../navigation/NavigationContext';

export default function CancelOrderScreen() {
  const { cancelOrder } = useApp();
  const { currentRoute, goBack } = useNavigation();

  const orderId = currentRoute.params?.orderId || 'ORD-2026-8891';
  const [selectedReason, setSelectedReason] = useState('Changed my mind');
  const [note, setNote] = useState('');

  const REASONS = [
    'Changed my mind',
    'Found a better price elsewhere',
    'Delivery time is too long',
    'Ordered wrong size or color variant',
  ];

  const handleSubmitCancel = () => {
    cancelOrder(orderId, selectedReason);
    goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Ionicons name="arrow-back" size={22} color={COLORS.emeraldPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cancel Order #{orderId}</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Select Cancellation Reason</Text>
        <Text style={styles.subTitle}>
          Under SellFastBuyFast v1 policy, cancellation is available prior to merchant fulfillment acceptance.
        </Text>

        {REASONS.map((r, idx) => (
          <TouchableOpacity
            key={idx}
            style={[
              styles.reasonCard,
              selectedReason === r && styles.selectedReasonCard,
            ]}
            onPress={() => setSelectedReason(r)}
          >
            <Ionicons
              name={selectedReason === r ? 'radio-button-on' : 'radio-button-off'}
              size={20}
              color={selectedReason === r ? COLORS.emeraldPrimary : COLORS.textMuted}
            />
            <Text style={styles.reasonText}>{r}</Text>
          </TouchableOpacity>
        ))}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Additional Context (Optional)</Text>
          <TextInput
            style={styles.textArea}
            multiline
            numberOfLines={4}
            placeholder="Tell us more about why you are cancelling..."
            placeholderTextColor={COLORS.textMuted}
            value={note}
            onChangeText={setNote}
          />
        </View>

        <TouchableOpacity
          style={styles.submitBtn}
          activeOpacity={0.85}
          onPress={handleSubmitCancel}
        >
          <Text style={styles.submitText}>Submit Order Cancellation</Text>
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
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.emeraldPrimary,
  },
  subTitle: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    marginTop: 4,
    marginBottom: 20,
    lineHeight: 18,
  },
  reasonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  selectedReasonCard: {
    borderColor: COLORS.emeraldPrimary,
    borderWidth: 1.5,
  },
  reasonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  inputGroup: {
    marginTop: 16,
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.emeraldPrimary,
  },
  textArea: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 14,
    color: COLORS.textPrimary,
    textAlignVertical: 'top',
    height: 100,
  },
  submitBtn: {
    backgroundColor: COLORS.badgeRed,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justify: 'center',
    marginTop: 28,
  },
  submitText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
  },
});

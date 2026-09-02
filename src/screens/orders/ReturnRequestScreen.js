import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { useApp } from '../../context/AppContext';
import { useNavigation } from '../../navigation/NavigationContext';

export default function ReturnRequestScreen() {
  const { createReturnRequest } = useApp();
  const { currentRoute, goBack, navigate } = useNavigation();

  const orderId = currentRoute.params?.orderId;

  const [reason, setReason] = useState('Damaged or defective item');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitReturn = async () => {
    if (!orderId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const request = await createReturnRequest(orderId, reason, description);
      navigate('return-status', { returnId: request.id, orderId });
    } catch {
      // AppContext shows a recoverable error toast.
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Ionicons name="arrow-back" size={22} color={COLORS.emeraldPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Return Request</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>{orderId ? `Request Return for Order #${orderId}` : 'Select an order to request a return'}</Text>
        <Text style={styles.subTitle}>
          Items eligible within 7 days of delivery under SellFastBuyFast Buyer Protection Policy.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Reason for Return</Text>
          {['Damaged or defective item', 'Item not as described', 'Received wrong item or size'].map((r, idx) => (
            <TouchableOpacity
              key={idx}
              style={[styles.radioRow, reason === r && styles.radioRowActive]}
              onPress={() => setReason(r)}
            >
              <Ionicons
                name={reason === r ? 'radio-button-on' : 'radio-button-off'}
                size={18}
                color={reason === r ? COLORS.emeraldPrimary : COLORS.textMuted}
              />
              <Text style={styles.radioText}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>What happened?</Text>
          <TextInput
            style={styles.descriptionInput}
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={900}
            placeholder="Add details that will help the merchant and support team review your request."
            placeholderTextColor={COLORS.textMuted}
          />
          <Text style={styles.paymentBoundaryText}>
            Any payment adjustment is reviewed separately after the returned item is inspected.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.submitBtn}
          activeOpacity={0.85}
          onPress={handleSubmitReturn}
          disabled={!orderId || isSubmitting}
          accessibilityRole="button"
          accessibilityState={{ disabled: !orderId || isSubmitting, busy: isSubmitting }}
        >
          {isSubmitting
            ? <ActivityIndicator color={COLORS.white} />
            : <Text style={styles.submitText}>Submit Return Request</Text>}
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.emeraldPrimary,
  },
  subTitle: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    marginTop: -8,
    lineHeight: 18,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.emeraldPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  radioRowActive: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 10,
    paddingHorizontal: 8,
  },
  radioText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  uploadBox: {
    height: 80,
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justify: 'center',
    gap: 6,
    paddingHorizontal: 16,
  },
  uploadText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  descriptionInput: {
    minHeight: 110,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    color: COLORS.textPrimary,
    textAlignVertical: 'top',
    fontSize: 13.5,
  },
  paymentBoundaryText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },
  submitBtn: {
    backgroundColor: COLORS.emeraldPrimary,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justify: 'center',
    marginTop: 10,
  },
  submitText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
  },
});

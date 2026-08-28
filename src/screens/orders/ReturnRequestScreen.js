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

export default function ReturnRequestScreen() {
  const { showToast } = useApp();
  const { currentRoute, goBack, navigate } = useNavigation();

  const orderId = currentRoute.params?.orderId || 'ORD-2026-7740';

  const [reason, setReason] = useState('Damaged or defective item');
  const [refundMethod, setRefundMethod] = useState('original');
  const [description, setDescription] = useState('');
  const [evidenceUploaded, setEvidenceUploaded] = useState(true);

  const handleSubmitReturn = () => {
    showToast('Return request submitted for merchant review');
    navigate('return-status', { returnId: 'RET-8812', orderId });
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
        <Text style={styles.sectionTitle}>Request Return for Order #{orderId}</Text>
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
          <Text style={styles.cardLabel}>Photo / Video Evidence</Text>
          <TouchableOpacity
            style={styles.uploadBox}
            onPress={() => {
              setEvidenceUploaded(true);
              showToast('Photo evidence attached');
            }}
          >
            <Ionicons
              name={evidenceUploaded ? 'checkmark-circle' : 'camera-outline'}
              size={28}
              color={evidenceUploaded ? COLORS.successGreen : COLORS.emeraldPrimary}
            />
            <Text style={styles.uploadText}>
              {evidenceUploaded ? '1 Image Evidence Uploaded (IMG_008.jpg)' : 'Upload clear photos of defect/packaging'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Refund Destination</Text>
          <TouchableOpacity
            style={[styles.radioRow, refundMethod === 'original' && styles.radioRowActive]}
            onPress={() => setRefundMethod('original')}
          >
            <Ionicons
              name={refundMethod === 'original' ? 'radio-button-on' : 'radio-button-off'}
              size={18}
              color={refundMethod === 'original' ? COLORS.emeraldPrimary : COLORS.textMuted}
            />
            <Text style={styles.radioText}>Paystack Refund to Original Card / Bank</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.submitBtn}
          activeOpacity={0.85}
          onPress={handleSubmitReturn}
        >
          <Text style={styles.submitText}>Submit Return Request</Text>
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

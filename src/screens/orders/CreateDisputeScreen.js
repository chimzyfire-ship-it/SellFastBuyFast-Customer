import React, { useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { useApp } from '../../context/AppContext';
import { useNavigation } from '../../navigation/NavigationContext';

export default function CreateDisputeScreen() {
  const { createDispute } = useApp();
  const { currentRoute, goBack, navigate } = useNavigation();
  const orderId = currentRoute.params?.orderId;
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    if (!orderId || reason.trim().length < 8 || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await createDispute(orderId, reason.trim());
      navigate('order-detail', { orderId });
    } catch {
      // AppContext displays the recoverable API error.
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={22} color={COLORS.emeraldPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Open a Dispute</Text>
        <View style={{ width: 38 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.infoCard}>
          <Ionicons name="shield-outline" size={22} color={COLORS.emeraldPrimary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>{orderId ? `Order #${orderId}` : 'Order unavailable'}</Text>
            <Text style={styles.infoBody}>Describe the unresolved issue clearly. Opening a dispute pauses normal order completion for marketplace review.</Text>
          </View>
        </View>
        <View style={styles.formCard}>
          <Text style={styles.label}>What needs marketplace review?</Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            multiline
            maxLength={2000}
            style={styles.input}
            placeholder="Include the item, delivery, or merchant issue and the outcome you are requesting."
            placeholderTextColor={COLORS.textMuted}
          />
          <Text style={styles.counter}>{reason.length}/2000</Text>
        </View>
        <TouchableOpacity
          style={[styles.submitButton, (!orderId || reason.trim().length < 8 || isSubmitting) && styles.disabled]}
          onPress={submit}
          disabled={!orderId || reason.trim().length < 8 || isSubmitting}
          accessibilityRole="button"
          accessibilityState={{ disabled: !orderId || reason.trim().length < 8 || isSubmitting, busy: isSubmitting }}
        >
          {isSubmitting ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.submitText}>Submit Dispute</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: {
    height: 54,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  backButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: COLORS.emeraldPrimary, fontSize: 16, fontWeight: '700' },
  content: { padding: 20, gap: 16, paddingBottom: 80 },
  infoCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  infoTitle: { color: COLORS.emeraldPrimary, fontSize: 14, fontWeight: '700' },
  infoBody: { color: COLORS.textSecondary, fontSize: 12.5, lineHeight: 18, marginTop: 4 },
  formCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.borderLight },
  label: { color: COLORS.emeraldPrimary, fontSize: 13, fontWeight: '700', marginBottom: 10 },
  input: {
    minHeight: 150,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    color: COLORS.textPrimary,
    textAlignVertical: 'top',
    fontSize: 13.5,
  },
  counter: { color: COLORS.textMuted, fontSize: 11, textAlign: 'right', marginTop: 6 },
  submitButton: { minHeight: 52, borderRadius: 26, backgroundColor: COLORS.emeraldPrimary, alignItems: 'center', justifyContent: 'center' },
  submitText: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
  disabled: { opacity: 0.5 },
});

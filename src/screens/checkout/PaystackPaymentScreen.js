import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useApp } from '../../context/AppContext';
import { useNavigation } from '../../navigation/NavigationContext';
import { createCheckout, initializePayment, redirectUrl } from '../../services/checkoutService';

WebBrowser.maybeCompleteAuthSession();
const PAYMENTS_DEFERRED = process.env.EXPO_PUBLIC_PAYMENT_MODE !== 'paystack';

export default function PaystackPaymentScreen() {
  const { user, cart, addresses, selectedAddressId } = useApp();
  const { activeModal, closeModal, navigate } = useNavigation();
  const visible = activeModal?.name === 'checkout-paystack' || activeModal?.name === 'paystack-gateway';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pendingPayment, setPendingPayment] = useState(null);

  useEffect(() => {
    if (!visible) {
      setBusy(false);
      setError('');
      setPendingPayment(null);
    }
  }, [visible]);

  if (!visible) return null;

  const estimatedTotal = activeModal?.params?.totalAmount;
  const address = addresses.find((item) => item.id === selectedAddressId) || addresses[0];

  const continueVerification = (payment) => {
    closeModal();
    navigate('checkout-processing', {
      orderId: payment.orderId,
      paymentRef: payment.reference,
    });
  };

  const startPayment = async () => {
    if (busy) return;
    if (PAYMENTS_DEFERRED) {
      setError('Live payment is intentionally disabled. It will be completed as a separate integration module.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (!address) throw new Error('Select a delivery address before payment.');
      const checkout = await createCheckout(cart, address);
      let authorizationUrl = checkout.paymentAuthorizationUrl;
      let reference = checkout.reference;
      if (!authorizationUrl) {
        const initialized = await initializePayment(checkout.orderId);
        authorizationUrl = initialized.authorizationUrl;
        reference = initialized.reference;
      }

      const payment = { orderId: checkout.orderId, reference, authorizationUrl };
      setPendingPayment(payment);
      const result = await WebBrowser.openAuthSessionAsync(authorizationUrl, redirectUrl);
      if (result.type === 'success') {
        continueVerification(payment);
      } else {
        setError('The Paystack window closed before confirmation. You can safely check the payment status or try again.');
      }
    } catch (err) {
      setError(err.message || 'Unable to start Paystack checkout.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={closeModal} disabled={busy}>
            <Ionicons name="close" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{PAYMENTS_DEFERRED ? 'Payment Demo' : 'Secure Paystack Checkout'}</Text>
          <View style={styles.lockBadge}>
            <Ionicons name="lock-closed" size={14} color="#C69B56" />
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.amountCard}>
            <Text style={styles.eyebrow}>ORDER ESTIMATE</Text>
            <Text style={styles.amount}>₦ {Number(estimatedTotal || 0).toLocaleString()}</Text>
            <Text style={styles.email}>{user?.email}</Text>
          </View>

          <View style={styles.providerCard}>
            <View style={styles.providerIcon}>
              <Ionicons name="open-outline" size={24} color="#0F382C" />
            </View>
            <View style={styles.providerCopy}>
              <Text style={styles.providerTitle}>{PAYMENTS_DEFERRED ? 'Live payment is deferred' : 'Payment opens on Paystack'}</Text>
              <Text style={styles.providerText}>
                {PAYMENTS_DEFERRED
                  ? 'This build does not collect payment details, create a paid order, or contact a payment provider.'
                  : "Card, bank transfer, and USSD details are entered only on Paystack's hosted page. SellFastBuyFast never receives your card number or PIN."}
              </Text>
            </View>
          </View>

          <View style={styles.noteCard}>
            <Ionicons name="calculator-outline" size={18} color="#B58105" />
            <Text style={styles.noteText}>
              {PAYMENTS_DEFERRED
                ? 'You can continue reviewing the rest of the marketplace while the payment module remains isolated.'
                : 'The server validates stock, delivery fee, and the final amount before creating the payment reference.'}
            </Text>
          </View>

          {!!error && (
            <View style={styles.errorCard}>
              <Ionicons name="alert-circle-outline" size={18} color="#B42318" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.payButton, (busy || PAYMENTS_DEFERRED) && styles.disabled]}
            onPress={startPayment}
            disabled={busy || PAYMENTS_DEFERRED}
            accessibilityRole="button"
            accessibilityState={{ disabled: busy || PAYMENTS_DEFERRED, busy }}
          >
            {busy ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="shield-checkmark" size={19} color="#C69B56" />
                <Text style={styles.payButtonText}>
                  {PAYMENTS_DEFERRED ? 'Payment Setup Deferred' : pendingPayment ? 'Reopen Paystack' : 'Continue to Paystack'}
                </Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>

          {pendingPayment && (
            <TouchableOpacity style={styles.verifyButton} onPress={() => continueVerification(pendingPayment)} disabled={busy}>
              <Text style={styles.verifyButtonText}>Check payment status</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F6F0' },
  header: { height: 58, paddingHorizontal: 16, backgroundColor: '#071A14', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  closeButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#FFFFFF', fontSize: 14, fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700' },
  lockBadge: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: 'rgba(198,155,86,0.45)', alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, padding: 20, gap: 14, justifyContent: 'center' },
  amountCard: { backgroundColor: '#0F382C', borderRadius: 24, padding: 24, alignItems: 'center' },
  eyebrow: { color: '#C69B56', fontSize: 10, letterSpacing: 1.2, fontFamily: 'PlusJakartaSans-ExtraBold' },
  amount: { color: '#FFFFFF', fontSize: 32, fontFamily: 'PlusJakartaSans-ExtraBold', fontWeight: '800', marginVertical: 6 },
  email: { color: 'rgba(255,255,255,0.75)', fontSize: 12 },
  providerCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#E8E2D8', flexDirection: 'row', gap: 14 },
  providerIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#F3EFE7', alignItems: 'center', justifyContent: 'center' },
  providerCopy: { flex: 1 },
  providerTitle: { color: '#0F382C', fontSize: 15, fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700', marginBottom: 5 },
  providerText: { color: '#5C6057', fontSize: 12, lineHeight: 18 },
  noteCard: { backgroundColor: '#FFF9E9', borderRadius: 16, padding: 14, flexDirection: 'row', gap: 10, borderWidth: 1, borderColor: '#F0DFC0' },
  noteText: { flex: 1, color: '#6B5316', fontSize: 11.5, lineHeight: 17 },
  errorCard: { backgroundColor: '#FEF3F2', borderRadius: 14, padding: 12, flexDirection: 'row', gap: 8, borderWidth: 1, borderColor: '#FECACA' },
  errorText: { flex: 1, color: '#B42318', fontSize: 11.5, lineHeight: 17 },
  payButton: { height: 54, borderRadius: 27, backgroundColor: '#0F382C', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  disabled: { opacity: 0.65 },
  payButtonText: { color: '#FFFFFF', fontSize: 14, fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700' },
  verifyButton: { height: 48, borderRadius: 24, borderWidth: 1, borderColor: '#0F382C', alignItems: 'center', justifyContent: 'center' },
  verifyButtonText: { color: '#0F382C', fontSize: 13, fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700' },
});

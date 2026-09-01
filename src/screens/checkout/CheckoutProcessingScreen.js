import React, { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { useNavigation } from '../../navigation/NavigationContext';
import { verifyPayment } from '../../services/checkoutService';
import { getOrder } from '../../services/orderService';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default function CheckoutProcessingScreen() {
  const { clearCart, refreshOrders } = useApp();
  const { currentRoute, reset } = useNavigation();
  const { paymentRef, orderId } = currentRoute.params || {};
  const [statusText, setStatusText] = useState('Confirming payment with Paystack...');

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!paymentRef || !orderId) {
        reset('checkout-failed', { reason: 'Payment reference is missing.' });
        return;
      }

      for (let attempt = 0; attempt < 20 && !cancelled; attempt += 1) {
        try {
          const result = await verifyPayment(paymentRef);
          if (result.status === 'payment_confirmed') {
            setStatusText('Payment verified. Preparing your order...');
            const order = await getOrder(orderId);
            clearCart();
            await refreshOrders();
            if (!cancelled) reset('checkout-confirmation', { orderId, order });
            return;
          }
          if (result.status === 'cancelled') {
            reset('checkout-failed', { reason: 'The stock reservation expired. Any captured payment has been queued for refund.' });
            return;
          }
          if (result.status === 'failed' || result.status === 'abandoned') {
            reset('checkout-failed', { reason: 'Paystack did not complete this payment.' });
            return;
          }
          setStatusText('Payment is still pending. Checking again...');
        } catch (err) {
          setStatusText(err.message || 'Unable to confirm payment. Retrying...');
        }
        await wait(3_000);
      }

      if (!cancelled) {
        reset('checkout-failed', {
          reason: 'Payment confirmation is taking longer than expected. Do not pay again; check My Orders shortly.',
        });
      }
    };
    void run();
    return () => { cancelled = true; };
  }, [paymentRef, orderId]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <ActivityIndicator size="large" color="#C69B56" />
        </View>
        <Text style={styles.title}>Verifying Your Payment</Text>
        <Text style={styles.status}>{statusText}</Text>
        <View style={styles.referenceCard}>
          <Ionicons name="receipt-outline" size={17} color="#C69B56" />
          <View style={styles.referenceCopy}>
            <Text style={styles.referenceLabel}>PAYSTACK REFERENCE</Text>
            <Text style={styles.referenceValue}>{paymentRef}</Text>
          </View>
        </View>
        <Text style={styles.notice}>Keep this screen open. Order confirmation is shown only after server verification.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#071A14' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 26 },
  iconWrap: { width: 92, height: 92, borderRadius: 46, backgroundColor: '#0F382C', borderWidth: 1, borderColor: '#C69B56', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  title: { color: '#FFFFFF', fontSize: 25, fontFamily: 'PlayfairDisplay-Bold', fontWeight: '700', textAlign: 'center' },
  status: { color: 'rgba(255,255,255,0.78)', fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 9, minHeight: 40 },
  referenceCard: { width: '100%', backgroundColor: '#0F382C', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(198,155,86,0.35)', padding: 16, flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 24 },
  referenceCopy: { flex: 1 },
  referenceLabel: { color: '#C69B56', fontSize: 9, letterSpacing: 1, fontFamily: 'PlusJakartaSans-ExtraBold' },
  referenceValue: { color: '#FFFFFF', fontSize: 12, fontFamily: 'PlusJakartaSans-Bold', marginTop: 3 },
  notice: { color: 'rgba(255,255,255,0.55)', fontSize: 10.5, lineHeight: 16, textAlign: 'center', marginTop: 18 },
});

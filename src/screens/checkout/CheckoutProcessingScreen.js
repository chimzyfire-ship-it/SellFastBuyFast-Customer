import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, ImageBackground, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { useNavigation } from '../../navigation/NavigationContext';
import { verifyPayment } from '../../services/checkoutService';
import { getOrder } from '../../services/orderService';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default function CheckoutProcessingScreen() {
  const { currentRoute } = useNavigation();
  return currentRoute.params?.demo ? <DemoCheckoutProcessing /> : <LiveCheckoutProcessing />;
}

function DemoCheckoutProcessing() {
  const { addDemoOrder, clearCart } = useApp();
  const { currentRoute, reset } = useNavigation();
  const { paymentRef, orderId, order } = currentRoute.params || {};
  const [statusText, setStatusText] = useState('Securing your demo checkout...');
  const pulse = useRef(new Animated.Value(0)).current;
  const shieldScale = useRef(new Animated.Value(0.85)).current;
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 1500, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 0, useNativeDriver: true }),
    ]));
    pulseLoop.start();
    Animated.spring(shieldScale, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }).start();
    Animated.timing(progress, { toValue: 1, duration: 2800, easing: Easing.inOut(Easing.quad), useNativeDriver: false }).start();
    const middle = setTimeout(() => setStatusText('Confirming the demo order and delivery details...'), 1100);
    const complete = setTimeout(() => {
      addDemoOrder(order);
      clearCart();
      reset('checkout-confirmation', { orderId, order });
    }, 2900);
    return () => {
      pulseLoop.stop();
      clearTimeout(middle);
      clearTimeout(complete);
    };
  }, [orderId, paymentRef]);

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.35] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0.7, 0.35, 0] });
  const progressWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <ImageBackground source={require('../../../assets/auth-bg.jpg')} style={demoStyles.background} resizeMode="cover">
      <SafeAreaView style={demoStyles.container}>
        <View style={demoStyles.content}>
          <View style={demoStyles.pulseArea}>
            <Animated.View style={[demoStyles.ring, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]} />
            <Animated.View style={[demoStyles.shield, { transform: [{ scale: shieldScale }] }]}>
              <Ionicons name="shield-checkmark" size={38} color="#C69B56" />
            </Animated.View>
          </View>
          <Text style={demoStyles.title}>Securing Your Order</Text>
          <Text style={demoStyles.status}>{statusText}</Text>
          <View style={demoStyles.progressTrack}>
            <Animated.View style={[demoStyles.progressFill, { width: progressWidth }]} />
          </View>
          <View style={demoStyles.referenceCard}>
            <Ionicons name="receipt-outline" size={17} color="#C69B56" />
            <View>
              <Text style={demoStyles.referenceLabel}>DEMO PAYMENT REFERENCE</Text>
              <Text style={demoStyles.referenceValue}>{paymentRef}</Text>
            </View>
          </View>
          <Text style={demoStyles.notice}>Demo mode only — no payment is collected or order is submitted.</Text>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

function LiveCheckoutProcessing() {
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

const demoStyles = StyleSheet.create({
  background: { flex: 1, width: '100%', height: '100%', backgroundColor: '#071A14' },
  container: { flex: 1, backgroundColor: 'rgba(7,26,20,0.82)' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 26 },
  pulseArea: { width: 140, height: 140, alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  ring: { position: 'absolute', width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(198,155,86,0.3)', borderWidth: 1.5, borderColor: '#C69B56' },
  shield: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#0F382C', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#C69B56', elevation: 8 },
  title: { color: '#FFFFFF', fontSize: 25, fontFamily: 'PlayfairDisplay-Bold', fontWeight: '700', textAlign: 'center' },
  status: { color: 'rgba(255,255,255,0.88)', fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 9, minHeight: 40 },
  progressTrack: { width: '100%', height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.16)', marginTop: 20 },
  progressFill: { height: '100%', backgroundColor: '#C69B56' },
  referenceCard: { width: '100%', backgroundColor: '#0F382C', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(198,155,86,0.35)', padding: 16, flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 24 },
  referenceLabel: { color: '#C69B56', fontSize: 9, letterSpacing: 1, fontFamily: 'PlusJakartaSans-ExtraBold' },
  referenceValue: { color: '#FFFFFF', fontSize: 12, fontFamily: 'PlusJakartaSans-Bold', marginTop: 3 },
  notice: { color: 'rgba(255,255,255,0.65)', fontSize: 10.5, lineHeight: 16, textAlign: 'center', marginTop: 18 },
});

import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  Animated,
  Easing,
  ImageBackground,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { useApp } from '../../context/AppContext';
import { useNavigation } from '../../navigation/NavigationContext';

export default function CheckoutProcessingScreen() {
  const { createOrder } = useApp();
  const { currentRoute, reset } = useNavigation();

  const paymentRef = currentRoute.params?.paymentRef || 'PSTK-' + Math.floor(100000 + Math.random() * 900000);

  const [statusText, setStatusText] = useState('Securing Paystack Escrow Channel...');

  // Animation values
  const pulseAnim1 = useRef(new Animated.Value(0)).current;
  const pulseAnim2 = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Radar Pulse Loop 1
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim1, {
          toValue: 1,
          duration: 1800,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim1, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 2. Radar Pulse Loop 2 (Delayed)
    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim2, {
            toValue: 1,
            duration: 1800,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim2, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, 600);

    // 3. Center Icon Spring
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 6,
      tension: 40,
      useNativeDriver: true,
    }).start();

    // 4. Linear Progress Bar
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 2600,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: false,
    }).start();

    // Staggered status messages
    const t1 = setTimeout(() => {
      setStatusText('Authorizing Naira Payment with Central Switch...');
    }, 900);

    const t2 = setTimeout(() => {
      setStatusText('Locking Merchant Inventory & Courier Dispatch...');
    }, 1800);

    const t3 = setTimeout(() => {
      const newOrder = createOrder(paymentRef);
      reset('checkout-confirmation', { orderId: newOrder.id, order: newOrder });
    }, 2800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const pulseScale1 = pulseAnim1.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.4],
  });

  const pulseOpacity1 = pulseAnim1.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0.7, 0.4, 0],
  });

  const pulseScale2 = pulseAnim2.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.4],
  });

  const pulseOpacity2 = pulseAnim2.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0.7, 0.4, 0],
  });

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <ImageBackground
      source={require('../../../assets/auth-bg.jpg')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          {/* Animated Radar Pulse Container */}
          <View style={styles.pulseContainer}>
            <Animated.View
              style={[
                styles.radarRing,
                {
                  transform: [{ scale: pulseScale1 }],
                  opacity: pulseOpacity1,
                },
              ]}
            />
            <Animated.View
              style={[
                styles.radarRing,
                {
                  transform: [{ scale: pulseScale2 }],
                  opacity: pulseOpacity2,
                },
              ]}
            />

            {/* Central Shield Icon Badge */}
            <Animated.View style={[styles.centerShield, { transform: [{ scale: scaleAnim }] }]}>
              <Ionicons name="shield-checkmark" size={38} color="#C69B56" />
            </Animated.View>
          </View>

          {/* Processing Titles */}
          <Text style={styles.titleText}>Securing Your Order</Text>
          <Text style={styles.statusMessageText}>{statusText}</Text>

          {/* Progress Track */}
          <View style={styles.progressBarTrack}>
            <Animated.View style={[styles.progressBarFill, { width: progressWidth }]} />
          </View>

          {/* Reference & Security Guarantee */}
          <View style={styles.escrowCard}>
            <View style={styles.escrowHeader}>
              <Ionicons name="lock-closed" size={14} color="#C69B56" />
              <Text style={styles.escrowTitle}>Paystack 256-Bit Escrow Vault</Text>
            </View>
            <Text style={styles.escrowRef}>Payment Ref: {paymentRef}</Text>
            <Text style={styles.escrowNote}>
              Funds remain secured in neutral escrow until you inspect and confirm your package delivery.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#072019',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 26,
  },
  pulseContainer: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 32,
  },
  radarRing: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(198, 155, 86, 0.35)',
    borderWidth: 1.5,
    borderColor: '#C69B56',
  },
  centerShield: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#0F382C',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#C69B56',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  titleText: {
    fontSize: 25,
    fontFamily: 'PlayfairDisplay-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  statusMessageText: {
    fontSize: 13.5,
    fontFamily: 'PlusJakartaSans-Medium',
    color: 'rgba(255, 255, 255, 0.92)',
    textAlign: 'center',
    minHeight: 38,
    paddingHorizontal: 16,
    lineHeight: 19,
  },
  progressBarTrack: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 18,
    marginBottom: 32,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#C69B56',
    borderRadius: 3,
  },
  escrowCard: {
    width: '100%',
    backgroundColor: 'rgba(15, 56, 44, 0.85)',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(198, 155, 86, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  escrowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  escrowTitle: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    color: '#C69B56',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  escrowRef: {
    fontSize: 12.5,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  escrowNote: {
    fontSize: 11.5,
    fontFamily: 'PlusJakartaSans-Regular',
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 16,
  },
});

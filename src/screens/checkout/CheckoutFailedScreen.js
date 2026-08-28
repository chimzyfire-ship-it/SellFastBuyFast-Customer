import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { useNavigation } from '../../navigation/NavigationContext';

export default function CheckoutFailedScreen() {
  const { currentRoute, navigate } = useNavigation();
  const reason = currentRoute.params?.reason || 'Transaction was canceled or could not be authorized by your issuing bank.';

  // Animation values
  const scaleShieldAnim = useRef(new Animated.Value(0)).current;
  const fadeContentAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleShieldAnim, {
      toValue: 1,
      friction: 5,
      tension: 45,
      useNativeDriver: true,
    }).start();

    Animated.timing(fadeContentAnim, {
      toValue: 1,
      duration: 450,
      delay: 150,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Animated Shield Warning */}
        <Animated.View
          style={[
            styles.iconCircleOuter,
            { transform: [{ scale: scaleShieldAnim }] },
          ]}
        >
          <View style={styles.iconCircleInner}>
            <Ionicons name="close" size={36} color="#FFFFFF" />
          </View>
        </Animated.View>

        <Animated.View style={[styles.contentBlock, { opacity: fadeContentAnim }]}>
          <Text style={styles.titleText}>Payment Not Completed</Text>
          <Text style={styles.subtitleText}>
            No funds were debited from your account. Your shopping bag items remain safely preserved.
          </Text>

          {/* Provider / Gateway Explanation Card */}
          <View style={styles.reasonCard}>
            <View style={styles.reasonHeader}>
              <Ionicons name="alert-circle-outline" size={16} color={COLORS.badgeRed} />
              <Text style={styles.reasonLabel}>PROVIDER NOTICE</Text>
            </View>
            <Text style={styles.reasonText}>{reason}</Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsColumn}>
            <TouchableOpacity
              style={styles.retryBtn}
              activeOpacity={0.88}
              onPress={() => navigate('checkout-review')}
            >
              <Ionicons name="refresh" size={17} color="#FFFFFF" />
              <Text style={styles.retryBtnText}>Retry Checkout Payment</Text>
              <View style={styles.btnIconBadge}>
                <Ionicons name="arrow-forward" size={13} color="#0F382C" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.bagBtn}
              activeOpacity={0.8}
              onPress={() => navigate('bag')}
            >
              <Text style={styles.bagBtnText}>Return to Shopping Bag</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleOuter: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: '#FDF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#E53E3E',
    shadowColor: '#E53E3E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  iconCircleInner: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#E53E3E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentBlock: {
    width: '100%',
    alignItems: 'center',
  },
  titleText: {
    fontSize: 24,
    fontFamily: 'PlayfairDisplay-Bold',
    fontWeight: '700',
    color: '#0F382C',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 13.5,
    fontFamily: 'PlusJakartaSans-Medium',
    color: '#5C6057',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  reasonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    width: '100%',
    marginVertical: 22,
    borderWidth: 1,
    borderColor: '#FED7D7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  reasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  reasonLabel: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    color: COLORS.badgeRed,
    letterSpacing: 1,
  },
  reasonText: {
    fontSize: 12.5,
    fontFamily: 'PlusJakartaSans-Medium',
    color: '#4A4E46',
    lineHeight: 18,
  },
  actionsColumn: {
    width: '100%',
    gap: 10,
  },
  retryBtn: {
    backgroundColor: '#0F382C',
    height: 52,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#0F382C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  btnIconBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#C69B56',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  bagBtn: {
    backgroundColor: '#FFFFFF',
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ECE8E1',
  },
  bagBtnText: {
    color: '#0F382C',
    fontSize: 13.5,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
});

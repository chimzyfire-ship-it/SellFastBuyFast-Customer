import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { useApp } from '../../context/AppContext';
import { useNavigation } from '../../navigation/NavigationContext';
import { getOrder } from '../../services/orderService';

export default function OrderTrackingScreen() {
  const { orders, showToast } = useApp();
  const { currentRoute, goBack, navigate } = useNavigation();

  const orderId = currentRoute.params?.orderId;
  const summary = orders.find((item) => item.id === orderId);
  const [order, setOrder] = useState(summary);

  useEffect(() => {
    let active = true;
    if (orderId) {
      void getOrder(orderId).then((detail) => {
        if (active) setOrder(detail);
      }).catch(() => {});
    }
    return () => { active = false; };
  }, [orderId]);

  // Active Radar Pulse Animation
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1600,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.2],
  });

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.8, 0.4, 0],
  });

  const statusRank = {
    pending_payment: 0,
    payment_confirmed: 1,
    processing: 2,
    in_transit: 3,
    delivered: 4,
    completed: 5,
  };
  const currentRank = statusRank[order?.apiStatus] ?? -1;
  const statusTime = (status) => {
    const event = order?.statusEvents?.find((item) => item.toStatus === status);
    return event ? new Date(event.createdAt).toLocaleString() : 'Pending';
  };
  const STEPS = [
    { title: 'Order Created', sub: 'Order record created', status: 'pending_payment' },
    { title: 'Ready for Fulfilment', sub: 'Order cleared for merchant action', status: 'payment_confirmed' },
    { title: 'Merchant Accepted', sub: 'Merchant is preparing the order', status: 'processing' },
    { title: 'Handed to Carrier', sub: order?.carrierName ? `Carrier: ${order.carrierName}` : 'Carrier details pending', status: 'in_transit' },
    { title: 'Delivered', sub: 'Delivery evidence recorded', status: 'delivered' },
  ].map((step) => ({
    ...step,
    done: currentRank >= statusRank[step.status],
    active: currentRank === statusRank[step.status],
    time: statusTime(step.status),
  }));

  const handleCopyWaybill = () => {
    if (order?.trackingNumber) showToast && showToast(`Waybill ${order.trackingNumber} copied`);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={goBack}
          activeOpacity={0.75}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.emeraldPrimary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Live Logistics Tracking</Text>
          <Text style={styles.headerSub}>{order?.trackingNumber ? `Waybill #${order.trackingNumber}` : 'Waybill pending'}</Text>
        </View>

        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={handleCopyWaybill}
          activeOpacity={0.75}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="copy-outline" size={18} color={COLORS.emeraldPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Logistics Carrier Hero Card */}
        <View style={styles.carrierCard}>
          <View style={styles.carrierTopRow}>
            <View style={styles.carrierIconWrapper}>
              <Ionicons name="car-sport" size={20} color="#C69B56" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.carrierKicker}>OFFICIAL LOGISTICS PARTNER</Text>
              <Text style={styles.carrierName}>{order?.carrierName || 'Carrier not assigned'}</Text>
              <Text style={styles.waybillText}>{order?.trackingNumber ? `Waybill: ${order.trackingNumber}` : 'Tracking details will appear after dispatch.'}</Text>
            </View>

            <TouchableOpacity
              style={styles.contactBtn}
              activeOpacity={0.8}
              onPress={() => navigate('create-ticket', { orderId: order?.id })}
            >
              <Ionicons name="call" size={14} color="#FFFFFF" />
              <Text style={styles.contactBtnText}>Contact</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Live ETA Banner */}
        <View style={styles.etaBanner}>
          <View style={styles.etaIconCircle}>
            <Ionicons name="time" size={18} color="#0F382C" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.etaTitle}>{order?.apiStatus === 'in_transit' ? 'Shipment in transit' : 'Shipment status'}</Text>
            <Text style={styles.etaSub}>{order?.trackingNumber ? 'Use the carrier waybill for the latest location.' : 'Dispatch and tracking information are pending.'}</Text>
          </View>
          <View style={styles.livePulsePill}>
            <View style={styles.liveGreenDot} />
            <Text style={styles.livePillText}>SERVER</Text>
          </View>
        </View>

        {/* Stepper Timeline Card */}
        <View style={styles.timelineCard}>
          <Text style={styles.timelineTitle}>Fulfillment & Transit Milestones</Text>

          <View style={styles.milestoneList}>
            {STEPS.map((step, idx) => {
              const isLast = idx === STEPS.length - 1;

              return (
                <View key={idx} style={styles.timelineRow}>
                  {/* Left Column: Node & Connector */}
                  <View style={styles.timelineCol}>
                    {step.active ? (
                      <View style={styles.activeNodeContainer}>
                        <Animated.View
                          style={[
                            styles.activePulseRing,
                            {
                              transform: [{ scale: pulseScale }],
                              opacity: pulseOpacity,
                            },
                          ]}
                        />
                        <View style={styles.activeNodeCore}>
                          <Ionicons name="navigate" size={11} color="#FFFFFF" />
                        </View>
                      </View>
                    ) : (
                      <View style={[styles.dot, step.done && styles.dotDone]}>
                        <Ionicons
                          name={step.done ? 'checkmark' : 'ellipse-outline'}
                          size={11}
                          color={step.done ? '#FFFFFF' : '#8F948B'}
                        />
                      </View>
                    )}

                    {!isLast && (
                      <View
                        style={[
                          styles.line,
                          step.done && styles.lineDone,
                        ]}
                      />
                    )}
                  </View>

                  {/* Right Column: Step Details */}
                  <View style={styles.stepContent}>
                    <View style={styles.stepHeaderRow}>
                      <Text
                        style={[
                          styles.stepTitle,
                          step.done && styles.stepTitleDone,
                          step.active && styles.stepTitleActive,
                        ]}
                      >
                        {step.title}
                      </Text>
                      <Text
                        style={[
                          styles.stepTime,
                          step.active && styles.stepTimeActive,
                        ]}
                      >
                        {step.time}
                      </Text>
                    </View>
                    <Text style={styles.stepSub}>{step.sub}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Need Help CTA Tile */}
        <TouchableOpacity
          style={styles.helpCard}
          activeOpacity={0.8}
          onPress={() => navigate('create-ticket', { orderId: order?.id })}
        >
          <View style={styles.helpIconCircle}>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color="#0F382C" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.helpTitle}>Have a question about your shipment?</Text>
            <Text style={styles.helpSub}>Contact VIP concierge support or request updates.</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#7E827A" />
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
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#ECE8E1',
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F5F3ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#0F382C',
  },
  headerSub: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Medium',
    color: '#7E827A',
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 110,
    gap: 14,
  },
  carrierCard: {
    backgroundColor: '#0F382C',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#185040',
    shadowColor: '#0F382C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  carrierTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  carrierIconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  carrierKicker: {
    fontSize: 9,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    color: '#C69B56',
    letterSpacing: 0.8,
  },
  carrierName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    marginTop: 2,
  },
  waybillText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11.5,
    fontFamily: 'PlusJakartaSans-Medium',
    marginTop: 2,
  },
  contactBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  contactBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  etaBanner: {
    backgroundColor: '#FAF7F0',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#ECE8E1',
  },
  etaIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F3ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  etaTitle: {
    fontSize: 13.5,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#0F382C',
  },
  etaSub: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#7E827A',
    marginTop: 1,
  },
  livePulsePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EAF6EC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  liveGreenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#157347',
  },
  livePillText: {
    fontSize: 9.5,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    color: '#157347',
  },
  timelineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#ECE8E1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  timelineTitle: {
    fontSize: 13.5,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#0F382C',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 18,
  },
  milestoneList: {
    gap: 0,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: 14,
    minHeight: 60,
  },
  timelineCol: {
    alignItems: 'center',
    width: 26,
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F5F3ED',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ECE8E1',
  },
  dotDone: {
    backgroundColor: '#0F382C',
    borderColor: '#0F382C',
  },
  activeNodeContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  activePulseRing: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(21, 115, 71, 0.4)',
  },
  activeNodeCore: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#157347',
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: '#ECE8E1',
    marginVertical: 3,
  },
  lineDone: {
    backgroundColor: '#0F382C',
  },
  stepContent: {
    flex: 1,
    paddingBottom: 14,
  },
  stepHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepTitle: {
    fontSize: 13.5,
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontWeight: '600',
    color: '#7E827A',
  },
  stepTitleDone: {
    color: '#1A1D1A',
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  stepTitleActive: {
    color: '#0F382C',
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
  },
  stepTime: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#8F948B',
  },
  stepTimeActive: {
    color: '#157347',
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  stepSub: {
    fontSize: 11.5,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#5C6057',
    marginTop: 2,
  },
  helpCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#ECE8E1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  helpIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F5F3ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpTitle: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#0F382C',
  },
  helpSub: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#7E827A',
    marginTop: 2,
  },
});

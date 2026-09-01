import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { useApp } from '../../context/AppContext';
import { useNavigation } from '../../navigation/NavigationContext';

export default function CheckoutDeliveryScreen() {
  const { selectedDeliveryMethod, setSelectedDeliveryMethod } = useApp();
  const { navigate, goBack } = useNavigation();

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

        <Text style={styles.headerTitle}>Delivery Method</Text>

        <View style={{ width: 38 }} />
      </View>

      {/* Centered Stepper Progress Indicator */}
      <View style={styles.stepperContainer}>
        <View style={styles.stepItem}>
          <View style={[styles.stepCircle, styles.stepCircleCompleted]}>
            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
          </View>
          <Text style={[styles.stepLabel, styles.stepLabelCompleted]}>Address</Text>
        </View>

        <View style={[styles.stepConnector, styles.stepConnectorActive]} />

        <View style={styles.stepItem}>
          <View style={[styles.stepCircle, styles.stepCircleActive]}>
            <Text style={styles.stepNumActive}>2</Text>
          </View>
          <Text style={[styles.stepLabel, styles.stepLabelActive]}>Delivery</Text>
        </View>

        <View style={[styles.stepConnector, styles.stepConnectorInactive]} />

        <View style={styles.stepItem}>
          <View style={styles.stepCircle}>
            <Text style={styles.stepNum}>3</Text>
          </View>
          <Text style={styles.stepLabel}>Payment</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Editorial Section Title */}
        <View style={styles.titleSection}>
          <Text style={styles.titleText}>Choose delivery speed</Text>
          <Text style={styles.titleSub}>Select logistics courier service for your shipment.</Text>
        </View>

        {/* Standard Delivery Option */}
        <TouchableOpacity
          style={[
            styles.deliveryCard,
            selectedDeliveryMethod === 'standard' && styles.deliveryCardSelected,
          ]}
          onPress={() => setSelectedDeliveryMethod('standard')}
          activeOpacity={0.85}
        >
          <View style={styles.cardHeader}>
            <View style={styles.radioRow}>
              <View style={[styles.radioCircle, selectedDeliveryMethod === 'standard' && styles.radioCircleActive]}>
                {selectedDeliveryMethod === 'standard' && <View style={styles.radioDot} />}
              </View>
              <View style={styles.methodInfo}>
                <Text style={styles.methodTitle}>Standard Doorstep Delivery</Text>
                <Text style={styles.courierName}>GIG Logistics Express</Text>
              </View>
            </View>

            <Text style={styles.methodPrice}>₦ 4,500</Text>
          </View>

          <View style={styles.deliveryMetaRow}>
            <View style={styles.etaBadge}>
              <Ionicons name="time-outline" size={13} color="#0F382C" />
              <Text style={styles.etaText}>Estimated: 2 to 3 Business Days</Text>
            </View>
          </View>

          <Text style={styles.methodDesc}>
            Includes courier status updates when available and delivery evidence collection.
          </Text>
        </TouchableOpacity>

        {/* Express Priority Delivery Option */}
        <TouchableOpacity
          style={[
            styles.deliveryCard,
            selectedDeliveryMethod === 'express' && styles.deliveryCardSelected,
          ]}
          onPress={() => setSelectedDeliveryMethod('express')}
          activeOpacity={0.85}
        >
          <View style={styles.cardHeader}>
            <View style={styles.radioRow}>
              <View style={[styles.radioCircle, selectedDeliveryMethod === 'express' && styles.radioCircleActive]}>
                {selectedDeliveryMethod === 'express' && <View style={styles.radioDot} />}
              </View>
              <View style={styles.methodInfo}>
                <View style={styles.titleWithBadge}>
                  <Text style={styles.methodTitle}>Express VIP Priority</Text>
                  <View style={styles.expressPill}>
                    <Text style={styles.expressPillText}>FASTEST</Text>
                  </View>
                </View>
                <Text style={styles.courierName}>DHL Express Nigeria</Text>
              </View>
            </View>

            <Text style={styles.methodPrice}>₦ 7,500</Text>
          </View>

          <View style={styles.deliveryMetaRow}>
            <View style={[styles.etaBadge, styles.etaBadgeExpress]}>
              <Ionicons name="flash-outline" size={13} color="#C69B56" />
              <Text style={[styles.etaText, styles.etaTextExpress]}>Estimated: next business day</Text>
            </View>
          </View>

          <Text style={styles.methodDesc}>
            Priority handling where the merchant and carrier can support it.
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Sticky Bottom Action */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.continueBtn}
          activeOpacity={0.88}
          onPress={() => navigate('checkout-review')}
        >
          <Text style={styles.continueBtnText}>Review Order & Payment</Text>
          <View style={styles.btnIconBadge}>
            <Ionicons name="arrow-forward" size={14} color="#0F382C" />
          </View>
        </TouchableOpacity>
      </View>
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
  headerTitle: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#0F382C',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#ECE8E1',
  },
  stepItem: {
    alignItems: 'center',
    gap: 4,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F5F3ED',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ECE8E1',
  },
  stepCircleActive: {
    backgroundColor: '#0F382C',
    borderColor: '#0F382C',
  },
  stepCircleCompleted: {
    backgroundColor: '#157347',
    borderColor: '#157347',
  },
  stepNum: {
    fontSize: 11.5,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#7E827A',
  },
  stepNumActive: {
    fontSize: 11.5,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepLabel: {
    fontSize: 10.5,
    fontFamily: 'PlusJakartaSans-Medium',
    color: '#7E827A',
  },
  stepLabelActive: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#0F382C',
  },
  stepLabelCompleted: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#157347',
  },
  stepConnector: {
    width: 36,
    height: 2,
    marginHorizontal: 8,
    marginTop: -16,
  },
  stepConnectorActive: {
    backgroundColor: '#157347',
  },
  stepConnectorInactive: {
    backgroundColor: '#ECE8E1',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 110,
  },
  titleSection: {
    marginBottom: 16,
  },
  titleText: {
    fontSize: 22,
    fontFamily: 'PlayfairDisplay-Bold',
    fontWeight: '700',
    color: '#0F382C',
    letterSpacing: -0.3,
  },
  titleSub: {
    fontSize: 12.5,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#7E827A',
    marginTop: 3,
  },
  deliveryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ECE8E1',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  deliveryCardSelected: {
    borderColor: '#0F382C',
    borderWidth: 1.5,
    shadowColor: '#0F382C',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#C5C1B6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: '#0F382C',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0F382C',
  },
  methodInfo: {
    flex: 1,
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  methodTitle: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#1A1D1A',
  },
  expressPill: {
    backgroundColor: '#FAF7F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ECE8E1',
  },
  expressPillText: {
    fontSize: 9,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    color: '#C69B56',
    letterSpacing: 0.6,
  },
  courierName: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Medium',
    color: '#7E827A',
    marginTop: 2,
  },
  methodPrice: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    color: '#0F382C',
  },
  deliveryMetaRow: {
    marginBottom: 8,
    paddingLeft: 30,
  },
  etaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F5F3ED',
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  etaBadgeExpress: {
    backgroundColor: '#FAF7F0',
  },
  etaText: {
    fontSize: 11.5,
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontWeight: '600',
    color: '#0F382C',
  },
  etaTextExpress: {
    color: '#8C682A',
  },
  methodDesc: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#5C6057',
    lineHeight: 17,
    paddingLeft: 30,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#ECE8E1',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 10,
  },
  continueBtn: {
    backgroundColor: '#0F382C',
    height: 52,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#0F382C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  continueBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  btnIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#C69B56',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

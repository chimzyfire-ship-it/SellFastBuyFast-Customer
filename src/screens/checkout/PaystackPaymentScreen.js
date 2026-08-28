import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
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

export default function PaystackPaymentScreen() {
  const { user, cart, selectedDeliveryMethod, showToast } = useApp();
  const { activeModal, closeModal, navigate } = useNavigation();

  // Support both modal name identifiers
  const visible = activeModal?.name === 'checkout-paystack' || activeModal?.name === 'paystack-gateway';

  const [paymentMethod, setPaymentMethod] = useState('card'); // 'card' | 'bank' | 'ussd'

  // Card Form State
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('889');
  const [cardName, setCardName] = useState(user.name || 'Amina Bello');
  const [saveCard, setSaveCard] = useState(true);

  // USSD Bank State
  const [selectedBank, setSelectedBank] = useState('gtb');

  // Countdown timer for Bank Transfer
  const [timeLeft, setTimeLeft] = useState(1799); // 30 minutes in seconds

  useEffect(() => {
    if (!visible) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [visible]);

  if (!visible) return null;

  const subtotal = cart.reduce((acc, item) => acc + (item.product?.price || 0) * (item.quantity || 1), 0);
  const deliveryFee = selectedDeliveryMethod === 'express' ? 7500 : 4500;
  const totalAmount = activeModal?.params?.totalAmount || subtotal + deliveryFee;

  const formatMinutes = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleCopyAccount = (text, label) => {
    showToast && showToast(`${label} copied to clipboard`);
  };

  const handleSimulateSuccess = () => {
    closeModal();
    const paymentRef = 'PSTK-' + Math.floor(100000 + Math.random() * 900000);
    navigate('checkout-processing', { paymentRef });
  };

  const handleSimulateFailure = () => {
    closeModal();
    navigate('checkout-failed', { reason: 'Card authorization failed or transaction declined by bank.' });
  };

  const USSD_BANKS = [
    { id: 'gtb', name: 'GTBank', code: '*737*50*154500*8891#' },
    { id: 'access', name: 'Access Bank', code: '*901*000*154500*8891#' },
    { id: 'zenith', name: 'Zenith Bank', code: '*966*6*154500*8891#' },
    { id: 'uba', name: 'UBA', code: '*919*4*154500*8891#' },
    { id: 'first', name: 'First Bank', code: '*894*894*154500*8891#' },
    { id: 'kuda', name: 'Kuda Bank', code: '*894*000*154500*8891#' },
  ];

  const currentUssd = USSD_BANKS.find((b) => b.id === selectedBank) || USSD_BANKS[0];

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.container}>
        {/* Paystack Header */}
        <View style={styles.paystackHeader}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={closeModal}
            activeOpacity={0.75}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <Ionicons name="lock-closed" size={14} color="#C69B56" />
            <Text style={styles.paystackHeaderTitle}>Paystack Secure Checkout</Text>
          </View>

          <View style={styles.testBadge}>
            <Text style={styles.testBadgeText}>ESCROW</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollBody}
          showsVerticalScrollIndicator={false}
        >
          {/* Merchant & Amount Banner */}
          <View style={styles.bannerCard}>
            <Text style={styles.merchantLabel}>SellFastBuyFast Nigeria Limited</Text>
            <Text style={styles.amountText}>₦ {totalAmount.toLocaleString()}</Text>
            <View style={styles.userEmailBadge}>
              <Ionicons name="person-circle-outline" size={13} color="#C69B56" />
              <Text style={styles.emailText}>{user.email}</Text>
            </View>
          </View>

          {/* Payment Method Selector Tabs */}
          <Text style={styles.sectionTitle}>SELECT PAYMENT METHOD</Text>
          <View style={styles.methodsRow}>
            {[
              { id: 'card', label: 'Card', icon: 'card-outline' },
              { id: 'bank', label: 'Bank Transfer', icon: 'business-outline' },
              { id: 'ussd', label: 'USSD Code', icon: 'keypad-outline' },
            ].map((m) => {
              const isActive = paymentMethod === m.id;
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.methodTab, isActive && styles.methodTabActive]}
                  onPress={() => setPaymentMethod(m.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={m.icon}
                    size={17}
                    color={isActive ? '#0F382C' : '#7E827A'}
                  />
                  <Text style={[styles.methodLabel, isActive && styles.methodLabelActive]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* TAB 1: CARD PAYMENT FORM */}
          {paymentMethod === 'card' && (
            <View style={styles.tabContentCard}>
              <View style={styles.tabHeaderRow}>
                <Text style={styles.tabHeading}>Debit / Credit Card</Text>
                <View style={styles.cardLogosRow}>
                  <View style={styles.cardBadgeMastercard}>
                    <Text style={styles.cardLogoText}>MC</Text>
                  </View>
                  <View style={styles.cardBadgeVisa}>
                    <Text style={styles.cardLogoText}>VISA</Text>
                  </View>
                  <View style={styles.cardBadgeVerve}>
                    <Text style={styles.cardLogoText}>VERVE</Text>
                  </View>
                </View>
              </View>

              {/* Card Number Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>CARD NUMBER</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="card" size={18} color="#0F382C" />
                  <TextInput
                    style={styles.textInput}
                    value={cardNumber}
                    onChangeText={setCardNumber}
                    placeholder="0000 0000 0000 0000"
                    placeholderTextColor="#8F948B"
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              {/* Expiry & CVV */}
              <View style={styles.rowInputs}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>EXPIRY DATE</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.textInput}
                      value={cardExpiry}
                      onChangeText={setCardExpiry}
                      placeholder="MM/YY"
                      placeholderTextColor="#8F948B"
                    />
                  </View>
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>CVV</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.textInput}
                      value={cardCvv}
                      onChangeText={setCardCvv}
                      placeholder="123"
                      placeholderTextColor="#8F948B"
                      secureTextEntry
                      keyboardType="number-pad"
                    />
                  </View>
                </View>
              </View>

              {/* Cardholder Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>CARDHOLDER NAME</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={17} color="#5C6057" />
                  <TextInput
                    style={styles.textInput}
                    value={cardName}
                    onChangeText={setCardName}
                    placeholder="Amina Bello"
                    placeholderTextColor="#8F948B"
                  />
                </View>
              </View>

              {/* Save Card Checkbox */}
              <TouchableOpacity
                style={styles.checkboxRow}
                activeOpacity={0.8}
                onPress={() => setSaveCard(!saveCard)}
              >
                <Ionicons
                  name={saveCard ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={saveCard ? '#0F382C' : '#8F948B'}
                />
                <Text style={styles.checkboxLabel}>Save card for 1-click tokenized checkout</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* TAB 2: BANK TRANSFER (PAYSTACK DEDICATED NUBAN) */}
          {paymentMethod === 'bank' && (
            <View style={styles.tabContentCard}>
              <View style={styles.timerBanner}>
                <Ionicons name="time-outline" size={16} color="#B58105" />
                <Text style={styles.timerText}>
                  Account expires in <Text style={{ fontWeight: '800' }}>{formatMinutes(timeLeft)}</Text>
                </Text>
              </View>

              <Text style={styles.transferPrompt}>
                Transfer <Text style={{ fontWeight: '800', color: '#0F382C' }}>₦ {totalAmount.toLocaleString()}</Text> to the dedicated Paystack escrow account below:
              </Text>

              {/* Virtual Account Bento Details */}
              <View style={styles.bankDetailBento}>
                <View style={styles.bankDetailRow}>
                  <View>
                    <Text style={styles.bankDetailLabel}>BANK NAME</Text>
                    <Text style={styles.bankDetailValue}>Wema Bank / Paystack Escrow</Text>
                  </View>
                  <Ionicons name="business" size={20} color="#0F382C" />
                </View>

                <View style={styles.dividerLine} />

                <View style={styles.bankDetailRow}>
                  <View>
                    <Text style={styles.bankDetailLabel}>ACCOUNT NUMBER</Text>
                    <Text style={styles.nubanValue}>7820194821</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.copyPillBtn}
                    activeOpacity={0.8}
                    onPress={() => handleCopyAccount('7820194821', 'Account number')}
                  >
                    <Ionicons name="copy-outline" size={13} color="#0F382C" />
                    <Text style={styles.copyPillText}>Copy</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.dividerLine} />

                <View style={styles.bankDetailRow}>
                  <View>
                    <Text style={styles.bankDetailLabel}>BENEFICIARY NAME</Text>
                    <Text style={styles.bankDetailValue}>SFBF / Amina Bello (Paystack)</Text>
                  </View>
                </View>
              </View>

              <View style={styles.instantNotice}>
                <Ionicons name="flash" size={14} color="#157347" />
                <Text style={styles.instantNoticeText}>
                  Automated confirmation: payment verified in ~30 seconds upon transfer.
                </Text>
              </View>
            </View>
          )}

          {/* TAB 3: USSD CODE PAYMENT */}
          {paymentMethod === 'ussd' && (
            <View style={styles.tabContentCard}>
              <Text style={styles.tabHeading}>Select Your Bank for USSD Dial</Text>

              <View style={styles.ussdBanksGrid}>
                {USSD_BANKS.map((b) => {
                  const isSelected = selectedBank === b.id;
                  return (
                    <TouchableOpacity
                      key={b.id}
                      style={[styles.ussdBankBtn, isSelected && styles.ussdBankBtnActive]}
                      onPress={() => setSelectedBank(b.id)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.ussdBankText, isSelected && styles.ussdBankTextActive]}>
                        {b.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Generated USSD String Display */}
              <View style={styles.ussdDisplayCard}>
                <Text style={styles.ussdLabel}>DIAL THE CODE BELOW ON YOUR PHONE</Text>
                <Text style={styles.ussdCodeText}>{currentUssd.code}</Text>

                <View style={styles.ussdActionsRow}>
                  <TouchableOpacity
                    style={styles.ussdCopyBtn}
                    activeOpacity={0.8}
                    onPress={() => handleCopyAccount(currentUssd.code, 'USSD code')}
                  >
                    <Ionicons name="copy-outline" size={14} color="#0F382C" />
                    <Text style={styles.ussdCopyText}>Copy Code</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.ussdHelper}>
                Dial from the phone number linked to your {currentUssd.name} account and enter your bank PIN to authorize.
              </Text>
            </View>
          )}

          {/* Primary Action Button */}
          <TouchableOpacity
            style={styles.payNowBtn}
            activeOpacity={0.88}
            onPress={handleSimulateSuccess}
          >
            <Ionicons name="shield-checkmark" size={18} color="#C69B56" />
            <Text style={styles.payNowBtnText}>
              {paymentMethod === 'card'
                ? `Authorize & Pay ₦ ${totalAmount.toLocaleString()}`
                : paymentMethod === 'bank'
                ? `I Have Sent ₦ ${totalAmount.toLocaleString()}`
                : `I Have Dialed USSD Code`}
            </Text>
            <View style={styles.btnIconBadge}>
              <Ionicons name="arrow-forward" size={14} color="#0F382C" />
            </View>
          </TouchableOpacity>

          {/* Escrow Simulation Sandbox Controls */}
          <View style={styles.testActionsBox}>
            <Text style={styles.testTitle}>PAYMENT SIMULATION SANDBOX</Text>
            <TouchableOpacity
              style={styles.successTriggerBtn}
              activeOpacity={0.85}
              onPress={handleSimulateSuccess}
            >
              <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
              <Text style={styles.triggerText}>Simulate Successful Payment ➔ Escrow</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.failTriggerBtn}
              activeOpacity={0.85}
              onPress={handleSimulateFailure}
            >
              <Ionicons name="close-circle" size={16} color="#E53E3E" />
              <Text style={[styles.triggerText, { color: '#E53E3E' }]}>
                Simulate Payment Decline / Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#072019',
  },
  paystackHeader: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#071A14',
    borderBottomWidth: 1,
    borderBottomColor: '#0E2E24',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  paystackHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  testBadge: {
    backgroundColor: 'rgba(198, 155, 86, 0.2)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C69B56',
  },
  testBadgeText: {
    color: '#C69B56',
    fontSize: 9.5,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  scrollBody: {
    backgroundColor: '#F8F6F0',
    padding: 18,
    paddingBottom: 60,
    gap: 14,
  },
  bannerCard: {
    backgroundColor: '#0F382C',
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#0F382C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  merchantLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11.5,
    fontFamily: 'PlusJakartaSans-Medium',
  },
  amountText: {
    color: '#C69B56',
    fontSize: 28,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    marginTop: 4,
  },
  userEmailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginTop: 6,
  },
  emailText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontFamily: 'PlusJakartaSans-Medium',
  },
  sectionTitle: {
    fontSize: 10.5,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    color: '#C69B56',
    letterSpacing: 0.8,
    marginTop: 4,
  },
  methodsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  methodTab: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECE8E1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  methodTabActive: {
    backgroundColor: '#FAF7F0',
    borderColor: '#0F382C',
    borderWidth: 1.5,
  },
  methodLabel: {
    fontSize: 11.5,
    fontFamily: 'PlusJakartaSans-Medium',
    color: '#7E827A',
  },
  methodLabelActive: {
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#0F382C',
    fontWeight: '700',
  },
  tabContentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ECE8E1',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  tabHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  tabHeading: {
    fontSize: 13.5,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#0F382C',
  },
  cardLogosRow: {
    flexDirection: 'row',
    gap: 4,
  },
  cardBadgeMastercard: {
    backgroundColor: '#FAF5EA',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E8E2D2',
  },
  cardBadgeVisa: {
    backgroundColor: '#EBF4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D0E3E8',
  },
  cardBadgeVerve: {
    backgroundColor: '#FEECEC',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FED7D7',
  },
  cardLogoText: {
    fontSize: 9,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    color: '#0F382C',
  },
  inputGroup: {
    gap: 4,
  },
  inputLabel: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    color: '#7E827A',
    letterSpacing: 0.8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    backgroundColor: '#F5F3ED',
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#ECE8E1',
  },
  textInput: {
    flex: 1,
    fontSize: 13.5,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#1A1D1A',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 10,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  checkboxLabel: {
    fontSize: 11.5,
    fontFamily: 'PlusJakartaSans-Medium',
    color: '#5C6057',
  },
  timerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FAF5EA',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E2D2',
  },
  timerText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Medium',
    color: '#B58105',
  },
  transferPrompt: {
    fontSize: 12.5,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#5C6057',
    lineHeight: 18,
  },
  bankDetailBento: {
    backgroundColor: '#FAF7F0',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#ECE8E1',
    gap: 8,
  },
  bankDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bankDetailLabel: {
    fontSize: 9.5,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    color: '#C69B56',
    letterSpacing: 0.8,
  },
  bankDetailValue: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#1A1D1A',
    marginTop: 2,
  },
  nubanValue: {
    fontSize: 17,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    color: '#0F382C',
    marginTop: 2,
    letterSpacing: 1,
  },
  copyPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ECE8E1',
  },
  copyPillText: {
    fontSize: 11.5,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#0F382C',
  },
  dividerLine: {
    height: 1,
    backgroundColor: '#ECE8E1',
  },
  instantNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EAF6EC',
    padding: 10,
    borderRadius: 12,
  },
  instantNoticeText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Medium',
    color: '#157347',
    flex: 1,
  },
  ussdBanksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ussdBankBtn: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#FAF7F0',
    borderWidth: 1,
    borderColor: '#ECE8E1',
  },
  ussdBankBtnActive: {
    backgroundColor: '#0F382C',
    borderColor: '#0F382C',
  },
  ussdBankText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Medium',
    color: '#5C6057',
  },
  ussdBankTextActive: {
    color: '#FFFFFF',
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  ussdDisplayCard: {
    backgroundColor: '#FAF7F0',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#ECE8E1',
    alignItems: 'center',
    gap: 6,
    marginVertical: 4,
  },
  ussdLabel: {
    fontSize: 9.5,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    color: '#C69B56',
    letterSpacing: 0.8,
  },
  ussdCodeText: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    color: '#0F382C',
    letterSpacing: 1.5,
    marginVertical: 2,
  },
  ussdActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  ussdCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ECE8E1',
  },
  ussdCopyText: {
    fontSize: 11.5,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#0F382C',
  },
  ussdHelper: {
    fontSize: 11.5,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#7E827A',
    textAlign: 'center',
    lineHeight: 16,
  },
  payNowBtn: {
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
  payNowBtnText: {
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
  testActionsBox: {
    backgroundColor: '#FAF7F0',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#ECE8E1',
    gap: 8,
  },
  testTitle: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    color: '#C69B56',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  successTriggerBtn: {
    backgroundColor: '#157347',
    height: 42,
    borderRadius: 21,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  failTriggerBtn: {
    backgroundColor: '#FFFFFF',
    height: 42,
    borderRadius: 21,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#FED7D7',
  },
  triggerText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
});

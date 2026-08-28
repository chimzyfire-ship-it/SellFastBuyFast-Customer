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

export default function CreateSupportTicketScreen() {
  const { createSupportTicket, orders } = useApp();
  const { currentRoute, goBack, navigate } = useNavigation();

  const orderId = currentRoute.params?.orderId || 'ORD-2026-8891';
  const order = orders.find((o) => o.id === orderId);

  const [category, setCategory] = useState('Delivery issue');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const CATEGORIES = [
    'Delivery issue',
    'Payment & Escrow',
    'Merchant inquiry',
    'Packaging / Quality',
    'Other questions',
  ];

  const handleSubmit = () => {
    if (!subject.trim() || !message.trim()) return;
    const newTicket = createSupportTicket(orderId, subject, category, message);
    navigate('support-ticket', { ticketId: newTicket.id });
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

        <Text style={styles.headerTitle}>New Support Ticket</Text>

        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Order Reference Hero Card */}
        <View style={styles.orderCard}>
          <View style={styles.orderIconCircle}>
            <Ionicons name="headset-outline" size={20} color="#C69B56" />
          </View>
          <View style={styles.orderTextCol}>
            <Text style={styles.orderKicker}>ATTACHED ORDER</Text>
            <Text style={styles.orderIdText}>{orderId}</Text>
            {order?.merchantName && (
              <Text style={styles.merchantSub}>Merchant: {order.merchantName}</Text>
            )}
          </View>
          <View style={styles.vipTag}>
            <Ionicons name="sparkles" size={10} color="#C69B56" />
            <Text style={styles.vipTagText}>VIP Concierge</Text>
          </View>
        </View>

        {/* Section Header */}
        <View style={styles.titleSection}>
          <Text style={styles.titleText}>How can we assist you?</Text>
          <Text style={styles.titleSub}>
            Our concierge team will respond directly within minutes.
          </Text>
        </View>

        {/* Category Selector */}
        <View style={styles.formSection}>
          <Text style={styles.formLabel}>Select Issue Category</Text>
          <View style={styles.categoryWrap}>
            {CATEGORIES.map((c, idx) => {
              const isActive = category === c;
              return (
                <TouchableOpacity
                  key={idx}
                  style={[styles.catPill, isActive && styles.catPillActive]}
                  onPress={() => setCategory(c)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.catText, isActive && styles.catTextActive]}>
                    {c}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Subject Input */}
        <View style={styles.formSection}>
          <Text style={styles.formLabel}>Subject</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Courier contact / Driver delivery time"
            placeholderTextColor="#8F948B"
            value={subject}
            onChangeText={setSubject}
          />
        </View>

        {/* Message Details Input */}
        <View style={styles.formSection}>
          <Text style={styles.formLabel}>Message Details</Text>
          <TextInput
            style={styles.textArea}
            multiline
            numberOfLines={5}
            placeholder="Please provide details about your inquiry so we can resolve it immediately..."
            placeholderTextColor="#8F948B"
            value={message}
            onChangeText={setMessage}
          />
        </View>

        {/* Submit Action */}
        <TouchableOpacity
          style={[
            styles.submitBtn,
            (!subject.trim() || !message.trim()) && styles.submitBtnDisabled,
          ]}
          activeOpacity={0.88}
          onPress={handleSubmit}
          disabled={!subject.trim() || !message.trim()}
        >
          <Text style={styles.submitBtnText}>Submit Support Ticket</Text>
          <View style={styles.btnIconBadge}>
            <Ionicons name="arrow-forward" size={13} color="#0F382C" />
          </View>
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
  headerTitle: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#0F382C',
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 110,
    gap: 16,
  },
  orderCard: {
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
  orderIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#0F382C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderTextCol: {
    flex: 1,
  },
  orderKicker: {
    fontSize: 9.5,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    color: '#C69B56',
    letterSpacing: 0.8,
  },
  orderIdText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#0F382C',
    marginTop: 1,
  },
  merchantSub: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Medium',
    color: '#7E827A',
    marginTop: 1,
  },
  vipTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FAF7F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ECE8E1',
  },
  vipTagText: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#C69B56',
  },
  titleSection: {
    marginTop: 2,
    marginBottom: 4,
  },
  titleText: {
    fontSize: 20,
    fontFamily: 'PlayfairDisplay-Bold',
    fontWeight: '700',
    color: '#0F382C',
  },
  titleSub: {
    fontSize: 12.5,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#7E827A',
    marginTop: 3,
  },
  formSection: {
    gap: 8,
  },
  formLabel: {
    fontSize: 12.5,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#0F382C',
  },
  categoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catPill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECE8E1',
  },
  catPillActive: {
    backgroundColor: '#0F382C',
    borderColor: '#0F382C',
  },
  catText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Medium',
    color: '#5C6057',
  },
  catTextActive: {
    color: '#FFFFFF',
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  input: {
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#ECE8E1',
    fontSize: 13.5,
    fontFamily: 'PlusJakartaSans-Medium',
    color: '#1A1D1A',
  },
  textArea: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#ECE8E1',
    fontSize: 13.5,
    fontFamily: 'PlusJakartaSans-Medium',
    color: '#1A1D1A',
    textAlignVertical: 'top',
    height: 120,
  },
  submitBtn: {
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
    marginTop: 8,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
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

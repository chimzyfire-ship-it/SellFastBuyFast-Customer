import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  KeyboardAvoidingView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { useApp } from '../../context/AppContext';
import { useNavigation } from '../../navigation/NavigationContext';

export default function SupportTicketScreen() {
  const { tickets, addMessageToTicket, isLoadingCustomerCare, refreshCustomerCare } = useApp();
  const { currentRoute, goBack } = useNavigation();

  const ticketId = currentRoute.params?.ticketId;
  const ticket = tickets.find((t) => t.id === ticketId);

  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!ticket || !input.trim() || isSending) return;
    setIsSending(true);
    try {
      await addMessageToTicket(ticket.id, input.trim());
      setInput('');
    } catch {
      // AppContext shows a recoverable error toast and preserves the draft.
    } finally {
      setIsSending(false);
    }
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
          <Text style={styles.headerTitle}>{ticket ? `Ticket #${ticket.id}` : 'Support Ticket'}</Text>
          <Text style={styles.headerSub}>{ticket?.orderId ? `Order #${ticket.orderId}` : 'Customer Support'}</Text>
        </View>

        <View style={styles.statusPill}>
          <Text style={styles.statusPillText}>{ticket?.status || 'Unavailable'}</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Ticket Topic Card */}
          {ticket ? <View style={styles.topicCard}>
            <View style={styles.topicHeader}>
              <View style={styles.topicIconWrap}>
                <Ionicons name="chatbubbles-outline" size={16} color="#0F382C" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.topicCategoryKicker}>{ticket.category?.toUpperCase() || 'SUPPORT'}</Text>
                <Text style={styles.topicSubject}>{ticket.subject}</Text>
              </View>
            </View>
          </View> : isLoadingCustomerCare ? (
            <View style={styles.topicCard}>
              <ActivityIndicator color={COLORS.emeraldPrimary} />
              <Text style={styles.headerSub}>Loading ticket…</Text>
            </View>
          ) : (
            <View style={styles.topicCard}>
              <Text style={styles.topicSubject}>Ticket unavailable</Text>
              <Text style={styles.headerSub}>Refresh your account data or return to the previous screen.</Text>
              <TouchableOpacity
                style={styles.ticketRefreshButton}
                onPress={() => refreshCustomerCare().catch(() => {})}
                accessibilityRole="button"
              >
                <Text style={styles.ticketRefreshText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Conversation Thread */}
          <View style={styles.threadList}>
            {ticket?.messages?.map((m) => {
              const isUser = m.sender === 'user';
              return (
                <View
                  key={m.id}
                  style={[
                    styles.msgBubble,
                    isUser ? styles.userBubble : styles.agentBubble,
                  ]}
                >
                  {!isUser && (
                    <View style={styles.agentHeaderRow}>
                      <View style={styles.agentAvatarCircle}>
                        <Ionicons name="sparkles" size={10} color="#C69B56" />
                      </View>
                      <Text style={styles.agentName}>
                        {m.agentName || 'SellFast VIP Concierge'}
                      </Text>
                    </View>
                  )}

                  <Text
                    style={[
                      styles.msgText,
                      isUser ? styles.userMsgText : styles.agentMsgText,
                    ]}
                  >
                    {m.text}
                  </Text>

                  <Text
                    style={[
                      styles.timeText,
                      isUser ? styles.userTimeText : styles.agentTimeText,
                    ]}
                  >
                    {m.time}
                  </Text>
                </View>
              );
            })}
          </View>
        </ScrollView>

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            placeholder="Type your reply to concierge..."
            placeholderTextColor="#8F948B"
            value={input}
            onChangeText={setInput}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || isSending) && styles.sendBtnDisabled]}
            activeOpacity={0.85}
            onPress={handleSend}
            disabled={!ticket || !input.trim() || isSending}
            accessibilityRole="button"
            accessibilityLabel="Send support message"
            accessibilityState={{ disabled: !ticket || !input.trim() || isSending, busy: isSending }}
          >
            {isSending
              ? <ActivityIndicator size="small" color="#FFFFFF" />
              : <Ionicons name="arrow-up" size={18} color="#FFFFFF" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    height: 54,
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
  statusPill: {
    backgroundColor: '#FAF7F0',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ECE8E1',
  },
  statusPillText: {
    fontSize: 10.5,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#157347',
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 24,
    gap: 14,
  },
  topicCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ECE8E1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  topicHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  ticketRefreshButton: {
    minHeight: 44,
    paddingHorizontal: 20,
    borderRadius: 22,
    backgroundColor: COLORS.emeraldPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  ticketRefreshText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
  topicIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F3ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topicCategoryKicker: {
    fontSize: 9.5,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    color: '#C69B56',
    letterSpacing: 0.8,
  },
  topicSubject: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#0F382C',
    marginTop: 2,
  },
  threadList: {
    gap: 12,
  },
  msgBubble: {
    maxWidth: '82%',
    padding: 14,
    borderRadius: 18,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#0F382C',
    borderBottomRightRadius: 4,
    shadowColor: '#0F382C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  agentBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#ECE8E1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  agentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  agentAvatarCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FAF7F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  agentName: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#C69B56',
  },
  msgText: {
    fontSize: 13.5,
    fontFamily: 'PlusJakartaSans-Medium',
    lineHeight: 19,
  },
  userMsgText: {
    color: '#FFFFFF',
  },
  agentMsgText: {
    color: '#1A1D1A',
  },
  timeText: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-Regular',
    marginTop: 6,
    alignSelf: 'flex-end',
  },
  userTimeText: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  agentTimeText: {
    color: '#8F948B',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#ECE8E1',
    gap: 10,
  },
  textInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 90,
    backgroundColor: '#F5F3ED',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 13.5,
    fontFamily: 'PlusJakartaSans-Medium',
    color: '#1A1D1A',
    borderWidth: 1,
    borderColor: '#ECE8E1',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0F382C',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F382C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
});

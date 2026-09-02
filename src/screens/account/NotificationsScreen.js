import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { useApp } from '../../context/AppContext';
import { useNavigation } from '../../navigation/NavigationContext';

export default function NotificationsScreen() {
  const { notifications, markNotificationRead, isLoadingCustomerCare, refreshCustomerCare } = useApp();
  const { goBack, navigate } = useNavigation();

  const handlePressNotif = (notif) => {
    markNotificationRead(notif.id);
    if (notif.targetRoute) {
      navigate(notif.targetRoute, notif.targetParams || {});
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
          <Ionicons name="arrow-back" size={22} color="#0F382C" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Notification Center</Text>

        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subTitle}>Order updates, courier tracking & VIP announcements</Text>

        {isLoadingCustomerCare && notifications.length === 0 && (
          <View style={styles.emptyState}>
            <ActivityIndicator color={COLORS.emeraldPrimary} />
            <Text style={styles.emptySub}>Loading notifications…</Text>
          </View>
        )}

        {notifications.map((item) => {
          const isUnread = !item.read;
          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.notifCard,
                isUnread && styles.notifCardUnread,
              ]}
              onPress={() => handlePressNotif(item)}
              activeOpacity={0.85}
            >
              <View
                style={[
                  styles.iconCircle,
                  isUnread && styles.iconCircleUnread,
                ]}
              >
                <Ionicons
                  name={isUnread ? 'notifications' : 'notifications-outline'}
                  size={18}
                  color={isUnread ? '#0F382C' : '#7E827A'}
                />
              </View>

              <View style={styles.textWrap}>
                <View style={styles.titleRow}>
                  <Text style={[styles.title, isUnread && styles.titleUnread]}>
                    {item.title}
                  </Text>
                  {isUnread && <View style={styles.unreadDot} />}
                </View>

                <Text style={styles.body}>{item.body}</Text>
                <Text style={styles.time}>{item.time}</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {!isLoadingCustomerCare && notifications.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="notifications-off-outline" size={32} color="#C69B56" />
            </View>
            <Text style={styles.emptyTitle}>You're All Caught Up</Text>
            <Text style={styles.emptySub}>
              New order confirmations and shipment logistics updates will appear here in real time.
            </Text>
            <TouchableOpacity
              onPress={() => refreshCustomerCare().catch(() => {})}
              accessibilityRole="button"
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        )}
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
    gap: 12,
  },
  subTitle: {
    fontSize: 12.5,
    fontFamily: 'PlusJakartaSans-Medium',
    color: '#7E827A',
    marginBottom: 4,
  },
  notifCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#ECE8E1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  notifCardUnread: {
    borderColor: '#C69B56',
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 4,
    borderLeftColor: '#0F382C',
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F5F3ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleUnread: {
    backgroundColor: '#FAF5EA',
  },
  textWrap: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 13.5,
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontWeight: '600',
    color: '#5C6057',
  },
  titleUnread: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#0F382C',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C69B56',
  },
  body: {
    fontSize: 12.5,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#5C6057',
    marginTop: 3,
    lineHeight: 18,
  },
  time: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#8F948B',
    marginTop: 6,
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ECE8E1',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  retryButton: {
    marginTop: 12,
    minHeight: 44,
    paddingHorizontal: 20,
    borderRadius: 22,
    backgroundColor: COLORS.emeraldPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FAF5EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: 'PlayfairDisplay-Bold',
    fontWeight: '700',
    color: '#0F382C',
  },
  emptySub: {
    fontSize: 12.5,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#7E827A',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
  },
});

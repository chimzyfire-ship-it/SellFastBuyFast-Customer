import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Switch,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { useApp } from '../../context/AppContext';
import { useNavigation } from '../../navigation/NavigationContext';

export default function PrivacyScreen() {
  const { showToast, signOut } = useApp();
  const { goBack } = useNavigation();

  const [marketingEmails, setMarketingEmails] = useState(true);
  const [dataSharing, setDataSharing] = useState(false);
  const [twoFactorAuth, setTwoFactorAuth] = useState(true);

  const handleRequestExport = () => {
    Alert.alert(
      'Export Account Data',
      'An encrypted zip file containing your account history, saved addresses, and order logs will be delivered to your email within 24 hours.',
      [
        { text: 'Request Export', onPress: () => showToast && showToast('Data export requested successfully') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleRequestDeletion = () => {
    Alert.alert(
      'Request Permanent Account Deletion',
      'This initiates a data-erasure review under applicable privacy requirements. Records we must retain for legal, accounting, or transaction purposes will be handled separately.',
      [
        {
          text: 'Proceed with Deletion',
          style: 'destructive',
          onPress: () => {
            showToast && showToast('Account deletion request initiated');
            signOut && signOut();
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
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

        <Text style={styles.headerTitle}>Privacy & Security</Text>

        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Section 1: Security & Verification */}
        <View style={styles.bentoCard}>
          <Text style={styles.sectionKicker}>SECURITY & ACCESS</Text>

          <View style={styles.row}>
            <View style={styles.iconCircle}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#0F382C" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Two-Factor Authentication</Text>
              <Text style={styles.rowSub}>SMS & WhatsApp OTP confirmation for high-value orders</Text>
            </View>
            <Switch
              value={twoFactorAuth}
              onValueChange={setTwoFactorAuth}
              trackColor={{ false: '#ECE8E1', true: '#0F382C' }}
              thumbColor={twoFactorAuth ? '#C69B56' : '#FFFFFF'}
            />
          </View>
        </View>

        {/* Section 2: NDPR Consent Settings */}
        <View style={styles.bentoCard}>
          <Text style={styles.sectionKicker}>NDPR DATA CONSENT SETTINGS</Text>

          <View style={styles.row}>
            <View style={styles.iconCircle}>
              <Ionicons name="mail-unread-outline" size={18} color="#0F382C" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Curated Collections & VIP Drops</Text>
              <Text style={styles.rowSub}>Receive alerts on exclusive luxury arrivals and private sales</Text>
            </View>
            <Switch
              value={marketingEmails}
              onValueChange={setMarketingEmails}
              trackColor={{ false: '#ECE8E1', true: '#0F382C' }}
              thumbColor={marketingEmails ? '#C69B56' : '#FFFFFF'}
            />
          </View>

          <View style={[styles.row, { borderBottomWidth: 0 }]}>
            <View style={styles.iconCircle}>
              <Ionicons name="analytics-outline" size={18} color="#0F382C" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Anonymized Feed Intelligence</Text>
              <Text style={styles.rowSub}>Improve merchant fulfillment speed and category curation</Text>
            </View>
            <Switch
              value={dataSharing}
              onValueChange={setDataSharing}
              trackColor={{ false: '#ECE8E1', true: '#0F382C' }}
              thumbColor={dataSharing ? '#C69B56' : '#FFFFFF'}
            />
          </View>
        </View>

        {/* Section 3: Data Ownership & Management */}
        <View style={styles.bentoCard}>
          <Text style={styles.sectionKicker}>DATA OWNERSHIP & MANAGEMENT</Text>

          <TouchableOpacity
            style={styles.actionBtn}
            activeOpacity={0.8}
            onPress={handleRequestExport}
          >
            <View style={styles.actionIconCircle}>
              <Ionicons name="download-outline" size={18} color="#0F382C" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionText}>Export Personal Archive (.JSON)</Text>
              <Text style={styles.actionSub}>Download full order receipts and addresses</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#7E827A" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { borderBottomWidth: 0 }]}
            activeOpacity={0.8}
            onPress={handleRequestDeletion}
          >
            <View style={[styles.actionIconCircle, { backgroundColor: '#FEECEC' }]}>
              <Ionicons name="trash-outline" size={18} color="#D9383A" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.actionText, { color: '#D9383A' }]}>
                Request Permanent Account Deletion
              </Text>
              <Text style={styles.actionSub}>NDPR erasure request review process</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#D9383A" />
          </TouchableOpacity>
        </View>
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
  bentoCard: {
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
  sectionKicker: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    color: '#C69B56',
    letterSpacing: 1,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F3ED',
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F3ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontSize: 13.5,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#1A1D1A',
  },
  rowSub: {
    fontSize: 11.5,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#7E827A',
    marginTop: 2,
    lineHeight: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F3ED',
  },
  actionIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FAF5EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 13.5,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#0F382C',
  },
  actionSub: {
    fontSize: 11.5,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#7E827A',
    marginTop: 2,
  },
});

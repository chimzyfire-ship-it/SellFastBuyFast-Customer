import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { useApp } from '../../context/AppContext';
import { useNavigation } from '../../navigation/NavigationContext';
import StateLgaPicker from '../../components/StateLgaPicker';

export default function AddressBookScreen() {
  const { addresses, setDefaultAddress, addAddress } = useApp();
  const { goBack } = useNavigation();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [recipient, setRecipient] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [locationText, setLocationText] = useState('Lekki Phase 1 / Victoria Island, Lagos State');

  const handleSave = () => {
    if (!street || !recipient) return;
    const parts = locationText.split(', ');
    addAddress({
      title: title || 'Home',
      recipient,
      phone: phone || '+234 803 123 4567',
      street,
      city: parts[0] || 'Lagos',
      state: parts[1] || 'Lagos State',
      isDefault: false,
    });
    setIsAddModalOpen(false);
    setTitle('');
    setRecipient('');
    setPhone('');
    setStreet('');
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

        <Text style={styles.headerTitle}>Delivery Addresses</Text>

        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() => setIsAddModalOpen(true)}
          activeOpacity={0.75}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="add" size={22} color="#0F382C" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subTitle}>Select your primary delivery destination</Text>

        {addresses.map((item) => {
          const isSelected = item.isDefault;
          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.addressCard,
                isSelected && styles.addressCardDefault,
              ]}
              onPress={() => setDefaultAddress(item.id)}
              activeOpacity={0.85}
            >
              <View style={styles.cardHeader}>
                <View style={styles.titleRow}>
                  <View
                    style={[
                      styles.radioCircle,
                      isSelected && styles.radioCircleActive,
                    ]}
                  >
                    {isSelected && <View style={styles.radioInnerDot} />}
                  </View>
                  <Text style={styles.addressTitle}>{item.title}</Text>
                </View>

                {isSelected && (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultBadgeText}>DEFAULT</Text>
                  </View>
                )}
              </View>

              <View style={styles.cardBody}>
                <View style={styles.recipientRow}>
                  <Ionicons name="person-outline" size={14} color="#5C6057" />
                  <Text style={styles.recipientText}>{item.recipient}</Text>
                  <Text style={styles.phoneText}>• {item.phone}</Text>
                </View>

                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={14} color="#7E827A" />
                  <Text style={styles.streetText}>{item.street}, {item.city}, {item.state}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Add Address CTA Card */}
        <TouchableOpacity
          style={styles.addCardBtn}
          activeOpacity={0.8}
          onPress={() => setIsAddModalOpen(true)}
        >
          <View style={styles.addIconCircle}>
            <Ionicons name="add" size={18} color="#0F382C" />
          </View>
          <Text style={styles.addCardText}>Add New Delivery Address</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Add Address Slide-Up Modal */}
      <Modal visible={isAddModalOpen} animationType="slide">
        <SafeAreaView style={styles.modalSafeArea}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => setIsAddModalOpen(false)}
            >
              <Ionicons name="close" size={22} color="#0F382C" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Delivery Address</Text>
            <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Address Label</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Home, Office, Work Studio"
                placeholderTextColor="#8F948B"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Recipient Full Name</Text>
              <TextInput
                style={styles.input}
                value={recipient}
                onChangeText={setRecipient}
                placeholder="e.g. Amina Bello"
                placeholderTextColor="#8F948B"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="+234 803 123 4567"
                placeholderTextColor="#8F948B"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>State & City Location (36 States + FCT)</Text>
              <TouchableOpacity
                style={styles.pickerTrigger}
                onPress={() => setIsPickerOpen(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="location" size={18} color="#0F382C" />
                <Text style={styles.pickerTriggerText}>{locationText}</Text>
                <Ionicons name="chevron-down" size={16} color="#7E827A" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Street Address & House Number</Text>
              <TextInput
                style={styles.input}
                value={street}
                onChangeText={setStreet}
                placeholder="e.g. 14b Admiralty Way"
                placeholderTextColor="#8F948B"
              />
            </View>

            <TouchableOpacity
              style={styles.saveSubmitBtn}
              activeOpacity={0.88}
              onPress={handleSave}
            >
              <Text style={styles.saveSubmitText}>Save Delivery Address</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* State & LGA Picker Modal */}
      <StateLgaPicker
        visible={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSelectLocation={(loc) => setLocationText(loc)}
      />
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
  addressCard: {
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
  addressCardDefault: {
    borderColor: '#0F382C',
    borderWidth: 1.5,
    backgroundColor: '#FFFFFF',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#DCD7CC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: '#0F382C',
  },
  radioInnerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0F382C',
  },
  addressTitle: {
    fontSize: 14.5,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#0F382C',
  },
  defaultBadge: {
    backgroundColor: '#0F382C',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  defaultBadgeText: {
    color: '#C69B56',
    fontSize: 9.5,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  cardBody: {
    paddingLeft: 30,
    gap: 4,
  },
  recipientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recipientText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#1A1D1A',
  },
  phoneText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#7E827A',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 2,
  },
  streetText: {
    fontSize: 12.5,
    fontFamily: 'PlusJakartaSans-Medium',
    color: '#5C6057',
    flex: 1,
    lineHeight: 18,
  },
  addCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#C69B56',
    marginTop: 6,
  },
  addIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FAF5EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCardText: {
    fontSize: 13.5,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#0F382C',
  },
  modalSafeArea: {
    flex: 1,
    backgroundColor: '#F8F6F0',
  },
  modalHeader: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#ECE8E1',
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#0F382C',
  },
  saveBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  saveText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#0F382C',
  },
  modalScrollContent: {
    padding: 20,
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 12.5,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#0F382C',
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
  pickerTrigger: {
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#ECE8E1',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pickerTriggerText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Medium',
    color: '#1A1D1A',
  },
  saveSubmitBtn: {
    backgroundColor: '#0F382C',
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#0F382C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  saveSubmitText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
});

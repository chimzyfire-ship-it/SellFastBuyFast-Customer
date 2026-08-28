import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

export const ALL_NIGERIAN_STATES = [
  { state: 'Abia State', lga: 'Aba Central / Umuahia' },
  { state: 'Adamawa State', lga: 'Yola / Jimeta' },
  { state: 'Akwa Ibom State', lga: 'Uyo Municipal' },
  { state: 'Anambra State', lga: 'Awka / Onitsha' },
  { state: 'Bauchi State', lga: 'Bauchi Central' },
  { state: 'Bayelsa State', lga: 'Yenagoa' },
  { state: 'Benue State', lga: 'Makurdi' },
  { state: 'Borno State', lga: 'Maiduguri' },
  { state: 'Cross River State', lga: 'Calabar Municipal' },
  { state: 'Delta State', lga: 'Warri / Asaba' },
  { state: 'Ebonyi State', lga: 'Abakaliki' },
  { state: 'Edo State', lga: 'Benin City' },
  { state: 'Ekiti State', lga: 'Ado Ekiti' },
  { state: 'Enugu State', lga: 'Enugu Urban / Independence Layout' },
  { state: 'Gombe State', lga: 'Gombe Central' },
  { state: 'Imo State', lga: 'Owerri Municipal' },
  { state: 'Jigawa State', lga: 'Dutse' },
  { state: 'Kaduna State', lga: 'Kaduna Central / Barnawa' },
  { state: 'Kano State', lga: 'Kano Municipal / Nassarawa' },
  { state: 'Katsina State', lga: 'Katsina Central' },
  { state: 'Kebbi State', lga: 'Birnin Kebbi' },
  { state: 'Kogi State', lga: 'Lokoja' },
  { state: 'Kwara State', lga: 'Ilorin Central' },
  { state: 'Lagos State', lga: 'Lekki Phase 1 / Victoria Island' },
  { state: 'Lagos State', lga: 'Ikeja GRA / Allen Avenue' },
  { state: 'Lagos State', lga: 'Yaba / Commercial Avenue' },
  { state: 'Lagos State', lga: 'Surulere / Maryland' },
  { state: 'Lagos State', lga: 'Ikoyi / Banana Island' },
  { state: 'Nasarawa State', lga: 'Lafia / Karu' },
  { state: 'Niger State', lga: 'Minna' },
  { state: 'Ogun State', lga: 'Abeokuta / Ota' },
  { state: 'Ondo State', lga: 'Akure' },
  { state: 'Osun State', lga: 'Osogbo' },
  { state: 'Oyo State', lga: 'Ibadan (Bodija / Ring Road)' },
  { state: 'Plateau State', lga: 'Jos North / Rayfield' },
  { state: 'Rivers State', lga: 'Port Harcourt GRA Phase 2' },
  { state: 'Sokoto State', lga: 'Sokoto Metropolis' },
  { state: 'Taraba State', lga: 'Jalingo' },
  { state: 'Yobe State', lga: 'Damaturu' },
  { state: 'Zamfara State', lga: 'Gusau' },
  { state: 'Abuja FCT', lga: 'Maitama / Wuse II / Asokoro' },
  { state: 'Abuja FCT', lga: 'Gwarinpa / Utako / Jabi' },
];

export default function StateLgaPicker({ visible, onClose, onSelectLocation }) {
  const [query, setQuery] = useState('');

  if (!visible) return null;

  const filtered = ALL_NIGERIAN_STATES.filter(
    (loc) =>
      loc.state.toLowerCase().includes(query.toLowerCase()) ||
      loc.lga.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (item) => {
    onSelectLocation(`${item.lga}, ${item.state}`);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={COLORS.emeraldPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Location (36 States + FCT)</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={COLORS.textSecondary} />
          <TextInput
            style={styles.input}
            placeholder="Search state or city (e.g. Lagos, Abuja, Rivers, Kano)..."
            placeholderTextColor={COLORS.textMuted}
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.countLabel}>Showing {filtered.length} locations across Nigeria</Text>
          {filtered.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.locationRow}
              onPress={() => handleSelect(item)}
            >
              <Ionicons name="location-outline" size={20} color={COLORS.emeraldPrimary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.lgaText}>{item.lga}</Text>
                <Text style={styles.stateText}>{item.state}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justify: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  closeBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.emeraldPrimary,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    margin: 16,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  countLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    gap: 12,
  },
  lgaText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  stateText: {
    fontSize: 12,
    color: COLORS.emeraldPrimary,
    fontWeight: '600',
    marginTop: 2,
  },
});

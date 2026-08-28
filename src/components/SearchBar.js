import React from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

export default function SearchBar({ value, onChangeText, onScanPress, onFilterPress }) {
  return (
    <View style={styles.container}>
      <View style={styles.inputWrapper}>
        <Ionicons name="search-outline" size={19} color="#7E827A" style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          placeholder="Search authentic luxury, designers, tech..."
          placeholderTextColor="#8F948B"
          value={value}
          onChangeText={onChangeText}
          returnKeyType="search"
        />
        {value?.length > 0 && (
          <TouchableOpacity onPress={() => onChangeText('')} style={styles.clearButton}>
            <Ionicons name="close-circle" size={17} color="#8F948B" />
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        style={styles.filterButton}
        activeOpacity={0.85}
        onPress={onFilterPress || onScanPress}
        accessibilityLabel="Open filters"
      >
        <Ionicons name="options-outline" size={21} color={COLORS.white} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 12,
    gap: 10,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    height: 50,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#ECE8E1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 13.5,
    color: COLORS.textPrimary,
    fontFamily: 'PlusJakartaSans-Medium',
    includeFontPadding: false,
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
  },
  filterButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.emeraldPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F382C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
});

import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';

export default function SocialAuthButtons({ onGooglePress, onApplePress }) {
  return (
    <View style={styles.container}>
      {/* Official Google Pill Button */}
      <TouchableOpacity
        style={styles.googleBtn}
        activeOpacity={0.85}
        onPress={onGooglePress}
        accessibilityRole="button"
        accessibilityLabel="Sign in with Google"
      >
        <View style={styles.iconContainer}>
          <Ionicons name="logo-google" size={19} color="#EA4335" />
        </View>
        <Text style={styles.googleBtnText}>Continue with Google</Text>
      </TouchableOpacity>

      {/* Official Apple Pill Button */}
      <TouchableOpacity
        style={styles.appleBtn}
        activeOpacity={0.85}
        onPress={onApplePress}
        accessibilityRole="button"
        accessibilityLabel="Sign in with Apple"
      >
        <View style={styles.iconContainer}>
          <Ionicons name="logo-apple" size={20} color="#FFFFFF" />
        </View>
        <Text style={styles.appleBtnText}>Continue with Apple</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
    width: '100%',
  },
  googleBtn: {
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#747775', // Google official border spec
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  iconContainer: {
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleBtnText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#1F1F1F', // Google official text color
    letterSpacing: 0.1,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  appleBtn: {
    height: 48,
    borderRadius: 24,
    backgroundColor: '#000000', // Apple official black button
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  appleBtnText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.1,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});

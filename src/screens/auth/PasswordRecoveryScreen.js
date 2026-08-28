import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { useNavigation } from '../../navigation/NavigationContext';
import AuthLayout from '../../components/auth/AuthLayout';

export default function PasswordRecoveryScreen() {
  const { navigate } = useNavigation();
  const [email, setEmail] = useState('');
  const [focusedField, setFocusedField] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSend = () => {
    if (!email.trim()) {
      setError('Please enter your email or phone');
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setSubmitted(true);
    }, 500);
  };

  return (
    <AuthLayout
      activeTab={null}
      title={submitted ? 'Check Your Inbox' : 'Reset Password'}
      subtitle={
        submitted
          ? 'We sent reset instructions to your address'
          : 'Enter your email or phone to receive reset instructions'
      }
    >
      {!submitted ? (
        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address or Phone</Text>
            <View
              style={[
                styles.inputWrapper,
                focusedField === 'email' && styles.inputWrapperFocused,
                error && styles.inputError,
              ]}
            >
              <View style={styles.inputIconBox}>
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={error ? COLORS.badgeRed : focusedField === 'email' ? COLORS.emeraldPrimary : COLORS.textSecondary}
                />
              </View>
              <TextInput
                style={styles.input}
                placeholder="e.g. amina.bello@example.ng"
                placeholderTextColor={COLORS.textMuted}
                value={email}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                onChangeText={(val) => {
                  setEmail(val);
                  if (error) setError(null);
                }}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            {error && (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle" size={13} color={COLORS.badgeRed} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.submitBtnPill}
            activeOpacity={0.88}
            onPress={handleSend}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <View style={styles.btnContentRow}>
                <Text style={styles.submitBtnText}>Send Reset Link</Text>
                <View style={styles.btnIconBadge}>
                  <Ionicons name="send" size={14} color={COLORS.emeraldPrimary} />
                </View>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.cardFooter}>
            <Text style={styles.footerText}>Remembered your password? </Text>
            <TouchableOpacity onPress={() => navigate('auth-signin')}>
              <Text style={styles.signInLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.successContainer}>
          <View style={styles.successBadge}>
            <Ionicons name="checkmark-circle" size={54} color={COLORS.successGreen} />
          </View>

          <Text style={styles.successSub}>
            If an account exists for{' '}
            <Text style={styles.emailHighlight}>{email || 'your email'}</Text>,
            password recovery instructions have been dispatched.
          </Text>

          <TouchableOpacity
            style={styles.submitBtnPill}
            activeOpacity={0.88}
            onPress={() => navigate('auth-signin')}
          >
            <Text style={styles.submitBtnText}>Return to Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resendBtn}
            onPress={() => {
              setSubmitted(false);
              setEmail('');
            }}
          >
            <Text style={styles.resendText}>Try another address</Text>
          </TouchableOpacity>
        </View>
      )}
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  formContainer: {
    gap: 15,
  },
  inputGroup: {
    gap: 5,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.emeraldPrimary,
    letterSpacing: -0.1,
  },
  inputWrapper: {
    height: 50,
    backgroundColor: '#F7F5EE',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#E6E1D4',
  },
  inputWrapperFocused: {
    borderColor: COLORS.emeraldPrimary,
    backgroundColor: '#FFFFFF',
    shadowColor: COLORS.emeraldPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  inputError: {
    borderColor: COLORS.badgeRed,
    backgroundColor: '#FFF8F8',
  },
  inputIconBox: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontSize: 14.5,
    color: COLORS.textPrimary,
    fontWeight: '500',
    includeFontPadding: false,
    paddingVertical: 0,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.badgeRed,
    fontWeight: '600',
  },
  submitBtnPill: {
    backgroundColor: COLORS.emeraldPrimary,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(198, 155, 86, 0.35)',
    shadowColor: '#0F382C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
    width: '100%',
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  submitBtnText: {
    color: COLORS.white,
    fontSize: 15.5,
    fontWeight: '700',
    letterSpacing: 0.3,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  btnIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EBE6DC',
  },
  footerText: {
    fontSize: 13.5,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  signInLink: {
    fontSize: 13.5,
    fontWeight: '800',
    color: COLORS.emeraldPrimary,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  successBadge: {
    marginBottom: 8,
  },
  successSub: {
    fontSize: 13.5,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 4,
    marginBottom: 18,
    paddingHorizontal: 6,
  },
  emailHighlight: {
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  resendBtn: {
    marginTop: 12,
    padding: 6,
  },
  resendText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: COLORS.goldDark,
  },
});

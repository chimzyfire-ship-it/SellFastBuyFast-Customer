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
import { useApp } from '../../context/AppContext';
import { useNavigation } from '../../navigation/NavigationContext';
import AuthLayout from '../../components/auth/AuthLayout';
import SocialAuthButtons from '../../components/auth/SocialAuthButtons';

export default function SignInScreen() {
  const { signIn, intendedRoute, setIntendedRoute, showToast } = useApp();
  const { navigate, reset } = useNavigation();

  const [email, setEmail] = useState('amina.bello@example.ng');
  const [password, setPassword] = useState('••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    if (!email.trim()) {
      newErrors.email = 'Email address or phone number is required';
    }
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignIn = () => {
    if (!validateForm()) return;
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      signIn(email, password);
      showToast('Welcome back to SellFastBuyFast!');
      if (intendedRoute) {
        const target = intendedRoute;
        setIntendedRoute(null);
        reset(target.name, target.params);
      } else {
        reset('home');
      }
    }, 500);
  };

  const handleSocialSignIn = (provider) => {
    signIn('social.user@example.ng', 'password123');
    showToast(`Signed in with ${provider}`);
    if (intendedRoute) {
      const target = intendedRoute;
      setIntendedRoute(null);
      reset(target.name, target.params);
    } else {
      reset('home');
    }
  };

  return (
    <AuthLayout
      activeTab="signin"
      title="Welcome Back"
      subtitle="Sign in to your account to continue"
    >
      <View style={styles.formContainer}>
        {/* Email or Phone Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email Address or Phone Number</Text>
          <View
            style={[
              styles.inputWrapper,
              focusedField === 'email' && styles.inputWrapperFocused,
              errors.email && styles.inputError,
            ]}
          >
            <View style={styles.inputIconBox}>
              <Ionicons
                name="mail-outline"
                size={18}
                color={errors.email ? COLORS.badgeRed : focusedField === 'email' ? COLORS.emeraldPrimary : COLORS.textSecondary}
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
                if (errors.email) setErrors({ ...errors, email: null });
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {email.length > 0 && (
              <TouchableOpacity
                onPress={() => setEmail('')}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>
          {errors.email && (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle" size={13} color={COLORS.badgeRed} />
              <Text style={styles.errorText}>{errors.email}</Text>
            </View>
          )}
        </View>

        {/* Password Input */}
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Password</Text>
            <TouchableOpacity
              onPress={() => navigate('auth-recover')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          </View>
          <View
            style={[
              styles.inputWrapper,
              focusedField === 'password' && styles.inputWrapperFocused,
              errors.password && styles.inputError,
            ]}
          >
            <View style={styles.inputIconBox}>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={errors.password ? COLORS.badgeRed : focusedField === 'password' ? COLORS.emeraldPrimary : COLORS.textSecondary}
              />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor={COLORS.textMuted}
              value={password}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              onChangeText={(val) => {
                setPassword(val);
                if (errors.password) setErrors({ ...errors, password: null });
              }}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={19}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
          </View>
          {errors.password && (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle" size={13} color={COLORS.badgeRed} />
              <Text style={styles.errorText}>{errors.password}</Text>
            </View>
          )}
        </View>

        {/* Primary CTA Button Pill */}
        <TouchableOpacity
          style={styles.submitBtnPill}
          activeOpacity={0.88}
          onPress={handleSignIn}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <View style={styles.btnContentRow}>
              <Text style={styles.submitBtnText}>Sign In to Account</Text>
              <View style={styles.btnIconBadge}>
                <Ionicons name="arrow-forward" size={15} color={COLORS.emeraldPrimary} />
              </View>
            </View>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or continue with</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Professional Google & Apple Button Pills */}
        <SocialAuthButtons
          onGooglePress={() => handleSocialSignIn('Google')}
          onApplePress={() => handleSocialSignIn('Apple')}
        />

        {/* Switch to Sign Up */}
        <View style={styles.cardFooter}>
          <Text style={styles.footerText}>New to SellFastBuyFast? </Text>
          <TouchableOpacity onPress={() => navigate('auth-signup')}>
            <Text style={styles.signUpLink}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </View>
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
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.emeraldPrimary,
    letterSpacing: -0.1,
  },
  forgotText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.goldDark,
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
  eyeButton: {
    padding: 4,
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
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E6E1D4',
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    paddingHorizontal: 12,
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
  signUpLink: {
    fontSize: 13.5,
    fontWeight: '800',
    color: COLORS.emeraldPrimary,
  },
});

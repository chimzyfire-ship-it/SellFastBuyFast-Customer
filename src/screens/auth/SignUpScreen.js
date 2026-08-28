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

export default function SignUpScreen() {
  const { navigate } = useNavigation();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(true);
  const [focusedField, setFocusedField] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const getPasswordStrength = () => {
    if (!password) return null;
    if (password.length < 6) return { level: 'Weak', color: '#D9453B', width: '33%' };
    if (password.length < 8 || !/\d/.test(password)) return { level: 'Fair', color: '#C69B56', width: '66%' };
    return { level: 'Strong', color: '#2D8A68', width: '100%' };
  };

  const strength = getPasswordStrength();

  const validateForm = () => {
    const newErrors = {};

    if (!name.trim()) {
      newErrors.name = 'Full Name is required';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!emailRegex.test(email.trim())) {
      newErrors.email = 'Please enter a valid email';
    }

    const phoneRegex = /^(\+234|0)[789][01]\d{8}$/;
    const cleanPhone = phone.replace(/\s+/g, '');
    if (!cleanPhone) {
      newErrors.phone = 'Phone number is required';
    } else if (!phoneRegex.test(cleanPhone)) {
      newErrors.phone = 'Enter valid Nigerian phone (e.g. 08031234567 or +234...)';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!agreed) {
      newErrors.agreed = 'Please accept Terms & Privacy Policy';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateForm()) return;
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      navigate('auth-verify', { email, phone, name });
    }, 400);
  };

  return (
    <AuthLayout
      activeTab="signup"
      title="Create Account"
      subtitle="Join thousands of shoppers & creators across Nigeria"
    >
      <View style={styles.formContainer}>
        {/* Full Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Full Name</Text>
          <View
            style={[
              styles.inputWrapper,
              focusedField === 'name' && styles.inputWrapperFocused,
              errors.name && styles.inputError,
            ]}
          >
            <View style={styles.inputIconBox}>
              <Ionicons
                name="person-outline"
                size={18}
                color={errors.name ? COLORS.badgeRed : focusedField === 'name' ? COLORS.emeraldPrimary : COLORS.textSecondary}
              />
            </View>
            <TextInput
              style={styles.input}
              placeholder="e.g. Amina Bello"
              placeholderTextColor={COLORS.textMuted}
              value={name}
              onFocus={() => setFocusedField('name')}
              onBlur={() => setFocusedField(null)}
              onChangeText={(val) => {
                setName(val);
                if (errors.name) setErrors({ ...errors, name: null });
              }}
              autoCapitalize="words"
            />
          </View>
          {errors.name && (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle" size={13} color={COLORS.badgeRed} />
              <Text style={styles.errorText}>{errors.name}</Text>
            </View>
          )}
        </View>

        {/* Email Address */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email Address</Text>
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
              placeholder="amina.bello@example.ng"
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
            />
          </View>
          {errors.email && (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle" size={13} color={COLORS.badgeRed} />
              <Text style={styles.errorText}>{errors.email}</Text>
            </View>
          )}
        </View>

        {/* Phone Number */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone Number (Nigeria)</Text>
          <View
            style={[
              styles.inputWrapper,
              focusedField === 'phone' && styles.inputWrapperFocused,
              errors.phone && styles.inputError,
            ]}
          >
            <View style={styles.inputIconBox}>
              <Ionicons
                name="call-outline"
                size={18}
                color={errors.phone ? COLORS.badgeRed : focusedField === 'phone' ? COLORS.emeraldPrimary : COLORS.textSecondary}
              />
            </View>
            <TextInput
              style={styles.input}
              placeholder="+234 803 123 4567 or 080..."
              placeholderTextColor={COLORS.textMuted}
              value={phone}
              onFocus={() => setFocusedField('phone')}
              onBlur={() => setFocusedField(null)}
              onChangeText={(val) => {
                setPhone(val);
                if (errors.phone) setErrors({ ...errors, phone: null });
              }}
              keyboardType="phone-pad"
            />
          </View>
          {errors.phone && (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle" size={13} color={COLORS.badgeRed} />
              <Text style={styles.errorText}>{errors.phone}</Text>
            </View>
          )}
        </View>

        {/* Password */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
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
              placeholder="Minimum 8 characters"
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
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={19}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {strength && (
            <View style={styles.strengthRow}>
              <View style={styles.strengthBarBg}>
                <View style={[styles.strengthBarFill, { width: strength.width, backgroundColor: strength.color }]} />
              </View>
              <Text style={[styles.strengthLabel, { color: strength.color }]}>
                {strength.level}
              </Text>
            </View>
          )}

          {errors.password && (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle" size={13} color={COLORS.badgeRed} />
              <Text style={styles.errorText}>{errors.password}</Text>
            </View>
          )}
        </View>

        {/* Terms Agreement */}
        <View style={styles.termsContainer}>
          <TouchableOpacity
            style={styles.termsRow}
            activeOpacity={0.7}
            onPress={() => {
              setAgreed(!agreed);
              if (errors.agreed) setErrors({ ...errors, agreed: null });
            }}
          >
            <View style={[styles.checkbox, agreed && styles.checkboxActive, errors.agreed && styles.checkboxError]}>
              {agreed && <Ionicons name="checkmark" size={14} color={COLORS.white} />}
            </View>
            <Text style={styles.termsText}>
              I agree to the <Text style={styles.termsLink}>Terms</Text> and{' '}
              <Text style={styles.termsLink}>Privacy Policy</Text>.
            </Text>
          </TouchableOpacity>
          {errors.agreed && (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle" size={13} color={COLORS.badgeRed} />
              <Text style={styles.errorText}>{errors.agreed}</Text>
            </View>
          )}
        </View>

        {/* Submit Pill */}
        <TouchableOpacity
          style={styles.submitBtnPill}
          activeOpacity={0.88}
          onPress={handleNext}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <View style={styles.btnContentRow}>
              <Text style={styles.submitBtnText}>Continue to Verification</Text>
              <View style={styles.btnIconBadge}>
                <Ionicons name="arrow-forward" size={15} color={COLORS.emeraldPrimary} />
              </View>
            </View>
          )}
        </TouchableOpacity>

        {/* Switch Link */}
        <View style={styles.cardFooter}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigate('auth-signin')}>
            <Text style={styles.signInLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  formContainer: {
    gap: 13,
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
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '500',
    includeFontPadding: false,
    paddingVertical: 0,
  },
  eyeButton: {
    padding: 4,
  },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
    paddingHorizontal: 2,
  },
  strengthBarBg: {
    flex: 1,
    height: 4,
    backgroundColor: '#EBE7DD',
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 11,
    fontWeight: '700',
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
  termsContainer: {
    marginTop: 2,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  checkbox: {
    width: 19,
    height: 19,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#C7C2B6',
    backgroundColor: '#FAF9F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxActive: {
    backgroundColor: COLORS.emeraldPrimary,
    borderColor: COLORS.emeraldPrimary,
  },
  checkboxError: {
    borderColor: COLORS.badgeRed,
  },
  termsText: {
    flex: 1,
    fontSize: 12.5,
    color: COLORS.textSecondary,
    lineHeight: 18,
    fontWeight: '500',
  },
  termsLink: {
    color: COLORS.emeraldPrimary,
    fontWeight: '700',
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
});

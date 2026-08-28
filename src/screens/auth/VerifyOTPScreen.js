import React, { useState, useEffect, useRef } from 'react';
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

export default function VerifyOTPScreen() {
  const { signUp, intendedRoute, setIntendedRoute, showToast } = useApp();
  const { currentRoute, goBack, reset } = useNavigation();

  const params = currentRoute.params || {};
  const phone = params.phone || '+234 803 123 4567';
  const name = params.name || 'Amina Bello';
  const email = params.email || 'amina.bello@example.ng';

  const [otp, setOtp] = useState(['5', '9', '2', '', '', '']);
  const [focusedIndex, setFocusedIndex] = useState(3);
  const [timer, setTimer] = useState(45);
  const [isLoading, setIsLoading] = useState(false);

  const inputRefs = useRef([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleOtpChange = (text, index) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      signUp(name, email, phone);
      showToast(`Welcome, ${name}!`);
      if (intendedRoute) {
        const target = intendedRoute;
        setIntendedRoute(null);
        reset(target.name, target.params);
      } else {
        reset('home');
      }
    }, 500);
  };

  const handleResend = () => {
    setTimer(60);
    showToast('A new 6-digit code was sent to ' + phone);
  };

  return (
    <AuthLayout
      activeTab={null}
      title="Verify Phone"
      subtitle={`Code sent to ${phone}`}
    >
      <View style={styles.formContainer}>
        {/* Change Phone Option */}
        <View style={styles.changePhoneRow}>
          <TouchableOpacity onPress={goBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.changePhoneText}>Incorrect phone number? Edit</Text>
          </TouchableOpacity>
        </View>

        {/* 6-Digit OTP Boxes */}
        <View style={styles.otpRow}>
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputRefs.current[index] = ref)}
              style={[
                styles.otpBox,
                otp[index] ? styles.otpBoxFilled : null,
                focusedIndex === index ? styles.otpBoxFocused : null,
              ]}
              keyboardType="number-pad"
              maxLength={1}
              value={otp[index]}
              onFocus={() => setFocusedIndex(index)}
              onBlur={() => setFocusedIndex(null)}
              onChangeText={(text) => handleOtpChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              selectTextOnFocus
            />
          ))}
        </View>

        {/* Verify CTA Button Pill */}
        <TouchableOpacity
          style={styles.submitBtnPill}
          activeOpacity={0.88}
          onPress={handleVerify}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <View style={styles.btnContentRow}>
              <Text style={styles.submitBtnText}>Verify & Proceed</Text>
              <View style={styles.btnIconBadge}>
                <Ionicons name="checkmark" size={15} color={COLORS.emeraldPrimary} />
              </View>
            </View>
          )}
        </TouchableOpacity>

        {/* Resend Timer */}
        <View style={styles.resendContainer}>
          {timer > 0 ? (
            <Text style={styles.resendTimer}>
              Resend code in <Text style={styles.timerCountdown}>{timer}s</Text>
            </Text>
          ) : (
            <TouchableOpacity
              style={styles.resendActionBtn}
              onPress={handleResend}
              activeOpacity={0.7}
            >
              <Text style={styles.resendLink}>Resend 6-Digit Code</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  formContainer: {
    gap: 14,
  },
  changePhoneRow: {
    alignItems: 'center',
    marginBottom: 4,
  },
  changePhoneText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.goldDark,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  otpBox: {
    width: 44,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#F7F5EE',
    borderWidth: 1.5,
    borderColor: '#E6E1D4',
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.emeraldPrimary,
    includeFontPadding: false,
  },
  otpBoxFilled: {
    borderColor: COLORS.emeraldLight,
    backgroundColor: '#F0F6F3',
  },
  otpBoxFocused: {
    borderColor: COLORS.emeraldPrimary,
    backgroundColor: '#FFFFFF',
    shadowColor: COLORS.emeraldPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
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
  resendContainer: {
    alignItems: 'center',
    marginTop: 4,
  },
  resendTimer: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  timerCountdown: {
    fontWeight: '700',
    color: COLORS.emeraldPrimary,
  },
  resendActionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  resendLink: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.goldDark,
  },
});

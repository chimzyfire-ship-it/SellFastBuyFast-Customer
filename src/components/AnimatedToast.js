import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Animated,
  TouchableOpacity,
  Platform,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

export default function AnimatedToast({ message, onDismiss }) {
  const translateYAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    if (message) {
      // 1. Spring-based Slide Down & Scale Pop
      Animated.parallel([
        Animated.spring(translateYAnim, {
          toValue: 0,
          friction: 6,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();

      // 2. Auto-dismiss slide out after 3.2s
      const timer = setTimeout(() => {
        handleDismiss();
      }, 3200);

      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(translateYAnim, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss && onDismiss();
    });
  };

  if (!message) return null;

  const isWelcome = message.toLowerCase().includes('welcome');

  return (
    <SafeAreaView style={styles.safeWrapper} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.toastContainer,
          {
            opacity: opacityAnim,
            transform: [{ translateY: translateYAnim }, { scale: scaleAnim }],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.toastCard}
          activeOpacity={0.9}
          onPress={handleDismiss}
        >
          <View style={styles.iconCircle}>
            <Ionicons
              name={isWelcome ? 'sparkles' : 'checkmark-circle'}
              size={18}
              color="#C69B56"
            />
          </View>

          <View style={styles.textCol}>
            {isWelcome && <Text style={styles.welcomeKicker}>AUTHENTICATED</Text>}
            <Text style={styles.messageText}>{message}</Text>
          </View>

          <TouchableOpacity
            onPress={handleDismiss}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.closeBtn}
          >
            <Ionicons name="close" size={16} color="rgba(255, 255, 255, 0.6)" />
          </TouchableOpacity>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeWrapper: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 10 : 30,
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
  },
  toastContainer: {
    width: '90%',
    maxWidth: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  toastCard: {
    backgroundColor: '#0F382C',
    borderRadius: 22,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderColor: '#C69B56',
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(198, 155, 86, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
  },
  welcomeKicker: {
    fontSize: 9.5,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    color: '#C69B56',
    letterSpacing: 1,
  },
  messageText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
});

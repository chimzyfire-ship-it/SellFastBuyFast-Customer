import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  ImageBackground,
  SafeAreaView,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { useNavigation } from '../../navigation/NavigationContext';

export default function AuthLayout({
  title,
  subtitle,
  activeTab = null,
  showBack = true,
  children,
}) {
  const { goBack, navigate } = useNavigation();

  return (
    <View style={styles.outerContainer}>
      <ImageBackground
        source={require('../../../assets/auth-bg.jpg')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        {/* Ambient Dark Emerald Scrim */}
        <View style={styles.overlayScrim} />

        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardView}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Top Navigation Row */}
              <View style={styles.topNavRow}>
                {showBack ? (
                  <TouchableOpacity
                    style={styles.backButton}
                    onPress={goBack}
                    activeOpacity={0.75}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    accessibilityLabel="Go back"
                  >
                    <Ionicons name="arrow-back" size={20} color={COLORS.white} />
                  </TouchableOpacity>
                ) : (
                  <View style={styles.backButtonPlaceholder} />
                )}
              </View>

              {/* Minimalist Brand Logo & Header Centerpiece */}
              <View style={styles.brandCenterpiece}>
                <Image
                  source={require('../../../assets/sellfastbuyfast-logo.png')}
                  style={styles.brandLogo}
                  resizeMode="contain"
                  accessibilityLabel="SellFastBuyFast"
                />

                {title && <Text style={styles.headerTitle}>{title}</Text>}
                {subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
              </View>

              {/* Liquid Glass Segmented Tab Switcher */}
              {activeTab && (
                <View style={styles.glassSegmentedContainer}>
                  <TouchableOpacity
                    style={[
                      styles.glassSegmentTab,
                      activeTab === 'signin' && styles.glassSegmentTabActive,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => {
                      if (activeTab !== 'signin') navigate('auth-signin');
                    }}
                  >
                    <Text
                      style={[
                        styles.glassSegmentText,
                        activeTab === 'signin' && styles.glassSegmentTextActive,
                      ]}
                    >
                      Sign In
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.glassSegmentTab,
                      activeTab === 'signup' && styles.glassSegmentTabActive,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => {
                      if (activeTab !== 'signup') navigate('auth-signup');
                    }}
                  >
                    <Text
                      style={[
                        styles.glassSegmentText,
                        activeTab === 'signup' && styles.glassSegmentTextActive,
                      ]}
                    >
                      Create Account
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Liquid Glass Form Container */}
              <View style={styles.liquidGlassCard}>
                {children}
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#071812',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlayScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 20, 15, 0.68)',
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: Platform.OS === 'android' ? 10 : 4,
    paddingBottom: 32,
  },
  topNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonPlaceholder: {
    width: 40,
    height: 40,
  },
  brandCenterpiece: {
    alignItems: 'center',
    marginBottom: 16,
  },
  brandLogo: {
    height: 38,
    width: 156,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 13.5,
    color: 'rgba(255, 255, 255, 0.78)',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 19,
  },
  glassSegmentedContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.32)',
    borderRadius: 24,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    marginBottom: 16,
  },
  glassSegmentTab: {
    flex: 1,
    height: 38,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassSegmentTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  glassSegmentText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.75)',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  glassSegmentTextActive: {
    color: COLORS.emeraldPrimary,
    fontWeight: '700',
  },
  liquidGlassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 28,
    padding: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.65)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.32,
    shadowRadius: 24,
    elevation: 8,
  },
});

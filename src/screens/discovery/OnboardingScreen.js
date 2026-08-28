import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
  FlatList,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { useNavigation } from '../../navigation/NavigationContext';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    kicker: "NIGERIA'S #1 MARKETPLACE",
    title: 'Shop Everything\nYou Love in One Place',
    description: 'Explore latest smartphones, sneakers, designer wear, accessories & beauty — 100% authentic from top verified merchants.',
    image: require('../../../assets/onboarding-slide1.png'),
  },
  {
    id: '2',
    kicker: 'ZERO-STRESS ESCROW PROTECTION',
    title: 'Pay With Confidence\n& Total Security',
    description: 'Seamless Naira card checkout, bank transfers & automated Paystack escrow. Your payment is protected until you receive your order.',
    image: require('../../../assets/onboarding-slide2.png'),
  },
  {
    id: '3',
    kicker: 'EXPRESS NATIONWIDE DELIVERY',
    title: 'Direct to Your Doorstep\nin Record Time',
    description: 'Live real-time courier tracking across Lagos, Abuja, Port Harcourt & nationwide with 7-day easy returns and priority care.',
    image: require('../../../assets/onboarding-slide3.jpg'),
  },
];

export default function OnboardingScreen() {
  const { navigate, reset } = useNavigation();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef(null);

  const handleScroll = (event) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    if (slideIndex !== activeIndex && slideIndex >= 0 && slideIndex < SLIDES.length) {
      setActiveIndex(slideIndex);
    }
  };

  const handleSkip = () => {
    reset('home');
  };

  const scrollToSlide = (index) => {
    flatListRef.current?.scrollToIndex({ index, animated: true });
    setActiveIndex(index);
  };

  const renderSlideItem = ({ item }) => (
    <View style={styles.slideItem}>
      {/* 100% Edge-to-Edge Full Screen Image (Zero Fade Delay & GPU Cached) */}
      <Image
        source={item.image}
        style={styles.fullScreenImage}
        resizeMode="cover"
        fadeDuration={0}
      />

      {/* Seamless Lighter Luxury Green Gradient Fade from Mid-Screen */}
      <LinearGradient
        colors={[
          'rgba(7, 32, 25, 0)',
          'rgba(7, 32, 25, 0.25)',
          'rgba(7, 32, 25, 0.65)',
          'rgba(7, 32, 25, 0.92)',
          '#072019',
          '#051813',
        ]}
        locations={[0, 0.22, 0.45, 0.7, 0.88, 1]}
        style={styles.gradientOverlay}
      >
        <View style={styles.textContent}>
          {/* Kicker Typography - Pure & Clean without Emojis or Icons */}
          <Text style={styles.kickerText}>{item.kicker}</Text>

          {/* Editorial Google Font Playfair Display Title */}
          <Text style={styles.titleText}>{item.title}</Text>

          {/* Clean Google Font Plus Jakarta Sans Description */}
          <Text style={styles.descriptionText}>{item.description}</Text>
        </View>
      </LinearGradient>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Full-Screen Horizontal Paging Carousel with Instant Pre-caching */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlideItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onMomentumScrollEnd={handleScroll}
        decelerationRate="fast"
        snapToInterval={width}
        snapToAlignment="center"
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        windowSize={3}
        removeClippedSubviews={false}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        style={styles.flatList}
      />

      {/* Floating Skip Action Top Right */}
      <TouchableOpacity
        onPress={handleSkip}
        style={styles.skipBtn}
        activeOpacity={0.75}
        hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
      >
        <Text style={styles.skipText}>Skip</Text>
        <Ionicons name="chevron-forward" size={13} color="rgba(255, 255, 255, 0.95)" />
      </TouchableOpacity>

      {/* Centered Bigger Floating Hero Logo (Dropped Down from Top Bar) */}
      <View style={styles.floatingHeroLogoContainer} pointerEvents="none">
        <Image
          source={require('../../../assets/sellfastbuyfast-logo.png')}
          style={styles.heroLogo}
          resizeMode="contain"
          accessibilityLabel="SellFastBuyFast"
        />
      </View>

      {/* Floating Bottom Action Dock & Paging Dots */}
      <View style={styles.floatingFooterContainer} pointerEvents="box-none">
        {/* Paging Indicators */}
        <View style={styles.paginationRow}>
          {SLIDES.map((_, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => scrollToSlide(idx)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={[
                styles.dot,
                idx === activeIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        {/* Primary Action Button Pill */}
        <TouchableOpacity
          style={styles.primaryBtnPill}
          activeOpacity={0.88}
          onPress={() => navigate('auth-signup')}
        >
          <Text style={styles.primaryBtnText}>Create Free Account</Text>
          <View style={styles.btnIconBadge}>
            <Ionicons name="arrow-forward" size={14} color={COLORS.goldAccent} />
          </View>
        </TouchableOpacity>

        {/* Secondary Action Button Pill */}
        <TouchableOpacity
          style={styles.secondaryBtnPill}
          activeOpacity={0.78}
          onPress={() => navigate('auth-signin')}
        >
          <Text style={styles.secondaryBtnText}>Sign In to Account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#072019',
    width: '100%',
    height: '100%',
  },
  flatList: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  slideItem: {
    width: width,
    height: height,
    position: 'relative',
  },
  fullScreenImage: {
    width: width,
    height: height,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.54,
    justifyContent: 'flex-start',
    paddingTop: height * 0.07,
  },
  textContent: {
    paddingHorizontal: 26,
    alignItems: 'center',
  },
  kickerText: {
    fontSize: 11.5,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    color: COLORS.goldLight,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginBottom: 8,
    textAlign: 'center',
  },
  titleText: {
    fontSize: 28,
    fontFamily: 'PlayfairDisplay-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 34,
    letterSpacing: -0.4,
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.45)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  descriptionText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Medium',
    color: 'rgba(255, 255, 255, 0.88)',
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  floatingHeroLogoContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 82 : 68,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  heroLogo: {
    height: 60,
    width: 248,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.55,
    shadowRadius: 12,
  },
  skipBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 52 : 44,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 6,
    paddingHorizontal: 8,
    zIndex: 30,
  },
  skipText: {
    fontSize: 13.5,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.95)',
    textShadowColor: 'rgba(0, 0, 0, 0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  floatingFooterContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 34 : 26,
    left: 0,
    right: 0,
    paddingHorizontal: 22,
    gap: 10,
    zIndex: 20,
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
    marginBottom: 8,
  },
  dot: {
    height: 4.5,
    borderRadius: 2.5,
  },
  dotActive: {
    width: 26,
    backgroundColor: COLORS.goldAccent,
  },
  dotInactive: {
    width: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  primaryBtnPill: {
    backgroundColor: COLORS.goldAccent,
    height: 54,
    borderRadius: 27,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryBtnText: {
    color: '#072019',
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    letterSpacing: 0.2,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  btnIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#072019',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnPill: {
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});

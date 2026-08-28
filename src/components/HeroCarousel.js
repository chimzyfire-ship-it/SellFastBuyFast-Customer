import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 40;

const SLIDES = [
  {
    id: '1',
    subtitle: 'NEW ARRIVALS',
    title: 'Elevate your\neveryday',
    description: 'Discover quality, style and value\ncrafted for modern living.',
    buttonText: 'Shop Now',
    image: require('../../assets/hero-handbag.jpg'),
  },
  {
    id: '2',
    subtitle: 'PREMIUM TECH',
    title: 'Precision sound\n& smart living',
    description: 'Next-gen audio, wearables and\ngadgets for seamless lifestyle.',
    buttonText: 'Shop Now',
    image: { uri: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80' },
  },
  {
    id: '3',
    subtitle: 'HOME LUXURY',
    title: 'Curated modern\ninteriors',
    description: 'Handcrafted accent furniture and\ncontemporary living accents.',
    buttonText: 'Shop Now',
    image: { uri: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=800&q=80' },
  },
];

export default function HeroCarousel({ onCtaPress }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollViewRef = useRef(null);

  const handleScroll = (event) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / CARD_WIDTH);
    if (index !== activeIndex && index >= 0 && index < SLIDES.length) {
      setActiveIndex(index);
    }
  };

  return (
    <View style={styles.outerContainer}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + 12}
        snapToAlignment="center"
        contentContainerStyle={styles.scrollContent}
      >
        {SLIDES.map((slide) => (
          <View key={slide.id} style={styles.card}>
            {/* Left Content Area */}
            <View style={styles.contentContainer}>
              <Text style={styles.subtitle}>{slide.subtitle}</Text>
              <Text style={styles.title} numberOfLines={2}>
                {slide.title}
              </Text>
              <Text style={styles.description} numberOfLines={2}>
                {slide.description}
              </Text>

              <TouchableOpacity
                style={styles.ctaButtonPill}
                activeOpacity={0.88}
                onPress={() => onCtaPress && onCtaPress(slide)}
              >
                <Text style={styles.buttonText}>{slide.buttonText}</Text>
                <View style={styles.btnIconBadge}>
                  <Ionicons name="chevron-forward" size={13} color={COLORS.white} />
                </View>
              </TouchableOpacity>
            </View>

            {/* Right Image Container */}
            <View style={styles.imageContainer}>
              <Image
                source={typeof slide.image === 'string' ? { uri: slide.image } : slide.image}
                style={styles.heroImage}
                resizeMode="cover"
              />
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Pagination Dots */}
      <View style={styles.pagination}>
        {SLIDES.map((_, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => {
              setActiveIndex(index);
              scrollViewRef.current?.scrollTo({
                x: index * (CARD_WIDTH + 12),
                animated: true,
              });
            }}
            style={[
              styles.dot,
              activeIndex === index ? styles.activeDot : styles.inactiveDot,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    marginVertical: 4,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  card: {
    width: CARD_WIDTH,
    height: 200,
    backgroundColor: '#EBE7DF',
    borderRadius: 24,
    flexDirection: 'row',
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E2DDD3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  contentContainer: {
    flex: 1.15,
    paddingLeft: 18,
    paddingRight: 6,
    paddingVertical: 18,
    justifyContent: 'center',
    zIndex: 2,
  },
  subtitle: {
    fontSize: 10,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-ExtraBold',
    color: '#C69B56',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    fontSize: 23,
    lineHeight: 27,
    fontFamily: 'PlayfairDisplay-Bold',
    fontWeight: '700',
    color: '#0F382C',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 11,
    lineHeight: 15,
    fontFamily: 'PlusJakartaSans-Medium',
    color: '#5C6057',
    marginBottom: 12,
  },
  ctaButtonPill: {
    backgroundColor: '#0F382C',
    paddingVertical: 6,
    paddingLeft: 14,
    paddingRight: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    shadowColor: '#0F382C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    letterSpacing: 0.2,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  btnIconBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#C69B56',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 4,
    gap: 6,
  },
  dot: {
    height: 5,
    borderRadius: 2.5,
  },
  activeDot: {
    width: 18,
    backgroundColor: '#0F382C',
  },
  inactiveDot: {
    width: 5,
    backgroundColor: '#D5D0C5',
  },
});

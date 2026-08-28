import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { COLORS, SHADOWS } from '../theme/colors';
import { HERO_SLIDES } from '../data/mockData';

export default function HeroCarousel({ onCtaPress }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const slide = HERO_SLIDES[activeIndex];

  const handleNextSlide = () => {
    setActiveIndex((prev) => (prev + 1) % HERO_SLIDES.length);
  };

  return (
    <View style={styles.outerContainer}>
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={handleNextSlide}
        style={styles.card}
      >
        <View style={styles.contentContainer}>
          <Text style={styles.subtitle}>{slide.subtitle}</Text>
          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.description}>{slide.description}</Text>

          <TouchableOpacity
            style={styles.appleButton}
            activeOpacity={0.8}
            onPress={() => onCtaPress && onCtaPress(slide)}
          >
            <Text style={styles.buttonText}>{slide.buttonText}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.imageContainer}>
          <Image
            source={{ uri: slide.image }}
            style={styles.heroImage}
            resizeMode="cover"
          />
        </View>
      </TouchableOpacity>

      <View style={styles.pagination}>
        {HERO_SLIDES.map((_, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => setActiveIndex(index)}
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
    paddingHorizontal: 20,
    marginVertical: 12,
  },
  card: {
    backgroundColor: COLORS.emeraldPrimary,
    borderRadius: 24,
    minHeight: 190,
    flexDirection: 'row',
    overflow: 'hidden',
    position: 'relative',
    ...SHADOWS.appleMedium,
  },
  contentContainer: {
    flex: 1.25,
    padding: 20,
    justifyContent: 'center',
    zIndex: 2,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.goldAccent,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  title: {
    fontSize: 24,
    lineHeight: 28,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 8,
  },
  description: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
    marginBottom: 16,
  },
  appleButton: {
    backgroundColor: COLORS.goldAccent,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignSelf: 'flex-start',
    ...SHADOWS.goldGlow,
  },
  buttonText: {
    color: COLORS.emeraldDark,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  imageContainer: {
    flex: 0.95,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  heroImage: {
    width: '100%',
    height: '90%',
    borderRadius: 16,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  activeDot: {
    width: 20,
    backgroundColor: COLORS.emeraldPrimary,
  },
  inactiveDot: {
    width: 6,
    backgroundColor: COLORS.border,
  },
});

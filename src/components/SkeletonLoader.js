import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, Dimensions } from 'react-native';
import { COLORS } from '../theme/colors';

const { width } = Dimensions.get('window');

export function SkeletonItem({ style }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.8,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [opacity]);

  return <Animated.View style={[styles.skeleton, style, { opacity }]} />;
}

export function ProductCardSkeleton() {
  const cardWidth = (width - 56) / 2;
  return (
    <View style={[styles.cardContainer, { width: cardWidth }]}>
      <SkeletonItem style={styles.cardImage} />
      <SkeletonItem style={styles.cardTextTitle} />
      <SkeletonItem style={styles.cardTextPrice} />
    </View>
  );
}

export function HeroSkeleton() {
  return (
    <View style={styles.heroContainer}>
      <SkeletonItem style={styles.heroImage} />
    </View>
  );
}

export function OrderCardSkeleton() {
  return (
    <View style={styles.orderCard}>
      <View style={styles.orderRow}>
        <SkeletonItem style={{ width: 120, height: 16, borderRadius: 8 }} />
        <SkeletonItem style={{ width: 60, height: 20, borderRadius: 10 }} />
      </View>
      <SkeletonItem style={{ width: '80%', height: 14, borderRadius: 6, marginVertical: 12 }} />
      <View style={styles.orderRow}>
        <SkeletonItem style={{ width: 80, height: 14, borderRadius: 6 }} />
        <SkeletonItem style={{ width: 90, height: 18, borderRadius: 6 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: COLORS.border,
  },
  cardContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  cardImage: {
    width: '100%',
    height: 140,
    borderRadius: 12,
  },
  cardTextTitle: {
    width: '85%',
    height: 14,
    borderRadius: 6,
  },
  cardTextPrice: {
    width: '50%',
    height: 16,
    borderRadius: 6,
  },
  heroContainer: {
    marginHorizontal: 20,
    marginTop: 14,
    height: 160,
    borderRadius: 20,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  orderCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginBottom: 12,
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justify: 'space-between',
  },
});

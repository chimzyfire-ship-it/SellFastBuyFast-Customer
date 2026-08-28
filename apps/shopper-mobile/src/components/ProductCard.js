import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

export default function ProductCard({
  product,
  isWishlisted,
  onToggleWishlist,
  onPress,
}) {
  return (
    <TouchableOpacity
      style={styles.cardContainer}
      activeOpacity={0.88}
      onPress={() => onPress && onPress(product)}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: product.image }}
          style={styles.productImage}
          resizeMode="cover"
        />

        {product.badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{product.badge}</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.wishlistButton}
          activeOpacity={0.7}
          onPress={() => onToggleWishlist && onToggleWishlist(product.id)}
        >
          <Ionicons
            name={isWishlisted ? 'heart' : 'heart-outline'}
            size={18}
            color={isWishlisted ? COLORS.badgeRed : COLORS.textPrimary}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.detailsContainer}>
        <Text style={styles.productName} numberOfLines={1}>
          {product.name}
        </Text>
        <Text style={styles.productPrice}>
          {product.formattedPrice}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    width: '47.5%',
    marginBottom: 16,
  },
  imageContainer: {
    width: '100%',
    height: 165,
    backgroundColor: COLORS.imageBg,
    borderRadius: 18,
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productImage: {
    width: '90%',
    height: '90%',
    borderRadius: 12,
  },
  badge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(15, 56, 44, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: {
    color: COLORS.goldLight,
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  wishlistButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsContainer: {
    marginTop: 8,
    paddingHorizontal: 2,
  },
  productName: {
    fontSize: 13.5,
    fontWeight: '600',
    color: COLORS.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.emeraldPrimary,
  },
});

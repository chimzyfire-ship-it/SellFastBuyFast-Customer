import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Platform,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { useNavigation } from '../navigation/NavigationContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = Math.floor((width - 40 - 14) / 2);

const PRODUCT_ARCH_IMAGES = {
  p1: require('../../assets/product-smartwatch-arch.jpg'),
  p2: require('../../assets/product-sneakers-arch.jpg'),
  p3: require('../../assets/product-perfume-arch.jpg'),
  p4: require('../../assets/product-handbag-arch.jpg'),
};

export default function ProductCard({
  product,
  isWishlisted,
  onToggleWishlist,
  onPress,
  cardWidth,
}) {
  const { openModal } = useNavigation();
  const itemWidth = cardWidth || CARD_WIDTH;
  const imageSource = PRODUCT_ARCH_IMAGES[product.id] || { uri: product.image };

  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      friction: 8,
      tension: 60,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 8,
      tension: 60,
      useNativeDriver: true,
    }).start();
  };

  const handleLongPress = () => {
    try {
      const Haptics = require('expo-haptics');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (e) {}

    if (openModal) {
      openModal('product-quicklook', { product });
    }
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[styles.cardContainer, { width: itemWidth }]}
        activeOpacity={0.92}
        onPress={() => onPress && onPress(product)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onLongPress={handleLongPress}
        delayLongPress={280}
      >
        {/* Product Image on Clean Soft Neutral Surface */}
        <View style={[styles.imageContainer, { height: itemWidth - 20 }]}>
          <Image
            source={imageSource}
            style={styles.productImage}
            resizeMode="cover"
          />

          {/* Floating Heart Button */}
          <TouchableOpacity
            style={styles.wishlistButton}
            activeOpacity={0.75}
            onPress={() => onToggleWishlist && onToggleWishlist(product.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel={isWishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
          >
            <Ionicons
              name={isWishlisted ? 'heart' : 'heart-outline'}
              size={16}
              color={isWishlisted ? COLORS.badgeRed : '#2C302D'}
            />
          </TouchableOpacity>
        </View>

        {/* Product Details */}
        <View style={styles.detailsContainer}>
          <Text style={styles.kickerText}>
            {(product.category || product.badge || 'EXCLUSIVE').toUpperCase()}
          </Text>
          <Text style={styles.productName} numberOfLines={2}>
            {product.name}
          </Text>
          <Text style={styles.productPrice}>
            {product.formattedPrice}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ECE8E1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  imageContainer: {
    width: '100%',
    backgroundColor: '#F5F3ED',
    borderRadius: 16,
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  wishlistButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  detailsContainer: {
    marginTop: 8,
    paddingHorizontal: 2,
  },
  kickerText: {
    fontSize: 9,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    color: '#C69B56',
    letterSpacing: 1.1,
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  productName: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontWeight: '600',
    color: '#1A1D1A',
    lineHeight: 17,
    marginBottom: 4,
    minHeight: 34,
  },
  productPrice: {
    fontSize: 14.5,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    color: '#0F382C',
  },
});

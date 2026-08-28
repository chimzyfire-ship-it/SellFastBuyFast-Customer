import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
  Share,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { useApp } from '../context/AppContext';
import { useNavigation } from '../navigation/NavigationContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = Math.min(width - 48, 360);

const PRODUCT_ARCH_IMAGES = {
  p1: require('../../assets/product-smartwatch-arch.jpg'),
  p2: require('../../assets/product-sneakers-arch.jpg'),
  p3: require('../../assets/product-perfume-arch.jpg'),
  p4: require('../../assets/product-handbag-arch.jpg'),
};

export default function ProductQuickLookModal() {
  const { wishlist, toggleWishlist, addToCart, showToast } = useApp();
  const { activeModal, closeModal, navigate } = useNavigation();

  const visible = activeModal?.name === 'product-quicklook';
  const product = activeModal?.params?.product;
  const isWishlisted = product ? wishlist.includes(product.id) : false;

  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const translateYAnim = useRef(new Animated.Value(24)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && product) {
      try {
        const Haptics = require('expo-haptics');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (e) {}

      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.spring(translateYAnim, {
          toValue: 0,
          friction: 6,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.88);
      translateYAnim.setValue(24);
      fadeAnim.setValue(0);
    }
  }, [visible, product]);

  if (!visible || !product) return null;

  const imageSource = PRODUCT_ARCH_IMAGES[product.id] || { uri: product.image };

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.92,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      closeModal();
    });
  };

  const handleViewDetails = () => {
    closeModal();
    navigate('product-detail', { productId: product.id, product });
  };

  const handleQuickAdd = () => {
    addToCart(product, product.colors?.[0] || '#1C1C1E', product.sizes?.[0] || 'Standard');
    showToast && showToast(`Added ${product.name} to bag`);
    closeModal();
  };

  const handleToggleWishlist = () => {
    toggleWishlist(product.id);
    showToast && showToast(isWishlisted ? 'Removed from wishlist' : 'Saved to wishlist');
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${product.name} on SellFastBuyFast: ${product.formattedPrice}`,
      });
    } catch (e) {}
  };

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdropTap}
          activeOpacity={1}
          onPress={handleDismiss}
        />

        <Animated.View
          style={[
            styles.contentContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }, { translateY: translateYAnim }],
            },
          ]}
        >
          {/* Main Product Peek Card */}
          <View style={styles.previewCard}>
            {/* Arched Image Header */}
            <View style={styles.imageHeaderWrapper}>
              <Image source={imageSource} style={styles.previewImage} resizeMode="cover" />
              <View style={styles.verifiedTag}>
                <Ionicons name="sparkles" size={11} color="#C69B56" />
                <Text style={styles.verifiedText}>Verified Merchant</Text>
              </View>
            </View>

            {/* Content Details */}
            <View style={styles.cardDetails}>
              <View style={styles.titlePriceRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.merchantSub}>{product.merchant}</Text>
                  <Text style={styles.productTitle} numberOfLines={1}>{product.name}</Text>
                </View>
                <Text style={styles.productPrice}>{product.formattedPrice}</Text>
              </View>

              <View style={styles.ratingRow}>
                <Ionicons name="star" size={13} color="#C69B56" />
                <Text style={styles.ratingScore}>{product.rating}</Text>
                <Text style={styles.reviewsCount}>({product.reviewsCount} verified reviews)</Text>
              </View>

              <Text style={styles.descText} numberOfLines={2}>
                {product.description}
              </Text>
            </View>
          </View>

          {/* Liquid Glass iOS Context Menu */}
          <View style={styles.liquidGlassMenu}>
            <TouchableOpacity
              style={styles.menuRow}
              activeOpacity={0.7}
              onPress={handleViewDetails}
            >
              <View style={styles.menuIconWrap}>
                <Ionicons name="eye-outline" size={18} color="#0F382C" />
              </View>
              <Text style={styles.menuText}>View Full Details</Text>
              <Ionicons name="chevron-forward" size={15} color="#8F948B" />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuRow}
              activeOpacity={0.7}
              onPress={handleQuickAdd}
            >
              <View style={[styles.menuIconWrap, { backgroundColor: '#EAF6EC' }]}>
                <Ionicons name="bag-handle-outline" size={18} color="#157347" />
              </View>
              <Text style={[styles.menuText, { color: '#0F382C' }]}>Quick Add to Bag</Text>
              <Ionicons name="add" size={16} color="#157347" />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuRow}
              activeOpacity={0.7}
              onPress={handleToggleWishlist}
            >
              <View style={styles.menuIconWrap}>
                <Ionicons
                  name={isWishlisted ? 'heart' : 'heart-outline'}
                  size={18}
                  color={isWishlisted ? '#D9383A' : '#0F382C'}
                />
              </View>
              <Text style={styles.menuText}>
                {isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
              </Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuRow}
              activeOpacity={0.7}
              onPress={handleShare}
            >
              <View style={styles.menuIconWrap}>
                <Ionicons name="share-outline" size={18} color="#0F382C" />
              </View>
              <Text style={styles.menuText}>Share Curated Piece</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(7, 32, 25, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  backdropTap: {
    ...StyleSheet.absoluteFillObject,
  },
  contentContainer: {
    width: CARD_WIDTH,
    alignItems: 'center',
    gap: 14,
  },
  previewCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.35,
    shadowRadius: 28,
    elevation: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  imageHeaderWrapper: {
    width: '100%',
    height: 240,
    backgroundColor: '#EBE7DF',
    position: 'relative',
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  verifiedTag: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: 'rgba(15, 56, 44, 0.9)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  verifiedText: {
    color: '#C69B56',
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
  },
  cardDetails: {
    padding: 18,
    gap: 6,
  },
  titlePriceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  merchantSub: {
    fontSize: 10.5,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#C69B56',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  productTitle: {
    fontSize: 18,
    fontFamily: 'PlayfairDisplay-Bold',
    fontWeight: '700',
    color: '#0F382C',
    marginTop: 2,
  },
  productPrice: {
    fontSize: 17,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    color: '#0F382C',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  ratingScore: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#1A1D1A',
  },
  reviewsCount: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#7E827A',
  },
  descText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#5C6057',
    lineHeight: 17,
    marginTop: 4,
  },
  liquidGlassMenu: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 22,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#ECE8E1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 16,
    gap: 12,
  },
  menuIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F3ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: {
    flex: 1,
    fontSize: 13.5,
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontWeight: '600',
    color: '#1A1D1A',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F0ECE4',
    marginHorizontal: 16,
  },
});

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../theme/colors';

export default function ProductModal({
  product,
  visible,
  onClose,
  onAddToCart,
  isWishlisted,
  onToggleWishlist,
}) {
  if (!product) return null;

  const [selectedColor, setSelectedColor] = useState(product.colors ? product.colors[0] : null);
  const [selectedSize, setSelectedSize] = useState(product.sizes ? product.sizes[0] : null);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.dismissOverlay} onPress={onClose} />

        <View style={styles.sheetContainer}>
          {/* Apple Modal Handle */}
          <View style={styles.handleBar} />

          {/* Close & Wishlist Controls */}
          <View style={styles.topControls}>
            <TouchableOpacity style={styles.iconCircle} onPress={onClose}>
              <Ionicons name="close" size={20} color={COLORS.textPrimary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconCircle}
              onPress={() => onToggleWishlist(product.id)}
            >
              <Ionicons
                name={isWishlisted ? 'heart' : 'heart-outline'}
                size={20}
                color={isWishlisted ? COLORS.badgeRed : COLORS.textPrimary}
              />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Main Product Image Container */}
            <View style={styles.imagePreviewWrapper}>
              <Image source={{ uri: product.image }} style={styles.previewImage} resizeMode="contain" />
            </View>

            {/* Merchant & Title */}
            <View style={styles.headerInfo}>
              <View style={styles.merchantBadge}>
                <Ionicons name="checkmark-seal" size={14} color={COLORS.goldAccent} />
                <Text style={styles.merchantText}>{product.merchant}</Text>
              </View>
              <Text style={styles.titleText}>{product.name}</Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={15} color={COLORS.goldAccent} />
                <Text style={styles.ratingText}>{product.rating} ({product.reviewsCount} reviews)</Text>
              </View>
            </View>

            {/* Color Selectors */}
            {product.colors && product.colors.length > 0 && (
              <View style={styles.optionSection}>
                <Text style={styles.optionLabel}>COLOR</Text>
                <View style={styles.optionsRow}>
                  {product.colors.map((colorHex, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => setSelectedColor(colorHex)}
                      style={[
                        styles.colorSwatch,
                        { backgroundColor: colorHex },
                        selectedColor === colorHex && styles.selectedColorSwatch,
                      ]}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* Size Selectors */}
            {product.sizes && product.sizes.length > 0 && (
              <View style={styles.optionSection}>
                <Text style={styles.optionLabel}>SIZE / VARIANT</Text>
                <View style={styles.optionsRow}>
                  {product.sizes.map((sz, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => setSelectedSize(sz)}
                      style={[
                        styles.sizePill,
                        selectedSize === sz ? styles.selectedSizePill : styles.unselectedSizePill,
                      ]}
                    >
                      <Text
                        style={[
                          styles.sizeText,
                          selectedSize === sz ? styles.selectedSizeText : styles.unselectedSizeText,
                        ]}
                      >
                        {sz}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Description */}
            <View style={styles.descriptionSection}>
              <Text style={styles.optionLabel}>DESCRIPTION</Text>
              <Text style={styles.descriptionText}>{product.description}</Text>
            </View>
          </ScrollView>

          {/* Bottom Sticky Action Bar with Apple Button */}
          <View style={styles.stickyFooter}>
            <View style={styles.priceContainer}>
              <Text style={styles.totalLabel}>PRICE</Text>
              <Text style={styles.priceValue}>{product.formattedPrice}</Text>
            </View>

            <TouchableOpacity
              style={styles.appleAddToCartButton}
              activeOpacity={0.85}
              onPress={() => {
                onAddToCart(product);
                onClose();
              }}
            >
              <Ionicons name="bag-add-outline" size={20} color={COLORS.white} style={{ marginRight: 8 }} />
              <Text style={styles.addToCartText}>Add to Cart</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  dismissOverlay: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '88%',
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  imagePreviewWrapper: {
    height: 220,
    backgroundColor: COLORS.imageBg,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  previewImage: {
    width: '85%',
    height: '85%',
  },
  headerInfo: {
    marginVertical: 8,
  },
  merchantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  merchantText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  titleText: {
    fontSize: 22,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontWeight: '700',
    color: COLORS.emeraldPrimary,
    marginBottom: 6,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  optionSection: {
    marginTop: 16,
  },
  optionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedColorSwatch: {
    borderColor: COLORS.emeraldPrimary,
    transform: [{ scale: 1.15 }],
  },
  sizePill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  selectedSizePill: {
    backgroundColor: COLORS.emeraldPrimary,
    borderColor: COLORS.emeraldPrimary,
  },
  unselectedSizePill: {
    backgroundColor: COLORS.cardBg,
    borderColor: COLORS.border,
  },
  sizeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  selectedSizeText: {
    color: COLORS.white,
  },
  unselectedSizeText: {
    color: COLORS.textPrimary,
  },
  descriptionSection: {
    marginTop: 18,
  },
  descriptionText: {
    fontSize: 13.5,
    lineHeight: 20,
    color: COLORS.textSecondary,
  },
  stickyFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    backgroundColor: COLORS.background,
  },
  priceContainer: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  priceValue: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.emeraldPrimary,
  },
  appleAddToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.emeraldPrimary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 24, // Apple pill style button
    ...SHADOWS.appleSoft,
  },
  addToCartText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
});

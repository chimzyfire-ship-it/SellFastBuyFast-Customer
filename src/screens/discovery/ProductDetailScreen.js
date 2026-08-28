import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Dimensions,
  Platform,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { PRODUCTS } from '../../data/mockData';
import { useApp } from '../../context/AppContext';
import { useNavigation } from '../../navigation/NavigationContext';

const { width } = Dimensions.get('window');
const ARCH_WIDTH = Math.floor((width - 40) * 0.58);

const PRODUCT_ARCH_IMAGES = {
  p1: require('../../../assets/product-smartwatch-arch.jpg'),
  p2: require('../../../assets/product-sneakers-arch.jpg'),
  p3: require('../../../assets/product-perfume-arch.jpg'),
  p4: require('../../../assets/product-handbag-arch.jpg'),
};

export default function ProductDetailScreen() {
  const { wishlist, toggleWishlist, addToCart, showToast } = useApp();
  const { currentRoute, goBack, navigate, openModal } = useNavigation();

  const product = currentRoute.params?.product || PRODUCTS[0];
  const isWishlisted = wishlist.includes(product.id);

  const [selectedColor, setSelectedColor] = useState(product.colors?.[0] || '#1C1C1E');
  const [selectedSize, setSelectedSize] = useState(product.sizes?.[0] || '41mm');
  const [activeSlide, setActiveSlide] = useState(0);

  const imageSource = PRODUCT_ARCH_IMAGES[product.id] || { uri: product.image };

  const handleAddToCart = () => {
    addToCart(product, selectedColor, selectedSize);
    showToast && showToast(`Added ${product.name} to bag`);
  };

  const handleBuyNow = () => {
    addToCart(product, selectedColor, selectedSize);
    navigate('bag');
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${product.name} on SellFastBuyFast - Nigeria's premier luxury marketplace: ${product.formattedPrice}`,
      });
    } catch (e) {
      console.log(e);
    }
  };

  const handleOpenGallery = () => {
    openModal('image-gallery', {
      imageUrl: imageSource,
      title: product.name,
    });
  };

  // 5 Carousel Slides: Slide 0 is the authentic image; Slides 1-4 are studio angle placeholders
  const ANGLE_SLIDES = [
    { type: 'image', source: imageSource, label: 'Hero Showcase' },
    { type: 'placeholder', icon: 'camera-outline', title: 'Side Profile', sub: 'Precision Case Finish' },
    { type: 'placeholder', icon: 'layers-outline', title: 'Detail Angle', sub: 'Material Craftsmanship' },
    { type: 'placeholder', icon: 'scan-outline', title: 'Back View', sub: 'Sensors & Hardware' },
    { type: 'placeholder', icon: 'gift-outline', title: 'Packaging', sub: 'Luxury Unboxing' },
  ];

  // Custom 4-feature highlights based on product category
  const getProductSpecs = (p) => {
    if (p.category === 'fashion') {
      return [
        { icon: 'shield-checkmark-outline', title: '100% Genuine', sub: 'Full Grain Leather' },
        { icon: 'cut-outline', title: 'Artisanal Craft', sub: 'Hand-stitched' },
        { icon: 'water-outline', title: 'Weatherproof', sub: 'Treated Lining' },
        { icon: 'ribbon-outline', title: 'Italian Metal', sub: 'Gold Hardware' },
      ];
    } else if (p.category === 'beauty') {
      return [
        { icon: 'sparkles-outline', title: 'Eau de Parfum', sub: '25% Concentration' },
        { icon: 'time-outline', title: '16hr Longevity', sub: 'All-day Sillage' },
        { icon: 'leaf-outline', title: 'Clean Floral', sub: 'Natural Bergamot' },
        { icon: 'flask-outline', title: 'French Glass', sub: 'Signature Bottle' },
      ];
    } else {
      return [
        { icon: 'heart-outline', title: 'Advanced', sub: 'Health Sensors' },
        { icon: 'sunny-outline', title: '2000 nits', sub: 'Brightness' },
        { icon: 'battery-charging-outline', title: 'All-day', sub: 'Battery' },
        { icon: 'flash-outline', title: 'Fast Charging', sub: 'Support' },
      ];
    }
  };

  const specs = getProductSpecs(product);

  const handleScroll = (event) => {
    const slide = Math.round(event.nativeEvent.contentOffset.x / ARCH_WIDTH);
    if (slide >= 0 && slide < ANGLE_SLIDES.length && slide !== activeSlide) {
      setActiveSlide(slide);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Floating Top Header Bar */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.circleBtn}
          onPress={goBack}
          activeOpacity={0.75}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={22} color="#0F382C" />
        </TouchableOpacity>

        <View style={styles.topHeaderRight}>
          <TouchableOpacity
            style={styles.circleBtn}
            onPress={() => toggleWishlist(product.id)}
            activeOpacity={0.75}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons
              name={isWishlisted ? 'heart' : 'heart-outline'}
              size={20}
              color={isWishlisted ? COLORS.badgeRed : '#0F382C'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.circleBtn}
            onPress={handleShare}
            activeOpacity={0.75}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="share-outline" size={20} color="#0F382C" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Split Showcase Header */}
        <View style={styles.heroSection}>
          {/* Left Column: Metadata, Hierarchy & Price */}
          <View style={styles.heroLeftCol}>
            <View style={styles.verifiedMerchantPill}>
              <Ionicons name="checkmark-circle" size={13} color="#C69B56" />
              <Text style={styles.verifiedMerchantText}>Verified Merchant</Text>
            </View>

            <Text style={styles.productNameTitle}>{product.name}</Text>

            <TouchableOpacity
              style={styles.ratingRow}
              activeOpacity={0.8}
              onPress={() => openModal('product-reviews', { product })}
            >
              <Ionicons name="star" size={14} color="#C69B56" />
              <Text style={styles.ratingScoreText}>{product.rating}</Text>
              <Text style={styles.reviewsCountText}>({product.reviewsCount} reviews)</Text>
            </TouchableOpacity>

            <Text style={styles.priceHeadingText}>{product.formattedPrice}</Text>

            {/* 3-Row Micro Trust Strip */}
            <View style={styles.microTrustCol}>
              <View style={styles.microTrustRow}>
                <Ionicons name="shield-checkmark-outline" size={14} color="#5C6057" />
                <Text style={styles.microTrustText}>1 Year Warranty</Text>
              </View>

              <View style={styles.microTrustRow}>
                <Ionicons name="car-outline" size={14} color="#5C6057" />
                <Text style={styles.microTrustText}>Fast Delivery</Text>
              </View>

              <View style={styles.microTrustRow}>
                <Ionicons name="shield-outline" size={14} color="#5C6057" />
                <Text style={styles.microTrustText}>100% Authentic</Text>
              </View>
            </View>
          </View>

          {/* Right Column: Cathedral Arched Showcase Frame with Horizontal Sliding Angle Gallery */}
          <View style={[styles.heroRightCol, { width: ARCH_WIDTH }]}>
            <View style={styles.archedFrame}>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handleScroll}
                style={styles.archScrollView}
                contentContainerStyle={{ width: ARCH_WIDTH * ANGLE_SLIDES.length }}
              >
                {ANGLE_SLIDES.map((slide, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.archSlide, { width: ARCH_WIDTH }]}
                    activeOpacity={0.92}
                    onPress={handleOpenGallery}
                  >
                    {slide.type === 'image' ? (
                      <Image
                        source={slide.source}
                        style={styles.archImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.placeholderSlideContainer}>
                        <View style={styles.placeholderIconCircle}>
                          <Ionicons name={slide.icon} size={28} color="#C69B56" />
                        </View>
                        <Text style={styles.placeholderAngleKicker}>ANGLE 0{idx + 1}</Text>
                        <Text style={styles.placeholderTitle}>{slide.title}</Text>
                        <Text style={styles.placeholderSub}>{slide.sub}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Tap to Zoom Glassmorphism Capsule */}
              <TouchableOpacity
                style={styles.tapZoomCapsule}
                activeOpacity={0.8}
                onPress={handleOpenGallery}
              >
                <Ionicons name="search" size={12} color="#0F382C" />
                <Text style={styles.tapZoomText}>Tap to zoom</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Carousel Dash Dynamic Pagination Indicators */}
        <View style={styles.carouselDashRow}>
          {ANGLE_SLIDES.map((_, idx) => {
            const isActive = activeSlide === idx;
            return (
              <View
                key={idx}
                style={[
                  styles.dashDot,
                  isActive && styles.dashPillActive,
                ]}
              />
            );
          })}
        </View>

        {/* Bento Selectors Card (Side-by-Side: Color & Size) */}
        <View style={styles.bentoSelectorsCard}>
          {/* Left Sub-column: Color */}
          <View style={styles.selectorCol}>
            <Text style={styles.selectorLabel}>Color</Text>
            <View style={styles.swatchesRow}>
              {(product.colors || ['#1C1C1E', '#E3DCD2', '#1B3B30']).map((cHex, idx) => {
                const isSelected = selectedColor === cHex;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.swatchCircleWrapper,
                      isSelected && styles.swatchCircleSelected,
                    ]}
                    onPress={() => setSelectedColor(cHex)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.swatchInner, { backgroundColor: cHex }]} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Vertical Divider */}
          <View style={styles.selectorDivider} />

          {/* Right Sub-column: Size */}
          <View style={styles.selectorCol}>
            <Text style={styles.selectorLabel}>Size</Text>
            <View style={styles.sizesRow}>
              {(product.sizes || ['41mm', '45mm']).map((sz, idx) => {
                const isSelected = selectedSize === sz;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.sizePill,
                      isSelected && styles.sizePillActive,
                    ]}
                    onPress={() => setSelectedSize(sz)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.sizePillText,
                        isSelected && styles.sizePillTextActive,
                      ]}
                    >
                      {sz}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* Bento About This Item Section */}
        <View style={styles.bentoAboutSection}>
          <Text style={styles.aboutTitle}>About This Item</Text>
          <Text style={styles.aboutBody}>{product.description}</Text>

          {/* 4-Column Bento Feature Highlight Card */}
          <View style={styles.specsBentoGrid}>
            {specs.map((item, idx) => (
              <View key={idx} style={styles.specBentoCell}>
                <View style={styles.specIconWrap}>
                  <Ionicons name={item.icon} size={20} color="#0F382C" />
                </View>
                <Text style={styles.specTitleText}>{item.title}</Text>
                <Text style={styles.specSubText}>{item.sub}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Purchase Action Dock */}
      <View style={styles.bottomStickyBar}>
        <View style={styles.priceSummaryCol}>
          <Text style={styles.stickyPriceLabel}>Total Price</Text>
          <Text style={styles.stickyPriceValue}>{product.formattedPrice}</Text>
        </View>

        <View style={styles.verticalBarDivider} />

        <View style={styles.ctaButtonsGroup}>
          <TouchableOpacity
            style={styles.addBagBtn}
            activeOpacity={0.85}
            onPress={handleAddToCart}
          >
            <Ionicons name="bag-handle-outline" size={17} color="#0F382C" />
            <Text style={styles.addBagBtnText}>Add to Bag</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.buyNowBtn}
            activeOpacity={0.88}
            onPress={handleBuyNow}
          >
            <Text style={styles.buyNowBtnText}>Buy Now</Text>
            <Ionicons name="arrow-forward" size={14} color="#C69B56" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  topHeader: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 6,
    zIndex: 10,
  },
  topHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  circleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  heroSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 6,
    gap: 12,
    alignItems: 'center',
  },
  heroLeftCol: {
    flex: 1.0,
    justifyContent: 'center',
    paddingVertical: 4,
  },
  verifiedMerchantPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FAF5EA',
    alignSelf: 'flex-start',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E2D2',
    marginBottom: 8,
  },
  verifiedMerchantText: {
    fontSize: 10.5,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#5C5446',
  },
  productNameTitle: {
    fontSize: 25,
    fontFamily: 'PlayfairDisplay-Bold',
    fontWeight: '700',
    color: '#0F382C',
    lineHeight: 31,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  },
  ratingScoreText: {
    fontSize: 12.5,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#1A1D1A',
  },
  reviewsCountText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#7E827A',
  },
  priceHeadingText: {
    fontSize: 23,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    color: '#0F382C',
    marginBottom: 12,
  },
  microTrustCol: {
    gap: 6,
  },
  microTrustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  microTrustText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Medium',
    color: '#5C6057',
  },
  heroRightCol: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  archedFrame: {
    width: '100%',
    height: 310,
    backgroundColor: '#EBE7DF',
    borderTopLeftRadius: 145,
    borderTopRightRadius: 145,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  archScrollView: {
    width: '100%',
    height: '100%',
  },
  archSlide: {
    height: 310,
    alignItems: 'center',
    justifyContent: 'center',
  },
  archImage: {
    width: '100%',
    height: '100%',
  },
  placeholderSlideContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FAF7F0',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#DCD7CC',
  },
  placeholderIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  placeholderAngleKicker: {
    fontSize: 9.5,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    color: '#C69B56',
    letterSpacing: 1,
    marginBottom: 2,
  },
  placeholderTitle: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#0F382C',
    textAlign: 'center',
  },
  placeholderSub: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#7E827A',
    textAlign: 'center',
    marginTop: 2,
  },
  tapZoomCapsule: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  tapZoomText: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#0F382C',
  },
  carouselDashRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    marginBottom: 16,
  },
  dashDot: {
    width: 6,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: '#DCD7CC',
  },
  dashPillActive: {
    width: 24,
    backgroundColor: '#0F382C',
  },
  bentoSelectorsCard: {
    marginHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 22,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ECE8E1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 20,
  },
  selectorCol: {
    flex: 1,
    gap: 8,
  },
  selectorLabel: {
    fontSize: 12.5,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#1A1D1A',
  },
  swatchesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  swatchCircleWrapper: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchCircleSelected: {
    borderColor: '#0F382C',
  },
  swatchInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  selectorDivider: {
    width: 1,
    height: 46,
    backgroundColor: '#ECE8E1',
    marginHorizontal: 12,
  },
  sizesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sizePill: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECE8E1',
  },
  sizePillActive: {
    borderColor: '#0F382C',
    borderWidth: 1.5,
    backgroundColor: '#FAF7F0',
  },
  sizePillText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontWeight: '600',
    color: '#7E827A',
  },
  sizePillTextActive: {
    color: '#0F382C',
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  bentoAboutSection: {
    paddingHorizontal: 20,
  },
  aboutTitle: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#0F382C',
    marginBottom: 8,
  },
  aboutBody: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#5C6057',
    lineHeight: 20,
    marginBottom: 16,
  },
  specsBentoGrid: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 22,
    padding: 16,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#ECE8E1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  specBentoCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  specIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F3ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ECE8E1',
  },
  specTitleText: {
    fontSize: 10.5,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#1A1D1A',
    textAlign: 'center',
  },
  specSubText: {
    fontSize: 9.5,
    fontFamily: 'PlusJakartaSans-Medium',
    color: '#7E827A',
    textAlign: 'center',
    marginTop: 1,
  },
  bottomStickyBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#ECE8E1',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 10,
  },
  priceSummaryCol: {
    justifyContent: 'center',
  },
  stickyPriceLabel: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-Medium',
    color: '#7E827A',
  },
  stickyPriceValue: {
    fontSize: 17,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    color: '#0F382C',
    marginTop: 1,
  },
  verticalBarDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#ECE8E1',
    marginHorizontal: 12,
  },
  ctaButtonsGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addBagBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#0F382C',
    backgroundColor: '#FFFFFF',
  },
  addBagBtnText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#0F382C',
  },
  buyNowBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0F382C',
    shadowColor: '#0F382C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  buyNowBtnText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

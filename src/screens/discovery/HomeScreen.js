import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { PRODUCTS, CATEGORIES } from '../../data/mockData';
import { useApp } from '../../context/AppContext';
import { useNavigation } from '../../navigation/NavigationContext';

import SearchBar from '../../components/SearchBar';
import HeroCarousel from '../../components/HeroCarousel';
import CategoryNav from '../../components/CategoryNav';
import TrustStrip from '../../components/TrustStrip';
import ProductCard from '../../components/ProductCard';
import { ProductCardSkeleton, HeroSkeleton } from '../../components/SkeletonLoader';

const { width } = Dimensions.get('window');
const HORIZONTAL_CARD_WIDTH = Math.floor((width - 40 - 20) / 2.3);

export default function HomeScreen() {
  const { wishlist, toggleWishlist, showToast } = useApp();
  const { navigate, openModal } = useNavigation();

  const [activeCategory, setActiveCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      showToast('Catalogue refreshed');
    }, 800);
  };

  const handleSelectProduct = (product) => {
    navigate('product-detail', { productId: product.id, product });
  };

  const filteredProducts = PRODUCTS.filter((p) =>
    activeCategory === 'all' ? true : p.category === activeCategory
  );

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={COLORS.emeraldPrimary}
          colors={[COLORS.emeraldPrimary]}
        />
      }
    >
      {/* 1. Search Bar with Filter Button */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => navigate('search')}
        style={styles.searchTouchable}
        accessibilityRole="button"
        accessibilityLabel="Search products"
      >
        <View pointerEvents="none">
          <SearchBar
            value=""
            onChangeText={() => {}}
            onFilterPress={() => openModal('search-filters')}
            onScanPress={() => openModal('search-filters')}
          />
        </View>
      </TouchableOpacity>

      {/* 2. Warm Luxury Hero Banner */}
      {loading ? (
        <HeroSkeleton />
      ) : (
        <HeroCarousel
          onCtaPress={() => {
            const featured = PRODUCTS[3] || PRODUCTS[0];
            navigate('product-detail', { productId: featured.id, product: featured });
          }}
        />
      )}

      {/* 3. Category Segmented Card Dock */}
      <CategoryNav
        activeCategoryId={activeCategory}
        onSelectCategory={(id) => {
          if (id === 'more') {
            navigate('category', { categorySlug: 'all' });
          } else {
            setActiveCategory(id);
          }
        }}
      />

      {/* 4. Value Proposition Trust Strip */}
      <TrustStrip />

      {/* 5. Section Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.titleTextWrapper}>
          <Text style={styles.sectionTitle}>
            {activeCategory === 'all'
              ? 'Top Picks For You'
              : `${CATEGORIES.find((c) => c.id === activeCategory)?.name || activeCategory} Collection`}
          </Text>
          <Text style={styles.sectionSub}>Handpicked quality, just for you</Text>
        </View>

        <TouchableOpacity
          style={styles.seeAllContainer}
          activeOpacity={0.75}
          onPress={() => navigate('category', { categorySlug: activeCategory })}
          accessibilityRole="button"
          accessibilityLabel="View all products"
        >
          <Text style={styles.seeAllText}>View all</Text>
          <Ionicons name="chevron-forward" size={14} color={COLORS.emeraldPrimary} />
        </TouchableOpacity>
      </View>

      {/* 6. Product Showcase Horizontal Scroll & Grid */}
      {loading ? (
        <View style={styles.productGrid}>
          {[1, 2, 3, 4].map((i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </View>
      ) : (
        <>
          {/* Horizontal Product Carousel matching mockup */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalProductsContent}
          >
            {filteredProducts.map((item) => (
              <ProductCard
                key={item.id}
                product={item}
                cardWidth={HORIZONTAL_CARD_WIDTH}
                isWishlisted={wishlist.includes(item.id)}
                onToggleWishlist={toggleWishlist}
                onPress={handleSelectProduct}
              />
            ))}
          </ScrollView>

          {/* 2-Column Grid of Remaining Curated Items */}
          <View style={styles.productGrid}>
            {filteredProducts.slice(3).map((item) => (
              <ProductCard
                key={item.id}
                product={item}
                isWishlisted={wishlist.includes(item.id)}
                onToggleWishlist={toggleWishlist}
                onPress={handleSelectProduct}
              />
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 110,
  },
  searchTouchable: {
    width: '100%',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 6,
    marginBottom: 12,
  },
  titleTextWrapper: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 21,
    fontFamily: 'PlayfairDisplay-Bold',
    fontWeight: '700',
    color: '#0F382C',
    letterSpacing: -0.3,
  },
  sectionSub: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#7E827A',
    marginTop: 2,
  },
  seeAllContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
  },
  seeAllText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#0F382C',
  },
  horizontalProductsContent: {
    paddingHorizontal: 20,
    gap: 12,
    paddingBottom: 16,
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    columnGap: 14,
    rowGap: 16,
    marginTop: 4,
  },
});

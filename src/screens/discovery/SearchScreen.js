import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { PRODUCTS } from '../../data/mockData';
import { useApp } from '../../context/AppContext';
import { useNavigation } from '../../navigation/NavigationContext';
import ProductCard from '../../components/ProductCard';

const { width } = Dimensions.get('window');
const HORIZONTAL_CARD_WIDTH = Math.floor((width - 40 - 20) / 2.3);

const RECENT_SEARCHES = ['Smart watch', 'Leather bag', 'Perfume', 'Sneakers'];
const POPULAR_TAGS = ['Electronics', 'Lagos Fashion', 'Fragrance', 'Furniture'];

export default function SearchScreen() {
  const { wishlist, toggleWishlist } = useApp();
  const { navigate, goBack, openModal } = useNavigation();

  const [query, setQuery] = useState('');

  const filteredProducts = PRODUCTS.filter((p) => {
    if (!query.trim()) return false;
    const q = query.toLowerCase().trim();
    const matchName = p.name.toLowerCase().includes(q);
    const matchMerchant = p.merchant.toLowerCase().includes(q);
    const matchCategory = (p.category || '').toLowerCase().includes(q);
    return matchName || matchMerchant || matchCategory;
  });

  const trendingProducts = PRODUCTS.slice(0, 6);

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Search Header Bar */}
      <View style={styles.searchHeader}>
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={goBack}
          activeOpacity={0.75}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.emeraldPrimary} />
        </TouchableOpacity>

        <View style={styles.inputWrapper}>
          <Ionicons name="search-outline" size={18} color="#7E827A" style={styles.searchIcon} />
          <TextInput
            style={styles.input}
            placeholder="Search luxury, tech, designers..."
            placeholderTextColor="#8F948B"
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => setQuery('')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close-circle" size={18} color="#8F948B" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.filterButton}
          activeOpacity={0.85}
          onPress={() => openModal('search-filters')}
        >
          <Ionicons name="options-outline" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {query.trim() === '' ? (
          /* Default Discovery Feed when query is empty */
          <View style={styles.discoveryWrapper}>
            {/* Recent Searches Pills */}
            <View style={styles.tagSection}>
              <View style={styles.tagSectionHeader}>
                <Text style={styles.sectionKicker}>RECENT SEARCHES</Text>
              </View>
              <View style={styles.tagWrap}>
                {RECENT_SEARCHES.map((tag, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.tagPill}
                    onPress={() => setQuery(tag)}
                    activeOpacity={0.78}
                  >
                    <Ionicons name="time-outline" size={13} color="#7E827A" />
                    <Text style={styles.tagText}>{tag}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Trending Keywords Pills */}
            <View style={styles.tagSection}>
              <View style={styles.tagSectionHeader}>
                <Text style={styles.sectionKicker}>TRENDING KEYWORDS</Text>
              </View>
              <View style={styles.tagWrap}>
                {POPULAR_TAGS.map((tag, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.tagPill, styles.trendingPill]}
                    onPress={() => setQuery(tag)}
                    activeOpacity={0.78}
                  >
                    <Ionicons name="trending-up" size={13} color="#C69B56" />
                    <Text style={[styles.tagText, styles.trendingTagText]}>{tag}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Curated Trending Products Grid */}
            <View style={styles.trendingSection}>
              <View style={styles.trendingHeaderRow}>
                <View>
                  <Text style={styles.trendingTitle}>Trending Right Now</Text>
                  <Text style={styles.trendingSub}>Popular authentic items curated for you</Text>
                </View>
              </View>

              <View style={styles.productGrid}>
                {trendingProducts.map((item) => (
                  <ProductCard
                    key={item.id}
                    product={item}
                    isWishlisted={wishlist.includes(item.id)}
                    onToggleWishlist={toggleWishlist}
                    onPress={(p) => navigate('product-detail', { productId: p.id, product: p })}
                  />
                ))}
              </View>
            </View>
          </View>
        ) : (
          /* Live Search Results View */
          <View style={styles.resultsContainer}>
            <View style={styles.resultHeaderRow}>
              <Text style={styles.resultCountText}>
                {filteredProducts.length} authentic {filteredProducts.length === 1 ? 'item' : 'items'} found for{' '}
                <Text style={{ fontWeight: '700', color: '#0F382C' }}>"{query}"</Text>
              </Text>
            </View>

            {filteredProducts.length > 0 ? (
              <View style={styles.productGrid}>
                {filteredProducts.map((item) => (
                  <ProductCard
                    key={item.id}
                    product={item}
                    isWishlisted={wishlist.includes(item.id)}
                    onToggleWishlist={toggleWishlist}
                    onPress={(p) => navigate('product-detail', { productId: p.id, product: p })}
                  />
                ))}
              </View>
            ) : (
              <View style={styles.noResultsBox}>
                <View style={styles.noResultsIconCircle}>
                  <Ionicons name="search-outline" size={42} color="#7E827A" />
                </View>
                <Text style={styles.noResultsTitle}>No items matching "{query}"</Text>
                <Text style={styles.noResultsSub}>
                  Try searching for "Smart Watch", "Sneakers", "Handbag", or explore categories.
                </Text>
                <TouchableOpacity
                  style={styles.clearSearchBtn}
                  activeOpacity={0.85}
                  onPress={() => setQuery('')}
                >
                  <Text style={styles.clearSearchBtnText}>View All Products</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#ECE8E1',
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F5F3ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrapper: {
    flex: 1,
    height: 46,
    backgroundColor: '#F5F3ED',
    borderRadius: 23,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E8E4DA',
  },
  searchIcon: {
    marginRight: 6,
  },
  input: {
    flex: 1,
    fontSize: 13.5,
    fontFamily: 'PlusJakartaSans-Medium',
    color: '#1A1D1A',
    paddingVertical: 0,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0F382C',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F382C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  scrollContent: {
    paddingBottom: 110,
  },
  discoveryWrapper: {
    paddingTop: 16,
  },
  tagSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  tagSectionHeader: {
    marginBottom: 8,
  },
  sectionKicker: {
    fontSize: 10.5,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    color: '#C69B56',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ECE8E1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  trendingPill: {
    backgroundColor: '#FAF7F0',
    borderColor: '#E8E2D2',
  },
  tagText: {
    fontSize: 12.5,
    fontFamily: 'PlusJakartaSans-Medium',
    color: '#3E423B',
  },
  trendingTagText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#0F382C',
  },
  trendingSection: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#ECE8E1',
  },
  trendingHeaderRow: {
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  trendingTitle: {
    fontSize: 20,
    fontFamily: 'PlayfairDisplay-Bold',
    fontWeight: '700',
    color: '#0F382C',
    letterSpacing: -0.3,
  },
  trendingSub: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#7E827A',
    marginTop: 2,
  },
  resultsContainer: {
    paddingTop: 16,
  },
  resultHeaderRow: {
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  resultCountText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Medium',
    color: '#5C6057',
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    columnGap: 14,
    rowGap: 16,
  },
  noResultsBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  noResultsIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F5F3ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  noResultsTitle: {
    fontSize: 19,
    fontFamily: 'PlayfairDisplay-Bold',
    fontWeight: '700',
    color: '#0F382C',
    textAlign: 'center',
    marginBottom: 6,
  },
  noResultsSub: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#7E827A',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  clearSearchBtn: {
    backgroundColor: '#0F382C',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 24,
  },
  clearSearchBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
});

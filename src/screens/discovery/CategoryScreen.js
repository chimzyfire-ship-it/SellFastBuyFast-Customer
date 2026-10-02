import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Image,
  ImageBackground,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { CATEGORIES as DEFAULT_CATEGORIES, CATEGORY_TAXONOMY } from '../../data/mockData';
import { fetchCategoryTaxonomy, fetchLiveProducts } from '../../services/catalogService';
import { useApp } from '../../context/AppContext';
import { useNavigation } from '../../navigation/NavigationContext';
import ProductCard from '../../components/ProductCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDEBAR_WIDTH = Math.min(115, Math.floor(SCREEN_WIDTH * 0.29));
const RIGHT_PANE_WIDTH = SCREEN_WIDTH - SIDEBAR_WIDTH - 24;
const PRODUCT_CARD_WIDTH = Math.floor((RIGHT_PANE_WIDTH - 10) / 2);

export default function CategoryScreen() {
  const { wishlist, toggleWishlist, liveProducts, liveCategories } = useApp();
  const { currentRoute, navigate } = useNavigation();

  const primaryCategories = useMemo(() => {
    if (liveCategories && liveCategories.length > 0) {
      const filtered = liveCategories.filter((c) => c.id !== 'all');
      if (filtered.length >= 10) return filtered;
    }
    return DEFAULT_CATEGORIES;
  }, [liveCategories]);

  // Initial category from route params or default to first category ('home-office')
  const initialCategorySlug = currentRoute.params?.categorySlug;
  const validInitialSlug = primaryCategories.some((c) => c.id === initialCategorySlug || c.slug === initialCategorySlug)
    ? initialCategorySlug
    : primaryCategories[0]?.id || 'home-office';

  const [activeCategorySlug, setActiveCategorySlug] = useState(validInitialSlug);
  const [selectedSubCategory, setSelectedSubCategory] = useState(null);
  const [taxonomyData, setTaxonomyData] = useState(CATEGORY_TAXONOMY[validInitialSlug] || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryProducts, setCategoryProducts] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  const rightScrollRef = useRef(null);

  // Sync category if route params update
  useEffect(() => {
    if (initialCategorySlug && initialCategorySlug !== 'all') {
      const match = primaryCategories.find((c) => c.id === initialCategorySlug || c.slug === initialCategorySlug);
      if (match) {
        setActiveCategorySlug(match.id || match.slug);
        setSelectedSubCategory(null);
      }
    }
  }, [initialCategorySlug, primaryCategories]);

  // Load category taxonomy and products when active category changes
  useEffect(() => {
    let active = true;
    const currentTaxonomy = CATEGORY_TAXONOMY[activeCategorySlug] || null;
    setTaxonomyData(currentTaxonomy);

    fetchCategoryTaxonomy(activeCategorySlug)
      .then((data) => {
        if (active && data) {
          setTaxonomyData(data);
        }
      })
      .catch(() => {
        // Fallback already assigned
      });

    return () => {
      active = false;
    };
  }, [activeCategorySlug]);

  // Load and filter products for active category / subcategory
  useEffect(() => {
    let active = true;
    setIsLoadingProducts(true);

    fetchLiveProducts({
      categorySlug: activeCategorySlug,
      subCategorySlug: selectedSubCategory,
    })
      .then((prods) => {
        if (active) {
          setCategoryProducts(prods);
        }
      })
      .catch(() => {
        if (active) {
          const fallback = (liveProducts || []).filter((p) => {
            const matchesCat = p.category === activeCategorySlug;
            const matchesSub = !selectedSubCategory || p.subCategory === selectedSubCategory;
            return matchesCat && matchesSub;
          });
          setCategoryProducts(fallback);
        }
      })
      .finally(() => {
        if (active) setIsLoadingProducts(false);
      });

    return () => {
      active = false;
    };
  }, [activeCategorySlug, selectedSubCategory, liveProducts]);

  // Handle changing primary category
  const handleSelectPrimaryCategory = (slug) => {
    setActiveCategorySlug(slug);
    setSelectedSubCategory(null);
    setSearchQuery('');
    if (rightScrollRef.current) {
      rightScrollRef.current.scrollTo({ y: 0, animated: true });
    }
  };

  // Handle clicking a subcategory
  const handleSelectSubCategory = (subCat) => {
    setSelectedSubCategory(subCat.slug);
    // Scroll down to products grid
    if (rightScrollRef.current) {
      rightScrollRef.current.scrollTo({ y: 380, animated: true });
    }
  };

  // Handle clicking "SEE ALL PRODUCTS"
  const handleSeeAllProducts = () => {
    setSelectedSubCategory(null);
    if (rightScrollRef.current) {
      rightScrollRef.current.scrollTo({ y: 380, animated: true });
    }
  };

  // Filter sections & subcategories if search query exists
  const sectionsToDisplay = useMemo(() => {
    if (!taxonomyData?.sections) return [];
    if (!searchQuery.trim()) return taxonomyData.sections;

    const q = searchQuery.toLowerCase().trim();
    return taxonomyData.sections
      .map((sec) => {
        const matchingSubs = sec.subcategories.filter((sub) =>
          sub.name.toLowerCase().includes(q)
        );
        if (matchingSubs.length > 0 || sec.title.toLowerCase().includes(q)) {
          return {
            ...sec,
            subcategories: matchingSubs.length > 0 ? matchingSubs : sec.subcategories,
          };
        }
        return null;
      })
      .filter(Boolean);
  }, [taxonomyData, searchQuery]);

  // Active category display name
  const activeCategoryObj = primaryCategories.find(
    (c) => c.id === activeCategorySlug || c.slug === activeCategorySlug
  );
  const activeCategoryTitle = activeCategoryObj?.name || taxonomyData?.name || 'Category';

  return (
    <ImageBackground
      source={require('../../../assets/app-bg.jpg')}
      style={styles.fullAppBackground}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safeContainer}>
        {/* Top Search Header matching Jumia Layout */}
        <View style={styles.headerBar}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={19} color="#7E827A" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search on SellFastBuyFast"
              placeholderTextColor="#8F928B"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              onSubmitEditing={() => {
                if (searchQuery.trim()) {
                  navigate('search', { query: searchQuery });
                }
              }}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close-circle" size={18} color="#9E9F9A" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Master-Detail Split Screen Layout */}
        <View style={styles.splitLayout}>
          {/* Left Vertical Category Rail */}
          <View style={styles.sidebar}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sidebarContent}
            >
              {primaryCategories.map((cat) => {
                const catSlug = cat.slug || cat.id;
                const isActive = activeCategorySlug === catSlug;

                return (
                  <TouchableOpacity
                    key={catSlug}
                    style={[styles.sidebarItem, isActive && styles.sidebarItemActive]}
                    activeOpacity={0.7}
                    onPress={() => handleSelectPrimaryCategory(catSlug)}
                  >
                    {isActive && <View style={styles.activeIndicatorBar} />}
                    <Text
                      style={[
                        styles.sidebarItemText,
                        isActive && styles.sidebarItemTextActive,
                      ]}
                      numberOfLines={2}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Right Content Pane */}
          <View style={styles.contentPane}>
            <ScrollView
              ref={rightScrollRef}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.contentScroll}
            >
              {/* Top Banner Button: SEE ALL PRODUCTS */}
              <TouchableOpacity
                style={styles.seeAllBanner}
                activeOpacity={0.85}
                onPress={handleSeeAllProducts}
              >
                <Text style={styles.seeAllBannerText}>
                  {taxonomyData?.bannerTitle || 'SEE ALL PRODUCTS'}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#1A1D1A" />
              </TouchableOpacity>

              {/* Grouped Subcategory Sections */}
              {sectionsToDisplay.map((section) => {
                const columns = section.columns || 3;
                const itemWidthPercent = columns === 2 ? '48%' : '31%';

                return (
                  <View key={section.id} style={styles.sectionBlock}>
                    {/* Section Header */}
                    <View style={styles.sectionHeaderRow}>
                      <Text style={styles.sectionTitle}>{section.title}</Text>
                      {section.showSeeAll && (
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => {
                            setSelectedSubCategory(null);
                            if (rightScrollRef.current) {
                              rightScrollRef.current.scrollTo({ y: 380, animated: true });
                            }
                          }}
                        >
                          <Text style={styles.sectionSeeAllText}>SEE ALL</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Subcategories Grid */}
                    <View style={styles.subcatGrid}>
                      {section.subcategories.map((sub) => {
                        const isSubSelected = selectedSubCategory === sub.slug;

                        return (
                          <TouchableOpacity
                            key={sub.id}
                            style={[
                              styles.subcatCard,
                              { width: itemWidthPercent },
                              isSubSelected && styles.subcatCardSelected,
                            ]}
                            activeOpacity={0.8}
                            onPress={() => handleSelectSubCategory(sub)}
                          >
                            <View style={styles.subcatImageContainer}>
                              <Image
                                source={{ uri: sub.image }}
                                style={styles.subcatImage}
                                resizeMode="cover"
                              />
                            </View>
                            <Text
                              style={[
                                styles.subcatName,
                                isSubSelected && styles.subcatNameSelected,
                              ]}
                              numberOfLines={2}
                            >
                              {sub.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                );
              })}

              {/* Curated Products Section */}
              <View style={styles.productsSection}>
                <View style={styles.productsHeaderRow}>
                  <View>
                    <Text style={styles.productsSectionTitle}>
                      {selectedSubCategory
                        ? `Filtered Products`
                        : `${activeCategoryTitle} Collection`}
                    </Text>
                    <Text style={styles.productsCountSub}>
                      {categoryProducts.length} items available
                    </Text>
                  </View>

                  {selectedSubCategory && (
                    <TouchableOpacity
                      style={styles.clearFilterBadge}
                      activeOpacity={0.7}
                      onPress={() => setSelectedSubCategory(null)}
                    >
                      <Text style={styles.clearFilterText}>Reset filter</Text>
                      <Ionicons name="close" size={13} color={COLORS.emeraldPrimary} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* 2-Column Product Grid */}
                <View style={styles.productGrid}>
                  {categoryProducts.map((item) => (
                    <View key={item.id} style={styles.productCardWrapper}>
                      <ProductCard
                        product={item}
                        cardWidth={PRODUCT_CARD_WIDTH}
                        isWishlisted={wishlist.includes(item.id)}
                        onToggleWishlist={toggleWishlist}
                        onPress={(p) => navigate('product-detail', { productId: p.id, product: p })}
                      />
                    </View>
                  ))}

                  {categoryProducts.length === 0 && !isLoadingProducts && (
                    <View style={styles.emptyProductsBox}>
                      <View style={styles.emptyIconCircle}>
                        <Ionicons name="grid-outline" size={28} color="#C69B56" />
                      </View>
                      <Text style={styles.emptyTitle}>No items currently listed</Text>
                      <Text style={styles.emptySubtitle}>
                        New verified vendor consignments are uploaded daily in {activeCategoryTitle}.
                      </Text>
                      <TouchableOpacity
                        style={styles.exploreAllBtn}
                        activeOpacity={0.85}
                        onPress={handleSeeAllProducts}
                      >
                        <Text style={styles.exploreAllBtnText}>Show all category items</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  fullAppBackground: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#F5F2EB',
  },
  safeContainer: {
    flex: 1,
    backgroundColor: 'rgba(249, 248, 243, 0.88)',
  },
  headerBar: {
    paddingHorizontal: 14,
    paddingTop: Platform.OS === 'android' ? 10 : 6,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#ECE8E1',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2EFE9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#1A1D1A',
    paddingVertical: 0,
  },
  splitLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: SIDEBAR_WIDTH,
    backgroundColor: '#F6F4EE',
    borderRightWidth: 1,
    borderRightColor: '#EBE7DF',
  },
  sidebarContent: {
    paddingBottom: 90,
  },
  sidebarItem: {
    position: 'relative',
    paddingVertical: 18,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: '#ECE8E1',
    minHeight: 68,
  },
  sidebarItemActive: {
    backgroundColor: '#FFFFFF',
  },
  activeIndicatorBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#0F382C', // Brand luxury Emerald
  },
  sidebarItemText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Medium',
    color: '#656860',
    textAlign: 'center',
    lineHeight: 16,
  },
  sidebarItemTextActive: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#0F382C',
  },
  contentPane: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentScroll: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 95,
  },
  seeAllBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAF8F4',
    borderWidth: 1,
    borderColor: '#ECE7DD',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  seeAllBannerText: {
    fontSize: 12.5,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#1A1D1A',
    letterSpacing: 0.3,
  },
  sectionBlock: {
    marginBottom: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F0ECE4',
    padding: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3EFE8',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#1A1D1A',
    letterSpacing: 0.4,
  },
  sectionSeeAllText: {
    fontSize: 11.5,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#C69B56', // Brand luxury Gold
    letterSpacing: 0.2,
  },
  subcatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  subcatCard: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  subcatCardSelected: {
    backgroundColor: 'rgba(15, 56, 44, 0.05)',
    borderRadius: 8,
  },
  subcatImageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#F8F6F0',
    borderRadius: 8,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#ECE7DE',
  },
  subcatImage: {
    width: '100%',
    height: '100%',
  },
  subcatName: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Medium',
    color: '#2F322D',
    textAlign: 'center',
    lineHeight: 14,
    paddingHorizontal: 2,
  },
  subcatNameSelected: {
    color: '#0F382C',
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  productsSection: {
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#ECE8E1',
  },
  productsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  productsSectionTitle: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#0F382C',
  },
  productsCountSub: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#7E827A',
    marginTop: 1,
  },
  clearFilterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#EDF4F0',
    borderWidth: 1,
    borderColor: '#D4E4DC',
  },
  clearFilterText: {
    fontSize: 10.5,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: '#0F382C',
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  productCardWrapper: {
    width: PRODUCT_CARD_WIDTH,
    marginBottom: 4,
  },
  emptyProductsBox: {
    paddingVertical: 32,
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: '#FAF8F4',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ECE8E1',
    marginTop: 6,
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F2ECE0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#1A1D1A',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 11.5,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#7E827A',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 14,
  },
  exploreAllBtn: {
    backgroundColor: '#0F382C',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  exploreAllBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
});

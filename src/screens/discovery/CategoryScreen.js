import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { PRODUCTS, CATEGORIES } from '../../data/mockData';
import { useApp } from '../../context/AppContext';
import { useNavigation } from '../../navigation/NavigationContext';
import ProductCard from '../../components/ProductCard';

export default function CategoryScreen() {
  const { wishlist, toggleWishlist } = useApp();
  const { currentRoute, goBack, navigate, openModal } = useNavigation();

  const categorySlug = currentRoute.params?.categorySlug || 'all';
  const [selectedCat, setSelectedCat] = useState(categorySlug);

  const activeCategoryObj = CATEGORIES.find((c) => c.id === selectedCat);

  const filteredProducts = PRODUCTS.filter((p) =>
    selectedCat === 'all' ? true : p.category === selectedCat
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Ionicons name="arrow-back" size={22} color={COLORS.emeraldPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {selectedCat === 'all' ? 'All Collections' : activeCategoryObj?.name || selectedCat}
        </Text>
        <TouchableOpacity style={styles.filterButton} onPress={() => openModal('search-filters')}>
          <Ionicons name="options-outline" size={20} color={COLORS.emeraldPrimary} />
        </TouchableOpacity>
      </View>

      {/* Category Pills Header */}
      <View style={styles.pillsRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsScroll}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.pill,
                selectedCat === cat.id && styles.pillActive,
              ]}
              onPress={() => setSelectedCat(cat.id)}
            >
              <Text
                style={[
                  styles.pillText,
                  selectedCat === cat.id && styles.pillTextActive,
                ]}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Products Grid */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.metaHeader}>
          <Text style={styles.countText}>Showing {filteredProducts.length} items</Text>
        </View>

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

          {filteredProducts.length === 0 && (
            <View style={styles.noResults}>
              <Ionicons name="grid-outline" size={42} color={COLORS.textMuted} />
              <Text style={styles.noResultsText}>No items available in this category yet</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justify: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  backButton: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontWeight: '700',
    color: COLORS.emeraldPrimary,
  },
  filterButton: {
    padding: 6,
  },
  pillsRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  pillsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  pill: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pillActive: {
    backgroundColor: COLORS.emeraldPrimary,
    borderColor: COLORS.emeraldPrimary,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  pillTextActive: {
    color: COLORS.white,
    fontWeight: '600',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  metaHeader: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  countText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    columnGap: 16,
    rowGap: 24,
  },
  noResults: {
    width: '100%',
    padding: 40,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
});

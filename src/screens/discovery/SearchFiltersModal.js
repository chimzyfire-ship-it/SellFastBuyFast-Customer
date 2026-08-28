import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { CATEGORIES } from '../../data/mockData';
import { useNavigation } from '../../navigation/NavigationContext';

export default function SearchFiltersModal() {
  const { activeModal, closeModal } = useNavigation();
  const visible = activeModal?.name === 'search-filters';

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [minRating, setMinRating] = useState(4.0);
  const [inStockOnly, setInStockOnly] = useState(true);
  const [sortOption, setSortOption] = useState('popular'); // 'popular' | 'price-low' | 'price-high' | 'rating'

  if (!visible) return null;

  const handleApply = () => {
    closeModal();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={COLORS.emeraldPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Filter & Sort</Text>
          <TouchableOpacity
            onPress={() => {
              setSelectedCategory('all');
              setMinRating(4.0);
              setInStockOnly(false);
              setSortOption('popular');
            }}
          >
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Sort By */}
          <Text style={styles.sectionTitle}>Sort By</Text>
          <View style={styles.optionsWrap}>
            {[
              { id: 'popular', label: 'Most Popular' },
              { id: 'price-low', label: 'Price: Low to High' },
              { id: 'price-high', label: 'Price: High to Low' },
              { id: 'rating', label: 'Highest Rated' },
            ].map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={[
                  styles.optionPill,
                  sortOption === opt.id && styles.optionPillActive,
                ]}
                onPress={() => setSortOption(opt.id)}
              >
                <Text
                  style={[
                    styles.optionText,
                    sortOption === opt.id && styles.optionTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Category Filter */}
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Category</Text>
          <View style={styles.optionsWrap}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.optionPill,
                  selectedCategory === cat.id && styles.optionPillActive,
                ]}
                onPress={() => setSelectedCategory(cat.id)}
              >
                <Text
                  style={[
                    styles.optionText,
                    selectedCategory === cat.id && styles.optionTextActive,
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Minimum Rating */}
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Minimum Rating</Text>
          <View style={styles.optionsWrap}>
            {[3.5, 4.0, 4.5, 4.8].map((rate) => (
              <TouchableOpacity
                key={rate}
                style={[
                  styles.optionPill,
                  minRating === rate && styles.optionPillActive,
                ]}
                onPress={() => setMinRating(rate)}
              >
                <Ionicons
                  name="star"
                  size={14}
                  color={minRating === rate ? COLORS.goldAccent : COLORS.textMuted}
                />
                <Text
                  style={[
                    styles.optionText,
                    minRating === rate && styles.optionTextActive,
                  ]}
                >
                  {rate}+ Stars
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Availability Toggle */}
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Availability</Text>
          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => setInStockOnly(!inStockOnly)}
          >
            <Text style={styles.toggleLabel}>In Stock Only</Text>
            <Ionicons
              name={inStockOnly ? 'checkbox' : 'square-outline'}
              size={22}
              color={inStockOnly ? COLORS.emeraldPrimary : COLORS.textMuted}
            />
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.applyButton} onPress={handleApply} activeOpacity={0.85}>
            <Text style={styles.applyText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.emeraldPrimary,
  },
  resetText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.badgeRed,
  },
  scrollContent: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.emeraldPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  optionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  optionPillActive: {
    backgroundColor: COLORS.emeraldPrimary,
    borderColor: COLORS.emeraldPrimary,
  },
  optionText: {
    fontSize: 13.5,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  optionTextActive: {
    color: COLORS.white,
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.cardBg,
    padding: 16,
    borderRadius: 14,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  applyButton: {
    backgroundColor: COLORS.emeraldPrimary,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justify: 'center',
  },
  applyText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

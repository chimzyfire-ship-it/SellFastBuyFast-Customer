import React from 'react';
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
import { PRODUCTS } from '../../data/mockData';
import { useApp } from '../../context/AppContext';
import { useNavigation } from '../../navigation/NavigationContext';
import ProductCard from '../../components/ProductCard';

export default function SavedScreen() {
  const { wishlist, toggleWishlist } = useApp();
  const { navigate, goBack } = useNavigation();

  const savedProducts = PRODUCTS.filter((p) => wishlist.includes(p.id));

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={goBack}
          activeOpacity={0.75}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={22} color="#0F382C" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Saved Wishlist</Text>

        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{savedProducts.length} Items</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {savedProducts.length > 0 ? (
          <View style={styles.productGrid}>
            {savedProducts.map((item) => (
              <ProductCard
                key={item.id}
                product={item}
                isWishlisted={true}
                onToggleWishlist={toggleWishlist}
                onPress={(p) => navigate('product-detail', { productId: p.id, product: p })}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="heart-outline" size={32} color="#C69B56" />
            </View>
            <Text style={styles.emptyTitle}>Your Wishlist is Empty</Text>
            <Text style={styles.emptySub}>
              Tap the heart icon on any curated piece to save it for later review or instant checkout.
            </Text>
            <TouchableOpacity
              style={styles.exploreBtn}
              activeOpacity={0.88}
              onPress={() => navigate('home')}
            >
              <Text style={styles.exploreBtnText}>Explore Catalogue</Text>
              <View style={styles.btnIconBadge}>
                <Ionicons name="arrow-forward" size={13} color="#0F382C" />
              </View>
            </TouchableOpacity>
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
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
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
  headerTitle: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#0F382C',
  },
  countBadge: {
    backgroundColor: '#FAF5EA',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E2D2',
  },
  countBadgeText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#0F382C',
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 110,
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 14,
    rowGap: 16,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ECE8E1',
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FAF5EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'PlayfairDisplay-Bold',
    fontWeight: '700',
    color: '#0F382C',
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 12.5,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#7E827A',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  exploreBtn: {
    backgroundColor: '#0F382C',
    height: 50,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    gap: 8,
    shadowColor: '#0F382C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  exploreBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  btnIconBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#C69B56',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

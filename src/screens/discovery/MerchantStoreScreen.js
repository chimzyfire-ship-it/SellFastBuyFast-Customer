import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { PRODUCTS } from '../../data/mockData';
import { useApp } from '../../context/AppContext';
import { useNavigation } from '../../navigation/NavigationContext';
import ProductCard from '../../components/ProductCard';

export default function MerchantStoreScreen() {
  const { wishlist, toggleWishlist, showToast } = useApp();
  const { currentRoute, goBack, navigate } = useNavigation();

  const merchantName = currentRoute.params?.merchantName || 'SellFast Direct';

  const merchantProducts = PRODUCTS.filter(
    (p) => p.merchant.toLowerCase() === merchantName.toLowerCase() || p.merchant.includes('SellFast')
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Ionicons name="arrow-back" size={22} color={COLORS.emeraldPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{merchantName}</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={() => showToast(`Following ${merchantName}`)}>
          <Ionicons name="notifications-outline" size={20} color={COLORS.emeraldPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Merchant Hero Banner */}
        <View style={styles.storeBanner}>
          <View style={styles.avatarCircle}>
            <Ionicons name="storefront" size={32} color={COLORS.goldAccent} />
          </View>
          <View style={styles.verifiedPill}>
            <Ionicons name="shield-checkmark" size={12} color={COLORS.goldLight} />
            <Text style={styles.verifiedText}>VERIFIED MERCHANT</Text>
          </View>
          <Text style={styles.storeName}>{merchantName}</Text>
          <Text style={styles.storeBio}>
            Lagos, Nigeria • Verified seller since 2024 • 99.4% Fulfillment Score
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>4.9 ★</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>1,240+</Text>
              <Text style={styles.statLabel}>Orders</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>&lt; 2 hrs</Text>
              <Text style={styles.statLabel}>Response</Text>
            </View>
          </View>
        </View>

        {/* Catalogue Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Merchant Storefront Catalogue</Text>
          <Text style={styles.sectionSub}>All items dispatched directly from merchant warehouse</Text>
        </View>

        {/* Products Grid */}
        <View style={styles.productGrid}>
          {merchantProducts.map((item) => (
            <ProductCard
              key={item.id}
              product={item}
              isWishlisted={wishlist.includes(item.id)}
              onToggleWishlist={toggleWishlist}
              onPress={(p) => navigate('product-detail', { productId: p.id, product: p })}
            />
          ))}
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
    height: 54,
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
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontWeight: '700',
    color: COLORS.emeraldPrimary,
  },
  iconBtn: {
    padding: 6,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  storeBanner: {
    backgroundColor: COLORS.emeraldPrimary,
    padding: 24,
    alignItems: 'center',
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.emeraldDark,
    alignItems: 'center',
    justify: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: COLORS.goldAccent,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(198, 155, 86, 0.2)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 8,
  },
  verifiedText: {
    color: COLORS.goldLight,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  storeName: {
    fontSize: 22,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
  },
  storeBio: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
    textAlign: 'center',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justify: 'space-around',
    width: '100%',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
  },
  statBox: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.goldAccent,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontWeight: '700',
    color: COLORS.emeraldPrimary,
  },
  sectionSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    columnGap: 16,
    rowGap: 24,
  },
});

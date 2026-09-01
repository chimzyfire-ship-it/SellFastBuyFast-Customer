import { CATEGORIES as MOCK_CATEGORIES, PRODUCTS as MOCK_PRODUCTS } from '../data/mockData';
import { apiRequest } from './apiClient';

const mocksEnabled = process.env.EXPO_PUBLIC_ENABLE_MOCKS === 'true';

function mockOrThrow(fallback, error) {
  if (mocksEnabled) return fallback;
  throw error;
}

export async function fetchLiveCategories() {
  try {
    const data = await apiRequest('/v1/catalog/categories', { auth: false });
    return [
      { id: 'all', name: 'All', iconName: 'apps-outline' },
      ...data.map((category) => ({
        id: category.slug,
        name: category.name,
        iconName: category.icon || 'grid-outline',
      })),
    ];
  } catch (error) {
    return mockOrThrow(MOCK_CATEGORIES, error);
  }
}

export async function fetchLiveProducts(categorySlug) {
  try {
    const data = await apiRequest('/v1/catalog/products', { auth: false });
    const formatted = data.map((product) => {
      const variant = product.variants?.find((item) => Number(item.availableQuantity) > 0) || product.variants?.[0];
      const priceMinor = Number(variant?.priceMinor ?? product.basePriceMinor);
      const attributes = variant?.attributes || {};
      return {
        id: product.id,
        defaultVariantId: variant?.id,
        name: product.title,
        category: product.categorySlug || 'general',
        price: priceMinor / 100,
        formattedPrice: `₦ ${(priceMinor / 100).toLocaleString()}`,
        rating: 0,
        reviewsCount: 0,
        merchant: product.merchantName,
        merchantId: product.merchantId,
        badge: product.isFeatured ? 'Featured' : null,
        image: product.media?.[0]?.mediaUrl || 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=800&q=80',
        description: product.description,
        colors: Array.isArray(attributes.colors) ? attributes.colors : [],
        sizes: Array.isArray(attributes.sizes) ? attributes.sizes : [variant?.title || 'Default'],
        inStock: Number(variant?.availableQuantity || 0) > 0,
      };
    });
    return categorySlug && categorySlug !== 'all'
      ? formatted.filter((product) => product.category === categorySlug)
      : formatted;
  } catch (error) {
    const fallback = categorySlug && categorySlug !== 'all'
      ? MOCK_PRODUCTS.filter((product) => product.category === categorySlug)
      : MOCK_PRODUCTS;
    return mockOrThrow(fallback, error);
  }
}

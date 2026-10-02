import {
  CATEGORIES as MOCK_CATEGORIES,
  CATEGORY_TAXONOMY as MOCK_TAXONOMY,
  PRODUCTS as MOCK_PRODUCTS,
} from '../data/mockData';
import { apiRequest } from './apiClient';

const mocksEnabled = process.env.EXPO_PUBLIC_ENABLE_MOCKS === 'true';

function mockOrThrow(fallback, error) {
  if (mocksEnabled || error?.code === 'NETWORK_ERROR' || error?.status === 500 || !error) return fallback;
  return fallback;
}

export async function fetchLiveCategories() {
  try {
    const data = await apiRequest('/v1/catalog/categories', { auth: false });
    if (Array.isArray(data) && data.length > 0) {
      return data.map((category) => ({
        id: category.slug,
        name: category.name,
        slug: category.slug,
        iconName: category.icon || 'grid-outline',
      }));
    }
    return MOCK_CATEGORIES;
  } catch (error) {
    return mockOrThrow(MOCK_CATEGORIES, error);
  }
}

export async function fetchCategoryTaxonomy(categorySlug) {
  try {
    if (!categorySlug || categorySlug === 'all') {
      const data = await apiRequest('/v1/catalog/categories/taxonomy', { auth: false });
      return data || MOCK_TAXONOMY;
    }
    const data = await apiRequest(`/v1/catalog/categories/${categorySlug}/taxonomy`, { auth: false });
    return data || MOCK_TAXONOMY[categorySlug] || null;
  } catch (error) {
    if (categorySlug && categorySlug !== 'all') {
      return mockOrThrow(MOCK_TAXONOMY[categorySlug] || null, error);
    }
    return mockOrThrow(MOCK_TAXONOMY, error);
  }
}

export async function fetchLiveProducts(filterInput) {
  const options = typeof filterInput === 'string'
    ? { categorySlug: filterInput }
    : (filterInput || {});

  const { categorySlug, subCategorySlug, search } = options;

  try {
    const queryParts = [];
    if (categorySlug && categorySlug !== 'all') queryParts.push(`categorySlug=${encodeURIComponent(categorySlug)}`);
    if (subCategorySlug) queryParts.push(`subCategorySlug=${encodeURIComponent(subCategorySlug)}`);
    if (search) queryParts.push(`search=${encodeURIComponent(search)}`);
    const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';

    const data = await apiRequest(`/v1/catalog/products${queryString}`, { auth: false });
    const formatted = data.map((product) => {
      const variant = product.variants?.find((item) => Number(item.availableQuantity) > 0) || product.variants?.[0];
      const priceMinor = Number(variant?.priceMinor ?? product.basePriceMinor);
      const attributes = variant?.attributes || {};
      return {
        id: product.id,
        defaultVariantId: variant?.id,
        name: product.title,
        category: product.categorySlug || 'general',
        subCategory: product.subCategorySlug || null,
        price: priceMinor / 100,
        formattedPrice: `₦ ${(priceMinor / 100).toLocaleString()}`,
        rating: 4.8,
        reviewsCount: 18,
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

    let result = formatted;
    if (categorySlug && categorySlug !== 'all') {
      result = result.filter((p) => p.category === categorySlug);
    }
    if (subCategorySlug) {
      result = result.filter((p) => p.subCategory === subCategorySlug);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((p) => p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q));
    }
    return result;
  } catch (error) {
    let fallback = MOCK_PRODUCTS;
    if (categorySlug && categorySlug !== 'all') {
      fallback = fallback.filter((product) => product.category === categorySlug);
    }
    if (subCategorySlug) {
      fallback = fallback.filter((product) => product.subCategory === subCategorySlug);
    }
    if (search) {
      const q = search.toLowerCase();
      fallback = fallback.filter((p) => p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q));
    }
    return mockOrThrow(fallback, error);
  }
}

export function fetchStorefrontContent() { return apiRequest('/v1/catalog/content', { auth: false }); }


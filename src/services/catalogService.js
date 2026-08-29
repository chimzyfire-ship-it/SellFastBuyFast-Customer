import { supabase } from '../lib/supabase';
import { CATEGORIES as MOCK_CATEGORIES, PRODUCTS as MOCK_PRODUCTS } from '../data/mockData';

export async function fetchLiveCategories() {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error || !data || data.length === 0) {
      return MOCK_CATEGORIES;
    }

    return [
      { id: 'all', name: 'All', iconName: 'apps-outline' },
      ...data.map((c) => ({
        id: c.slug,
        name: c.name,
        iconName: c.icon || 'grid-outline',
      })),
    ];
  } catch {
    return MOCK_CATEGORIES;
  }
}

export async function fetchLiveProducts(categorySlug) {
  try {
    let query = supabase
      .from('products')
      .select(`
        id,
        title,
        slug,
        description,
        base_price_minor,
        compare_price_minor,
        is_featured,
        merchants ( business_name ),
        categories ( slug ),
        product_media ( media_url, sort_order )
      `)
      .eq('status', 'published');

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      return categorySlug && categorySlug !== 'all'
        ? MOCK_PRODUCTS.filter((p) => p.category === categorySlug)
        : MOCK_PRODUCTS;
    }

    const formatted = data.map((p) => {
      const media = p.product_media?.sort((a, b) => a.sort_order - b.sort_order);
      const priceNaira = Number(p.base_price_minor) / 100;

      return {
        id: p.id,
        name: p.title,
        category: p.categories?.slug || 'general',
        price: priceNaira,
        formattedPrice: `₦ ${priceNaira.toLocaleString()}`,
        rating: 4.9,
        reviewsCount: 24,
        merchant: p.merchants?.business_name || 'SellFast Store',
        badge: p.is_featured ? 'Featured' : null,
        image: media?.[0]?.media_url || 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=800&q=80',
        description: p.description,
        inStock: true,
      };
    });

    if (categorySlug && categorySlug !== 'all') {
      return formatted.filter((p) => p.category === categorySlug);
    }
    return formatted;
  } catch {
    return MOCK_PRODUCTS;
  }
}

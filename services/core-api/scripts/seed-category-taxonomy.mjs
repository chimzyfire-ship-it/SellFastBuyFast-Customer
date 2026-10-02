#!/usr/bin/env node
/**
 * seed-category-taxonomy.mjs
 * Seeds the 12 primary categories and their hierarchical subcategories
 * into PostgreSQL for SellFastBuyFast Mobile App Category Screen.
 */
import 'dotenv/config';
import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('Missing DATABASE_URL in environment');
  process.exit(1);
}

const sql = postgres(databaseUrl, { max: 1 });

const ROOT_CATEGORIES = [
  { id: 'c0000001-0000-4000-8000-000000000001', name: 'Home & Office', slug: 'home-office', icon: 'business-outline', sort_order: 1 },
  { id: 'c0000001-0000-4000-8000-000000000002', name: 'Phones & Tablets', slug: 'phones-tablets', icon: 'phone-portrait-outline', sort_order: 2 },
  { id: 'c0000001-0000-4000-8000-000000000003', name: 'Fashion', slug: 'fashion', icon: 'shirt-outline', sort_order: 3 },
  { id: 'c0000001-0000-4000-8000-000000000004', name: 'Health & Beauty', slug: 'health-beauty', icon: 'sparkles-outline', sort_order: 4 },
  { id: 'c0000001-0000-4000-8000-000000000005', name: 'Electronics', slug: 'electronics', icon: 'tv-outline', sort_order: 5 },
  { id: 'c0000001-0000-4000-8000-000000000006', name: 'Computing', slug: 'computing', icon: 'laptop-outline', sort_order: 6 },
  { id: 'c0000001-0000-4000-8000-000000000007', name: 'Grocery', slug: 'grocery', icon: 'cart-outline', sort_order: 7 },
  { id: 'c0000001-0000-4000-8000-000000000008', name: 'Garden & Outdoors', slug: 'garden-outdoors', icon: 'leaf-outline', sort_order: 8 },
  { id: 'c0000001-0000-4000-8000-000000000009', name: 'Automobile', slug: 'automobile', icon: 'car-sport-outline', sort_order: 9 },
  { id: 'c0000001-0000-4000-8000-000000000010', name: 'Sporting Goods', slug: 'sporting-goods', icon: 'football-outline', sort_order: 10 },
  { id: 'c0000001-0000-4000-8000-000000000011', name: 'Gaming', slug: 'gaming', icon: 'game-controller-outline', sort_order: 11 },
  { id: 'c0000001-0000-4000-8000-000000000012', name: 'Baby Products', slug: 'baby-products', icon: 'happy-outline', sort_order: 12 },
];

const SUBCATEGORIES = [
  // Home & Office
  { name: 'Large Appliances', slug: 'appliances', icon: 'cube-outline', parent_id: 'c0000001-0000-4000-8000-000000000001', sort_order: 1 },
  { name: 'Small Appliances', slug: 'small-appliances', icon: 'cafe-outline', parent_id: 'c0000001-0000-4000-8000-000000000001', sort_order: 2 },
  { name: 'Cookware', slug: 'cookware', icon: 'restaurant-outline', parent_id: 'c0000001-0000-4000-8000-000000000001', sort_order: 3 },
  { name: 'Bakeware', slug: 'bakeware', icon: 'pizza-outline', parent_id: 'c0000001-0000-4000-8000-000000000001', sort_order: 4 },
  { name: 'Cutlery & Accessories', slug: 'cutlery', icon: 'cutlery-outline', parent_id: 'c0000001-0000-4000-8000-000000000001', sort_order: 5 },
  { name: 'Bedding', slug: 'bedding', icon: 'bed-outline', parent_id: 'c0000001-0000-4000-8000-000000000001', sort_order: 6 },
  { name: 'Home Decor', slug: 'home-decor', icon: 'flower-outline', parent_id: 'c0000001-0000-4000-8000-000000000001', sort_order: 7 },
  { name: 'Dining Furniture', slug: 'dining-furniture', icon: 'file-tray-stacked-outline', parent_id: 'c0000001-0000-4000-8000-000000000001', sort_order: 8 },

  // Phones & Tablets
  { name: 'Smartphones', slug: 'smartphones', icon: 'phone-portrait-outline', parent_id: 'c0000001-0000-4000-8000-000000000002', sort_order: 1 },
  { name: 'Basic Phones', slug: 'basic-phones', icon: 'call-outline', parent_id: 'c0000001-0000-4000-8000-000000000002', sort_order: 2 },
  { name: 'iPads', slug: 'ipads', icon: 'tablet-portrait-outline', parent_id: 'c0000001-0000-4000-8000-000000000002', sort_order: 3 },
  { name: 'Cases & Covers', slug: 'cases-covers', icon: 'shield-outline', parent_id: 'c0000001-0000-4000-8000-000000000002', sort_order: 4 },

  // Fashion
  { name: 'Dresses', slug: 'dresses', icon: 'woman-outline', parent_id: 'c0000001-0000-4000-8000-000000000003', sort_order: 1 },
  { name: 'Handbags & Totes', slug: 'handbags', icon: 'bag-handle-outline', parent_id: 'c0000001-0000-4000-8000-000000000003', sort_order: 2 },
  { name: 'Men Sneakers', slug: 'men-sneakers', icon: 'footsteps-outline', parent_id: 'c0000001-0000-4000-8000-000000000003', sort_order: 3 },

  // Health & Beauty
  { name: 'Luxury Perfumes', slug: 'luxury-perfumes', icon: 'sparkles-outline', parent_id: 'c0000001-0000-4000-8000-000000000004', sort_order: 1 },
  { name: 'Skincare Serums', slug: 'serums-oils', icon: 'water-outline', parent_id: 'c0000001-0000-4000-8000-000000000004', sort_order: 2 },

  // Electronics
  { name: 'Smart TVs', slug: 'smart-tvs', icon: 'tv-outline', parent_id: 'c0000001-0000-4000-8000-000000000005', sort_order: 1 },
  { name: 'Headphones', slug: 'headphones', icon: 'headset-outline', parent_id: 'c0000001-0000-4000-8000-000000000005', sort_order: 2 },

  // Gaming
  { name: 'PlayStation 5', slug: 'playstation-5', icon: 'game-controller-outline', parent_id: 'c0000001-0000-4000-8000-000000000011', sort_order: 1 },
  { name: 'Xbox Series', slug: 'xbox-series', icon: 'game-controller-outline', parent_id: 'c0000001-0000-4000-8000-000000000011', sort_order: 2 },
];

async function seed() {
  console.log('Seeding category taxonomy...');

  for (const cat of ROOT_CATEGORIES) {
    await sql`
      INSERT INTO public.categories (id, name, slug, icon, parent_id, sort_order, is_active)
      VALUES (${cat.id}, ${cat.name}, ${cat.slug}, ${cat.icon}, NULL, ${cat.sort_order}, TRUE)
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        icon = EXCLUDED.icon,
        sort_order = EXCLUDED.sort_order,
        is_active = EXCLUDED.is_active
    `;
  }
  console.log(`Seeded ${ROOT_CATEGORIES.length} root categories.`);

  for (const sub of SUBCATEGORIES) {
    await sql`
      INSERT INTO public.categories (name, slug, icon, parent_id, sort_order, is_active)
      VALUES (${sub.name}, ${sub.slug}, ${sub.icon}, ${sub.parent_id}, ${sub.sort_order}, TRUE)
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        icon = EXCLUDED.icon,
        parent_id = EXCLUDED.parent_id,
        sort_order = EXCLUDED.sort_order,
        is_active = EXCLUDED.is_active
    `;
  }
  console.log(`Seeded ${SUBCATEGORIES.length} subcategories.`);

  console.log('Category taxonomy seed completed successfully.');
  await sql.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

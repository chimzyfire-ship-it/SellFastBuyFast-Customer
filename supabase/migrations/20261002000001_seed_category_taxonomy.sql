-- Migration: 20261002000001_seed_category_taxonomy.sql
-- Description: Seed the 12 primary e-commerce categories and subcategories taxonomy

-- 1. Ensure root categories exist
INSERT INTO public.categories (id, name, slug, icon, parent_id, sort_order, is_active)
VALUES
  ('c0000001-0000-4000-8000-000000000001', 'Home & Office', 'home-office', 'business-outline', NULL, 1, TRUE),
  ('c0000001-0000-4000-8000-000000000002', 'Phones & Tablets', 'phones-tablets', 'phone-portrait-outline', NULL, 2, TRUE),
  ('c0000001-0000-4000-8000-000000000003', 'Fashion', 'fashion', 'shirt-outline', NULL, 3, TRUE),
  ('c0000001-0000-4000-8000-000000000004', 'Health & Beauty', 'health-beauty', 'sparkles-outline', NULL, 4, TRUE),
  ('c0000001-0000-4000-8000-000000000005', 'Electronics', 'electronics', 'tv-outline', NULL, 5, TRUE),
  ('c0000001-0000-4000-8000-000000000006', 'Computing', 'computing', 'laptop-outline', NULL, 6, TRUE),
  ('c0000001-0000-4000-8000-000000000007', 'Grocery', 'grocery', 'cart-outline', NULL, 7, TRUE),
  ('c0000001-0000-4000-8000-000000000008', 'Garden & Outdoors', 'garden-outdoors', 'leaf-outline', NULL, 8, TRUE),
  ('c0000001-0000-4000-8000-000000000009', 'Automobile', 'automobile', 'car-sport-outline', NULL, 9, TRUE),
  ('c0000001-0000-4000-8000-000000000010', 'Sporting Goods', 'sporting-goods', 'football-outline', NULL, 10, TRUE),
  ('c0000001-0000-4000-8000-000000000011', 'Gaming', 'gaming', 'game-controller-outline', NULL, 11, TRUE),
  ('c0000001-0000-4000-8000-000000000012', 'Baby Products', 'baby-products', 'happy-outline', NULL, 12, TRUE)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

-- 2. Seed representative subcategories under root categories
INSERT INTO public.categories (name, slug, icon, parent_id, sort_order, is_active)
VALUES
  -- Home & Office Subcategories
  ('Large Appliances', 'appliances', 'cube-outline', 'c0000001-0000-4000-8000-000000000001', 1, TRUE),
  ('Small Appliances', 'small-appliances', 'cafe-outline', 'c0000001-0000-4000-8000-000000000001', 2, TRUE),
  ('Cookware', 'cookware', 'restaurant-outline', 'c0000001-0000-4000-8000-000000000001', 3, TRUE),
  ('Bakeware', 'bakeware', 'pizza-outline', 'c0000001-0000-4000-8000-000000000001', 4, TRUE),
  ('Cutlery & Accessories', 'cutlery', 'cutlery-outline', 'c0000001-0000-4000-8000-000000000001', 5, TRUE),
  ('Bedding & Linens', 'bedding', 'bed-outline', 'c0000001-0000-4000-8000-000000000001', 6, TRUE),
  ('Home Decor', 'home-decor', 'flower-outline', 'c0000001-0000-4000-8000-000000000001', 7, TRUE),
  ('Dining & Furniture', 'dining-furniture', 'file-tray-stacked-outline', 'c0000001-0000-4000-8000-000000000001', 8, TRUE),

  -- Phones & Tablets Subcategories
  ('Smartphones', 'smartphones', 'phone-portrait-outline', 'c0000001-0000-4000-8000-000000000002', 1, TRUE),
  ('Basic Phones', 'basic-phones', 'call-outline', 'c0000001-0000-4000-8000-000000000002', 2, TRUE),
  ('iPads & Tablets', 'ipads', 'tablet-portrait-outline', 'c0000001-0000-4000-8000-000000000002', 3, TRUE),
  ('Cases & Covers', 'cases-covers', 'shield-outline', 'c0000001-0000-4000-8000-000000000002', 4, TRUE),
  ('Chargers & Cables', 'chargers-cables', 'battery-charging-outline', 'c0000001-0000-4000-8000-000000000002', 5, TRUE),

  -- Fashion Subcategories
  ('Dresses', 'dresses', 'woman-outline', 'c0000001-0000-4000-8000-000000000003', 1, TRUE),
  ('Handbags & Clutches', 'handbags', 'bag-handle-outline', 'c0000001-0000-4000-8000-000000000003', 2, TRUE),
  ('Men Sneakers & Shoes', 'men-sneakers', 'footsteps-outline', 'c0000001-0000-4000-8000-000000000003', 3, TRUE),
  ('Shirts & Polos', 'shirts-polos', 'shirt-outline', 'c0000001-0000-4000-8000-000000000003', 4, TRUE),
  ('Watches & Accessories', 'men-watches', 'watch-outline', 'c0000001-0000-4000-8000-000000000003', 5, TRUE),

  -- Health & Beauty Subcategories
  ('Luxury Perfumes', 'luxury-perfumes', 'sparkles-outline', 'c0000001-0000-4000-8000-000000000004', 1, TRUE),
  ('Skincare Serums', 'serums-oils', 'water-outline', 'c0000001-0000-4000-8000-000000000004', 2, TRUE),
  ('Sunscreen & Lotions', 'sunscreen', 'sunny-outline', 'c0000001-0000-4000-8000-000000000004', 3, TRUE),

  -- Electronics Subcategories
  ('Smart TVs', 'smart-tvs', 'tv-outline', 'c0000001-0000-4000-8000-000000000005', 1, TRUE),
  ('Headphones & Earbuds', 'headphones', 'headset-outline', 'c0000001-0000-4000-8000-000000000005', 2, TRUE),
  ('Bluetooth Speakers', 'bluetooth-speakers', 'volume-high-outline', 'c0000001-0000-4000-8000-000000000005', 3, TRUE),

  -- Computing Subcategories
  ('MacBooks & Laptops', 'macbooks', 'laptop-outline', 'c0000001-0000-4000-8000-000000000006', 1, TRUE),
  ('External Storage', 'external-drives', 'save-outline', 'c0000001-0000-4000-8000-000000000006', 2, TRUE),
  ('Keyboards & Mice', 'keyboards-mice', 'hardware-chip-outline', 'c0000001-0000-4000-8000-000000000006', 3, TRUE),

  -- Grocery Subcategories
  ('Rice & Pantry Staples', 'rice-grains', 'cart-outline', 'c0000001-0000-4000-8000-000000000007', 1, TRUE),
  ('Cooking Oils', 'cooking-oils', 'water-outline', 'c0000001-0000-4000-8000-000000000007', 2, TRUE),
  ('Coffee & Tea', 'coffee-tea', 'cafe-outline', 'c0000001-0000-4000-8000-000000000007', 3, TRUE),

  -- Gaming Subcategories
  ('PlayStation 5 Consoles & Games', 'playstation-5', 'game-controller-outline', 'c0000001-0000-4000-8000-000000000011', 1, TRUE),
  ('Xbox Series Consoles', 'xbox-series', 'game-controller-outline', 'c0000001-0000-4000-8000-000000000011', 2, TRUE),
  ('Gaming Headsets & Controllers', 'controllers', 'headset-outline', 'c0000001-0000-4000-8000-000000000011', 3, TRUE)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  parent_id = EXCLUDED.parent_id,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

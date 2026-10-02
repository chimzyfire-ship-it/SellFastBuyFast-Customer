import assert from 'node:assert/strict';
import test from 'node:test';

test('catalog taxonomy grouping correctly organizes root categories and nested subcategories', () => {
  const allActiveCategories = [
    { id: '1', name: 'Home & Office', slug: 'home-office', icon: 'business-outline', parentId: null, sortOrder: 1, isActive: true },
    { id: '2', name: 'Phones & Tablets', slug: 'phones-tablets', icon: 'phone-portrait-outline', parentId: null, sortOrder: 2, isActive: true },
    { id: 'sub-1', name: 'Appliances', slug: 'appliances', icon: 'cube-outline', parentId: '1', sortOrder: 1, isActive: true },
    { id: 'sub-2', name: 'Cookware', slug: 'cookware', icon: 'restaurant-outline', parentId: '1', sortOrder: 2, isActive: true },
    { id: 'sub-3', name: 'Smartphones', slug: 'smartphones', icon: 'phone-portrait-outline', parentId: '2', sortOrder: 1, isActive: true },
  ];

  const roots = allActiveCategories.filter((c) => !c.parentId);
  assert.equal(roots.length, 2);

  const taxonomy = roots.map((root) => {
    const children = allActiveCategories.filter((child) => child.parentId === root.id);
    return {
      id: root.id,
      name: root.name,
      slug: root.slug,
      icon: root.icon,
      bannerTitle: 'SEE ALL PRODUCTS',
      subcategories: children,
    };
  });

  assert.equal(taxonomy[0].slug, 'home-office');
  assert.equal(taxonomy[0].bannerTitle, 'SEE ALL PRODUCTS');
  assert.equal(taxonomy[0].subcategories.length, 2);
  assert.equal(taxonomy[0].subcategories[0].slug, 'appliances');
  assert.equal(taxonomy[1].subcategories.length, 1);
  assert.equal(taxonomy[1].subcategories[0].slug, 'smartphones');
});

test('categorySlug and search filters correctly match products', () => {
  const sampleProducts = [
    { id: 'p1', title: 'Smart Watch Series 9', categorySlug: 'phones-tablets' },
    { id: 'p2', title: 'Classic Leather Sneakers', categorySlug: 'fashion' },
    { id: 'p3', title: 'Front-Load Washer 8kg', categorySlug: 'home-office' },
  ];

  const filterProducts = (categorySlug?: string, search?: string) => {
    return sampleProducts.filter((p) => {
      if (categorySlug && categorySlug !== 'all' && p.categorySlug !== categorySlug) return false;
      if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  };

  assert.equal(filterProducts('home-office').length, 1);
  assert.equal(filterProducts('home-office')[0].id, 'p3');
  assert.equal(filterProducts('all').length, 3);
  assert.equal(filterProducts(undefined, 'watch').length, 1);
  assert.equal(filterProducts(undefined, 'watch')[0].id, 'p1');
});

import { errors } from '../../lib/errors.js';

export type ProductStatus = 'draft' | 'pending_approval' | 'published' | 'archived';

const PRODUCT_TRANSITIONS: Record<ProductStatus, ProductStatus[]> = {
  draft: ['pending_approval', 'archived'],
  pending_approval: ['draft', 'published'],
  published: ['draft', 'archived'],
  archived: ['draft'],
};

export function assertProductTransition(from: ProductStatus, to: ProductStatus): void {
  if (!PRODUCT_TRANSITIONS[from].includes(to)) {
    throw errors.conflict('INVALID_PRODUCT_TRANSITION', `Cannot transition product from '${from}' to '${to}'.`);
  }
}

export function requiresRemoderation(patch: {
  title?: string;
  description?: string;
  categoryId?: string | null;
}): boolean {
  return patch.title !== undefined || patch.description !== undefined || patch.categoryId !== undefined;
}

export function assertProductReadyForSubmission(input: {
  description: string | null;
  category: { isActive: boolean; parentId: string | null } | null;
  variants: Array<{ sku: string | null; priceMinor: number }>;
  media: Array<{ mediaType: string }>;
}): void {
  if (!input.description || input.description.trim().length < 20) {
    throw errors.conflict('PRODUCT_INCOMPLETE', 'A product description of at least 20 characters is required.');
  }
  if (!input.category?.isActive || !input.category.parentId) {
    throw errors.conflict('PRODUCT_INCOMPLETE', 'An active non-root category is required.');
  }
  if (!input.variants.some((variant) => Boolean(variant.sku?.trim()) && variant.priceMinor > 0)) {
    throw errors.conflict('PRODUCT_INCOMPLETE', 'At least one priced product variant with an SKU is required.');
  }
  if (!input.media.some((media) => media.mediaType === 'image')) {
    throw errors.conflict('PRODUCT_INCOMPLETE', 'At least one product image is required.');
  }
}

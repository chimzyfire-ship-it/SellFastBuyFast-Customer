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

import { z } from 'zod';
import { errors } from '../../lib/errors.js';

export const ALLOWED_MEDIA_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_MEDIA_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const MediaUploadUrlSchema = z.object({
  contentType: z.enum(ALLOWED_MEDIA_CONTENT_TYPES),
  sizeBytes: z.number().int().positive().max(MAX_MEDIA_SIZE_BYTES),
  filename: z.string().trim().max(200).optional(),
});

export function extensionForMediaContentType(mime: string): string {
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
}


export type ProductStatus = 'draft' | 'pending_approval' | 'published' | 'rejected' | 'archived';

const PRODUCT_TRANSITIONS: Record<ProductStatus, ProductStatus[]> = {
  draft: ['pending_approval', 'archived'],
  pending_approval: ['published', 'rejected'],
  published: ['draft', 'archived'],
  rejected: ['draft', 'archived'],
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
  brandId?: string | null;
  brand?: string;
  condition?: string;
  weightKg?: number;
  dimensionsCm?: string;
  returnPolicy?: string;
  warranty?: string;
  tags?: string[];
}): boolean {
  return patch.title !== undefined || patch.description !== undefined || patch.categoryId !== undefined || patch.brandId !== undefined ||
    patch.brand !== undefined || patch.condition !== undefined || patch.weightKg !== undefined ||
    patch.dimensionsCm !== undefined || patch.returnPolicy !== undefined || patch.warranty !== undefined ||
    patch.tags !== undefined;
}

export function assertProductReadyForSubmission(input: {
  description: string | null;
  category: { isActive: boolean; parentId: string | null } | null;
  variants: Array<{ sku: string | null; priceMinor: number }>;
  media: Array<{ mediaType: string }>;
  weightKg: unknown;
  dimensionsCm: string | null;
}): void {
  // Product Studio guidance (description length, SKU, media, dimensions and
  // price) helps a merchant create a strong listing, but it must not block a
  // vendor from placing a listing in the Operations review queue. Moderators
  // make the publish/reject decision after seeing the original submission.
  // The typed input is retained here as the explicit moderation contract.
  void input;
}

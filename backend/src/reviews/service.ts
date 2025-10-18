import { PrismaClient } from '@prisma/client';
import { ReviewTag, moderateContent } from '../types';

const prisma = new PrismaClient();

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface ReviewInput {
  placeId: string;
  userId: string;
  rating: number; // 1-5
  content?: string;
  tags?: ReviewTag[];
  isAnonymous?: boolean; // default: true
}

export interface ReviewUpdate {
  rating?: number;
  content?: string;
  tags?: ReviewTag[];
  isAnonymous?: boolean;
}

export interface ReviewWithUser {
  id: string;
  placeId: string;
  userId: string;
  rating: number;
  content: string | null;
  tags: ReviewTag[] | null;
  isAnonymous: boolean;
  createdAt: Date;
  user?: {
    id: string;
    email: string;
  } | null;
}

// ============================================================================
// Create Review
// ============================================================================

/**
 * Create a new review for a place
 *
 * @param input - Review creation data
 * @returns Created review
 * @throws Error if validation fails or place not found
 */
export async function createReview(input: ReviewInput): Promise<ReviewWithUser> {
  // Step 1: Validate place exists
  const place = await prisma.place.findUnique({
    where: { id: input.placeId },
  });

  if (!place) {
    throw new Error('Place not found');
  }

  // Step 2: Check if user already reviewed this place
  const existingReview = await prisma.review.findFirst({
    where: {
      placeId: input.placeId,
      userId: input.userId,
    },
  });

  if (existingReview) {
    throw new Error('You have already reviewed this place. Please update your existing review instead.');
  }

  // Step 3: Validate rating (1-5)
  if (input.rating < 1 || input.rating > 5) {
    throw new Error('Rating must be between 1 and 5');
  }

  // Step 4: Content moderation on review text
  if (input.content) {
    const moderation = moderateContent(input.content);
    if (!moderation.isAllowed) {
      throw new Error(`Content moderation failed: ${moderation.reasons?.join(', ')}`);
    }
  }

  // Step 5: Validate tags
  let tagsJson: string | null = null;
  if (input.tags && input.tags.length > 0) {
    const validTags: ReviewTag[] = ['clean', 'quiet', 'safe', 'friendly_staff', 'value', 'privacy', 'comfortable', 'spacious'];
    const invalidTags = input.tags.filter(tag => !validTags.includes(tag));
    if (invalidTags.length > 0) {
      throw new Error(`Invalid review tags: ${invalidTags.join(', ')}`);
    }
    tagsJson = JSON.stringify(input.tags);
  }

  // Step 6: Create review
  const review = await prisma.review.create({
    data: {
      placeId: input.placeId,
      userId: input.userId,
      rating: input.rating,
      content: input.content ?? null,
      tags: tagsJson,
      isAnonymous: input.isAnonymous ?? true, // Default to anonymous
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });

  return transformReview(review);
}

// ============================================================================
// List Reviews
// ============================================================================

/**
 * List reviews for a place
 *
 * @param placeId - Place ID to get reviews for
 * @param limit - Maximum number of results (default: 50)
 * @param offset - Pagination offset (default: 0)
 * @returns Array of reviews (anonymized if isAnonymous=true)
 */
export async function listReviews(
  placeId: string,
  limit: number = 50,
  offset: number = 0
): Promise<ReviewWithUser[]> {
  const reviews = await prisma.review.findMany({
    where: { placeId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
    skip: offset,
  });

  return reviews.map(transformReview);
}

/**
 * List all reviews by a user (for user profile page)
 *
 * @param userId - User ID
 * @param limit - Maximum number of results (default: 50)
 * @param offset - Pagination offset (default: 0)
 * @returns Array of user's reviews (shows all info since it's their own)
 */
export async function listUserReviews(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<ReviewWithUser[]> {
  const reviews = await prisma.review.findMany({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
    skip: offset,
  });

  return reviews.map(transformReview);
}

/**
 * List all reviews (for admin dashboard)
 *
 * @param limit - Maximum number of results (default: 50)
 * @param offset - Pagination offset (default: 0)
 * @returns Array of all reviews with count
 */
export async function listAllReviews(
  limit: number = 50,
  offset: number = 0
): Promise<{ reviews: ReviewWithUser[]; count: number }> {
  const [reviews, count] = await Promise.all([
    prisma.review.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    }),
    prisma.review.count(),
  ]);

  return {
    reviews: reviews.map(transformReview),
    count,
  };
}

// ============================================================================
// Get Single Review
// ============================================================================

/**
 * Get a single review by ID
 *
 * @param id - Review ID (UUID)
 * @returns Review or null if not found
 */
export async function getReview(id: string): Promise<ReviewWithUser | null> {
  const review = await prisma.review.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });

  if (!review) {
    return null;
  }

  return transformReview(review);
}

// ============================================================================
// Update Review
// ============================================================================

/**
 * Update a review (owner only)
 *
 * @param id - Review ID (UUID)
 * @param updates - Fields to update
 * @param userId - User performing the update
 * @returns Updated review
 * @throws Error if unauthorized or validation fails
 */
export async function updateReview(
  id: string,
  updates: ReviewUpdate,
  userId: string
): Promise<ReviewWithUser> {
  // Step 1: Fetch existing review
  const existing = await prisma.review.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error('Review not found');
  }

  // Step 2: Authorization check (only owner can update)
  if (existing.userId !== userId) {
    throw new Error('Unauthorized: You can only update your own reviews');
  }

  // Step 3: Validate rating if being updated
  if (updates.rating !== undefined) {
    if (updates.rating < 1 || updates.rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }
  }

  // Step 4: Content moderation if content is being updated
  if (updates.content !== undefined && updates.content.length > 0) {
    const moderation = moderateContent(updates.content);
    if (!moderation.isAllowed) {
      throw new Error(`Content moderation failed: ${moderation.reasons?.join(', ')}`);
    }
  }

  // Step 5: Prepare update data
  const data: any = {};

  if (updates.rating !== undefined) {
    data.rating = updates.rating;
  }

  if (updates.content !== undefined) {
    data.content = updates.content || null;
  }

  if (updates.isAnonymous !== undefined) {
    data.isAnonymous = updates.isAnonymous;
  }

  // Step 6: Validate and update tags
  if (updates.tags !== undefined) {
    if (updates.tags.length === 0) {
      data.tags = null;
    } else {
      const validTags: ReviewTag[] = ['clean', 'quiet', 'safe', 'friendly_staff', 'value', 'privacy', 'comfortable', 'spacious'];
      const invalidTags = updates.tags.filter(tag => !validTags.includes(tag));
      if (invalidTags.length > 0) {
        throw new Error(`Invalid review tags: ${invalidTags.join(', ')}`);
      }
      data.tags = JSON.stringify(updates.tags);
    }
  }

  // Step 7: Update database
  const updated = await prisma.review.update({
    where: { id },
    data,
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });

  return transformReview(updated);
}

// ============================================================================
// Delete Review
// ============================================================================

/**
 * Delete a review (owner or admin only)
 *
 * @param id - Review ID (UUID)
 * @param userId - User performing the deletion
 * @param isAdmin - Whether user is admin/moderator
 * @throws Error if unauthorized or review not found
 */
export async function deleteReview(
  id: string,
  userId: string,
  isAdmin: boolean = false
): Promise<void> {
  // Step 1: Fetch existing review
  const existing = await prisma.review.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error('Review not found');
  }

  // Step 2: Authorization check
  if (!isAdmin && existing.userId !== userId) {
    throw new Error('Unauthorized: You can only delete your own reviews');
  }

  // Step 3: Delete review
  await prisma.review.delete({
    where: { id },
  });
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Transform Prisma review to ReviewWithUser
 * Handles anonymity by hiding username if isAnonymous=true
 * Parses JSON tags field
 */
function transformReview(review: any): ReviewWithUser {
  // Parse tags
  let tags: ReviewTag[] | null = null;
  if (review.tags) {
    try {
      tags = JSON.parse(review.tags);
    } catch (error) {
      console.error('Failed to parse review tags:', review.tags);
    }
  }

  // Handle anonymity - only show user info if not anonymous
  let user = null;
  if (!review.isAnonymous && review.user) {
    user = {
      id: review.user.id,
      email: review.user.email,
    };
  }

  return {
    id: review.id,
    placeId: review.placeId,
    userId: review.userId,
    rating: review.rating,
    content: review.content,
    tags,
    isAnonymous: review.isAnonymous,
    createdAt: review.createdAt,
    user,
  };
}

/**
 * Calculate average rating for a place
 * Helper function for place statistics
 */
export async function calculatePlaceRating(placeId: string): Promise<{
  averageRating: number | null;
  reviewCount: number;
}> {
  const reviews = await prisma.review.findMany({
    where: { placeId },
    select: { rating: true },
  });

  if (reviews.length === 0) {
    return {
      averageRating: null,
      reviewCount: 0,
    };
  }

  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  const averageRating = sum / reviews.length;

  return {
    averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
    reviewCount: reviews.length,
  };
}

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { ReviewTag } from '../types';
import {
  createReview,
  listReviews,
  listUserReviews,
  listAllReviews,
  getReview,
  updateReview,
  deleteReview,
} from './service';
import { authenticateToken, type AuthRequest } from '../auth/middleware';

const router = Router();

// ============================================================================
// Validation Schemas
// ============================================================================

const ReviewTagSchema = z.enum(['clean', 'quiet', 'safe', 'friendly_staff', 'value', 'privacy', 'comfortable', 'spacious']);

const CreateReviewSchema = z.object({
  placeId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  content: z.string().max(1000).optional(),
  tags: z.array(ReviewTagSchema).optional(),
  isAnonymous: z.boolean().optional(),
});

const UpdateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  content: z.string().max(1000).optional(),
  tags: z.array(ReviewTagSchema).optional(),
  isAnonymous: z.boolean().optional(),
});

const PaginationSchema = z.object({
  limit: z.coerce.number().positive().max(100).optional(),
  offset: z.coerce.number().min(0).optional(),
});

// ============================================================================
// GET /api/reviews - List all reviews (admin)
// ============================================================================

router.get('/', async (req: Request, res: Response) => {
  try {
    // Validate query parameters
    const validation = PaginationSchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: validation.error.errors,
      });
    }

    const { limit = 50, offset = 0 } = validation.data;

    // Fetch all reviews
    const { reviews, count } = await listAllReviews(limit, offset);

    res.json({
      reviews,
      count,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('List all reviews error:', error);
    res.status(500).json({
      error: 'Failed to fetch reviews',
      message: error.message,
    });
  }
});

// ============================================================================
// GET /api/reviews/place/:placeId - List reviews for a place
// ============================================================================

router.get('/place/:placeId', async (req: Request, res: Response) => {
  try {
    const { placeId } = req.params;

    // Validate query parameters
    const validation = PaginationSchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: validation.error.errors,
      });
    }

    const { limit = 50, offset = 0 } = validation.data;

    // Fetch reviews
    const reviews = await listReviews(placeId, limit, offset);

    res.json({
      reviews,
      count: reviews.length,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('List place reviews error:', error);
    res.status(500).json({
      error: 'Failed to fetch reviews',
      message: error.message,
    });
  }
});

// ============================================================================
// GET /api/reviews/user/:userId - List reviews by a user
// ============================================================================

router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Validate query parameters
    const validation = PaginationSchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: validation.error.errors,
      });
    }

    const { limit = 50, offset = 0 } = validation.data;

    // Fetch reviews
    const reviews = await listUserReviews(userId, limit, offset);

    res.json({
      reviews,
      count: reviews.length,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('List user reviews error:', error);
    res.status(500).json({
      error: 'Failed to fetch reviews',
      message: error.message,
    });
  }
});

// ============================================================================
// GET /api/reviews/:id - Get single review
// ============================================================================

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const review = await getReview(id);

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    res.json(review);
  } catch (error: any) {
    console.error('Get review error:', error);
    res.status(500).json({
      error: 'Failed to fetch review',
      message: error.message,
    });
  }
});

// ============================================================================
// POST /api/reviews - Create new review (auth required)
// ============================================================================

router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    // Validate request body
    const validation = CreateReviewSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: validation.error.errors,
      });
    }

    const data = validation.data;

    // Create review
    const review = await createReview({
      placeId: data.placeId,
      userId: req.user!.userId, // From auth middleware
      rating: data.rating,
      content: data.content,
      tags: data.tags,
      isAnonymous: data.isAnonymous,
    });

    res.status(201).json(review);
  } catch (error: any) {
    console.error('Create review error:', error);

    // Content moderation errors
    if (error.message.includes('Content moderation failed')) {
      return res.status(400).json({
        error: 'Content not allowed',
        message: error.message,
      });
    }

    // Duplicate review error
    if (error.message.includes('already reviewed')) {
      return res.status(409).json({
        error: 'Duplicate review',
        message: error.message,
      });
    }

    // Place not found error
    if (error.message.includes('Place not found')) {
      return res.status(404).json({
        error: 'Place not found',
        message: error.message,
      });
    }

    // Validation errors
    if (error.message.includes('Rating must be') || error.message.includes('Invalid review tags')) {
      return res.status(400).json({
        error: 'Validation error',
        message: error.message,
      });
    }

    res.status(500).json({
      error: 'Failed to create review',
      message: error.message,
    });
  }
});

// ============================================================================
// PATCH /api/reviews/:id - Update review (auth required, owner only)
// ============================================================================

router.patch('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Validate request body
    const validation = UpdateReviewSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: validation.error.errors,
      });
    }

    const updates = validation.data;

    // Update review
    const review = await updateReview(id, updates, req.user!.userId);

    res.json(review);
  } catch (error: any) {
    console.error('Update review error:', error);

    // Authorization errors
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({
        error: 'Forbidden',
        message: error.message,
      });
    }

    // Not found errors
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Review not found',
        message: error.message,
      });
    }

    // Content moderation errors
    if (error.message.includes('Content moderation failed')) {
      return res.status(400).json({
        error: 'Content not allowed',
        message: error.message,
      });
    }

    // Validation errors
    if (error.message.includes('Rating must be') || error.message.includes('Invalid review tags')) {
      return res.status(400).json({
        error: 'Validation error',
        message: error.message,
      });
    }

    res.status(500).json({
      error: 'Failed to update review',
      message: error.message,
    });
  }
});

// ============================================================================
// DELETE /api/reviews/:id - Delete review (auth required, owner or admin)
// ============================================================================

router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if user is admin/moderator
    const isAdmin = req.user!.role === 'admin' || req.user!.role === 'moderator';

    // Delete review
    await deleteReview(id, req.user!.userId, isAdmin);

    res.status(204).send();
  } catch (error: any) {
    console.error('Delete review error:', error);

    // Authorization errors
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({
        error: 'Forbidden',
        message: error.message,
      });
    }

    // Not found errors
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Review not found',
        message: error.message,
      });
    }

    res.status(500).json({
      error: 'Failed to delete review',
      message: error.message,
    });
  }
});

export default router;

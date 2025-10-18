/**
 * Favorites Routes
 * Endpoints for managing user's favorite places
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../auth/middleware';

const router = Router();
const prisma = new PrismaClient();

// ============================================================================
// GET /api/favorites - Get current user's favorites
// ============================================================================
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const favorites = await prisma.favorite.findMany({
      where: { userId },
      include: {
        place: {
          include: {
            creator: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform to include aggregated review data
    const favoritesWithStats = await Promise.all(
      favorites.map(async (favorite) => {
        const reviewCount = await prisma.review.count({
          where: { placeId: favorite.place.id },
        });

        const avgRating = await prisma.review.aggregate({
          where: { placeId: favorite.place.id },
          _avg: { rating: true },
        });

        return {
          id: favorite.id,
          createdAt: favorite.createdAt,
          place: {
            ...favorite.place,
            reviewCount,
            averageRating: avgRating._avg.rating,
          },
        };
      })
    );

    res.json({ favorites: favoritesWithStats });
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ============================================================================
// GET /api/favorites/check/:placeId - Check if place is favorited
// ============================================================================
router.get('/check/:placeId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { placeId } = req.params;

    // Return early if user is not authenticated
    if (!userId) {
      return res.json({ isFavorited: false, favoriteId: null });
    }

    const favorite = await prisma.favorite.findUnique({
      where: {
        userId_placeId: {
          userId,
          placeId,
        },
      },
    });

    res.json({ isFavorited: !!favorite, favoriteId: favorite?.id });
  } catch (error) {
    console.error('Error checking favorite:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ============================================================================
// POST /api/favorites - Add a favorite
// ============================================================================
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { placeId } = req.body;

    if (!placeId) {
      return res.status(400).json({ message: 'placeId is required' });
    }

    // Check if place exists
    const place = await prisma.place.findUnique({
      where: { id: placeId },
    });

    if (!place) {
      return res.status(404).json({ message: 'Place not found' });
    }

    // Check if already favorited
    const existing = await prisma.favorite.findUnique({
      where: {
        userId_placeId: {
          userId,
          placeId,
        },
      },
    });

    if (existing) {
      return res.status(409).json({ message: 'Place already favorited' });
    }

    // Create favorite
    const favorite = await prisma.favorite.create({
      data: {
        userId,
        placeId,
      },
      include: {
        place: true,
      },
    });

    res.status(201).json({
      message: 'Favorite added successfully',
      favorite,
    });
  } catch (error) {
    console.error('Error adding favorite:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ============================================================================
// DELETE /api/favorites/:id - Remove a favorite by favorite ID
// ============================================================================
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const favorite = await prisma.favorite.findUnique({
      where: { id },
    });

    if (!favorite) {
      return res.status(404).json({ message: 'Favorite not found' });
    }

    if (favorite.userId !== userId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    await prisma.favorite.delete({
      where: { id },
    });

    res.json({ message: 'Favorite removed successfully' });
  } catch (error) {
    console.error('Error removing favorite:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ============================================================================
// DELETE /api/favorites/place/:placeId - Remove a favorite by place ID
// ============================================================================
router.delete('/place/:placeId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { placeId } = req.params;

    const favorite = await prisma.favorite.findUnique({
      where: {
        userId_placeId: {
          userId,
          placeId,
        },
      },
    });

    if (!favorite) {
      return res.status(404).json({ message: 'Favorite not found' });
    }

    await prisma.favorite.delete({
      where: {
        userId_placeId: {
          userId,
          placeId,
        },
      },
    });

    res.json({ message: 'Favorite removed successfully' });
  } catch (error) {
    console.error('Error removing favorite:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

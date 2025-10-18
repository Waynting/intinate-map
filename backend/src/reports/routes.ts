import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { ReportType, ReportStatus, PlaceType } from '../types';
import {
  createReport,
  listReports,
  getReport,
  updateReportStatus,
  deleteReport,
  getReportStatistics,
} from './service';
import { authenticateToken, type AuthRequest } from '../auth/middleware';

const router = Router();

// ============================================================================
// Authorization Middleware
// ============================================================================

/**
 * Middleware to check if user is admin or moderator
 */
function requireAdminOrModerator(req: AuthRequest, res: Response, next: Function) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
    return res.status(403).json({ error: 'Admin or moderator access required' });
  }

  next();
}

/**
 * Middleware to check if user is admin
 */
function requireAdmin(req: AuthRequest, res: Response, next: Function) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
}

// ============================================================================
// Validation Schemas
// ============================================================================

const ReportTypeSchema = z.enum(['data_fix', 'abuse', 'safety']);
const ReportStatusSchema = z.enum(['open', 'resolved', 'rejected']);
const PlaceTypeSchema = z.enum(['hotel', 'motel', 'short_stay']);

const CreateReportSchema = z.object({
  type: ReportTypeSchema,
  placeId: z.string().uuid().optional(),
  reviewId: z.string().uuid().optional(),
  payload: z.object({
    reason: z.string().min(10, 'Reason must be at least 10 characters').max(1000),
    description: z.string().max(2000).optional(),
    suggestedFix: z
      .object({
        name: z.string().max(200).optional(),
        address: z.string().max(500).optional(),
        type: PlaceTypeSchema.optional(),
        latitude: z.number().min(-90).max(90).optional(),
        longitude: z.number().min(-180).max(180).optional(),
      })
      .optional(),
  }),
}).refine((data) => data.placeId || data.reviewId, {
  message: 'Either placeId or reviewId must be provided',
});

const UpdateReportStatusSchema = z.object({
  status: ReportStatusSchema,
});

const ReportFiltersSchema = z.object({
  type: ReportTypeSchema.optional(),
  status: ReportStatusSchema.optional(),
  placeId: z.string().uuid().optional(),
  limit: z.coerce.number().positive().max(100).optional(),
  offset: z.coerce.number().min(0).optional(),
});

// ============================================================================
// GET /api/reports - List reports (admin/moderator only)
// ============================================================================

router.get('/', authenticateToken, requireAdminOrModerator, async (req: AuthRequest, res: Response) => {
  try {
    // Validate query parameters
    const validation = ReportFiltersSchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: validation.error.errors,
      });
    }

    const params = validation.data;

    // Build filters
    const filters: any = {};
    if (params.type) filters.type = params.type;
    if (params.status) filters.status = params.status;
    if (params.placeId) filters.placeId = params.placeId;

    const limit = params.limit || 50;
    const offset = params.offset || 0;

    // Fetch reports
    const reports = await listReports(filters, limit, offset);

    res.json({
      reports,
      count: reports.length,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('List reports error:', error);
    res.status(500).json({
      error: 'Failed to fetch reports',
      message: error.message,
    });
  }
});

// ============================================================================
// GET /api/reports/stats - Get statistics (admin/moderator only)
// ============================================================================

router.get('/stats', authenticateToken, requireAdminOrModerator, async (req: AuthRequest, res: Response) => {
  try {
    const stats = await getReportStatistics();
    res.json(stats);
  } catch (error: any) {
    console.error('Get report stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch statistics',
      message: error.message,
    });
  }
});

// ============================================================================
// GET /api/reports/:id - Get single report (admin/moderator only)
// ============================================================================

router.get('/:id', authenticateToken, requireAdminOrModerator, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const report = await getReport(id);

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json(report);
  } catch (error: any) {
    console.error('Get report error:', error);
    res.status(500).json({
      error: 'Failed to fetch report',
      message: error.message,
    });
  }
});

// ============================================================================
// POST /api/reports - Create report (anyone, optional auth)
// ============================================================================

// Optional auth middleware - sets req.user if token is present, but doesn't require it
const optionalAuth = async (req: AuthRequest, res: Response, next: Function) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      // Token provided, try to verify it
      const { verifyToken } = await import('../auth/service');
      try {
        req.user = verifyToken(token);
      } catch (error) {
        // Invalid token, but don't fail the request (allow anonymous reports)
        console.warn('Invalid token for optional auth:', error);
      }
    }

    next();
  } catch (error) {
    next();
  }
};

router.post('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    // Validate request body
    const validation = CreateReportSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: validation.error.errors,
      });
    }

    const data = validation.data;

    // Create report (userId is optional for anonymous reports)
    const report = await createReport({
      type: data.type,
      placeId: data.placeId,
      reviewId: data.reviewId,
      userId: req.user?.userId, // Optional - allows anonymous reports
      payload: data.payload,
    });

    res.status(201).json(report);
  } catch (error: any) {
    console.error('Create report error:', error);

    // Not found errors
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Target not found',
        message: error.message,
      });
    }

    // Validation errors
    if (
      error.message.includes('must target') ||
      error.message.includes('reason is required') ||
      error.message.includes('must include suggestedFix') ||
      error.message.includes('must suggest at least one')
    ) {
      return res.status(400).json({
        error: 'Validation error',
        message: error.message,
      });
    }

    res.status(500).json({
      error: 'Failed to create report',
      message: error.message,
    });
  }
});

// ============================================================================
// PATCH /api/reports/:id - Update report status (admin/moderator only)
// ============================================================================

router.patch('/:id', authenticateToken, requireAdminOrModerator, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Validate request body
    const validation = UpdateReportStatusSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: validation.error.errors,
      });
    }

    const { status } = validation.data;

    // Update report status
    const report = await updateReportStatus(id, status);

    res.json(report);
  } catch (error: any) {
    console.error('Update report status error:', error);

    // Not found errors
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Report not found',
        message: error.message,
      });
    }

    // Validation errors
    if (error.message.includes('Invalid status')) {
      return res.status(400).json({
        error: 'Validation error',
        message: error.message,
      });
    }

    res.status(500).json({
      error: 'Failed to update report',
      message: error.message,
    });
  }
});

// ============================================================================
// DELETE /api/reports/:id - Delete report (admin only)
// ============================================================================

router.delete('/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await deleteReport(id);

    res.status(204).send();
  } catch (error: any) {
    console.error('Delete report error:', error);

    // Not found errors
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Report not found',
        message: error.message,
      });
    }

    res.status(500).json({
      error: 'Failed to delete report',
      message: error.message,
    });
  }
});

export default router;

import { PrismaClient } from '@prisma/client';
import { ReportType, ReportStatus, ReportPayload } from '../types';

const prisma = new PrismaClient();

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface ReportInput {
  type: ReportType; // 'data_fix' | 'abuse' | 'safety'
  placeId?: string;
  reviewId?: string;
  userId?: string; // Reporter's user ID (optional for anonymous reports)
  payload: ReportPayload;
}

export interface ReportWithDetails {
  id: string;
  type: string;
  placeId: string | null;
  reviewId: string | null;
  userId: string | null;
  payload: ReportPayload;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  reporter?: {
    id: string;
    email: string;
  } | null;
  place?: {
    id: string;
    name: string;
  } | null;
}

export interface ReportFilters {
  type?: ReportType;
  status?: ReportStatus;
  placeId?: string;
}

// ============================================================================
// Create Report
// ============================================================================

/**
 * Create a new report
 *
 * @param input - Report creation data
 * @returns Created report
 * @throws Error if validation fails
 */
export async function createReport(input: ReportInput): Promise<ReportWithDetails> {
  // Step 1: Validate that at least one target is specified
  if (!input.placeId && !input.reviewId) {
    throw new Error('Report must target either a place or a review');
  }

  // Step 2: Validate place exists if specified
  if (input.placeId) {
    const place = await prisma.place.findUnique({
      where: { id: input.placeId },
    });
    if (!place) {
      throw new Error('Place not found');
    }
  }

  // Step 3: Validate review exists if specified
  if (input.reviewId) {
    const review = await prisma.review.findUnique({
      where: { id: input.reviewId },
    });
    if (!review) {
      throw new Error('Review not found');
    }
  }

  // Step 4: Validate payload based on report type
  validateReportPayload(input.type, input.payload);

  // Step 5: Serialize payload
  const payloadJson = JSON.stringify(input.payload);

  // Step 6: Create report
  const report = await prisma.report.create({
    data: {
      type: input.type,
      placeId: input.placeId ?? null,
      reviewId: input.reviewId ?? null,
      userId: input.userId ?? null,
      payload: payloadJson,
      status: 'open', // Default status
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
      place: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return transformReport(report);
}

// ============================================================================
// List Reports
// ============================================================================

/**
 * List reports with optional filters (admin/moderator only)
 *
 * @param filters - Filter criteria (type, status, placeId)
 * @param limit - Maximum number of results (default: 50)
 * @param offset - Pagination offset (default: 0)
 * @returns Array of reports
 */
export async function listReports(
  filters: ReportFilters = {},
  limit: number = 50,
  offset: number = 0
): Promise<ReportWithDetails[]> {
  const where: any = {};

  if (filters.type) {
    where.type = filters.type;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.placeId) {
    where.placeId = filters.placeId;
  }

  const reports = await prisma.report.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
      place: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: [
      { status: 'asc' }, // Open reports first
      { createdAt: 'desc' },
    ],
    take: limit,
    skip: offset,
  });

  return reports.map(transformReport);
}

// ============================================================================
// Get Single Report
// ============================================================================

/**
 * Get a single report by ID
 *
 * @param id - Report ID (UUID)
 * @returns Report or null if not found
 */
export async function getReport(id: string): Promise<ReportWithDetails | null> {
  const report = await prisma.report.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
      place: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!report) {
    return null;
  }

  return transformReport(report);
}

// ============================================================================
// Update Report Status
// ============================================================================

/**
 * Update report status (admin/moderator only)
 *
 * @param id - Report ID (UUID)
 * @param status - New status ('open' | 'resolved' | 'rejected')
 * @returns Updated report
 * @throws Error if report not found or invalid status
 */
export async function updateReportStatus(
  id: string,
  status: ReportStatus
): Promise<ReportWithDetails> {
  // Step 1: Validate status
  const validStatuses: ReportStatus[] = ['open', 'resolved', 'rejected'];
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  // Step 2: Update report
  try {
    const updated = await prisma.report.update({
      where: { id },
      data: { status },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
        place: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return transformReport(updated);
  } catch (error: any) {
    if (error.code === 'P2025') {
      throw new Error('Report not found');
    }
    throw error;
  }
}

// ============================================================================
// Delete Report
// ============================================================================

/**
 * Delete a report (admin only)
 *
 * @param id - Report ID (UUID)
 * @throws Error if report not found
 */
export async function deleteReport(id: string): Promise<void> {
  try {
    await prisma.report.delete({
      where: { id },
    });
  } catch (error: any) {
    if (error.code === 'P2025') {
      throw new Error('Report not found');
    }
    throw error;
  }
}

// ============================================================================
// Statistics
// ============================================================================

/**
 * Get report statistics (for admin dashboard)
 *
 * @returns Statistics about reports
 */
export async function getReportStatistics(): Promise<{
  total: number;
  byStatus: { open: number; resolved: number; rejected: number };
  byType: { data_fix: number; abuse: number; safety: number };
}> {
  const [total, byStatus, byType] = await Promise.all([
    // Total count
    prisma.report.count(),

    // Count by status
    prisma.report.groupBy({
      by: ['status'],
      _count: true,
    }),

    // Count by type
    prisma.report.groupBy({
      by: ['type'],
      _count: true,
    }),
  ]);

  // Transform grouped results into objects
  const statusCounts = {
    open: 0,
    resolved: 0,
    rejected: 0,
  };

  const typeCounts = {
    data_fix: 0,
    abuse: 0,
    safety: 0,
  };

  byStatus.forEach((item) => {
    statusCounts[item.status as ReportStatus] = item._count;
  });

  byType.forEach((item) => {
    typeCounts[item.type as ReportType] = item._count;
  });

  return {
    total,
    byStatus: statusCounts,
    byType: typeCounts,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Validate report payload based on report type
 */
function validateReportPayload(type: ReportType, payload: ReportPayload): void {
  // All reports must have a reason
  if (!payload.reason || payload.reason.trim().length === 0) {
    throw new Error('Report reason is required');
  }

  // Reason must be at least 10 characters
  if (payload.reason.trim().length < 10) {
    throw new Error('Report reason must be at least 10 characters');
  }

  // data_fix reports should have suggestedFix
  if (type === 'data_fix') {
    if (!payload.suggestedFix) {
      throw new Error('Data fix reports must include suggestedFix');
    }

    // At least one field must be suggested
    const hasSuggestion =
      payload.suggestedFix.name ||
      payload.suggestedFix.address ||
      payload.suggestedFix.type ||
      payload.suggestedFix.latitude !== undefined ||
      payload.suggestedFix.longitude !== undefined;

    if (!hasSuggestion) {
      throw new Error('Data fix reports must suggest at least one correction');
    }
  }
}

/**
 * Transform Prisma report to ReportWithDetails
 * Parses JSON payload field
 */
function transformReport(report: any): ReportWithDetails {
  // Parse payload
  let payload: ReportPayload;
  try {
    payload = JSON.parse(report.payload);
  } catch (error) {
    console.error('Failed to parse report payload:', report.payload);
    payload = { reason: 'Failed to parse payload' };
  }

  return {
    id: report.id,
    type: report.type,
    placeId: report.placeId,
    reviewId: report.reviewId,
    userId: report.userId,
    payload,
    status: report.status,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
    reporter: report.user
      ? {
          id: report.user.id,
          email: report.user.email,
        }
      : null,
    place: report.place
      ? {
          id: report.place.id,
          name: report.place.name,
        }
      : null,
  };
}

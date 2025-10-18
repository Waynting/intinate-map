import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { verifyToken } from './service';

/**
 * Authentication middleware - Verifies JWT token and attaches user to request
 *
 * Usage:
 * ```typescript
 * router.post('/protected', authenticateToken, async (req: AuthRequest, res) => {
 *   console.log(req.user.userId, req.user.email, req.user.role);
 * });
 * ```
 */
export async function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = verifyToken(token);
    req.user = decoded; // { userId, email, role }
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Type guard for AuthRequest
 */
export type { AuthRequest };

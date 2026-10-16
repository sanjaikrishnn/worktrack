import { Router, Request, Response, NextFunction } from 'express';
import { db, verifyPassword, User } from '../db.js';
import crypto from 'crypto';

export const authRouter = Router();

// In-memory active session tokens
const sessions = new Map<string, { userId: string; createdAt: number }>();

export function getSessionUser(req: Request): User | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const token = authHeader.replace(/^Bearer\s+/i, '');
  const session = sessions.get(token);
  if (!session) return null;

  // Session expiry 24h
  if (Date.now() - session.createdAt > 24 * 60 * 60 * 1000) {
    sessions.delete(token);
    return null;
  }

  const users = db.get('users');
  return users.find((u) => u.id === session.userId && u.active) || null;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized. Please login to continue.' });
  }
  (req as any).user = user;
  next();
}

export function requireRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as User;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: `Forbidden. Role '${user.role}' does not have access.` });
    }
    next();
  };
}

// POST /api/auth/login
authRouter.post('/login', (req: Request, res: Response) => {
  const { identifier, password, role } = req.body; // identifier can be email or empId

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Email/Employee ID and password are required.' });
  }

  const users = db.get('users');
  const user = users.find(
    (u) =>
      (u.email.toLowerCase() === identifier.trim().toLowerCase() ||
        u.empId.toLowerCase() === identifier.trim().toLowerCase()) &&
      u.active
  );

  if (!user) {
    return res.status(401).json({ error: 'Invalid Employee ID/Email or password.' });
  }

  const isValid = verifyPassword(password, user.passwordHash, user.salt);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid Employee ID/Email or password.' });
  }

  // If user selected a specific role on the form, verify that their account matches or has privileges
  if (role && role !== 'auto' && user.role !== role && user.role !== 'admin') {
    return res.status(403).json({
      error: `Your account is registered as '${user.role}', not '${role}'. Please login with the correct role.`,
    });
  }

  // Create session token
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { userId: user.id, createdAt: Date.now() });

  // Exclude password hash and salt
  const { passwordHash, salt, ...safeUser } = user;

  res.json({
    token,
    user: safeUser,
    message: 'Login successful',
  });
});

// GET /api/auth/me
authRouter.get('/me', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { passwordHash, salt, ...safeUser } = user;
  res.json({ user: safeUser });
});

// POST /api/auth/logout
authRouter.post('/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, '');
    sessions.delete(token);
  }
  res.json({ message: 'Logged out successfully' });
});

// POST /api/auth/verify-rework-access
// Dedicated re-authentication endpoint for Screen 7: Authentication for Rework Module
authRouter.post('/verify-rework-access', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'Password is required to access Rework Module.' });
  }

  const isValid = verifyPassword(password, user.passwordHash, user.salt);
  if (!isValid) {
    return res.status(401).json({ error: 'Incorrect password. Access denied.' });
  }

  res.json({
    verified: true,
    message: 'Authentication successful. Corrective time tracking enabled.',
  });
});

// GET /api/auth/users - list employees for manager assignment
authRouter.get('/users', requireAuth, (req: Request, res: Response) => {
  const users = db.get('users').map(({ passwordHash, salt, ...u }) => u);
  res.json({ users });
});

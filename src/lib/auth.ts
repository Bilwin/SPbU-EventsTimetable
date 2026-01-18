import * as jwt from 'jsonwebtoken';
import type { JwtPayload } from '@/types/auth';

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'access_secret_change_in_production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh_secret_change_in_production';

export function verifyAccessToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_ACCESS_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) {
    return {};
  }
  
  return Object.fromEntries(
    cookieHeader.split('; ').map(c => {
      const [key, ...value] = c.split('=');
      return [key, value.join('=')];
    })
  );
}

export function getAuthFromRequest(request: Request): JwtPayload | null {
  const cookies = parseCookies(request.headers.get('cookie'));
  const accessToken = cookies['access_token'];
  
  if (!accessToken) {
    return null;
  }
  
  return verifyAccessToken(accessToken);
}

export function requireAuth(request: Request): JwtPayload {
  const auth = getAuthFromRequest(request);
  if (!auth) {
    throw new Error('Unauthorized');
  }
  return auth;
}

export function requireAdmin(request: Request): JwtPayload {
  const auth = requireAuth(request);
  if (!auth.isAdmin) {
    throw new Error('Forbidden: Admin access required');
  }
  return auth;
}

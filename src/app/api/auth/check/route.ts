import { NextResponse } from 'next/server';
import * as jwt from 'jsonwebtoken';
import type { JwtPayload, AuthUser } from '@/types/auth';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_GROUP_ID = process.env.TELEGRAM_GROUP_ID;
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'access_secret_change_in_production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh_secret_change_in_production';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

type TelegramChatMember = {
  ok: boolean;
  result?: {
    status: 'creator' | 'administrator' | 'member' | 'restricted' | 'left' | 'kicked';
  };
};

async function checkIsAdmin(userId: number): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_GROUP_ID) {
    return false;
  }

  try {
    const telegramApiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getChatMember?chat_id=${TELEGRAM_GROUP_ID}&user_id=${userId}`;
    const response = await fetch(telegramApiUrl);
    const data = (await response.json()) as TelegramChatMember;

    if (!data.ok || !data.result) {
      return false;
    }

    return ['creator', 'administrator'].includes(data.result.status);
  } catch {
    return false;
  }
}

function generateTokens(payload: JwtPayload) {
  const accessToken = jwt.sign(
    { userId: payload.userId, isAdmin: payload.isAdmin },
    JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
  
  const refreshToken = jwt.sign(
    { userId: payload.userId, isAdmin: payload.isAdmin },
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );

  return { accessToken, refreshToken };
}

function getCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    maxAge,
  };
}

export async function GET(request: Request) {
  try {
    const cookieHeader = request.headers.get('cookie');
    
    if (!cookieHeader) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const cookies = Object.fromEntries(
      cookieHeader.split('; ').map(c => {
        const [key, ...value] = c.split('=');
        return [key, value.join('=')];
      })
    );

    const accessToken = cookies['access_token'];
    const refreshToken = cookies['refresh_token'];

    if (!accessToken && !refreshToken) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    if (accessToken) {
      try {
        const decoded = jwt.verify(accessToken, JWT_ACCESS_SECRET) as JwtPayload;
        
        const currentIsAdmin = await checkIsAdmin(decoded.userId);
        
        const user: AuthUser = {
          id: decoded.userId,
          firstName: '',
          isAdmin: currentIsAdmin,
        };
        
        return NextResponse.json({ authenticated: true, user });
      } catch {
      }
    }

    if (refreshToken) {
      try {
        const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as JwtPayload;
        
        const currentIsAdmin = await checkIsAdmin(decoded.userId);
        
        const tokens = generateTokens({
          userId: decoded.userId,
          isAdmin: currentIsAdmin,
        });

        const user: AuthUser = {
          id: decoded.userId,
          firstName: '',
          isAdmin: currentIsAdmin,
        };

        const response = NextResponse.json({ authenticated: true, user });
        
        response.cookies.set('access_token', tokens.accessToken, getCookieOptions(15 * 60));
        response.cookies.set('refresh_token', tokens.refreshToken, getCookieOptions(7 * 24 * 60 * 60));

        return response;
      } catch {
      }
    }

    const response = NextResponse.json({ authenticated: false }, { status: 401 });
    response.cookies.delete('access_token');
    response.cookies.delete('refresh_token');
    
    return response;
  } catch (error) {
    console.error('[auth.check]', error);
    return NextResponse.json({ authenticated: false, error: 'Server error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { validate, parse } from '@tma.js/init-data-node';
import * as jwt from 'jsonwebtoken';
import type { JwtPayload, SignInResponse } from '@/types/auth';

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
    console.error('[auth.checkIsAdmin] Missing TELEGRAM_BOT_TOKEN or TELEGRAM_GROUP_ID');
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
  } catch (error) {
    console.error('[auth.checkIsAdmin]', error);
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

export async function POST(request: Request) {
  try {
    const body = await request.json() as { initData: string };
    const { initData } = body;

    if (!initData) {
      return NextResponse.json<SignInResponse>(
        { success: false, error: 'Missing initData' },
        { status: 400 }
      );
    }

    if (!TELEGRAM_BOT_TOKEN) {
      console.error('[auth.signin] Missing TELEGRAM_BOT_TOKEN');
      return NextResponse.json<SignInResponse>(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    try {
      validate(initData, TELEGRAM_BOT_TOKEN, {
        expiresIn: 86400,
      });
    } catch (validationError) {
      console.error('[auth.signin] initData validation failed:', validationError);
      return NextResponse.json<SignInResponse>(
        { success: false, error: 'Invalid or expired initData' },
        { status: 401 }
      );
    }

    const parsedData = parse(initData);
    
    if (!parsedData.user) {
      return NextResponse.json<SignInResponse>(
        { success: false, error: 'User data not found in initData' },
        { status: 400 }
      );
    }

    const { user } = parsedData;
    
    const isAdmin = await checkIsAdmin(user.id);

    const { accessToken, refreshToken } = generateTokens({
      userId: user.id,
      isAdmin,
    });

    const response = NextResponse.json<SignInResponse>({
      success: true,
      user: {
        id: user.id,
        firstName: String(user.firstName ?? ''),
        lastName: user.lastName ? String(user.lastName) : undefined,
        username: user.username ? String(user.username) : undefined,
        languageCode: user.languageCode ? String(user.languageCode) : undefined,
        isAdmin,
      },
    });

    response.cookies.set('access_token', accessToken, getCookieOptions(15 * 60));
    response.cookies.set('refresh_token', refreshToken, getCookieOptions(7 * 24 * 60 * 60));

    return response;
  } catch (error) {
    console.error('[auth.signin]', error);
    return NextResponse.json<SignInResponse>(
      { success: false, error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

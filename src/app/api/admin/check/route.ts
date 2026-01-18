import { NextResponse } from 'next/server';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_GROUP_ID = process.env.TELEGRAM_GROUP_ID;

type TelegramChatMember = {
  ok: boolean;
  result?: {
    status: 'creator' | 'administrator' | 'member' | 'restricted' | 'left' | 'kicked';
    user: {
      id: number;
      first_name: string;
      username?: string;
    };
  };
  description?: string;
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
    }

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_GROUP_ID) {
      console.error('[admin.check] Missing TELEGRAM_BOT_TOKEN or TELEGRAM_GROUP_ID');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const telegramApiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getChatMember?chat_id=${TELEGRAM_GROUP_ID}&user_id=${userId}`;

    const response = await fetch(telegramApiUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = (await response.json()) as TelegramChatMember;

    if (!data.ok || !data.result) {
      return NextResponse.json({ isAdmin: false, error: data.description ?? 'User not found in group' });
    }

    const adminStatuses = ['creator', 'administrator'];
    const isAdmin = adminStatuses.includes(data.result.status);

    return NextResponse.json({ isAdmin, status: data.result.status });
  } catch (error) {
    console.error('[admin.check]', error);
    return NextResponse.json({ error: 'Failed to check admin status' }, { status: 500 });
  }
}

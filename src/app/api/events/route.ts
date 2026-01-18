import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, requireAdmin } from '@/lib/auth';

type CreateEventPayload = {
  title: string;
  description: string;
  location: string;
  date: string;
  startTime: string;
  endTime?: string;
  registerable?: boolean;
  registerUrl?: string;
};

const parseDateOnly = (value: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match) {
    const [, yearStr, monthStr, dayStr] = match;
    const year = Number(yearStr);
    const month = Number(monthStr) - 1;
    const day = Number(dayStr);
    const date = new Date(year, month, day, 0, 0, 0, 0);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const applyTimeToDate = (date: Date, time: string): Date | null => {
  const [hoursPart, minutesPart] = time.split(':');
  if (hoursPart === undefined || minutesPart === undefined) {
    return null;
  }

  const hours = Number(hoursPart);
  const minutes = Number(minutesPart);

  if (Number.isNaN(hours) || Number.isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
};

const normalizeDayStart = (value: Date) => {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const dateParam = url.searchParams.get('date');
    const fromParam = url.searchParams.get('from');
    const toParam = url.searchParams.get('to');

    if (dateParam) {
      const parsedDate = parseDateOnly(dateParam);

      if (!parsedDate) {
        return NextResponse.json({ error: 'Invalid date parameter. Use ISO date string.' }, { status: 422 });
      }

      const dayStart = normalizeDayStart(parsedDate);

      const events = await prisma.event.findMany({
        where: { date: dayStart },
        orderBy: [{ startTime: 'asc' }],
      });

      return NextResponse.json({ events });
    }

    if (fromParam || toParam) {
      if (!fromParam || !toParam) {
        return NextResponse.json({ error: 'Both "from" and "to" parameters are required.' }, { status: 400 });
      }

      const parsedFrom = parseDateOnly(fromParam);
      const parsedTo = parseDateOnly(toParam);

      if (!parsedFrom || !parsedTo) {
        return NextResponse.json({ error: 'Invalid range parameters. Use ISO date string.' }, { status: 422 });
      }

      const rangeStart = normalizeDayStart(parsedFrom);
      const rangeEnd = normalizeDayStart(parsedTo);

      if (rangeEnd.getTime() < rangeStart.getTime()) {
        return NextResponse.json({ error: '"to" must be on or after "from".' }, { status: 422 });
      }

      const events = await prisma.event.findMany({
        where: {
          date: {
            gte: rangeStart,
            lte: rangeEnd,
          },
        },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      });

      return NextResponse.json({ events });
    }

    return NextResponse.json({ error: 'Provide either "date" or "from"/"to" query parameters.' }, { status: 400 });
  } catch (error) {
    console.error('[events.GET]', error);
    return NextResponse.json({ error: 'Failed to load events' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    let auth;
    try {
      auth = requireAdmin(request);
    } catch {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    console.log(`[events.POST] Admin user ${auth.userId} creating event`);

    const payload = (await request.json()) as CreateEventPayload;
    const { title, description, location, date, startTime, endTime, registerable, registerUrl } = payload;

    if (!title || !description || !location || !startTime || !date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const parsedDate = parseDateOnly(date);

    if (!parsedDate) {
      return NextResponse.json({ error: 'Invalid date format. Use ISO date string.' }, { status: 422 });
    }

    const parsedStartTime = applyTimeToDate(parsedDate, startTime);
    if (!parsedStartTime) {
      return NextResponse.json({ error: 'Invalid startTime. Use HH:MM format (24h).' }, { status: 422 });
    }

    let parsedEndTime: Date | null = null;
    if (endTime) {
      parsedEndTime = applyTimeToDate(parsedDate, endTime);
      if (!parsedEndTime) {
        return NextResponse.json({ error: 'Invalid endTime. Use HH:MM format (24h).' }, { status: 422 });
      }

      if (parsedEndTime.getTime() <= parsedStartTime.getTime()) {
        return NextResponse.json({ error: 'endTime must be later than startTime.' }, { status: 422 });
      }
    }

    const created = await prisma.event.create({
      data: {
        title,
        description,
        location,
        date: parsedDate,
        startTime: parsedStartTime,
        endTime: parsedEndTime ?? undefined,
        registerable: Boolean(registerable),
        registerUrl,
      },
    });

    return NextResponse.json({ event: created }, { status: 201 });
  } catch (error) {
    console.error('[events.POST]', error);
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    let auth;
    try {
      auth = requireAdmin(request);
    } catch {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const url = new URL(request.url);
    const eventId = url.searchParams.get('id');

    if (!eventId) {
      return NextResponse.json({ error: 'Missing event id parameter' }, { status: 400 });
    }

    const existing = await prisma.event.findUnique({ where: { id: eventId } });
    if (!existing) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    await prisma.event.delete({ where: { id: eventId } });

    console.log(`[events.DELETE] Admin user ${auth.userId} deleted event ${eventId}`);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[events.DELETE]', error);
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}

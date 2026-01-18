import type { EventItem, EventsApiResponse, WeekDay, CalendarDayCell } from '@/types';

const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

export function formatIso(date: Date): string {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  const year = normalized.getFullYear();
  const month = pad(normalized.getMonth() + 1);
  const day = pad(normalized.getDate());
  return `${year}-${month}-${day}`;
}

export function getStartOfWeek(date: Date, offsetWeeks: number): Date {
  const start = new Date(date);
  const day = start.getDay();
  const diff = (day === 0 ? -6 : 1 - day) + offsetWeeks * 7;
  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function getWeekDays(offsetWeeks: number): WeekDay[] {
  const today = new Date();
  const start = getStartOfWeek(today, offsetWeeks);

  return Array.from({ length: 7 }, (_, index) => {
    const dayDate = new Date(start);
    dayDate.setDate(start.getDate() + index);

    const iso = formatIso(dayDate);
    const weekdayIndex = (dayDate.getDay() + 6) % 7;

    return {
      iso,
      shortLabel: WEEKDAY_LABELS[weekdayIndex],
      day: dayDate.getDate(),
      month: dayDate.getMonth(),
      year: dayDate.getFullYear(),
      isToday: iso === formatIso(today),
    };
  });
}

export function parseIsoDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map((part) => Number(part));
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

export function getCalendarGrid(
  referenceDate: Date,
  eventDays: Set<string>,
  todayIso: string,
  selectedIso: string
): CalendarDayCell[] {
  const monthReference = new Date(referenceDate);
  monthReference.setDate(1);
  const firstWeekdayIndex = (monthReference.getDay() + 6) % 7;
  const gridStart = new Date(monthReference);
  gridStart.setDate(monthReference.getDate() - firstWeekdayIndex);

  return Array.from({ length: 42 }, (_, index) => {
    const cellDate = new Date(gridStart);
    cellDate.setDate(gridStart.getDate() + index);
    const iso = formatIso(cellDate);
    return {
      iso,
      label: cellDate.getDate(),
      isCurrentMonth: cellDate.getMonth() === referenceDate.getMonth(),
      isToday: iso === todayIso,
      isSelected: iso === selectedIso,
      hasEvents: eventDays.has(iso),
      isPast: iso < todayIso,
    } satisfies CalendarDayCell;
  });
}

export function mapApiEvent(event: EventsApiResponse['events'][number]): EventItem {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    location: event.location,
    registerable: Boolean(event.registerable),
    registerUrl: event.registerUrl ?? undefined,
    startTime: new Date(event.startTime),
    endTime: event.endTime ? new Date(event.endTime) : undefined,
  };
}

export function getWeekOffsetFromToday(targetDate: Date): number {
  const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
  const todayWeekStart = getStartOfWeek(new Date(), 0);
  const targetWeekStart = getStartOfWeek(targetDate, 0);
  const diff = targetWeekStart.getTime() - todayWeekStart.getTime();
  return Math.round(diff / MS_PER_WEEK);
}

export function getEventStatus(event: EventItem, now: Date): 'active' | 'past' | 'upcoming' {
  const start = event.startTime.getTime();
  const end = (event.endTime ?? event.startTime).getTime();
  const current = now.getTime();

  if (current >= start && current <= end) {
    return 'active';
  }
  if (current > end) {
    return 'past';
  }
  return 'upcoming';
}

export const EVENTS_FADE_DURATION = 180;
export const LOADER_FADE_DURATION = 320;
export const LOADER_DELAY = 60;
export const CALENDAR_MONTH_TRANSITION_DURATION = 260;
export const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

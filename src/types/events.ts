export type EventItem = {
  id: string;
  title: string;
  location: string;
  description: string;
  registerable?: boolean;
  registerUrl?: string;
  startTime: Date;
  endTime?: Date;
};

export type EventsApiResponse = {
  events: Array<{
    id: string;
    title: string;
    description: string;
    location: string;
    registerable?: boolean | null;
    registerUrl?: string | null;
    startTime: string;
    endTime?: string | null;
  }>;
};

export type WeekDay = {
  iso: string;
  shortLabel: string;
  day: number;
  month: number;
  year: number;
  isToday: boolean;
};

export type CalendarDayCell = {
  iso: string;
  label: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  hasEvents: boolean;
  isPast: boolean;
};

export type EventStatus = 'active' | 'past' | 'upcoming';

export type AddEventForm = {
  title: string;
  description: string;
  location: string;
  date: string;
  startTime: string;
  endTime: string;
  registerable: boolean;
  registerUrl: string;
};

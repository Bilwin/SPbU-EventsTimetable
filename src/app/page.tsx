'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { Page } from '@/components/Page';
import { useAuth } from '@/hooks/useAuth';
import { CalendarModal } from '@/components/CalendarModal';
import { AddEventModal } from '@/components/AddEventModal';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';
import { EventCard } from '@/components/EventCard';
import type { EventItem, EventsApiResponse, WeekDay, CalendarDayCell, AddEventForm } from '@/types';
import {
  formatIso,
  getWeekDays,
  parseIsoDate,
  getCalendarGrid,
  mapApiEvent,
  getWeekOffsetFromToday,
  getStartOfWeek,
  getEventStatus,
  EVENTS_FADE_DURATION,
  LOADER_FADE_DURATION,
  LOADER_DELAY,
  CALENDAR_MONTH_TRANSITION_DURATION,
  MS_PER_WEEK,
} from '@/utils/date';

const clearTimeoutRef = (ref: MutableRefObject<number | undefined>) => {
  if (ref.current !== undefined) {
    window.clearTimeout(ref.current);
    ref.current = undefined;
  }
};

const fetchEventsWithinRange = async (params: URLSearchParams, signal: AbortSignal): Promise<EventsApiResponse> => {
  const response = await fetch(`/api/events?${params.toString()}`, { signal, credentials: 'include' });
  if (!response.ok) {
    throw new Error(`Failed to load events: ${response.status}`);
  }
  return (await response.json()) as EventsApiResponse;
};

const cancelAnimationFrameRef = (ref: MutableRefObject<number | undefined>) => {
  if (ref.current !== undefined) {
    window.cancelAnimationFrame(ref.current);
    ref.current = undefined;
  }
};

const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const isAdmin = user?.isAdmin ?? false;
  const [isLoading, setIsLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(() => formatIso(new Date()));
  const [displayedDate, setDisplayedDate] = useState(() => formatIso(new Date()));
  const [userLocale, setUserLocale] = useState('ru-RU');
  const [weekTransition, setWeekTransition] = useState<'next' | 'prev' | null>(null);
  const [isEventsLoading, setIsEventsLoading] = useState(true);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [showLoader, setShowLoader] = useState(true);
  const [isLoaderFading, setIsLoaderFading] = useState(false);
  const [isLoaderEntering, setIsLoaderEntering] = useState(false);
  const [showEvents, setShowEvents] = useState(false);
  const [isEventListVisible, setIsEventListVisible] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [calendarMonthDate, setCalendarMonthDate] = useState(() => parseIsoDate(formatIso(new Date())));
  const [isCalendarFetching, setIsCalendarFetching] = useState(false);
  const [calendarEventDays, setCalendarEventDays] = useState<Set<string>>(() => new Set());
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [calendarMonthTransition, setCalendarMonthTransition] = useState<'next' | 'prev' | null>(null);
  const [calendarMonthPhase, setCalendarMonthPhase] = useState<'idle' | 'exiting' | 'entering'>('idle');
  const [weekEventDays, setWeekEventDays] = useState<Set<string>>(() => new Set());
  const [eventsRefreshCounter, setEventsRefreshCounter] = useState(0);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [deleteConfirmEvent, setDeleteConfirmEvent] = useState<EventItem | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
  const [isAddEventSubmitting, setIsAddEventSubmitting] = useState(false);
  const [addEventError, setAddEventError] = useState<string | null>(null);
  const [addEventForm, setAddEventForm] = useState({
    title: '',
    description: '',
    location: '',
    date: '',
    startTime: '',
    endTime: '',
    registerable: false,
    registerUrl: '',
  });
  const displayedDateRef = useRef(displayedDate);
  const showEventsRef = useRef(showEvents);
  const showLoaderRef = useRef(showLoader);
  const eventsExitTimeoutRef = useRef<number | undefined>();
  const loaderDelayTimeoutRef = useRef<number | undefined>();
  const loaderHideTimeoutRef = useRef<number | undefined>();
  const loaderEnterFrameRef = useRef<number | undefined>();
  const fetchAbortControllerRef = useRef<AbortController | null>(null);
  const calendarFetchAbortRef = useRef<AbortController | null>(null);
  const calendarMonthExitTimeoutRef = useRef<number | undefined>();
  const calendarMonthEnterTimeoutRef = useRef<number | undefined>();
  const weekEventsFetchAbortRef = useRef<AbortController | null>(null);
  const addEventErrorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(new Date());
    }, 60000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    displayedDateRef.current = displayedDate;
  }, [displayedDate]);

  useEffect(() => {
    showEventsRef.current = showEvents;
  }, [showEvents]);

  useEffect(() => {
    showLoaderRef.current = showLoader;
  }, [showLoader]);

  useEffect(() => () => {
    clearTimeoutRef(eventsExitTimeoutRef);
    clearTimeoutRef(loaderDelayTimeoutRef);
    clearTimeoutRef(loaderHideTimeoutRef);
    cancelAnimationFrameRef(loaderEnterFrameRef);
    if (fetchAbortControllerRef.current) {
      fetchAbortControllerRef.current.abort();
      fetchAbortControllerRef.current = null;
    }
    if (calendarFetchAbortRef.current) {
      calendarFetchAbortRef.current.abort();
      calendarFetchAbortRef.current = null;
    }
    if (weekEventsFetchAbortRef.current) {
      weekEventsFetchAbortRef.current.abort();
      weekEventsFetchAbortRef.current = null;
    }
    clearTimeoutRef(calendarMonthExitTimeoutRef);
    clearTimeoutRef(calendarMonthEnterTimeoutRef);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsLoading(false), 1200);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.language) {
      setUserLocale(navigator.language);
    }
  }, []);

  useEffect(() => {
    if (isCalendarModalOpen) {
      setCalendarMonthDate(parseIsoDate(selectedDate));
      setCalendarMonthTransition(null);
    }
  }, [isCalendarModalOpen, selectedDate]);

  useEffect(() => {
    if (!isCalendarModalOpen) {
      clearTimeoutRef(calendarMonthExitTimeoutRef);
      clearTimeoutRef(calendarMonthEnterTimeoutRef);
      setCalendarMonthPhase('idle');
      setCalendarMonthTransition(null);
    }
  }, [isCalendarModalOpen]);

  const weekDays = getWeekDays(weekOffset);
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }, [events]);
  const weekStartIso = weekDays[0]?.iso ?? null;
  const weekEndIso = weekDays[weekDays.length - 1]?.iso ?? null;
  const selectedDateObj = useMemo(() => parseIsoDate(selectedDate), [selectedDate]);
  const selectedMonth = selectedDateObj.getMonth();
  const selectedYear = selectedDateObj.getFullYear();
  const monthLabel = useMemo(() => {
    return new Intl.DateTimeFormat(userLocale, { month: 'long', year: 'numeric' }).format(selectedDateObj);
  }, [selectedDateObj, userLocale]);
  const calendarMonthLabel = useMemo(() => {
    if (!calendarMonthDate) {
      return '';
    }
    return new Intl.DateTimeFormat(userLocale, { month: 'long', year: 'numeric' }).format(calendarMonthDate);
  }, [calendarMonthDate, userLocale]);
  const timeFormatter = useMemo(
    () => new Intl.DateTimeFormat(userLocale, { hour: '2-digit', minute: '2-digit' }),
    [userLocale],
  );
  const todayIso = useMemo(() => formatIso(now), [now]);
  const formatEventTimeRange = useCallback(
    (event: EventItem) => {
      const startLabel = timeFormatter.format(event.startTime);
      if (event.endTime) {
        return `${startLabel} – ${timeFormatter.format(event.endTime)}`;
      }
      return startLabel;
    },
    [timeFormatter],
  );
  const calendarDays = useMemo(() => {
    if (!calendarMonthDate) {
      return [] as CalendarDayCell[];
    }
    return getCalendarGrid(calendarMonthDate, calendarEventDays, todayIso, selectedDate);
  }, [calendarMonthDate, calendarEventDays, todayIso, selectedDate]);
  const calendarGridClassName = useMemo(() => {
    const classes = ['calendar-modal-grid'];
    if (calendarMonthTransition && calendarMonthPhase !== 'idle') {
      classes.push('is-transitioning', `is-${calendarMonthTransition}`, `is-${calendarMonthPhase}`);
    }
    return classes.join(' ');
  }, [calendarMonthPhase, calendarMonthTransition]);
  const calendarStatusMessage = calendarError ?? (isCalendarFetching ? 'Загрузка…' : '');
  const calendarStatusClassName = `calendar-modal-status${isCalendarFetching ? ' is-loading' : ''}`;
  const calendarOverlayClassName = `calendar-modal-overlay${isCalendarModalOpen ? ' is-visible' : ''}`;
  const calendarModalClassName = `calendar-modal${isCalendarModalOpen ? ' is-visible' : ''}`;
  const isCalendarAnimating = calendarMonthPhase !== 'idle';

  const getEventStatus = useCallback(
    (event: EventItem) => {
      const start = event.startTime.getTime();
      const end = (event.endTime ?? event.startTime).getTime();
      const current = now.getTime();

      if (current >= start && current <= end) {
        return 'active' as const;
      }
      if (current > end) {
        return 'past' as const;
      }
      return 'upcoming' as const;
    },
    [now],
  );

  const handleShiftWeek = (direction: number) => {
    const nextOffset = weekOffset + direction;
    setWeekTransition(direction > 0 ? 'next' : 'prev');
    setWeekOffset(nextOffset);
    const nextWeek = getWeekDays(nextOffset);
    const nextDate = nextWeek[0]?.iso ?? selectedDate;
    if (nextDate !== selectedDate) {
      setSelectedDate(nextDate);
    }
    setExpandedEventId(null);
  };

  const handleSelectDate = (iso: string) => {
    if (iso === selectedDate) {
      return;
    }
    setSelectedDate(iso);
    setExpandedEventId(null);
  };

  const handleToggleEvent = (eventId: string) => {
    setExpandedEventId((prev) => (prev === eventId ? null : eventId));
  };

  const handleRegisterClick = (url?: string) => {
    if (!url) {
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCalendarToggle = () => {
    setIsCalendarModalOpen((prev) => !prev);
  };

  const handleCalendarDaySelect = (iso: string) => {
    const targetDate = parseIsoDate(iso);
    const offset = getWeekOffsetFromToday(targetDate);
    setWeekOffset((prev) => (prev === offset ? prev : offset));
    setSelectedDate(iso);
    setIsCalendarModalOpen(false);
  };

  const handleCalendarMonthShift = (direction: number) => {
    if (calendarMonthPhase !== 'idle') {
      return;
    }

    const directionLabel = direction > 0 ? 'next' : 'prev';
    setCalendarMonthTransition(directionLabel);
    setCalendarMonthPhase('exiting');

    clearTimeoutRef(calendarMonthExitTimeoutRef);
    clearTimeoutRef(calendarMonthEnterTimeoutRef);

    calendarMonthExitTimeoutRef.current = window.setTimeout(() => {
      setCalendarMonthDate((prev) => {
        const base = prev ?? parseIsoDate(selectedDate);
        const nextDate = new Date(base);
        nextDate.setMonth(base.getMonth() + direction, 1);
        nextDate.setHours(0, 0, 0, 0);
        return nextDate;
      });
      setCalendarMonthPhase('entering');

      calendarMonthEnterTimeoutRef.current = window.setTimeout(() => {
        setCalendarMonthPhase('idle');
        setCalendarMonthTransition(null);
      }, CALENDAR_MONTH_TRANSITION_DURATION);
    }, CALENDAR_MONTH_TRANSITION_DURATION);
  };

  const handleCalendarModalDismiss = () => {
    setIsCalendarModalOpen(false);
  };

  const handleOpenAddEventModal = () => {
    setAddEventForm({
      title: '',
      description: '',
      location: '',
      date: selectedDate,
      startTime: '',
      endTime: '',
      registerable: false,
      registerUrl: '',
    });
    setAddEventError(null);
    setIsAddEventModalOpen(true);
  };

  const handleCloseAddEventModal = () => {
    if (isAddEventSubmitting) return;
    setIsAddEventModalOpen(false);
  };

  const handleAddEventFormChange = (field: keyof typeof addEventForm, value: string | boolean) => {
    setAddEventForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddEventSubmit = async () => {
    if (isAddEventSubmitting) return;

    const { title, description, location, date, startTime, endTime, registerable, registerUrl } = addEventForm;

    if (!title.trim() || !date || !startTime) {
      setAddEventError('Заполните обязательные поля: название, дата и время начала');
      return;
    }

    if (registerable) {
      if (!registerUrl.trim()) {
        setAddEventError('Укажите ссылку для регистрации');
        return;
      }
      if (!registerUrl.trim().startsWith('https://')) {
        setAddEventError('Ссылка для регистрации должна начинаться с https://');
        return;
      }
    }

    setIsAddEventSubmitting(true);
    setAddEventError(null);

    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        date,
        startTime,
        endTime: endTime || undefined,
        registerable,
        registerUrl: registerable && registerUrl.trim() ? registerUrl.trim() : undefined,
      };

      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(errorData.error ?? `Ошибка: ${response.status}`);
      }

      setIsAddEventModalOpen(false);
      setEventsRefreshCounter((prev) => prev + 1);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Произошла ошибка';
      setAddEventError(errorMessage);
      requestAnimationFrame(() => {
        addEventErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    } finally {
      setIsAddEventSubmitting(false);
    }
  };

  const handleOpenDeleteModal = (event: EventItem) => {
    setDeleteConfirmEvent(event);
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setTimeout(() => setDeleteConfirmEvent(null), 220);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmEvent) return;
    handleCloseDeleteModal();
    await new Promise((resolve) => setTimeout(resolve, 100));
    handleDeleteEvent(deleteConfirmEvent.id);
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!isAuthenticated || deletingEventId) return;

    setDeletingEventId(eventId);

    try {
      const response = await fetch(`/api/events?id=${eventId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as { error?: string };
        console.error('[events.delete]', errorData.error);
        setDeletingEventId(null);
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 380));

      setEvents((prev) => prev.filter((e) => e.id !== eventId));
      setDeletingEventId(null);

      setEventsRefreshCounter((prev) => prev + 1);
    } catch (error) {
      console.error('[events.delete]', error);
      setDeletingEventId(null);
    }
  };

  useEffect(() => {
    if (!weekTransition) {
      return undefined;
    }
    const timer = window.setTimeout(() => setWeekTransition(null), 320);
    return () => window.clearTimeout(timer);
  }, [weekTransition]);

  const weekScrollClassName = useMemo(() => {
    const classes = ['week-scroll'];
    if (weekTransition) {
      classes.push(`slide-${weekTransition}`);
    }
    return classes.join(' ');
  }, [weekTransition]);

  const loaderClassNames = ['events-loader'];
  if (showLoader && isLoaderEntering && !isLoaderFading) {
    loaderClassNames.push('is-visible');
  }
  if (isLoaderFading) {
    loaderClassNames.push('is-fading');
  }
  const loaderClassName = loaderClassNames.join(' ');

  useEffect(() => {
    cancelAnimationFrameRef(loaderEnterFrameRef);

    if (!showLoader) {
      setIsLoaderEntering(false);
      return;
    }

    loaderEnterFrameRef.current = window.requestAnimationFrame(() => {
      setIsLoaderEntering(true);
    });

    return () => {
      cancelAnimationFrameRef(loaderEnterFrameRef);
    };
  }, [showLoader]);

  useEffect(() => {
    if (selectedDate === displayedDateRef.current) {
      return;
    }

    clearTimeoutRef(eventsExitTimeoutRef);
    clearTimeoutRef(loaderDelayTimeoutRef);
    clearTimeoutRef(loaderHideTimeoutRef);

    setIsLoaderFading(false);

    if (showEventsRef.current) {
      setIsEventListVisible(false);
      eventsExitTimeoutRef.current = window.setTimeout(() => {
        setShowEvents(false);
      }, EVENTS_FADE_DURATION);
      loaderDelayTimeoutRef.current = window.setTimeout(() => {
        setShowLoader(true);
      }, EVENTS_FADE_DURATION + LOADER_DELAY);
    } else if (!showLoaderRef.current) {
      loaderDelayTimeoutRef.current = window.setTimeout(() => {
        setShowLoader(true);
      }, LOADER_DELAY);
    }
  }, [selectedDate]);

  useEffect(() => {
    const controller = new AbortController();
    fetchAbortControllerRef.current?.abort();
    fetchAbortControllerRef.current = controller;

    setIsEventsLoading(true);
    setEventsError(null);

    const query = new URLSearchParams({ date: selectedDate }).toString();

    const loadEvents = async () => {
      try {
        const response = await fetch(`/api/events?${query}`, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`Failed to load events: ${response.status}`);
        }
        const payload = (await response.json()) as EventsApiResponse;
        if (controller.signal.aborted) {
          return;
        }

        const normalizedEvents: EventItem[] = (payload.events ?? []).map(mapApiEvent);

        setEvents(normalizedEvents);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        console.error('[events.fetch]', error);
        setEvents([]);
        setEventsError('Не удалось загрузить события. Попробуйте ещё раз.');
      } finally {
        if (!controller.signal.aborted) {
          setIsEventsLoading(false);
        }
      }
    };

    void loadEvents();

    return () => {
      controller.abort();
      if (fetchAbortControllerRef.current === controller) {
        fetchAbortControllerRef.current = null;
      }
    };
  }, [selectedDate, eventsRefreshCounter]);

  useEffect(() => {
    if (!isCalendarModalOpen || !calendarMonthDate) {
      setIsCalendarFetching(false);
      return undefined;
    }

    const monthStart = new Date(calendarMonthDate.getFullYear(), calendarMonthDate.getMonth(), 1);
    const monthEnd = new Date(calendarMonthDate.getFullYear(), calendarMonthDate.getMonth() + 1, 0);
    const params = new URLSearchParams({ from: formatIso(monthStart), to: formatIso(monthEnd) });

    const controller = new AbortController();
    calendarFetchAbortRef.current?.abort();
    calendarFetchAbortRef.current = controller;

    setIsCalendarFetching(true);
    setCalendarError(null);

    const loadCalendarEvents = async () => {
      try {
        const response = await fetch(`/api/events?${params.toString()}`, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`Failed to load range events: ${response.status}`);
        }
        const payload = (await response.json()) as EventsApiResponse;
        if (controller.signal.aborted) {
          return;
        }

        const daySet = new Set<string>();
        (payload.events ?? []).forEach((eventItem) => {
          const startIso = formatIso(new Date(eventItem.startTime));
          daySet.add(startIso);
        });
        setCalendarEventDays(daySet);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        console.error('[calendar.fetch]', error);
        setCalendarError('Не удалось загрузить календарь');
        setCalendarEventDays(new Set());
      } finally {
        if (!controller.signal.aborted) {
          setIsCalendarFetching(false);
        }
      }
    };

    void loadCalendarEvents();

    return () => {
      controller.abort();
      if (calendarFetchAbortRef.current === controller) {
        calendarFetchAbortRef.current = null;
      }
    };
  }, [calendarMonthDate, isCalendarModalOpen]);

  useEffect(() => {
    if (!showLoader || isEventsLoading) {
      return;
    }

    clearTimeoutRef(loaderHideTimeoutRef);
    setIsLoaderFading(true);

    loaderHideTimeoutRef.current = window.setTimeout(() => {
      setShowLoader(false);
      setIsLoaderFading(false);
      setDisplayedDate(selectedDate);
      setShowEvents(true);
      requestAnimationFrame(() => {
        setIsEventListVisible(true);
      });
    }, LOADER_FADE_DURATION);

    return () => clearTimeoutRef(loaderHideTimeoutRef);
  }, [showLoader, isEventsLoading, selectedDate]);

  useEffect(() => {
    if (!weekStartIso || !weekEndIso) {
      return undefined;
    }

    const params = new URLSearchParams({ from: weekStartIso, to: weekEndIso });
    const controller = new AbortController();
    weekEventsFetchAbortRef.current?.abort();
    weekEventsFetchAbortRef.current = controller;

    const loadWeekEvents = async () => {
      try {
        const payload = await fetchEventsWithinRange(params, controller.signal);
        if (controller.signal.aborted) {
          return;
        }

        const daysWithEvents = new Set<string>();
        (payload.events ?? []).forEach((eventItem) => {
          const startIso = formatIso(new Date(eventItem.startTime));
          daysWithEvents.add(startIso);
        });
        setWeekEventDays(daysWithEvents);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        console.error('[week.fetch]', error);
        setWeekEventDays(new Set());
      }
    };

    void loadWeekEvents();

    return () => {
      controller.abort();
      if (weekEventsFetchAbortRef.current === controller) {
        weekEventsFetchAbortRef.current = null;
      }
    };
  }, [weekStartIso, weekEndIso, eventsRefreshCounter]);

  return (
    <Page back={false}>
      <div className="calendar-stage">
        <div
          className={`page-loader${isLoading ? ' is-visible' : ''}`}
          role="status"
          aria-hidden={!isLoading}
        >
          <div className="loader-brand">
            <div className="loader-ring" />
            <div className="loader-ring loader-ring--delayed" />
            <div className="loader-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="3" y="5" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.5" />
                <path d="M3 10h18" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="7.5" cy="15" r="1.25" fill="currentColor" />
                <circle cx="12" cy="15" r="1.25" fill="currentColor" />
              </svg>
            </div>
          </div>
          <p className="loader-text">Загрузка расписания</p>
        </div>

        <div
          className={calendarOverlayClassName}
          role={isCalendarModalOpen ? 'dialog' : undefined}
          aria-modal={isCalendarModalOpen || undefined}
          aria-label="Календарь событий"
          aria-hidden={isCalendarModalOpen ? undefined : true}
          onClick={isCalendarModalOpen ? handleCalendarModalDismiss : undefined}
        >
          <div
            className={calendarModalClassName}
            onClick={(event) => event.stopPropagation()}
            tabIndex={isCalendarModalOpen ? 0 : -1}
          >
            <div className="calendar-modal-header">
              <span className="calendar-modal-title">Календарь</span>
              <button
                type="button"
                className="calendar-modal-close"
                onClick={handleCalendarModalDismiss}
                aria-label="Закрыть календарь"
                disabled={!isCalendarModalOpen}
              >
                ×
              </button>
            </div>
            <div className="calendar-modal-toolbar">
              <button
                type="button"
                className="calendar-modal-nav"
                onClick={() => handleCalendarMonthShift(-1)}
                aria-label="Предыдущий месяц"
                disabled={!isCalendarModalOpen || isCalendarAnimating}
              >
                {'‹'}
              </button>
              <span className="calendar-modal-month">{calendarMonthLabel}</span>
              <button
                type="button"
                className="calendar-modal-nav"
                onClick={() => handleCalendarMonthShift(1)}
                aria-label="Следующий месяц"
                disabled={!isCalendarModalOpen || isCalendarAnimating}
              >
                {'›'}
              </button>
            </div>
            <div className="calendar-modal-weekdays" aria-hidden={!isCalendarModalOpen}>
              {WEEKDAY_LABELS.map((label) => (
                <span key={`weekday-${label}`} className="calendar-modal-weekday" aria-hidden="true">
                  {label}
                </span>
              ))}
            </div>
            <div className={calendarGridClassName} data-transition={calendarMonthTransition ?? undefined}>
                {calendarDays.map((day) => {
                const dayClasses = ['calendar-modal-day'];
                if (!day.isCurrentMonth) {
                  dayClasses.push('is-outside');
                }
                if (day.isSelected) {
                  dayClasses.push('is-selected');
                }
                if (day.isToday) {
                  dayClasses.push('is-today');
                }

                  const markerClasses: string[] = ['calendar-modal-day-marker'];
                  if (day.isSelected) {
                    markerClasses.push('is-selected');
                  } else if (day.isToday) {
                    markerClasses.push('is-today');
                  } else if (day.hasEvents) {
                    markerClasses.push('has-events');
                    if (day.isPast) {
                      markerClasses.push('is-past');
                    }
                  }

                return (
                  <button
                    key={day.iso}
                    type="button"
                    className={dayClasses.join(' ')}
                    onClick={() => handleCalendarDaySelect(day.iso)}
                    disabled={!isCalendarModalOpen || isCalendarAnimating}
                  >
                    <span className="calendar-modal-day-number">{day.label}</span>
                      <span className={markerClasses.join(' ')} aria-hidden="true" />
                  </button>
                );
              })}
            </div>
            <div className={calendarStatusClassName} aria-live="polite">
              {calendarStatusMessage}
            </div>
          </div>
        </div>

        {/* Add Event Modal */}
        <div
          className={`add-event-modal-overlay${isAddEventModalOpen ? ' is-visible' : ''}`}
          role={isAddEventModalOpen ? 'dialog' : undefined}
          aria-modal={isAddEventModalOpen || undefined}
          aria-label="Добавить событие"
          aria-hidden={isAddEventModalOpen ? undefined : true}
          onClick={isAddEventModalOpen ? handleCloseAddEventModal : undefined}
        >
          <div
            className={`add-event-modal${isAddEventModalOpen ? ' is-visible' : ''}`}
            onClick={(event) => event.stopPropagation()}
            tabIndex={isAddEventModalOpen ? 0 : -1}
          >
            <div className="add-event-modal-header">
              <span className="add-event-modal-title">Новое событие</span>
              <button
                type="button"
                className="add-event-modal-close"
                onClick={handleCloseAddEventModal}
                aria-label="Закрыть"
                disabled={!isAddEventModalOpen || isAddEventSubmitting}
              >
                ×
              </button>
            </div>
            <div className="add-event-modal-body">
              <div className="add-event-field">
                <label className="add-event-label" htmlFor="add-event-title">
                  Название *
                </label>
                <input
                  id="add-event-title"
                  type="text"
                  className="add-event-input"
                  value={addEventForm.title}
                  onChange={(e) => handleAddEventFormChange('title', e.target.value)}
                  placeholder="Название события"
                  disabled={isAddEventSubmitting}
                />
              </div>
              <div className="add-event-field">
                <label className="add-event-label" htmlFor="add-event-description">
                  Описание
                </label>
                <textarea
                  id="add-event-description"
                  className="add-event-textarea"
                  value={addEventForm.description}
                  onChange={(e) => handleAddEventFormChange('description', e.target.value)}
                  placeholder="Описание события"
                  rows={3}
                  disabled={isAddEventSubmitting}
                />
              </div>
              <div className="add-event-field">
                <label className="add-event-label" htmlFor="add-event-location">
                  Место
                </label>
                <input
                  id="add-event-location"
                  type="text"
                  className="add-event-input"
                  value={addEventForm.location}
                  onChange={(e) => handleAddEventFormChange('location', e.target.value)}
                  placeholder="Место проведения"
                  disabled={isAddEventSubmitting}
                />
              </div>
              <div className="add-event-row">
                <div className="add-event-field add-event-field--half">
                  <label className="add-event-label" htmlFor="add-event-date">
                    Дата *
                  </label>
                  <input
                    id="add-event-date"
                    type="date"
                    className="add-event-input"
                    value={addEventForm.date}
                    onChange={(e) => handleAddEventFormChange('date', e.target.value)}
                    disabled={isAddEventSubmitting}
                  />
                </div>
                <div className="add-event-field add-event-field--half">
                  <label className="add-event-label" htmlFor="add-event-start-time">
                    Начало *
                  </label>
                  <input
                    id="add-event-start-time"
                    type="time"
                    className="add-event-input"
                    value={addEventForm.startTime}
                    onChange={(e) => handleAddEventFormChange('startTime', e.target.value)}
                    disabled={isAddEventSubmitting}
                  />
                </div>
              </div>
              <div className="add-event-field">
                <label className="add-event-label" htmlFor="add-event-end-time">
                  Окончание
                </label>
                <input
                  id="add-event-end-time"
                  type="time"
                  className="add-event-input"
                  value={addEventForm.endTime}
                  onChange={(e) => handleAddEventFormChange('endTime', e.target.value)}
                  disabled={isAddEventSubmitting}
                />
              </div>
              <div className="add-event-field add-event-field--checkbox">
                <label className="add-event-checkbox-label">
                  <input
                    type="checkbox"
                    className="add-event-checkbox"
                    checked={addEventForm.registerable}
                    onChange={(e) => handleAddEventFormChange('registerable', e.target.checked)}
                    disabled={isAddEventSubmitting}
                  />
                  <span>Требуется регистрация</span>
                </label>
              </div>
              {addEventForm.registerable && (
                <div className="add-event-field">
                  <label className="add-event-label" htmlFor="add-event-register-url">
                    Ссылка на регистрацию
                  </label>
                  <input
                    id="add-event-register-url"
                    type="url"
                    className="add-event-input"
                    value={addEventForm.registerUrl}
                    onChange={(e) => handleAddEventFormChange('registerUrl', e.target.value)}
                    placeholder="https://..."
                    disabled={isAddEventSubmitting}
                  />
                </div>
              )}
              {addEventError && (
                <div ref={addEventErrorRef} className="add-event-error" role="alert">
                  {addEventError}
                </div>
              )}
            </div>
            <div className="add-event-modal-footer">
              <button
                type="button"
                className="add-event-cancel-button"
                onClick={handleCloseAddEventModal}
                disabled={isAddEventSubmitting}
              >
                Отмена
              </button>
              <button
                type="button"
                className="add-event-submit-button"
                onClick={handleAddEventSubmit}
                disabled={isAddEventSubmitting}
              >
                {isAddEventSubmitting ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>

        <div className={`calendar-content${!isLoading ? ' is-visible' : ''}`} aria-busy={isLoading}>
          <div className="week-header">
            <div className="week-header-bar">
              <div className="month-label">{monthLabel}</div>
              <div className="week-header-actions">
                {isAdmin && (
                  <button
                    type="button"
                    className="add-event-button"
                    onClick={handleOpenAddEventModal}
                    aria-label="Добавить событие"
                  >
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      role="presentation"
                      aria-hidden="true"
                    >
                      <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                )}
                <button
                  type="button"
                  className="calendar-launch-button"
                  onClick={handleCalendarToggle}
                  aria-label="Открыть календарь"
                  aria-pressed={isCalendarModalOpen}
                >
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    role="presentation"
                    aria-hidden="true"
                  >
                    <rect x="3" y="5" width="18" height="16" rx="4" ry="4" stroke="currentColor" fill="none" />
                    <line x1="3" y1="11" x2="21" y2="11" stroke="currentColor" strokeWidth="1.5" />
                    <line x1="8" y1="3" x2="8" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <line x1="16" y1="3" x2="16" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="week-panel">
            <button
              type="button"
              className="week-nav-button"
              onClick={() => handleShiftWeek(-1)}
              aria-label="Previous week"
            >
              {'‹'}
            </button>

            <div className={weekScrollClassName}>
              <div className="week-scroll-track" key={weekOffset}>
                {weekDays.map((day) => {
                  const isPastDay = day.iso < todayIso;
                  const classes = ['week-day'];
                  if (selectedDate === day.iso) {
                    classes.push('is-active');
                  }
                  if (day.isToday) {
                    classes.push('is-today');
                  }
                  if (day.month !== selectedMonth || day.year !== selectedYear) {
                    classes.push('is-outside');
                  }
                  if (weekEventDays.has(day.iso)) {
                    classes.push('has-events');
                    if (isPastDay) {
                      classes.push('is-event-past');
                    }
                  }

                  return (
                    <button
                      key={day.iso}
                      type="button"
                      className={classes.join(' ')}
                      onClick={() => handleSelectDate(day.iso)}
                    >
                      <span className="week-day-name">{day.shortLabel}</span>
                      <span className="week-day-number">{day.day}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              className="week-nav-button"
              onClick={() => handleShiftWeek(1)}
              aria-label="Next week"
            >
              {'›'}
            </button>
          </div>
          </div>

          <div className="events-list">
            {showLoader && (
              <div className={loaderClassName}>
                {[0, 1].map((item) => (
                  <div key={`skeleton-${item}`} className="event-card skeleton">
                    <div className="event-card-trigger">
                      <div className="event-card-text">
                        <span className="skeleton-block w-lg" />
                        <span className="skeleton-block w-md" />
                        <span className="skeleton-tag" />
                      </div>
                      <span className="skeleton-circle" />
                    </div>
                    <div className="event-card-details skeleton-details">
                      <span className="skeleton-block w-full" />
                      <span className="skeleton-block w-sm" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showEvents && (
              <div
                className={`events-list-content${isEventListVisible ? ' is-visible' : ' is-exiting'}`}
              >
                {sortedEvents.length ? (
                  sortedEvents.map((event, index) => {
                    const isExpanded = expandedEventId === event.id;
                    const isDeleting = deletingEventId === event.id;
                    const status = getEventStatus(event);
                    const cardClasses = ['event-card'];
                    if (isExpanded) {
                      cardClasses.push('is-open');
                    }
                    if (status === 'active') {
                      cardClasses.push('is-active');
                    }
                    if (status === 'past') {
                      cardClasses.push('is-past');
                    }
                    if (isDeleting) {
                      cardClasses.push('is-deleting');
                    }
                    return (
                      <div
                        key={`${displayedDate}-${event.id}`}
                        className={cardClasses.join(' ')}
                        style={{ animationDelay: `${index * 60}ms` }}
                        data-status={status}
                      >
                        {isAdmin ? (
                          isExpanded ? (
                            <button
                              type="button"
                              className="event-delete-button is-visible"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDeleteModal(event);
                              }}
                              aria-label="Удалить событие"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                                <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                                <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                              </svg>
                            </button>
                          ) : (
                            <span className="event-corner-arrow" aria-hidden="true">
                              <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
                                <path d="M2 2L8 8L2 14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </span>
                          )
                        ) : (
                          <span className={`event-corner-arrow${isExpanded ? ' is-open' : ''}`} aria-hidden="true">
                            <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
                              <path d="M2 2L8 8L2 14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </span>
                        )}
                        <div
                          className="event-card-trigger"
                          onClick={() => handleToggleEvent(event.id)}
                          role="button"
                          tabIndex={0}
                          aria-expanded={isExpanded}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleToggleEvent(event.id);
                            }
                          }}
                        >
                          <div className="event-card-text">
                            <span className="event-title">{event.title}</span>
                            <span className="event-time">{formatEventTimeRange(event)}</span>
                            {event.registerable && status === 'upcoming' ? (
                              <span className="event-badge-required">Необходима регистрация</span>
                            ) : null}
                          </div>
                        </div>
                        <div className={`event-card-details${isExpanded ? ' is-open' : ''}`}>
                          <p className="event-description">{event.description}</p>
                          <p className="event-details-row">
                            <span className="event-details-icon" aria-hidden="true">📍</span>
                            <span className="event-details-location">{event.location}</span>
                          </p>
                          {event.registerable ? (
                            status === 'upcoming' ? (
                              <button
                                type="button"
                                className="event-register-button"
                                onClick={() => handleRegisterClick(event.registerUrl)}
                              >
                                Зарегистрироваться
                              </button>
                            ) : (
                              <span className="event-register-button event-register-button--inactive" aria-label="Регистрация завершена">
                                Регистрация завершена
                              </span>
                            )
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="events-empty">
                    {eventsError ?? 'Add a meeting for this day.'}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        <div
          className={`delete-confirm-overlay${isDeleteModalOpen ? ' is-visible' : ''}`}
          role={isDeleteModalOpen ? 'dialog' : undefined}
          aria-modal={isDeleteModalOpen || undefined}
          aria-label="Подтверждение удаления"
          aria-hidden={isDeleteModalOpen ? undefined : true}
          onClick={isDeleteModalOpen ? handleCloseDeleteModal : undefined}
        >
          <div
            className={`delete-confirm-modal${isDeleteModalOpen ? ' is-visible' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="delete-confirm-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                <line x1="12" y1="7" x2="12" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <circle cx="12" cy="16.5" r="1" fill="currentColor" />
              </svg>
            </div>
            <h3 className="delete-confirm-title">Удалить событие?</h3>
            <p className="delete-confirm-text">
              {deleteConfirmEvent?.title ? (
                <>Вы уверены, что хотите удалить событие <strong>«{deleteConfirmEvent.title}»</strong>? Это действие нельзя отменить.</>
              ) : (
                'Вы уверены, что хотите удалить это событие? Это действие нельзя отменить.'
              )}
            </p>
            <div className="delete-confirm-actions">
              <button
                type="button"
                className="delete-confirm-cancel"
                onClick={handleCloseDeleteModal}
              >
                Отмена
              </button>
              <button
                type="button"
                className="delete-confirm-submit"
                onClick={handleConfirmDelete}
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}

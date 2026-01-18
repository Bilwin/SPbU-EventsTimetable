'use client';

import { useMemo } from 'react';
import type { CalendarDayCell } from '@/types';

const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

type CalendarModalProps = {
  isOpen: boolean;
  calendarMonthLabel: string;
  calendarDays: CalendarDayCell[];
  calendarStatusMessage: string;
  isCalendarFetching: boolean;
  calendarMonthTransition: 'next' | 'prev' | null;
  calendarMonthPhase: 'idle' | 'exiting' | 'entering';
  onClose: () => void;
  onDaySelect: (iso: string) => void;
  onMonthShift: (direction: number) => void;
};

export function CalendarModal({
  isOpen,
  calendarMonthLabel,
  calendarDays,
  calendarStatusMessage,
  isCalendarFetching,
  calendarMonthTransition,
  calendarMonthPhase,
  onClose,
  onDaySelect,
  onMonthShift,
}: CalendarModalProps) {
  const isAnimating = calendarMonthPhase !== 'idle';
  
  const overlayClassName = `calendar-modal-overlay${isOpen ? ' is-visible' : ''}`;
  const modalClassName = `calendar-modal${isOpen ? ' is-visible' : ''}`;
  const statusClassName = `calendar-modal-status${isCalendarFetching ? ' is-loading' : ''}`;
  
  const gridClassName = useMemo(() => {
    const classes = ['calendar-modal-grid'];
    if (calendarMonthTransition && calendarMonthPhase !== 'idle') {
      classes.push('is-transitioning', `is-${calendarMonthTransition}`, `is-${calendarMonthPhase}`);
    }
    return classes.join(' ');
  }, [calendarMonthPhase, calendarMonthTransition]);

  return (
    <div
      className={overlayClassName}
      role={isOpen ? 'dialog' : undefined}
      aria-modal={isOpen || undefined}
      aria-label="Календарь событий"
      aria-hidden={isOpen ? undefined : true}
      onClick={isOpen ? onClose : undefined}
    >
      <div
        className={modalClassName}
        onClick={(e) => e.stopPropagation()}
        tabIndex={isOpen ? 0 : -1}
      >
        <div className="calendar-modal-header">
          <span className="calendar-modal-title">Календарь</span>
          <button
            type="button"
            className="calendar-modal-close"
            onClick={onClose}
            aria-label="Закрыть календарь"
            disabled={!isOpen}
          >
            ×
          </button>
        </div>
        <div className="calendar-modal-toolbar">
          <button
            type="button"
            className="calendar-modal-nav"
            onClick={() => onMonthShift(-1)}
            aria-label="Предыдущий месяц"
            disabled={!isOpen || isAnimating}
          >
            {'‹'}
          </button>
          <span className="calendar-modal-month">{calendarMonthLabel}</span>
          <button
            type="button"
            className="calendar-modal-nav"
            onClick={() => onMonthShift(1)}
            aria-label="Следующий месяц"
            disabled={!isOpen || isAnimating}
          >
            {'›'}
          </button>
        </div>
        <div className="calendar-modal-weekdays" aria-hidden={!isOpen}>
          {WEEKDAY_LABELS.map((label) => (
            <span key={`weekday-${label}`} className="calendar-modal-weekday" aria-hidden="true">
              {label}
            </span>
          ))}
        </div>
        <div className={gridClassName} data-transition={calendarMonthTransition ?? undefined}>
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
                onClick={() => onDaySelect(day.iso)}
                disabled={!isOpen || isAnimating}
              >
                <span className="calendar-modal-day-number">{day.label}</span>
                <span className={markerClasses.join(' ')} aria-hidden="true" />
              </button>
            );
          })}
        </div>
        <div className={statusClassName} aria-live="polite">
          {calendarStatusMessage}
        </div>
      </div>
    </div>
  );
}

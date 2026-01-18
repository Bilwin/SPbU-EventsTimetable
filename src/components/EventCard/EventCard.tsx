'use client';

import type { EventItem, EventStatus } from '@/types';

type EventCardProps = {
  event: EventItem;
  status: EventStatus;
  isExpanded: boolean;
  isDeleting: boolean;
  isAdmin: boolean;
  animationDelay: number;
  displayedDate: string;
  timeRangeLabel: string;
  onToggle: () => void;
  onDelete: () => void;
  onRegister: () => void;
};

export function EventCard({
  event,
  status,
  isExpanded,
  isDeleting,
  isAdmin,
  animationDelay,
  displayedDate,
  timeRangeLabel,
  onToggle,
  onDelete,
  onRegister,
}: EventCardProps) {
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
      style={{ animationDelay: `${animationDelay}ms` }}
      data-status={status}
    >
      {isAdmin ? (
        <>
          <span className={`event-corner-arrow${isExpanded ? ' is-hidden' : ''}`} aria-hidden="true">
            <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
              <path d="M2 2L8 8L2 14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          <button
            type="button"
            className={`event-delete-button${isExpanded ? ' is-visible' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            aria-label="Удалить событие"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>
        </>
      ) : (
        <span className={`event-corner-arrow${isExpanded ? ' is-open' : ''}`} aria-hidden="true">
          <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
            <path d="M2 2L8 8L2 14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      )}
      <div
        className="event-card-trigger"
        onClick={onToggle}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        <div className="event-card-text">
          <span className="event-title">{event.title}</span>
          <span className="event-time">{timeRangeLabel}</span>
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
              onClick={onRegister}
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
}

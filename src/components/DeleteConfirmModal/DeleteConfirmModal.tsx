'use client';

import type { EventItem } from '@/types';

type DeleteConfirmModalProps = {
  isOpen: boolean;
  event: EventItem | null;
  onClose: () => void;
  onConfirm: () => void;
};

export function DeleteConfirmModal({
  isOpen,
  event,
  onClose,
  onConfirm,
}: DeleteConfirmModalProps) {
  return (
    <div
      className={`delete-confirm-overlay${isOpen ? ' is-visible' : ''}`}
      role={isOpen ? 'dialog' : undefined}
      aria-modal={isOpen || undefined}
      aria-label="Подтверждение удаления"
      aria-hidden={isOpen ? undefined : true}
      onClick={isOpen ? onClose : undefined}
    >
      <div
        className={`delete-confirm-modal${isOpen ? ' is-visible' : ''}`}
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
          {event?.title ? (
            <>Вы уверены, что хотите удалить событие <strong>«{event.title}»</strong>? Это действие нельзя отменить.</>
          ) : (
            'Вы уверены, что хотите удалить это событие? Это действие нельзя отменить.'
          )}
        </p>
        <div className="delete-confirm-actions">
          <button
            type="button"
            className="delete-confirm-cancel"
            onClick={onClose}
          >
            Отмена
          </button>
          <button
            type="button"
            className="delete-confirm-submit"
            onClick={onConfirm}
          >
            Удалить
          </button>
        </div>
      </div>
    </div>
  );
}

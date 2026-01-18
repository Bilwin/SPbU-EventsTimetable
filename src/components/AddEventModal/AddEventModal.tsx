'use client';

import { useRef, useEffect } from 'react';
import type { AddEventForm } from '@/types';

type AddEventModalProps = {
  isOpen: boolean;
  isSubmitting: boolean;
  form: AddEventForm;
  error: string | null;
  onClose: () => void;
  onFormChange: (field: keyof AddEventForm, value: string | boolean) => void;
  onSubmit: () => void;
};

export function AddEventModal({
  isOpen,
  isSubmitting,
  form,
  error,
  onClose,
  onFormChange,
  onSubmit,
}: AddEventModalProps) {
  const errorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (error) {
      errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [error]);

  return (
    <div
      className={`add-event-modal-overlay${isOpen ? ' is-visible' : ''}`}
      role={isOpen ? 'dialog' : undefined}
      aria-modal={isOpen || undefined}
      aria-label="Добавить событие"
      aria-hidden={isOpen ? undefined : true}
      onClick={isOpen ? onClose : undefined}
    >
      <div
        className={`add-event-modal${isOpen ? ' is-visible' : ''}`}
        onClick={(e) => e.stopPropagation()}
        tabIndex={isOpen ? 0 : -1}
      >
        <div className="add-event-modal-header">
          <span className="add-event-modal-title">Новое событие</span>
          <button
            type="button"
            className="add-event-modal-close"
            onClick={onClose}
            aria-label="Закрыть"
            disabled={!isOpen || isSubmitting}
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
              value={form.title}
              onChange={(e) => onFormChange('title', e.target.value)}
              placeholder="Название события"
              disabled={isSubmitting}
            />
          </div>
          <div className="add-event-field">
            <label className="add-event-label" htmlFor="add-event-description">
              Описание
            </label>
            <textarea
              id="add-event-description"
              className="add-event-textarea"
              value={form.description}
              onChange={(e) => onFormChange('description', e.target.value)}
              placeholder="Описание события"
              rows={3}
              disabled={isSubmitting}
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
              value={form.location}
              onChange={(e) => onFormChange('location', e.target.value)}
              placeholder="Место проведения"
              disabled={isSubmitting}
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
                value={form.date}
                onChange={(e) => onFormChange('date', e.target.value)}
                disabled={isSubmitting}
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
                value={form.startTime}
                onChange={(e) => onFormChange('startTime', e.target.value)}
                disabled={isSubmitting}
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
              value={form.endTime}
              onChange={(e) => onFormChange('endTime', e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <div className="add-event-field add-event-field--checkbox">
            <label className="add-event-checkbox-label">
              <input
                type="checkbox"
                className="add-event-checkbox"
                checked={form.registerable}
                onChange={(e) => onFormChange('registerable', e.target.checked)}
                disabled={isSubmitting}
              />
              <span>Требуется регистрация</span>
            </label>
          </div>
          {form.registerable && (
            <div className="add-event-field">
              <label className="add-event-label" htmlFor="add-event-register-url">
                Ссылка на регистрацию
              </label>
              <input
                id="add-event-register-url"
                type="url"
                className="add-event-input"
                value={form.registerUrl}
                onChange={(e) => onFormChange('registerUrl', e.target.value)}
                placeholder="https://..."
                disabled={isSubmitting}
              />
            </div>
          )}
          {error && (
            <div ref={errorRef} className="add-event-error" role="alert">
              {error}
            </div>
          )}
        </div>
        <div className="add-event-modal-footer">
          <button
            type="button"
            className="add-event-cancel-button"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Отмена
          </button>
          <button
            type="button"
            className="add-event-submit-button"
            onClick={onSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
}

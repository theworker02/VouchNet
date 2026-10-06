'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { rateUnitLabels, rateUnits, type RateUnit } from '../lib/profile-catalog';

export interface ServiceView {
  id: string;
  title: string;
  description: string | null;
  rateAmount: string | null;
  rateCurrency: string;
  rateUnit: RateUnit;
  active: boolean;
}

interface ServiceDraft {
  id?: string;
  title: string;
  description: string;
  rateAmount: string;
  rateUnit: RateUnit;
  active: boolean;
}

const emptyDraft: ServiceDraft = {
  title: '',
  description: '',
  rateAmount: '',
  rateUnit: 'HOURLY',
  active: true,
};

export function rateLabel(service: Pick<ServiceView, 'rateAmount' | 'rateUnit'>): string | null {
  if (service.rateAmount === null) return null;
  return `$${Number(service.rateAmount).toLocaleString()} ${rateUnitLabels[service.rateUnit]}`;
}

export function ServicesEditor({
  services,
  hourlyRate,
  rateVisible,
}: {
  services: ServiceView[];
  hourlyRate: string | null;
  rateVisible: boolean;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<ServiceDraft | null>(null);
  const [rate, setRate] = useState(hourlyRate ?? '');
  const [rateOn, setRateOn] = useState(rateVisible);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveService() {
    if (draft === null) return;
    setBusy(true);
    setError(null);
    try {
      const payload = {
        title: draft.title.trim(),
        description: draft.description.trim(),
        rateAmount: draft.rateAmount === '' ? null : Number(draft.rateAmount),
        rateUnit: draft.rateUnit,
        active: draft.active,
      };
      const response = await fetch(
        draft.id === undefined ? '/api/profile/services' : `/api/profile/services/${draft.id}`,
        {
          method: draft.id === undefined ? 'POST' : 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) {
        setError('Could not save this service. Check the fields and try again.');
        return;
      }
      setDraft(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function removeService(id: string) {
    setBusy(true);
    try {
      await fetch(`/api/profile/services/${id}`, { method: 'DELETE' });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function saveRate() {
    setBusy(true);
    try {
      await fetch('/api/profile/me', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          hourlyRateAmount: rate === '' ? null : Number(rate),
          hourlyRateVisible: rateOn,
        }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="services-editor">
      <div className="services-rate-row">
        <label>
          Published hourly rate
          <span className="rate-input">
            <span>$</span>
            <input
              inputMode="decimal"
              maxLength={10}
              value={rate}
              onChange={(event) => setRate(event.target.value)}
              placeholder="0"
            />
            <span className="rate-unit">USD / hr</span>
          </span>
        </label>
        <label className="experience-current">
          <input
            type="checkbox"
            checked={rateOn}
            onChange={(event) => setRateOn(event.target.checked)}
          />
          Show my rate on my profile
        </label>
        <button className="secondary" type="button" disabled={busy} onClick={() => void saveRate()}>
          {busy ? 'Saving…' : 'Save rate'}
        </button>
      </div>
      {services.map((service) => (
        <article className="experience-entry" key={service.id}>
          <div>
            <strong>{service.title}</strong>
            <p>{service.description ?? ''}</p>
            <span>
              {rateLabel(service) ?? 'Rate on request'}
              {service.active ? '' : ' · hidden'}
            </span>
          </div>
          <div className="experience-entry-actions">
            <button
              className="quiet-link"
              type="button"
              disabled={busy}
              onClick={() =>
                setDraft({
                  id: service.id,
                  title: service.title,
                  description: service.description ?? '',
                  rateAmount: service.rateAmount ?? '',
                  rateUnit: service.rateUnit,
                  active: service.active,
                })
              }
            >
              Edit
            </button>
            <button
              className="quiet-link danger"
              type="button"
              disabled={busy}
              onClick={() => void removeService(service.id)}
            >
              Remove
            </button>
          </div>
        </article>
      ))}
      {draft === null ? (
        <button className="secondary" type="button" onClick={() => setDraft({ ...emptyDraft })}>
          Add a service
        </button>
      ) : (
        <form
          className="experience-form"
          onSubmit={(event) => {
            event.preventDefault();
            void saveService();
          }}
        >
          <label>
            Service
            <input
              required
              maxLength={160}
              value={draft.title}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              placeholder="e.g. Backend architecture review"
            />
          </label>
          <label>
            Description
            <textarea
              maxLength={2000}
              rows={3}
              value={draft.description}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              placeholder="What clients get, deliverables, scope"
            />
          </label>
          <div className="experience-form-row">
            <label>
              Rate
              <span className="rate-input">
                <span>$</span>
                <input
                  inputMode="decimal"
                  maxLength={10}
                  value={draft.rateAmount}
                  onChange={(event) => setDraft({ ...draft, rateAmount: event.target.value })}
                  placeholder="On request"
                />
              </span>
            </label>
            <label>
              Rate type
              <select
                value={draft.rateUnit}
                onChange={(event) =>
                  setDraft({ ...draft, rateUnit: event.target.value as RateUnit })
                }
              >
                {rateUnits.map((unit) => (
                  <option key={unit} value={unit}>
                    {rateUnitLabels[unit]}
                  </option>
                ))}
              </select>
            </label>
            <label className="experience-current">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(event) => setDraft({ ...draft, active: event.target.checked })}
              />
              Visible on profile
            </label>
          </div>
          {error === null ? null : <p className="form-error">{error}</p>}
          <div className="experience-form-actions">
            <button className="primary" type="submit" disabled={busy}>
              {busy ? 'Saving…' : draft.id === undefined ? 'Add service' : 'Save changes'}
            </button>
            <button
              className="secondary"
              type="button"
              disabled={busy}
              onClick={() => setDraft(null)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import type { ServiceView } from './services-panel';
import { rateLabel } from './services-panel';

export function RequestServiceButton({
  providerUserId,
  providerName,
  services,
  signInHref,
}: {
  providerUserId: string;
  providerName: string;
  services: ServiceView[];
  signInHref: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [serviceId, setServiceId] = useState<string>('');
  const [message, setMessage] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  async function submit() {
    setState('sending');
    try {
      const response = await fetch('/api/service-requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          providerUserId,
          serviceId: serviceId === '' ? null : serviceId,
          message,
        }),
      });
      setState(response.ok ? 'sent' : 'error');
    } catch {
      setState('error');
    }
  }

  if (signInHref !== null) {
    return (
      <a className="primary service-request-link" href={signInHref}>
        Sign in to request services
      </a>
    );
  }
  return (
    <div className="service-request">
      {state === 'sent' ? (
        <p className="service-request-sent">Request sent to {providerName}.</p>
      ) : (
        <>
          <button className="primary" type="button" onClick={() => setOpen((value) => !value)}>
            {open ? 'Cancel request' : `Request ${providerName}'s services`}
          </button>
          {open ? (
            <form
              className="experience-form service-request-form"
              onSubmit={(event) => {
                event.preventDefault();
                void submit();
              }}
            >
              {services.length === 0 ? null : (
                <label>
                  Service
                  <select value={serviceId} onChange={(event) => setServiceId(event.target.value)}>
                    <option value="">General inquiry</option>
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.title}
                        {rateLabel(service) === null ? '' : ` — ${rateLabel(service)}`}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label>
                Message
                <textarea
                  required
                  minLength={10}
                  maxLength={4000}
                  rows={4}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Describe the work, timeline, and how to reach you"
                />
              </label>
              <button
                className="primary"
                type="submit"
                disabled={state === 'sending' || message.trim().length < 10}
              >
                {state === 'sending' ? 'Sending…' : 'Send request'}
              </button>
              {state === 'error' ? (
                <p className="form-error">The request could not be sent. Try again.</p>
              ) : null}
            </form>
          ) : null}
        </>
      )}
    </div>
  );
}

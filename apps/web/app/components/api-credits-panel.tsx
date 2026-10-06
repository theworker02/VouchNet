'use client';

import { useEffect, useState } from 'react';
import { apiOperationLabels, type ApiOperation } from '../lib/api-credits-config';

type CreditOverview = {
  isConfigured: boolean;
  balanceCredits: number;
  creditsPerUsd: number;
  packages: { id: string; amountCents: number; credits: number }[];
  costs: Record<ApiOperation, number>;
  usage30d: { calls: number; credits: number };
  activity: {
    id: string;
    kind: 'TOP_UP' | 'USAGE' | 'ADJUSTMENT';
    creditsDelta: number;
    balanceAfter: number;
    operation: string | null;
    amountCents: number | null;
    createdAt: string;
  }[];
};

const credits = new Intl.NumberFormat('en-US');
const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
});
const when = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

function activityLabel(entry: CreditOverview['activity'][number]): string {
  if (entry.kind === 'TOP_UP')
    return `Added credits${entry.amountCents === null ? '' : ` · ${usd.format(entry.amountCents / 100)}`}`;
  if (entry.kind === 'ADJUSTMENT') return 'Balance adjustment';
  return entry.operation !== null && entry.operation in apiOperationLabels
    ? apiOperationLabels[entry.operation as ApiOperation]
    : 'API call';
}

/**
 * Prepaid API and MCP credits. It reuses the billing card (`developer-access-summary`) and the
 * developer list rows so it reads as part of the existing membership surface.
 */
export function ApiCreditsPanel({ returnTo }: { returnTo: 'account' | 'developers' }) {
  const [overview, setOverview] = useState<CreditOverview | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    let attempts = 0;
    let pollTimer: number | null = null;
    let startingBalance: number | null = null;
    const params = new URLSearchParams(window.location.search).get('credits');
    const awaitTopUpWebhook = params === 'success';
    async function refresh() {
      try {
        const response = await fetch('/api/billing/credits');
        if (!response.ok) throw new Error('CREDITS_UNAVAILABLE');
        const next = (await response.json()) as CreditOverview;
        setOverview(next);
        if (startingBalance === null) {
          startingBalance = next.balanceCredits;
          if (awaitTopUpWebhook)
            setMessage({
              tone: 'success',
              text: 'Payment received. Credits appear once Stripe confirms it.',
            });
          if (params === 'canceled')
            setMessage({ tone: 'error', text: 'Checkout was canceled. No charge was made.' });
        }
        const landed =
          next.activity[0]?.kind === 'TOP_UP' &&
          Date.now() - new Date(next.activity[0].createdAt).getTime() < 15 * 60 * 1000;
        if (awaitTopUpWebhook && (landed || next.balanceCredits > startingBalance)) {
          if (pollTimer !== null) window.clearInterval(pollTimer);
          setMessage({ tone: 'success', text: 'Credits added to your balance.' });
        }
      } catch {
        setMessage({ tone: 'error', text: 'Credit balance is temporarily unavailable.' });
      }
    }
    void refresh();
    if (awaitTopUpWebhook) {
      pollTimer = window.setInterval(() => {
        attempts += 1;
        if (attempts >= 20 && pollTimer !== null) window.clearInterval(pollTimer);
        else void refresh();
      }, 3000);
    }
    return () => {
      if (pollTimer !== null) window.clearInterval(pollTimer);
    };
  }, []);

  async function addCredits(packageId: string) {
    setPending(packageId);
    setMessage(null);
    try {
      const response = await fetch('/api/billing/credits/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ packageId, returnTo }),
      });
      const body = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || body.url === undefined) {
        setMessage({
          tone: 'error',
          text:
            body.error === 'BILLING_NOT_CONFIGURED'
              ? 'Credit billing is not configured yet. Please try again later.'
              : 'We could not open secure Stripe checkout. Please try again.',
        });
        return;
      }
      window.location.assign(body.url);
    } catch {
      setMessage({
        tone: 'error',
        text: 'We could not reach secure Stripe checkout. Please try again.',
      });
    } finally {
      setPending(null);
    }
  }

  if (overview === null)
    return (
      <div className="developer-access-summary api-credits-panel">
        <p className="eyebrow">API &amp; MCP credits</p>
        {message?.tone === 'error' ? (
          <p className="form-error">{message.text}</p>
        ) : (
          <p className="muted-copy">Loading your credit balance…</p>
        )}
      </div>
    );
  const costValues = Object.values(overview.costs);
  const usage = overview.activity.filter((entry) => entry.kind !== 'ADJUSTMENT').slice(0, 5);
  return (
    <div className="developer-access-summary api-credits-panel">
      <div>
        <p className="eyebrow">API &amp; MCP credits</p>
        <h3>
          {overview.balanceCredits > 0
            ? `${credits.format(overview.balanceCredits)} credits available`
            : 'Add credits to use the API and MCP.'}
        </h3>
        <p>
          Prepaid, no subscription. {credits.format(overview.creditsPerUsd)} credits = $1. Each
          successful API call spends {Math.min(...costValues)}–{Math.max(...costValues)} credits;
          calls are refused once your balance runs out. Credential scopes, rate limits, and
          human-action approval rules still apply.
        </p>
      </div>
      {overview.isConfigured ? (
        <div className="api-credit-topups">
          {overview.packages.map((item) => (
            <button
              disabled={pending !== null}
              key={item.id}
              onClick={() => void addCredits(item.id)}
              type="button"
            >
              {pending === item.id ? 'Opening…' : `Add ${usd.format(item.amountCents / 100)}`}
            </button>
          ))}
        </div>
      ) : (
        <p className="muted-copy">Credit billing is being configured.</p>
      )}
      {message === null ? null : (
        <p className={message.tone === 'error' ? 'form-error' : 'action-feedback'}>
          {message.text}
        </p>
      )}
      <div className="developer-client-list api-credit-activity">
        <p className="eyebrow">Recent usage</p>
        {usage.length === 0 ? (
          <p className="muted-copy">No API or MCP calls yet.</p>
        ) : (
          <p className="muted-copy">
            {credits.format(overview.usage30d.calls)} calls and{' '}
            {credits.format(overview.usage30d.credits)} credits in the last 30 days.
          </p>
        )}
        {usage.length === 0
          ? null
          : usage.map((entry) => (
              <article key={entry.id}>
                <div>
                  <strong>{activityLabel(entry)}</strong>
                  <small>{when.format(new Date(entry.createdAt))}</small>
                </div>
                <code>
                  {entry.creditsDelta > 0 ? '+' : '−'}
                  {credits.format(Math.abs(entry.creditsDelta))}
                </code>
              </article>
            ))}
      </div>
    </div>
  );
}

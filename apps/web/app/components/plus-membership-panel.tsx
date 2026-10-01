'use client';

import { useEffect, useState } from 'react';

type BillingStatus = {
  isConfigured: boolean;
  isPlus: boolean;
  priceCents: number;
  subscription: { status: string; currentPeriodEndsAt: string | null; canManage: boolean };
  developerAccess: { isConfigured: boolean; isActive: boolean; status: string; canManage: boolean };
};

export function PlusMembershipPanel() {
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [action, setAction] = useState<'idle' | 'starting' | 'opening' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let attempts = 0;
    let pollTimer: number | null = null;
    const awaitCheckoutWebhook =
      new URLSearchParams(window.location.search).get('billing') === 'success';
    async function refreshBillingStatus() {
      try {
        const response = await fetch('/api/billing/status');
        if (!response.ok) throw new Error('BILLING_STATUS_UNAVAILABLE');
        const nextBilling = (await response.json()) as BillingStatus;
        setBilling(nextBilling);
        if (awaitCheckoutWebhook && (nextBilling.isPlus || nextBilling.developerAccess.isActive)) {
          if (pollTimer !== null) window.clearInterval(pollTimer);
          setMessage('Your paid access is active.');
        }
      } catch {
        setMessage('Membership status is temporarily unavailable.');
      }
    }
    void refreshBillingStatus();
    if (awaitCheckoutWebhook) {
      pollTimer = window.setInterval(() => {
        attempts += 1;
        if (attempts >= 20 && pollTimer !== null) window.clearInterval(pollTimer);
        else void refreshBillingStatus();
      }, 3000);
    }
    return () => {
      if (pollTimer !== null) window.clearInterval(pollTimer);
    };
  }, []);

  async function redirectTo(
    endpoint: '/api/billing/checkout' | '/api/billing/portal' | '/api/billing/developer-checkout',
  ) {
    setAction(endpoint.endsWith('checkout') ? 'starting' : 'opening');
    setMessage(null);
    try {
      const response = await fetch(endpoint, { method: 'POST' });
      const body = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || body.url === undefined) {
        setMessage(
          body.error === 'BILLING_NOT_CONFIGURED'
            ? 'VouchNet+ billing is not configured yet. Please try again later.'
            : 'We could not open secure Stripe billing. Please try again.',
        );
        return;
      }
      window.location.assign(body.url);
    } catch {
      setMessage('We could not reach secure Stripe billing. Please try again.');
    } finally {
      setAction('idle');
    }
  }

  if (billing === null) return <p className="muted-copy">Loading VouchNet+ membership options…</p>;
  const price = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    billing.priceCents / 100,
  );
  return (
    <section className="plus-membership-panel">
      <div>
        <p className="eyebrow">VouchNet+ · {price}/month</p>
        <h2>
          {billing.isPlus ? 'Your VouchNet+ membership is active.' : 'Bring your signal forward.'}
        </h2>
        <p>
          Includes 90-day profile analytics, three featured proof nodes, ten priority outreach
          credits each month, an emerald signal, and advanced feed controls.
        </p>
      </div>
      {billing.isPlus && billing.subscription.canManage ? (
        <button
          disabled={action !== 'idle'}
          onClick={() => void redirectTo('/api/billing/portal')}
          type="button"
        >
          {action === 'opening' ? 'Opening Stripe…' : 'Manage membership'}
        </button>
      ) : billing.isConfigured ? (
        <button
          disabled={action !== 'idle'}
          onClick={() => void redirectTo('/api/billing/checkout')}
          type="button"
        >
          {action === 'starting' ? 'Opening secure checkout…' : `Get VouchNet+ for ${price}/month`}
        </button>
      ) : (
        <p className="muted-copy">
          Secure billing is being configured. No purchase is available yet.
        </p>
      )}
      {message === null ? null : <p className="form-error">{message}</p>}
      <div className="developer-access-summary">
        <div>
          <p className="eyebrow">Developer access</p>
          <h3>
            {billing.developerAccess.isActive
              ? 'Unlimited integration access is active.'
              : 'Unmetered API and MCP access for integrations.'}
          </h3>
          <p>
            No prepaid request quota; fair-use, credential scopes, rate limits, and human-action
            approval rules still apply.
          </p>
        </div>
        {billing.developerAccess.isActive && billing.developerAccess.canManage ? (
          <button
            disabled={action !== 'idle'}
            onClick={() => void redirectTo('/api/billing/portal')}
            type="button"
          >
            Manage developer access
          </button>
        ) : billing.developerAccess.isConfigured ? (
          <button
            disabled={action !== 'idle'}
            onClick={() => void redirectTo('/api/billing/developer-checkout')}
            type="button"
          >
            {action === 'starting' ? 'Opening secure checkout…' : 'Subscribe to developer access'}
          </button>
        ) : (
          <p className="muted-copy">Developer billing is being configured.</p>
        )}
      </div>
    </section>
  );
}

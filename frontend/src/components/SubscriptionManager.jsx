import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { CreditCard, Sparkles, ExternalLink, RefreshCw, Zap } from 'lucide-react';
import AiPlansSection from './AiPlansSection';
import { AI_PLANS, PAID_PLAN_IDS } from '../constants/aiPlans';
import { startAiCheckout, checkoutErrorMessage } from '../utils/aiCheckout';

export default function SubscriptionManager() {
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  const loadUsage = useCallback(async () => {
    try {
      const res = await axios.get('/api/ai/usage');
      setUsage(res.data);
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.error
          || (err.response ? 'Could not load subscription details.' : 'Cannot reach the API. Check REACT_APP_API_URL on Netlify.'),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsage(); }, [loadUsage]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('ai_subscription') === 'success') {
      setMessage({ type: 'success', text: 'Subscription updated successfully! Your new plan is active.' });
      loadUsage();
      window.history.replaceState({}, '', window.location.pathname + window.location.hash);
    }
  }, [loadUsage]);

  const startCheckout = async (plan) => {
    setActionLoading(`checkout-${plan}`);
    setMessage({ type: '', text: '' });
    try {
      const result = await startAiCheckout(plan);
      if (result.manualUpgrade) {
        setUsage(result.manualUpgrade);
        setMessage({
          type: 'success',
          text: `Upgraded to ${result.manualUpgrade.planName || plan}! (test mode — no Stripe charge)`,
        });
      } else if (!result.redirected && result.error) {
        setMessage({ type: 'error', text: result.error });
      }
    } catch (err) {
      setMessage({ type: 'error', text: checkoutErrorMessage(err) });
    } finally {
      setActionLoading(null);
    }
  };

  const openBillingPortal = async () => {
    setActionLoading('portal');
    try {
      const res = await axios.post('/api/ai/billing-portal');
      if (res.data?.url) window.location.href = res.data.url;
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Could not open billing portal.' });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <div className="card"><div className="spinner" style={{ margin: '24px auto' }} /></div>;

  const plan = usage?.plan || 'free';
  const planInfo = AI_PLANS[plan] || AI_PLANS.free;
  const pct = usage?.limit ? Math.min(100, (usage.used / usage.limit) * 100) : 0;
  const isPaid = PAID_PLAN_IDS.includes(plan);
  const hasBilling = usage?.hasStripeSubscription;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{
              width: 52, height: 52, borderRadius: 12,
              background: 'linear-gradient(135deg, var(--blue), #60A5FA)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Sparkles size={26} color="#fff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>AI subscription</h3>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--grey-600)' }}>
                Powers AI Diagnosis & Health Education
              </p>
            </div>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={loadUsage} title="Refresh">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {message.text && (
          <div className={`alert ${message.type === 'error' ? 'alert-error' : 'alert-success'}`} style={{ marginTop: 16 }}>
            {message.text}
          </div>
        )}

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 12, marginTop: 20,
        }}>
          <div style={{ background: 'var(--grey-50)', borderRadius: 10, padding: 14, border: '1px solid var(--grey-200)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--grey-500)', textTransform: 'uppercase' }}>Current plan</div>
            <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>{planInfo.name}</div>
            <div style={{ fontSize: 13, color: 'var(--grey-600)' }}>
              {isPaid ? `$${planInfo.priceMonthly}/month` : 'Free'}
            </div>
          </div>
          <div style={{ background: 'var(--grey-50)', borderRadius: 10, padding: 14, border: '1px solid var(--grey-200)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--grey-500)', textTransform: 'uppercase' }}>Uses this month</div>
            <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>{usage?.used ?? 0} / {usage?.limit ?? 5}</div>
            <div style={{ fontSize: 13, color: usage?.canUse ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
              {usage?.remaining ?? 0} remaining
            </div>
          </div>
          <div style={{ background: 'var(--grey-50)', borderRadius: 10, padding: 14, border: '1px solid var(--grey-200)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--grey-500)', textTransform: 'uppercase' }}>Billing period</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 8 }}>
              {usage?.periodStart
                ? `Started ${new Date(usage.periodStart + 'T00:00:00').toLocaleDateString()}`
                : 'Monthly reset'}
            </div>
          </div>
          <div style={{ background: 'var(--grey-50)', borderRadius: 10, padding: 14, border: '1px solid var(--grey-200)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--grey-500)', textTransform: 'uppercase' }}>Payment status</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 8 }}>
              {hasBilling ? '✓ Active subscription' : isPaid ? 'Pending sync' : 'No paid subscription'}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ height: 10, background: 'var(--grey-100)', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{
              width: `${pct}%`, height: '100%',
              background: usage?.canUse ? 'var(--blue)' : 'var(--red)',
              transition: 'width 0.3s',
            }} />
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 20 }}>
          {hasBilling && (
            <button
              type="button"
              className="btn btn-primary"
              disabled={actionLoading === 'portal'}
              onClick={openBillingPortal}
            >
              <CreditCard size={16} />
              {actionLoading === 'portal' ? 'Opening…' : 'Manage payment & billing'}
              <ExternalLink size={14} />
            </button>
          )}
          {!isPaid && (
            <button type="button" className="btn btn-green" onClick={() => document.getElementById('upgrade-plans')?.scrollIntoView({ behavior: 'smooth' })}>
              <Zap size={16} /> Upgrade plan
            </button>
          )}
        </div>

        {hasBilling && (
          <p style={{ fontSize: 12, color: 'var(--grey-500)', marginTop: 12, lineHeight: 1.5 }}>
            Use the billing portal to update your card, view invoices, change plans, or cancel your subscription.
          </p>
        )}
      </div>

      <div id="upgrade-plans" className="card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
          {isPaid ? 'Change your plan' : 'Upgrade your AI plan'}
        </h3>
        <p style={{ fontSize: 13, color: 'var(--grey-600)', marginBottom: 16 }}>
          {isPaid
            ? 'Select a different tier below. For payment method changes, use Manage payment & billing above.'
            : 'You are on the free plan. Subscribe for more monthly AI uses on diagnosis and education.'}
        </p>
        {usage?.stripeEnabled === false && !usage?.manualUpgradeEnabled && (
          <div className="alert alert-warning" style={{ marginBottom: 16 }}>
            Card payments are not configured on the server yet. The site owner must add <strong>STRIPE_SECRET_KEY</strong> on Render.
          </div>
        )}
        <AiPlansSection
          variant="default"
          usage={usage}
          isAuthenticated
          onSubscribe={startCheckout}
          showHeader={false}
        />
      </div>
    </div>
  );
}

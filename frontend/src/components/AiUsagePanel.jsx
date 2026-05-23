import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Sparkles, Zap } from 'lucide-react';

const TIER_ORDER = ['pro', 'plus', 'max'];

export default function AiUsagePanel({ onUsageChange, refreshRef }) {
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(null);
  const [showPlans, setShowPlans] = useState(false);

  const loadUsage = useCallback(async () => {
    try {
      const res = await axios.get('/api/ai/usage');
      setUsage(res.data);
      onUsageChange?.(res.data);
    } catch {
      setUsage(null);
    } finally {
      setLoading(false);
    }
  }, [onUsageChange]);

  useEffect(() => { loadUsage(); }, [loadUsage]);

  useEffect(() => {
    if (refreshRef) refreshRef.current = loadUsage;
  }, [loadUsage, refreshRef]);

  const startCheckout = async (plan) => {
    setCheckoutLoading(plan);
    try {
      const res = await axios.post('/api/ai/checkout', { plan });
      if (res.data?.url) window.location.href = res.data.url;
    } catch (err) {
      alert(err.response?.data?.error || 'Could not start checkout.');
    } finally {
      setCheckoutLoading(null);
    }
  };

  if (loading || !usage || usage.plan === 'unlimited') return null;

  const pct = usage.limit ? Math.min(100, (usage.used / usage.limit) * 100) : 0;

  return (
    <div className="card" style={{ marginBottom: 16, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--blue-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={20} color="var(--blue)" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>AI usage this month</div>
            <div style={{ fontSize: 13, color: 'var(--grey-600)' }}>
              {usage.planName} plan · {usage.used} of {usage.limit} uses
            </div>
          </div>
        </div>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowPlans(!showPlans)}>
          <Zap size={14} /> {showPlans ? 'Hide plans' : 'Upgrade'}
        </button>
      </div>
      <div style={{ marginTop: 12, height: 8, background: 'var(--grey-100)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: usage.remaining > 0 ? 'var(--blue)' : 'var(--red)', transition: 'width 0.3s' }} />
      </div>
      {!usage.canUse && (
        <p style={{ marginTop: 10, fontSize: 13, color: 'var(--red)', fontWeight: 600 }}>
          You have used all AI requests this month. Upgrade to continue.
        </p>
      )}
      {showPlans && usage.plans && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginTop: 16 }}>
          <div style={{ padding: 12, border: '1px solid var(--grey-200)', borderRadius: 8, background: usage.plan === 'free' ? 'var(--blue-bg)' : 'transparent' }}>
            <div style={{ fontWeight: 700 }}>Free</div>
            <div style={{ fontSize: 12, color: 'var(--grey-600)' }}>5 uses / month</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>$0</div>
          </div>
          {TIER_ORDER.map((key) => {
            const p = usage.plans[key];
            return (
              <div key={key} style={{ padding: 12, border: '1px solid var(--grey-200)', borderRadius: 8, background: usage.plan === key ? 'var(--blue-bg)' : 'transparent' }}>
                <div style={{ fontWeight: 700 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: 'var(--grey-600)' }}>{p.limit} uses / month</div>
                <div style={{ fontSize: 13, marginTop: 6, fontWeight: 600 }}>${p.priceMonthly}/mo</div>
                <button type="button" className="btn btn-primary btn-sm" style={{ width: '100%', marginTop: 8 }}
                  disabled={usage.plan === key || checkoutLoading === key}
                  onClick={() => startCheckout(key)}>
                  {checkoutLoading === key ? 'Loading…' : usage.plan === key ? 'Current' : 'Subscribe'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

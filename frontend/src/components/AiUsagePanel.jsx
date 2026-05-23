import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Sparkles, Zap, AlertCircle } from 'lucide-react';
import AiPlansSection from './AiPlansSection';
import { PAID_PLAN_IDS } from '../constants/aiPlans';
import { startAiCheckout, checkoutErrorMessage } from '../utils/aiCheckout';

/**
 * Usage banner + plans for AI Diagnosis & Education pages.
 * Shows plans expanded when on free plan or when out of uses.
 */
export default function AiUsagePanel({ onUsageChange, refreshRef, defaultShowPlans }) {
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPlans, setShowPlans] = useState(defaultShowPlans ?? false);

  const loadUsage = useCallback(async () => {
    try {
      const res = await axios.get('/api/ai/usage');
      setUsage(res.data);
      onUsageChange?.(res.data);
      const isFree = !res.data.plan || res.data.plan === 'free';
      if (isFree || !res.data.canUse) setShowPlans(true);
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
    try {
      const result = await startAiCheckout(plan);
      if (result.manualUpgrade) {
        setUsage(result.manualUpgrade);
        onUsageChange?.(result.manualUpgrade);
        alert(`Upgraded to ${result.manualUpgrade.planName || plan}!`);
      } else if (!result.redirected && result.error) {
        alert(result.error);
      }
    } catch (err) {
      alert(checkoutErrorMessage(err));
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ marginBottom: 16, padding: 20 }}>
        <div className="spinner" style={{ margin: '0 auto' }} />
      </div>
    );
  }

  if (!usage || usage.plan === 'unlimited') return null;

  const pct = usage.limit ? Math.min(100, (usage.used / usage.limit) * 100) : 0;
  const isFree = usage.plan === 'free';
  const isPaid = PAID_PLAN_IDS.includes(usage.plan);

  return (
    <div style={{ marginBottom: 20 }}>
      <div className="card" style={{ padding: 16, marginBottom: showPlans ? 16 : 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10,
              background: isFree ? 'var(--amber-bg)' : 'var(--blue-bg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Sparkles size={22} color={isFree ? 'var(--amber)' : 'var(--blue)'} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>
                {isFree ? 'Free AI plan' : `${usage.planName} plan`}
              </div>
              <div style={{ fontSize: 13, color: 'var(--grey-600)' }}>
                {usage.used} of {usage.limit} AI uses this month · {usage.remaining} left
              </div>
            </div>
          </div>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowPlans(!showPlans)}>
            <Zap size={14} /> {showPlans ? 'Hide plans' : (isFree ? 'View plans' : 'Change plan')}
          </button>
        </div>
        <div style={{ marginTop: 12, height: 8, background: 'var(--grey-100)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{
            width: `${pct}%`, height: '100%',
            background: usage.remaining > 0 ? 'var(--blue)' : 'var(--red)',
            transition: 'width 0.3s',
          }} />
        </div>
        {!usage.canUse && (
          <div className="alert alert-warning" style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <div>
              <strong>Monthly limit reached.</strong> Upgrade below to keep using AI diagnosis and health education.
            </div>
          </div>
        )}
        {isFree && usage.canUse && (
          <p style={{ marginTop: 12, fontSize: 13, color: 'var(--grey-600)' }}>
            You are on the free plan (5 uses/month). Upgrade for more AI capacity.
          </p>
        )}
        {isPaid && (
          <p style={{ marginTop: 10, fontSize: 12, color: 'var(--grey-500)' }}>
            Manage billing and payment in <strong>Records → AI subscription</strong>.
          </p>
        )}
      </div>

      {showPlans && (
        <div className="card" style={{ padding: 20 }}>
          <AiPlansSection
            variant="default"
            usage={usage}
            isAuthenticated
            onSubscribe={startCheckout}
            title="Choose an AI plan"
            subtitle="Shared across AI Diagnosis and Health Education. Billed monthly."
          />
        </div>
      )}
    </div>
  );
}

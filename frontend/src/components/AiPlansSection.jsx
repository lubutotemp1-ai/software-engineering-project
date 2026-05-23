import React, { useState } from 'react';
import { Sparkles, Check, Zap } from 'lucide-react';
import { AI_PLANS, PAID_PLAN_IDS } from '../constants/aiPlans';

/**
 * @param {'landing'|'default'|'compact'} variant
 * @param {object} usage - current usage from API (optional)
 * @param {function} onSubscribe - (planId) => void for paid plans
 * @param {function} onGetStarted - () => void when not logged in
 * @param {boolean} isAuthenticated
 */
export default function AiPlansSection({
  variant = 'default',
  usage = null,
  onSubscribe,
  onGetStarted,
  isAuthenticated = false,
  title,
  subtitle,
  showHeader = true,
}) {
  const [loadingPlan, setLoadingPlan] = useState(null);
  const isLanding = variant === 'landing';
  const currentPlan = usage?.plan || 'free';

  const handlePlanClick = async (planId) => {
    if (planId === 'free') {
      if (!isAuthenticated && onGetStarted) onGetStarted();
      return;
    }
    if (!isAuthenticated) {
      onGetStarted?.();
      return;
    }
    if (currentPlan === planId) return;
    setLoadingPlan(planId);
    try {
      await onSubscribe?.(planId);
    } finally {
      setLoadingPlan(null);
    }
  };

  const plans = ['free', ...PAID_PLAN_IDS].map((id) => AI_PLANS[id]);

  return (
    <section style={{ marginBottom: isLanding ? 0 : 24 }}>
      {showHeader && (
      <div style={{ textAlign: 'center', marginBottom: isLanding ? 48 : 20 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: isLanding ? 'rgba(255,255,255,0.15)' : 'var(--blue-bg)',
          padding: '6px 14px', borderRadius: 20, marginBottom: 12,
          color: isLanding ? 'white' : 'var(--blue)', fontSize: 12, fontWeight: 700,
        }}>
          <Sparkles size={14} /> AI Plans
        </div>
        <h2 style={{
            fontSize: isLanding ? 42 : 22, fontWeight: 800, marginBottom: 10,
            color: isLanding ? 'white' : 'var(--grey-900)',
            letterSpacing: '-0.02em',
          }}>
            {title || 'AI health tools — pick your plan'}
          </h2>
        <p style={{
          fontSize: isLanding ? 17 : 14, maxWidth: 560, margin: '0 auto',
          color: isLanding ? 'rgba(255,255,255,0.85)' : 'var(--grey-600)', lineHeight: 1.6,
        }}>
          {subtitle || 'Free tier includes 5 AI uses per month. Upgrade anytime for more AI diagnosis and education chats.'}
        </p>
      </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: isLanding
          ? 'repeat(auto-fit, minmax(220px, 1fr))'
          : 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: isLanding ? 20 : 12,
        maxWidth: isLanding ? 1100 : '100%',
        margin: '0 auto',
      }}>
        {plans.map((plan) => {
          const isCurrent = currentPlan === plan.id;
          const isPopular = plan.popular;
          return (
            <div
              key={plan.id}
              style={{
                position: 'relative',
                background: isLanding ? 'rgba(255,255,255,0.12)' : '#fff',
                backdropFilter: isLanding ? 'blur(20px)' : 'none',
                border: isCurrent
                  ? `2px solid ${isLanding ? '#fff' : 'var(--blue)'}`
                  : isPopular
                    ? `2px solid ${isLanding ? '#f093fb' : 'var(--blue)'}`
                    : `1px solid ${isLanding ? 'rgba(255,255,255,0.25)' : 'var(--grey-200)'}`,
                borderRadius: 16,
                padding: isLanding ? '28px 24px' : '18px 16px',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
            >
              {isPopular && (
                <span style={{
                  position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
                  background: 'linear-gradient(90deg, #667eea, #f093fb)', color: '#fff',
                  fontSize: 10, fontWeight: 800, padding: '4px 12px', borderRadius: 12,
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  Most popular
                </span>
              )}
              {isCurrent && (
                <span style={{
                  position: 'absolute', top: 12, right: 12,
                  fontSize: 10, fontWeight: 700, color: isLanding ? '#fff' : 'var(--blue)',
                  background: isLanding ? 'rgba(255,255,255,0.2)' : 'var(--blue-bg)',
                  padding: '3px 8px', borderRadius: 8,
                }}>
                  Current
                </span>
              )}
              <div style={{ fontWeight: 800, fontSize: isLanding ? 22 : 17, color: isLanding ? '#fff' : '#111827' }}>
                {plan.name}
              </div>
              <div style={{ marginTop: 8, marginBottom: 12 }}>
                <span style={{ fontSize: isLanding ? 36 : 28, fontWeight: 800, color: isLanding ? '#fff' : '#111827' }}>
                  ${plan.priceMonthly}
                </span>
                <span style={{ fontSize: 13, color: isLanding ? 'rgba(255,255,255,0.7)' : 'var(--grey-500)' }}>/mo</span>
              </div>
              <div style={{ fontSize: 13, color: isLanding ? 'rgba(255,255,255,0.8)' : 'var(--grey-600)', marginBottom: 14 }}>
                {plan.limit} AI uses per month
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', flex: 1 }}>
                {plan.features.map((f) => (
                  <li key={f} style={{
                    display: 'flex', gap: 8, alignItems: 'flex-start',
                    fontSize: 12.5, color: isLanding ? 'rgba(255,255,255,0.9)' : 'var(--grey-700)',
                    marginBottom: 8,
                  }}>
                    <Check size={14} style={{ flexShrink: 0, marginTop: 2 }} color={isLanding ? '#a7f3d0' : 'var(--green)'} />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className={isLanding ? '' : 'btn'}
                disabled={isCurrent || loadingPlan === plan.id}
                onClick={() => handlePlanClick(plan.id)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 10,
                  border: 'none',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: isCurrent ? 'default' : 'pointer',
                  background: plan.id === 'free'
                    ? (isLanding ? 'rgba(255,255,255,0.2)' : 'var(--grey-100)')
                    : (isLanding ? '#fff' : 'var(--blue)'),
                  color: plan.id === 'free'
                    ? (isLanding ? '#fff' : 'var(--grey-800)')
                    : (isLanding ? '#667eea' : '#fff'),
                  opacity: isCurrent ? 0.7 : 1,
                }}
              >
                {loadingPlan === plan.id
                  ? 'Loading…'
                  : isCurrent
                    ? 'Current plan'
                    : plan.id === 'free'
                      ? (isAuthenticated ? 'Included' : 'Start free')
                      : (isAuthenticated ? 'Subscribe' : 'Get started')}
              </button>
            </div>
          );
        })}
      </div>
      {isLanding && (
        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>
          AI usage applies to symptom diagnosis and health education. Cancel anytime from your account.
        </p>
      )}
    </section>
  );
}

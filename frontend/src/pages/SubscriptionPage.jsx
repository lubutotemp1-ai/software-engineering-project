import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Crown, Check, ArrowRight, Loader } from 'lucide-react';

export default function SubscriptionPage() {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [plansRes, subRes] = await Promise.all([
        axios.get('/api/payments/plans'),
        axios.get('/api/payments/subscription'),
      ]);
      setPlans(plansRes.data);
      setCurrentSubscription(subRes.data);
    } catch (err) {
      console.error('Failed to fetch subscription data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId) => {
    setCheckoutLoading(true);
    try {
      const res = await axios.post('/api/payments/create-checkout-session', {
        plan_id: planId,
      });
      if (res.data.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      console.error('Failed to create checkout session:', err);
      alert(err.response?.data?.error || 'Failed to initiate checkout. Please try again.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <Loader size={32} className="spinner" />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Crown size={24} strokeWidth={1.5} />
          Subscription Plans
        </h1>
        <p>Choose the perfect plan for your healthcare needs</p>
      </div>

      {currentSubscription && currentSubscription.name !== 'Free' && (
        <div style={{
          marginBottom: 24,
          padding: '16px 20px',
          background: 'linear-gradient(135deg, #10B981, #059669)',
          borderRadius: 12,
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <Crown size={24} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Current Plan: {currentSubscription.name}</div>
            <div style={{ fontSize: 13, opacity: 0.9 }}>Status: {currentSubscription.status}</div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
        {plans.map((plan) => {
          const isCurrent = currentSubscription?.name === plan.name;
          const isPopular = plan.name === 'Pro';

          const getFeatures = (planName) => {
            switch (planName) {
              case 'Free':
                return [
                  '7 AI Diagnosis uses',
                  '10 Health Education uses',
                  'Basic health tracking',
                  'Limited appointments',
                ];
              case 'Pro':
                return [
                  '15 AI Diagnosis uses',
                  '15 Health Education uses',
                  'Full health tracking',
                  'Unlimited appointments',
                ];
              case 'Plus':
                return [
                  '25 AI Diagnosis uses',
                  '25 Health Education uses',
                  'Priority support',
                  'Advanced analytics',
                ];
              case 'Max':
                return [
                  '35 AI Diagnosis uses',
                  '35 Health Education uses',
                  '24/7 Premium support',
                  'Dedicated account manager',
                ];
              default:
                return [];
            }
          };

          return (
            <div
              key={plan.id}
              style={{
                position: 'relative',
                background: 'white',
                borderRadius: 16,
                padding: 24,
                border: isCurrent ? '2px solid #10B981' : isPopular ? '2px solid #3B82F6' : '1px solid #E5E7EB',
                boxShadow: isPopular ? '0 8px 24px rgba(59, 130, 246, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.05)',
                transition: 'all 0.3s',
                transform: isPopular ? 'scale(1.05)' : 'none',
              }}
              onMouseEnter={(e) => {
                if (!isCurrent) {
                  e.currentTarget.style.transform = isPopular ? 'scale(1.05) translateY(-4px)' : 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = isPopular ? '0 12px 50px rgba(59, 130, 246, 0.4)' : '0 12px 32px rgba(0, 0, 0, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isCurrent) {
                  e.currentTarget.style.transform = isPopular ? 'scale(1.05)' : 'translateY(0)';
                  e.currentTarget.style.boxShadow = isPopular ? '0 8px 24px rgba(59, 130, 246, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.05)';
                }
              }}
            >
              {isPopular && (
                <div style={{
                  position: 'absolute',
                  top: -12,
                  left: '20px',
                  background: 'linear-gradient(90deg, #3B82F6, #60A5FA)',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  Most Popular
                </div>
              )}

              {isCurrent && (
                <div style={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  background: '#10B981',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: 12,
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                }}>
                  Current
                </div>
              )}

              <div style={{ marginBottom: 20, marginTop: isPopular ? 8 : 0 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: '#111827' }}>{plan.name} Plan</h3>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontSize: 32, fontWeight: 800, color: '#111827' }}>${plan.price}</span>
                  <span style={{ fontSize: 16, fontWeight: 500, color: '#6B7280' }}>/mo</span>
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {getFeatures(plan.name).map((feature, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Check size={16} color="#10B981" strokeWidth={2} />
                      <span style={{ fontSize: 14, color: '#4B5563' }}>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={isCurrent || checkoutLoading || plan.price === 0}
                className="btn"
                style={{
                  width: '100%',
                  background: isCurrent ? '#E5E7EB' : (plan.price === 0 ? 'transparent' : (isPopular ? 'linear-gradient(90deg, #3B82F6, #60A5FA)' : '#2563EB')),
                  color: isCurrent ? '#6B7280' : 'white',
                  border: plan.price === 0 ? '1px solid rgba(255,255,255,0.5)' : 'none',
                  cursor: (isCurrent || checkoutLoading || plan.price === 0) ? 'not-allowed' : 'pointer',
                  opacity: isCurrent ? 0.7 : 1,
                  padding: '12px 24px',
                  borderRadius: '50px',
                  fontWeight: 600,
                }}
              >
                {checkoutLoading ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <Loader size={16} className="spinner" />
                    Processing...
                  </span>
                ) : isCurrent ? (
                  'Current Plan'
                ) : plan.price === 0 ? (
                  'Get Started'
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    Subscribe <ArrowRight size={16} />
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>

      <div style={{
        marginTop: 32,
        padding: 20,
        background: '#EFF6FF',
        borderRadius: 12,
        border: '1px solid #DBEAFE',
        fontSize: 13,
        color: '#0C4A6E',
        lineHeight: 1.6,
      }}>
        <strong style={{ display: 'block', marginBottom: 8 }}>💡 How it works:</strong>
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li>Select a plan that fits your needs</li>
          <li>You'll be redirected to Stripe's secure checkout</li>
          <li>Complete payment with your preferred method</li>
          <li>Your subscription will be activated immediately</li>
          <li>Cancel anytime from your account settings</li>
        </ul>
      </div>
    </div>
  );
}

export const AI_PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    limit: 5,
    priceMonthly: 0,
    description: 'Try AI diagnosis & health education',
    features: ['5 AI uses per month', 'AI symptom check', 'Health education chat'],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    limit: 10,
    priceMonthly: 5,
    description: 'For regular health questions',
    features: ['10 AI uses per month', 'AI diagnosis', 'Education assistant', 'Priority responses'],
    popular: false,
  },
  plus: {
    id: 'plus',
    name: 'Plus',
    limit: 15,
    priceMonthly: 10,
    description: 'More monthly AI capacity',
    features: ['15 AI uses per month', 'Everything in Pro', 'Ideal for families'],
    popular: true,
  },
  max: {
    id: 'max',
    name: 'Max',
    limit: 20,
    priceMonthly: 20,
    description: 'Maximum AI access',
    features: ['20 AI uses per month', 'Everything in Plus', 'Best value per use'],
    popular: false,
  },
};

export const PAID_PLAN_IDS = ['pro', 'plus', 'max'];

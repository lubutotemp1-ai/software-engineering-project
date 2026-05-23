import axios from 'axios';

/**
 * Start Stripe checkout or apply manual upgrade when configured on the server.
 * @returns {{ redirected: boolean, manualUpgrade?: object, error?: string }}
 */
export async function startAiCheckout(plan) {
  const res = await axios.post('/api/ai/checkout', { plan });
  if (res.data?.url) {
    window.location.href = res.data.url;
    return { redirected: true };
  }
  if (res.data?.manualUpgrade) {
    return { redirected: false, manualUpgrade: res.data };
  }
  return {
    redirected: false,
    error: 'Checkout did not return a payment link. Check server Stripe configuration.',
  };
}

export function checkoutErrorMessage(err) {
  if (!err.response) {
    return 'Cannot reach the API. Set REACT_APP_API_URL on Netlify to your Render backend URL.';
  }
  return err.response?.data?.error || 'Could not start checkout.';
}

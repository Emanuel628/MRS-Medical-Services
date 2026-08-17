const stripeCheckoutEnabled = import.meta.env.VITE_STRIPE_CHECKOUT_ENABLED === 'true';

if (!stripeCheckoutEnabled && typeof window !== 'undefined') {
  const nativeFetch = window.fetch.bind(window);

  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : String(input);
    const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();

    if (method === 'POST' && url.includes('/billing/checkout-session')) {
      return new Response(JSON.stringify({ message: 'Online card checkout is temporarily unavailable.' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (method === 'POST' && url.includes('/api/contact') && typeof init?.body === 'string') {
      try {
        const payload = JSON.parse(init.body) as Record<string, unknown>;
        if (payload.requestType === 'intake' && payload.paymentMethod === 'card') {
          init = {
            ...init,
            body: JSON.stringify({ ...payload, paymentMethod: 'pay_at_site' }),
          };
        }
      } catch {
        // Leave non-JSON requests unchanged.
      }
    }

    return nativeFetch(input, init);
  }) as typeof window.fetch;

  const applyCheckoutBlock = () => {
    const cardOption = document.querySelector<HTMLInputElement>('input[name="paymentMethod"][value="card"]');
    const payAtSiteOption = document.querySelector<HTMLInputElement>('input[name="paymentMethod"][value="pay_at_site"]');

    if (!cardOption || !payAtSiteOption) return;

    cardOption.disabled = true;
    const cardLabel = cardOption.closest('label');
    if (cardLabel) cardLabel.hidden = true;

    const checkoutTotal = document.querySelector<HTMLElement>('.checkout-total');
    if (checkoutTotal) checkoutTotal.hidden = true;

    if (!payAtSiteOption.checked) payAtSiteOption.click();

    const paymentGrid = cardOption.closest('.payment-method-grid');
    if (paymentGrid && !document.querySelector('[data-stripe-checkout-disabled="true"]')) {
      const notice = document.createElement('p');
      notice.dataset.stripeCheckoutDisabled = 'true';
      notice.className = 'payment-warning';
      notice.textContent = 'Online card checkout is temporarily unavailable. Please select Pay at site.';
      paymentGrid.insertAdjacentElement('afterend', notice);
    }
  };

  const observer = new MutationObserver(applyCheckoutBlock);
  const startCheckoutBlock = () => {
    applyCheckoutBlock();
    observer.observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startCheckoutBlock, { once: true });
  } else {
    startCheckoutBlock();
  }
}

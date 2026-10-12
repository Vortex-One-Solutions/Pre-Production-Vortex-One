import React, { useState } from 'react';
import { denyConsent, getConsent, grantConsent } from '../lib/analytics';

/**
 * Consent gate for product analytics. Mixpanel initializes opted-out and sends
 * nothing until the user accepts here. The choice is remembered per browser.
 */
export const AnalyticsConsentBanner: React.FC = () => {
  const [visible, setVisible] = useState(() => getConsent() === 'unknown');

  if (!visible) return null;

  const accept = () => {
    grantConsent();
    setVisible(false);
  };
  const decline = () => {
    denyConsent();
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Analytics consent"
      className="fixed inset-x-4 bottom-4 z-[1000] mx-auto max-w-2xl rounded-xl border border-slate-700 bg-slate-900/95 p-4 text-sm text-slate-200 shadow-2xl backdrop-blur sm:flex sm:items-center sm:gap-4"
    >
      <p className="flex-1 leading-6">
        We use product analytics (Mixpanel) to understand how Vortex One is used and improve it. No analytics data is
        collected unless you accept.
      </p>
      <div className="mt-3 flex shrink-0 gap-2 sm:mt-0">
        <button
          type="button"
          onClick={decline}
          className="rounded-lg border border-slate-600 px-3 py-2 font-medium text-slate-300 hover:bg-slate-800"
        >
          Decline
        </button>
        <button
          type="button"
          onClick={accept}
          className="rounded-lg bg-cyan-600 px-3 py-2 font-semibold text-white hover:bg-cyan-500"
        >
          Accept
        </button>
      </div>
    </div>
  );
};

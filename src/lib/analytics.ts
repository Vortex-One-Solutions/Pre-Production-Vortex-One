import mixpanel from 'mixpanel-browser';

// Mixpanel project tokens are public client identifiers (not secrets).
// Override per environment with VITE_MIXPANEL_TOKEN; set VITE_MIXPANEL_ENABLED=false to disable.
const DEFAULT_TOKEN = '5d274ec359fa104fef66f803781ca89d';
const TOKEN = import.meta.env.VITE_MIXPANEL_TOKEN || DEFAULT_TOKEN;
const ENABLED = import.meta.env.VITE_MIXPANEL_ENABLED !== 'false' && Boolean(TOKEN);
const CONSENT_KEY = 'vortex_analytics_consent';

export type ConsentState = 'granted' | 'denied' | 'unknown';

let initialized = false;
let currentUser: AnalyticsUser | null = null;

function readConsent(): ConsentState {
  try {
    const value = localStorage.getItem(CONSENT_KEY);
    return value === 'granted' || value === 'denied' ? value : 'unknown';
  } catch {
    return 'unknown';
  }
}

function writeConsent(state: Exclude<ConsentState, 'unknown'>) {
  try {
    localStorage.setItem(CONSENT_KEY, state);
  } catch {
    // Storage unavailable (private mode); consent applies to this page load only.
  }
}

/**
 * Initializes the SDK opted-out. Nothing is sent until the user grants consent
 * (EU/UK/CA users are possible, so tracking is consent-gated by default).
 */
export function initAnalytics() {
  if (!ENABLED || initialized) return;
  mixpanel.init(TOKEN, {
    debug: import.meta.env.DEV,
    persistence: 'localStorage',
    opt_out_tracking_by_default: true,
    track_pageview: false,
    ip: true,
  });
  initialized = true;
  mixpanel.register({
    platform: 'web',
    app_environment: import.meta.env.MODE,
  });
  if (readConsent() === 'granted') mixpanel.opt_in_tracking();
}

export function getConsent(): ConsentState {
  return readConsent();
}

export function grantConsent() {
  writeConsent('granted');
  if (!initialized) return;
  mixpanel.opt_in_tracking();
  // A user who was already signed in when consenting must be identified now.
  if (currentUser) identifyUser(currentUser);
}

export function denyConsent() {
  writeConsent('denied');
  if (initialized) mixpanel.opt_out_tracking();
}

const canSend = () => initialized && !mixpanel.has_opted_out_tracking();

export interface AnalyticsUser {
  id: string;
  name?: string;
  email?: string;
  role: string;
  organization_id: string;
  organization_name?: string;
}

/** Call on login, signup and session restore. Uses the stable DB user id, never email. */
export function identifyUser(user: AnalyticsUser) {
  currentUser = user;
  if (!canSend()) return;
  mixpanel.identify(user.id);
  mixpanel.people.set({
    $name: user.name,
    $email: user.email,
    role: user.role,
    organization_id: user.organization_id,
    organization_name: user.organization_name,
  });
  mixpanel.register({
    user_role: user.role,
    organization_id: user.organization_id,
  });
}

/** Call on logout so the next user on this browser gets a fresh anonymous id. */
export function resetAnalytics() {
  currentUser = null;
  if (!initialized) return;
  mixpanel.reset();
  mixpanel.register({ platform: 'web', app_environment: import.meta.env.MODE });
}

// Tracking plan: keep event names snake_case object_verb; add new events here, never inline strings.
type EventMap = {
  sign_up_completed: {
    sign_up_method: 'email';
  };
  login_completed: {
    login_method: 'email';
  };
  logout_completed: Record<string, never>;
  property_added: {
    source: 'csv_import' | 'county_gis_search';
    properties_added_count: number;
    properties_updated_count: number;
    records_processed_count: number;
    leads_generated_count?: number;
    provider?: string;
    county?: string;
  };
  property_search_completed: {
    provider?: string;
    county?: string;
    results_count: number;
    execution_time_ms?: number;
  };
};

export function track<E extends keyof EventMap>(event: E, properties: EventMap[E]) {
  if (!canSend()) return;
  try {
    mixpanel.track(event, properties);
  } catch (err) {
    if (import.meta.env.DEV) console.warn('[analytics] track failed', event, err);
  }
}

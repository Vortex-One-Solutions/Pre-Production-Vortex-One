# Analytics Tracking — Mixpanel

This project uses **Mixpanel** for all product analytics. Mixpanel is the single source of truth for event tracking, user identification, and behavioral data. Do not introduce any other analytics tools, SDKs, or tracking libraries without explicit instruction from a user.

---

## Before You Add or Modify Any Tracking

⛔ **Do not write Mixpanel tracking code without reading this file first.**

Wrong assumptions about platform, identity, or consent will produce broken Mixpanel data that requires manual cleanup or data deletion requests.

### Mandatory checklist before writing any Mixpanel code

- [ ] Confirm you are using the correct Mixpanel SDK for this project's platform (see Tech Stack below)
- [ ] Check if this project routes data through a CDP — if yes, send Mixpanel events through the CDP, not the Mixpanel SDK directly
- [ ] Check if consent gating is required — if this project serves EU or California users, no Mixpanel events may fire before user consent
- [ ] Review the existing Mixpanel tracking plan below before adding new events

---

## Tech Stack

| Detail | Value |
|---|---|
| **Platform** | React 19 + Vite (web SPA), Express API in `server.ts` |
| **Mixpanel SDK** | `mixpanel-browser` |
| **SDK version** | ^2.84.0 |
| **Tracking method** | client-side (after the API call succeeds) |
| **CDP (if any)** | none |
| **Consent required** | yes. EU/CA exposure is unconfirmed, so the SDK starts opted out until the user accepts in `AnalyticsConsentBanner` |
| **Mixpanel project token location** | `VITE_MIXPANEL_TOKEN` (build-time env). Falls back to the public production token in `src/lib/analytics.ts`. Set `VITE_MIXPANEL_ENABLED="false"` to disable. |

---

## Mixpanel Initialization

Mixpanel is initialized in:

**File:** `src/lib/analytics.ts` (`initAnalytics()`, called once in `src/main.tsx` before render)

```ts
mixpanel.init(TOKEN, { persistence: 'localStorage', opt_out_tracking_by_default: true, track_pageview: false });
mixpanel.register({ platform: 'web', app_environment: import.meta.env.MODE });
// opt_in_tracking() runs only after consent: grantConsent() / stored 'granted' choice
```

Feature code imports `track`, `identifyUser` and `resetAnalytics` from `src/lib/analytics.ts`, never `mixpanel-browser` directly. Events are typed in its `EventMap`, so add a new event there first.

**Do not:**
- Initialize Mixpanel in multiple places
- Create separate Mixpanel instances per component or module
- Import Mixpanel directly in feature files — use the shared initialization

---

## Mixpanel Identity

Mixpanel identity is managed through two calls:

| Action | When to call | Code location |
|---|---|---|
| `mixpanel.identify(user_id)` | On login, signup, or session restore | `src/contexts/AuthContext.tsx` → `applySession()` → `identifyUser()` |
| `mixpanel.reset()` | On logout | `src/contexts/AuthContext.tsx` → `signOut()` → `resetAnalytics()` |

Super properties registered after identify: `user_role`, `organization_id` (B2B account-level analysis; switch to `set_group` if the Group Analytics add-on is enabled). Profile (`people.set`): `$name`, `$email`, `role`, `organization_id`, `organization_name`.

**Rules:**
- Call `mixpanel.identify()` with a stable, internal user ID (database ID or UUID) — never use email addresses as the Mixpanel distinct_id
- Call `mixpanel.identify()` **after** the user record is confirmed (after DB write, not on form submit)
- Call `mixpanel.reset()` on every logout path — this clears the Mixpanel distinct_id and generates a new anonymous ID
- Never call `mixpanel.identify()` with a different user ID without calling `mixpanel.reset()` first

---

## Mixpanel Tracking Plan

These are the Mixpanel events currently tracked in this project. **All new Mixpanel events must follow the same conventions.**

### Naming conventions

- Mixpanel event names: `snake_case`, past tense verb + noun (e.g., `report_generated`, `item_added_to_cart`)
- Mixpanel property names: `snake_case` (e.g., `sign_up_method`, `plan_type`)
- No abbreviations in Mixpanel event or property names — use full words
- Boolean Mixpanel properties: use `is_` prefix (e.g., `is_first_time`)

### Current Mixpanel events

All events also carry super properties: `platform`, `app_environment`, `user_role`, `organization_id`.

| Mixpanel Event | Trigger | Key Properties | File |
|---|---|---|---|
| `sign_up_completed` | `/api/auth/signup` succeeds and the new user is signed in (fired after identify) | `sign_up_method` | `src/contexts/AuthContext.tsx` |
| `login_completed` | `/api/auth/login` succeeds (not fired on signup) | `login_method` | `src/contexts/AuthContext.tsx` |
| `logout_completed` | User signs out (fired before `reset()`) | none | `src/contexts/AuthContext.tsx` |
| `property_added` (**Value Moment**) | New properties are saved to the portfolio: CSV import with `properties_created > 0`, or a county GIS live search that saves newly discovered properties (cached replays are skipped) | `source` (`csv_import` / `county_gis_search`), `properties_added_count`, `properties_updated_count`, `records_processed_count`, `leads_generated_count`, `provider`, `county` | `src/components/DataImportModal.tsx`, `src/components/PropertiesView.tsx` |
| `property_search_completed` | County GIS live search returns | `provider`, `county`, `results_count`, `execution_time_ms` | `src/components/PropertiesView.tsx` |

`property_added` is one event per user action (batch), not one per property. Do not fire it in a loop.

---

## How to Add a New Mixpanel Event

1. **Check the tracking plan above** — if the Mixpanel event already exists, use it. Do not create duplicate Mixpanel events.
2. **Name the Mixpanel event** using the conventions above: `snake_case`, past tense, descriptive.
3. **Define Mixpanel properties** — only include properties available at the moment the event fires. Do not fetch additional data just for Mixpanel tracking.
4. **Place the Mixpanel tracking call** at the right moment:
   - Track Mixpanel events **after** the action succeeds (after DB write, after API response), not on button click or form submit
   - Track Mixpanel events **after** `mixpanel.identify()` if the event is tied to a logged-in action
5. **Update this file** — add the new Mixpanel event to the tracking plan table above.
6. **Verify in Mixpanel Live View** — confirm the event appears in Mixpanel with correct properties before considering it done.

### Mixpanel event template

```
// Track [description of what happened] in Mixpanel
mixpanel.track('[event_name]', {
  property_name: value,
  property_name: value,
});
```

---

## What Not to Do

- **Do not introduce other analytics tools.** This project uses Mixpanel. All tracking goes through Mixpanel.
- **Do not track Mixpanel events on page load** unless explicitly measuring page views. Mixpanel events represent user actions, not navigation.
- **Do not track PII as Mixpanel properties** — no emails, full names, phone numbers, IP addresses, or payment details in Mixpanel event properties.
- **Do not fire Mixpanel events inside loops** — each Mixpanel event call is a network request.
- **Do not hardcode the Mixpanel project token in feature code.** It lives only in `src/lib/analytics.ts` and can be overridden through `VITE_MIXPANEL_TOKEN`.
- **Do not skip `mixpanel.reset()` on logout** — failing to reset causes Mixpanel to merge the next user's events with the previous user's profile.
- **Do not call `mixpanel.identify()` before the user is authenticated** — premature identification creates orphaned Mixpanel profiles.
# Lumina Bug Tracker

**Last updated:** August 17, 2026

Use this file for confirmed defects and production risks. Record unconfirmed design opinions or one-person preferences in the private-beta feedback log first.

---

## Critical

None currently known.

A critical issue is anything that breaks authentication, privacy, the request-to-review lifecycle, payment-related trust, or production access.

---

## High Priority

None currently confirmed.

---

## Medium Priority — Confirmed Code Audit Items

### Legacy saved-professional route

- [ ] Audit or remove /saved/lash
- The route queries the older artist_profiles table while the active application uses artists
- Risk: the page may fail or show inconsistent data if someone reaches the legacy URL

### Legacy admin portfolio route

- [ ] Audit or remove /admin/portfolio
- The route uses the older portfolio-images storage bucket name while the active professional dashboard uses portfolio
- Risk: uploads or image retrieval may behave differently from the current dashboard

### Database change history

- [ ] Export the live Supabase schema, triggers, functions, and row-level security policies into version-controlled migrations
- Risk: production trust protections currently depend on live database configuration that is not fully reproducible from the repository

---

## Private-Beta Regression Watchlist

These are not currently confirmed bugs. Recheck them before releases and after changes to related pages.

### Core trust lifecycle

- [ ] Client can send a request to the intended professional
- [ ] Professional receives the request without a manual refresh
- [ ] Professional can send or revise a proposal
- [ ] Client can confirm, decline, or request a different time
- [ ] Only the assigned professional can complete a confirmed appointment
- [ ] Completed status appears for both accounts
- [ ] Review invitation opens the correct review form on production
- [ ] Only the authenticated client can submit the verified review
- [ ] A second review for the same appointment is rejected
- [ ] Professional can reply to the review

### Realtime and notifications

- [ ] Messages arrive while both users have the conversation open
- [ ] Unread state clears while the recipient is actively viewing the conversation
- [ ] Closing and reopening chat does not restore an already-read unread badge
- [ ] Request and completion notifications link to the correct request
- [ ] Notification participant names and profile context are accurate

### Authentication and security

- [ ] Signup and login work for both account types
- [ ] Password-reset email arrives through the production sender
- [ ] Reset link opens the production reset page and expires as configured
- [ ] Session controls accurately show and revoke devices

### Profiles and discovery

- [ ] Professional profile edits appear on the public profile
- [ ] Services, availability, portfolio, and structured location display correctly
- [ ] Search, filters, sorting, map, save, and compare work on desktop and mobile
- [ ] Homepage featured-service cards open the matching discovery result

---

## Resolved — August 2026

- [x] Duplicate review fragments in production review URLs
- [x] Review invitation not opening the review form
- [x] Completed appointments continuing to display Proposal Sent or Artist replied
- [x] Client and professional request archive and unarchive behavior
- [x] New requests requiring a manual page refresh
- [x] Message sending, multiline input, and sending-state polish
- [x] Unread badges not clearing correctly while chat was open
- [x] Realtime callback setup error on the professional requests page
- [x] Production password-reset redirects opening the homepage
- [x] Browse filters and sort menus requiring a second click on their trigger to close
- [x] Homepage layout imbalance at mobile and intermediate widths
- [x] Mobile search and navigation sizing

---

## Earlier Resolved Foundation Work

- [x] Realtime updates without page refresh
- [x] Request hiding
- [x] Chat bubbles and conversation header
- [x] Sticky message input and auto-scroll
- [x] Unread badges
- [x] Image attachments
- [x] Responsive mobile request and profile layouts

---

## New Issue Template

Copy this block when recording a confirmed problem:

### Short issue name

- **Status:** Open / Investigating / Fixed / Verified
- **Priority:** Critical / High / Medium / Low
- **Where:** Page, route, or workflow
- **Account:** Client / Professional / Signed out
- **Device:** Desktop / Mobile / Browser
- **What happened:**
- **What should happen:**
- **How to reproduce:**
- **Evidence:** Screenshot, video, error, or affected record
- **First observed:** Date
- **Fix and verification notes:**

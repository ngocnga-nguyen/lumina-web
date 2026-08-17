# Lumina Database

Last updated: August 17, 2026

## Purpose

This document describes the database structure currently used by the Lumina application.

Lumina uses Supabase for:

- PostgreSQL database
- Authentication
- Realtime updates
- File storage

The live Supabase project is the final source of truth. This document was updated from the current application code and the database protections already tested during the production trust-flow review.

---

## Current Tables

### `profiles`

Stores client account information and shared account details.

Important fields:

- `id` — matches the authenticated Supabase user ID
- `full_name`
- `email`
- `account_type`
- `profile_image_url`

Status: ✅ Active

---

### `artists`

Stores professional profiles shown throughout Lumina.

Important fields include:

- Identity: `id`, `name`, `email`, `category`
- Business details: `phone`, `social_link`, `bio`, `availability`
- Pricing and experience: `price_start`, `years_experience`, `experience_unit`, `experience_amount`
- Profile display: `profile_image_url`, `is_active`, `is_verified`
- Location: `address`, `address_line_1`, `city`, `region`, `postal_code`, `latitude`, `longitude`
- Work style: `location_type`, `travels_to_clients`, `service_area`, `hide_street_address`, `mobile_location_details`

The artist ID matches the professional's authenticated Supabase user ID.

Status: ✅ Active

---

### `services`

Stores services offered by each professional.

Important fields:

- `id`
- `artist_id`
- `service_name`
- `price`
- `duration`
- `description`
- `created_at`

Relationship: `services.artist_id → artists.id`

Status: ✅ Active

---

### `portfolio_images`

Stores professional portfolio entries.

Important fields:

- `id`
- `artist_id`
- `image_url`
- `caption`
- `created_at`

Relationship: `portfolio_images.artist_id → artists.id`

Status: ✅ Active

---

### `client_requests`

This is the central table for Lumina's request, proposal, appointment, completion, and review-unlock lifecycle.

Important fields:

- Request identity: `id`, `client_id`, `artist_id`
- Display snapshots: `client_name`, `artist_name`, `artist_image_url`, `artist_slug`, `artist_category`
- Request details: `client_contact`, `service_requested`, `preferred_date`, `preferred_time`, `notes`, `image_url`
- Artist proposal: `artist_response`, `proposed_date`, `proposed_time`, `proposed_price`
- Workflow: `status`, `client_status`, `client_confirmed`, `client_response_note`, `booking_status`
- Completion: `completed_at`, `completed_by`
- Organization: `client_hidden`, `artist_hidden`
- Timestamps: `created_at`, `updated_at`

Relationships:

- `client_requests.client_id → profiles.id / authenticated client`
- `client_requests.artist_id → artists.id`

Status: ✅ Active and central to the trust system

---

### `request_updates`

Stores request history, proposal updates, chat messages, and read states.

Important fields:

- `id`
- `request_id`
- `sender_type`
- `message`
- `status`
- `proposed_date`
- `proposed_time`
- `proposed_price`
- `image_url`
- `is_read_by_client`
- `is_read_by_artist`
- `is_deleted`
- `created_at`

Relationship: `request_updates.request_id → client_requests.id`

Status: ✅ Active

---

### `notifications`

Stores account notifications for clients and professionals.

Important fields:

- `id`
- `user_id`
- `request_id`
- `title`
- `message`
- `is_read`
- `created_at`

Notifications are used for events such as:

- New request
- New or updated proposal
- New message
- Appointment confirmation
- Proposal declined
- Different time requested
- Appointment completed

Status: ✅ Active

---

### `reviews`

Stores verified client reviews and professional responses.

Important fields:

- `id`
- `artist_id`
- `client_id`
- `request_id`
- `reviewer_name`
- `rating`
- `comment`
- `created_at`
- `artist_response`
- `artist_response_at`

Relationships:

- `reviews.artist_id → artists.id`
- `reviews.client_id → authenticated client`
- `reviews.request_id → client_requests.id`

Status: ✅ Active and database protected

---

### `saved_artists`

Stores the professionals saved by client accounts.

Important fields:

- `user_id`
- `artist_id`

Relationships:

- `saved_artists.user_id → authenticated client`
- `saved_artists.artist_id → artists.id`

Status: ✅ Active

---

## Request and Appointment Lifecycle

Lumina currently keeps the booking lifecycle in `client_requests`; there is not a separate appointments table.

```text
Client sends request
→ Artist sends proposal
→ Client confirms, declines, or requests a different time
→ Client and artist communicate
→ Appointment takes place
→ Assigned artist marks it completed
→ Verified review becomes available
→ Artist may respond to the review
```

Common workflow values used by the application include:

- Request status: `new`, `accepted`
- Client status: `pending`, `confirmed`, `declined`, `needs_different_time`
- Booking status: `pending`, `booked`, `client_declined`, `client_requested_changes`, `completed`

---

## Reviews and Trust Protections

The following behavior has been tested against Supabase:

- Only the assigned professional can complete an appointment.
- A client must confirm before the appointment can be completed.
- Completion records the time and the authenticated professional who completed it.
- A review requires a completed request belonging to the signed-in client.
- The review must match the professional on that completed request.
- Reviewer identity comes from the authenticated account.
- Anonymous fake-review insertion is rejected.
- Only one review is allowed for each completed appointment.
- A professional may respond to a review but cannot create the client's review.

The request-completion protection is enforced by the database trigger `protect_request_completion_trigger` using the function `public.protect_request_completion()`.

These protections are important because the public interface alone is not considered sufficient security. Trust rules must remain enforced inside Supabase.

---

## Realtime Behavior

Lumina listens for Supabase Realtime changes to keep the application current without requiring a page refresh.

Current realtime use includes:

- `client_requests` inserts and updates
- `request_updates` inserts
- `notifications` inserts

These power realtime request arrival, proposal changes, completion status, messaging, unread counts, and notifications.

---

## Storage Buckets

The active application uses these Supabase Storage buckets:

- `profile-images` — account and professional profile images
- `portfolio` — professional portfolio images
- `chat-images` — images shared in request conversations

There is also an older admin route that references `portfolio-images`. It should be treated as legacy until that route is audited or removed.

---

## Authorization Expectations

The live Row Level Security policies should continue to enforce these rules:

- Clients can access only their own private request and account data.
- Professionals can access only requests assigned to them.
- Only conversation participants can access request messages.
- Notifications are private to the recipient.
- Client saved-artist records belong to that client.
- Professionals manage only their own services, portfolio, profile, and review responses.
- Public profile, service, portfolio, and approved review information remains readable where required by the marketplace.

The exact live policy definitions should eventually be exported into version-controlled Supabase migrations so the production rules can be reviewed and reproduced.

---

## Not Separate Tables Today

- Availability is currently stored on the `artists` record.
- Appointments are represented by the lifecycle fields in `client_requests`.
- Chat and proposal history are stored in `request_updates`.

These can be normalized into separate tables later if product usage makes that necessary.

---

## Future Database Areas

Potential future tables or systems:

- Payments and payouts
- Reports and moderation
- Subscriptions
- More structured availability and calendar slots
- Audit history for sensitive trust actions

These are not required for the current private-beta flow.

---

## Maintenance Notes

- Update this document whenever a table, important field, trust rule, or storage bucket changes.
- Database changes should be saved as migration files before wider launch.
- The old names `requests`, `messages`, and `favorites` should not be used for new work. The active tables are `client_requests`, `request_updates`, and `saved_artists`.
- A legacy saved-artists route references `artist_profiles`; the current professional table is `artists` and that legacy route should be audited.

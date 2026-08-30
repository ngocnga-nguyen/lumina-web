# Lumina UI System

**Last Updated:** August 29, 2026

This document keeps Lumina’s pages feeling like one connected product rather
than a collection of individually designed screens. It supports the brand guide
in `03_BRAND.md`; it does not replace it.

## Product Experience

Every important screen should answer three questions:

1. Where am I?
2. What is the current status?
3. What is the clearest next step?

Lumina should feel calm, trustworthy, spacious, and purposeful. A page may be
beautiful, but it is not finished if the next step is unclear.

## Core Journey

Use the same order and language anywhere the client journey is explained:

1. **Discover** — browse and search professionals.
2. **Compare** — review services, pricing, work, and verified client reviews.
3. **Send a request** — share the desired service and optional date or time.
4. **Review the proposal** — accept, request a different time, or decline.
5. **Continue to booking** — finish scheduling through the professional’s
   existing booking process.
6. **Complete the service** — the assigned professional marks it complete.
7. **Leave a verified review** — the requesting client can review the completed
   Lumina request.

Sending a request is not a booking and does not charge the client. Do not use
“appointment confirmed” unless the appointment has actually been finalized.

## Page Families

### Marketing and discovery

Homepage, Browse, Map, public professional profiles, About, and Contact.

- Lead with discovery and trust information.
- Keep one primary action visible.
- Use the public Lumina navigation consistently.

### Client workspace

Saved, Compare, My Requests, chat, reviews, account, and settings.

- Lead with current status and the next action.
- Keep active and archived information separate.
- Use the client account menu consistently.

### Professional workspace

Dashboard, requests, services, results/portfolio, profile editing, and settings.

- Lead with work that needs attention.
- Clearly separate “what clients see” from “what you need to do.”
- Use the professional account menu consistently.

## Action Hierarchy

### Primary action

- Solid charcoal/black pill.
- Only one primary action in a section or decision group.
- Examples: Send Request, Accept Proposal, Continue to Booking, Save Changes.

### Secondary action

- White or ivory pill with a neutral/charcoal border.
- Use for useful alternatives.
- Examples: Message, Request Another Time, View Public Profile.

### Tertiary action

- Text button or quiet neutral treatment.
- Use for dismissive or organizational actions.
- Examples: Decline, Hide, Cancel, Back.

### Blush attention action

- Blush is an accent, not a second primary-button color.
- Reserve it for timely attention such as review invitations, selected states,
  helpful notices, and verified-review indicators.

## Panels and Cards

- Use ivory/white for primary content.
- Use ivory, Soft Baby Pink, or pale Blush Pink for supporting information and
  status panels.
- Use consistent rounded corners: approximately 20–28px for major panels and
  full pills for actions and status labels.
- Avoid nesting several equally strong panels. One panel should visually lead.
- Related information and its action should live in the same panel.

## Status Language

Use concrete, factual labels:

- Request sent
- Proposal received
- Proposal accepted
- Continue to booking
- Appointment confirmed
- Service completed
- Review available
- Review submitted

Avoid vague labels such as “Artist replied” when a more specific status exists.

## Trust Language

Only make claims that Lumina can support with data.

Use:

- Verified client review
- Completed Lumina service/request
- Professional-reported experience
- Portfolio photo added by the professional

Do not use without a defined verification process:

- Verified professional
- Trusted artist
- Top rated
- Licensed and insured
- Verified result

Before-and-after uploads are professional-submitted results until they are
linked to a completed Lumina service and, later, confirmed by a client.

## Responsive Rules

- Mobile must preserve the same journey and labels as desktop.
- Do not hide an important next step solely because the screen is small.
- Desktop may show more context; mobile should show the same status and primary
  action first.
- Touch targets should be at least 44px high where practical.
- Horizontal carousels must indicate that they can be swiped or dragged.

## Design Tokens

Use the approved brand palette:

- Soft Baby Pink: `#FCF6F7`
- Blush Pink: `#F9D8DF`
- Pearl / Silver Gray: `#C8C1BF`
- Warm Taupe: `#6B645F`
- Ivory: `#F6F2EF`
- Charcoal: `#3A2F2F`

Soft Baby Pink and Ivory are quiet surfaces. Blush Pink is a selective accent.
Pearl Gray and Warm Taupe support hierarchy without making the product feel
cold. Charcoal carries readable text and primary actions.

Typography:

- Georgia / serif for editorial headings.
- Geist / sans-serif for navigation, forms, statuses, and body copy.

## Feature Boundaries

The current product is request-first. Multiple-service requests, Lumina-native
instant booking, payments, deposits, and a full calendar are future product
work. Do not imply these features exist through visual copy before their
workflow and data model are ready.

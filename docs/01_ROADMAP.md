# Lumina Product Roadmap

**Last updated:** August 17, 2026

## Current Stage

**Private Beta / Production Testing**

Production is live at [joinlumina.co](https://joinlumina.co).

The roadmap is evidence-led. Dates and major features should not be promised until private-beta behavior shows what users actually need.

---

## Product Goal

Help clients confidently discover beauty professionals they can trust while helping independent professionals build credible discovery and reputation.

The protected core lifecycle is:

**Discovery → Request → Proposal → Confirmation → Communication → Completion → Verified Review**

---

## Foundation Completed

### Accounts and security

- Client and professional signup and login
- Email confirmation
- Persistent sessions
- Client account editing
- Professional profile editing
- Separate professional settings and privacy
- Forgot-password and secure reset flow
- Branded production authentication emails
- Device-session security controls

### Marketplace discovery

- Homepage search
- Browse and map views
- Search suggestions
- Category and service filters
- Sorting
- Saved professionals
- Comparison
- Featured-service homepage showcase
- Mobile swipe, desktop drag, and trackpad gestures

### Professional presence

- Public professional profiles
- Services, pricing, and duration
- Portfolio
- Availability
- Structured experience
- Salon, home-studio, mobile-salon, and travel-based locations
- Existing booking-link support

### Requests and communication

- Client service requests
- Professional proposals
- Client confirmation, decline, or different-time response
- Request-linked realtime messaging
- Image sharing
- Unread states
- Realtime notifications
- Client and professional archiving

### Reviews and trust

- Professional completion of confirmed appointments
- Verified-review invitation after completion
- Authenticated reviewer identity
- One review per completed appointment
- Professional review responses
- Ratings and review counts
- Database protections against unauthorized completion and fake reviews

### Production and brand

- Responsive desktop and mobile experience
- Production domain and deployment
- Production email delivery
- Site metadata
- Lumina logo and browser icons
- English and Vietnamese business overviews

---

## Phase 1 — Private-Beta Reliability

**Current priority**

### Production validation

- [ ] Complete a clean client-to-professional production test from discovery through review
- [ ] Repeat the test on both desktop and mobile
- [ ] Verify request, proposal, message, completion, and notification realtime behavior
- [ ] Verify archive and unarchive behavior for clients and professionals
- [ ] Recheck review links and review-form opening on the production domain
- [ ] Recheck password-reset delivery, expiration, and session controls
- [ ] Audit or remove legacy routes that use old table or storage names
- [ ] Export the live Supabase schema, triggers, and policies into version-controlled migrations

### Quality process

- [ ] Record bugs, UX friction, feature requests, and founder observations separately
- [ ] Fix critical trust, privacy, authentication, or core-lifecycle failures immediately
- [ ] Require repeated evidence before making noncritical product changes
- [ ] Maintain a short production regression checklist

---

## Phase 2 — Validate Professional Supply

**Goal:** Determine whether credible professionals will join, complete profiles, respond, and return.

### Initial target

- Recruit five high-quality, active beauty professionals in one focused launch area
- Include a useful mix of service and work-location types
- Observe onboarding without completing it for them

### Measure

- Outreach sent
- Responses
- Interested professionals
- Accounts created
- Profiles completed
- Time required to complete a credible profile
- Requests received
- Response time
- Returning professionals
- Repeated onboarding friction

### Questions to answer

- Do professionals understand Lumina's value without founder explanation?
- Is maintaining a Lumina profile worth the effort?
- Do professionals want discovery without replacing their booking tools?
- Which professional segment has the strongest need?

---

## Phase 3 — Validate Client Demand and Trust

**Goal:** Determine whether clients use Lumina to make a real decision and complete the trust lifecycle.

### Test

- Observe clients searching and comparing without guidance
- Measure whether clients save, compare, and send qualified requests
- Track proposals, confirmations, completions, and verified reviews
- Interview clients about their most recent real search for a professional
- Test whether trust explanations improve understanding and confidence

### Evidence that matters

- Qualified requests, not only page views
- Confirmed appointments
- Completed services
- Verified reviews
- Repeat client-professional relationships
- Returning clients and professionals
- Reduced decision confusion

---

## Phase 4 — Evidence-Led Product Improvement

Build only after repeated private-beta evidence.

Possible work:

- Simplify repeated onboarding friction
- Improve matching, filters, and comparison
- Strengthen profile completeness and credibility signals
- Improve accessibility, performance, loading, and error recovery
- Add moderation and reporting workflows
- Improve notification preferences
- Add localization foundations
- Consider Spanish and Vietnamese as the first product languages if user demand supports them
- Add useful professional insights without becoming a full salon operating system

---

## Phase 5 — Focused Market Expansion

Begin only after the first market shows healthy supply and real client activity.

Possible work:

- Expand one service category or nearby geography at a time
- Develop partnerships with salons, schools, and professional communities
- Test repeatable professional and client acquisition channels
- Improve local marketplace density
- Build referral and retention loops
- Measure unit economics and support burden

---

## Phase 6 — Monetization Experiments

Do not select a final model before proving value and retention.

Models to test:

- Professional subscriptions
- Optional premium profile or business tools
- Qualified new-client or transaction fees
- Promoted discovery with clear labeling
- Booking-related services
- A hybrid of intermediation and software revenue

Every experiment should test willingness to pay, fairness, conversion, retention, and professional trust.

---

## Later Possibilities

These are not current commitments:

- Native scheduling and calendar sync
- Deposits and payments
- Cancellation and no-show protection
- Waitlists
- Multi-category review ratings
- Verified before-and-after uploads
- Advanced professional analytics
- Team profiles and client management
- Marketing automation
- Personalized recommendations

---

## Do Not Prioritize Yet

- Replacing established salon-management systems
- Large feature expansion without repeated evidence
- Major redesigns based on one person's preference
- Broad geographic launch without marketplace density
- Large infrastructure changes without demand
- Premature monetization
- Hiring a large team before the model is validated

---

## Private-Beta Exit Criteria

Move beyond the current phase only when Lumina has:

- A stable production lifecycle with no known critical trust failures
- A focused group of credible, active professionals
- Multiple real client requests completed without founder rescue
- Verified reviews generated through real completed services
- Evidence that professionals return and maintain their presence
- Evidence that clients value Lumina's decision and trust experience
- A clear list of repeated friction supported by user behavior

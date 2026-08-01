# MRS Medical Services

Website for **MRS Medical Services**, a mobile phlebotomy business.

This project will be built from the approved landing-page reference. The goal is to reproduce the visual structure, spacing, hierarchy, and calm medical-service tone as closely as possible while replacing all placeholder branding, copy, services, credentials, testimonials, contact details, and photography with verified MRS Medical Services content.

## Approved Design Direction

The website should feel:

- Professional
- Calm
- Clean
- Trustworthy
- Personal
- Easy to understand
- Designed by a human, not generated from a generic AI template

The visual system will use restrained medical colors, strong typography, generous white space, thin dividers, clean alignment, and a small number of purposeful interface elements.

### Core design rules

1. **Hierarchy first** — every section has one clear purpose and one obvious reading order.
2. **Simplicity** — no unnecessary content, visual clutter, decorative filler, or oversized sections.
3. **Service funneling** — the page steadily guides visitors from understanding the service to scheduling a visit.
4. **No AI-style design** — no endless card grids, glowing gradients, floating blobs, glass effects, excessive pills, fake dashboards, or repeated feature boxes.
5. **Human language** — copy must sound warm, direct, and professional rather than robotic or corporate.
6. **Mobile-first behavior** — desktop should match the approved reference, while mobile must remain simple, readable, and easy to use.
7. **Accessibility** — semantic structure, readable type, strong contrast, visible focus states, labeled forms, and keyboard-friendly controls.

## Color Direction

The approved palette is based on the first reference design:

- **Primary navy:** deep, professional blue for headings, buttons, footer, and key accents
- **Medical teal:** used sparingly for secondary emphasis, icons, labels, and small highlights
- **White:** primary page background
- **Soft cool gray:** subtle section separation and input backgrounds
- **Charcoal:** body text

The page should remain mostly white. Navy provides structure and trust. Teal is an accent, not the dominant color.

Final color values will be tuned during implementation to match the reference visually and maintain accessible contrast.

## Typography Direction

The reference uses two complementary type styles:

- A refined serif for major headings
- A clean sans-serif for navigation, body copy, buttons, labels, and form controls

The heading font should feel established and human, not trendy or ornamental. The body font should remain highly readable on phones and desktops.

## Landing Page Build Plan

### 1. Header

A clean white header with:

- MRS Medical Services logo or temporary text-based wordmark on the left
- Centered/right-aligned navigation links
- Comfortable horizontal spacing
- Thin or subtle bottom separation from the hero

Navigation:

- Services
- How It Works
- Service Area
- About
- FAQs
- Contact

#### Explicitly excluded from the header

The approved reference includes a top-right scheduling button and phone number. These will **not** be included.

Remove:

- `Schedule a Visit` header button
- Header phone number
- Header phone icon

The header should therefore feel lighter and less crowded than the reference.

### 2. Hero Section

Desktop layout:

- Two-column split
- Copy and actions on the left
- Large real-service photograph on the right
- The image should meet the content edge cleanly, similar to the approved reference

Content order:

1. Large serif headline
2. Teal supporting line
3. Short human paragraph explaining the mobile phlebotomy service
4. Primary scheduling button
5. Secondary call button
6. ZIP-code service-area checker

The headline should clearly explain the service without vague marketing language.

Example direction only:

> Professional Blood Draws
>
> In the Comfort of Your Home

Final wording will be based on the services MRS Medical Services actually provides.

#### Hero actions

- Primary: `Schedule a Visit`
- Secondary: `Call Now`

Buttons should be rectangular with modest corner rounding, not oversized pills.

#### ZIP-code availability area

Keep:

- Location-pin icon
- `Need a blood draw?` prompt
- Short instruction asking for a ZIP code
- ZIP input
- `Check Availability` button

Remove the following reference content entirely:

- `We travel to your area.`
- `Available as early as Tomorrow at 9:00 AM`
- Any live or fake availability promise beneath the ZIP form

The ZIP checker should only confirm whether the location is inside the service area unless real scheduling availability is later connected.

### 3. Three-Point Trust Strip

A horizontal section directly below the hero with three evenly spaced items separated by thin vertical dividers.

Reference structure:

- Convenient
- Professional
- Comfortable

Each item includes:

- One thin-line icon
- Short heading
- One short supporting sentence

This is not a card grid. The section should sit directly on the page with open spacing and subtle borders/dividers.

### 4. Services Section

A clean white section with:

- Introductory heading block on the left
- Service list arranged in two columns on the right
- Small teal check icons
- No individual service cards

Reference heading rhythm:

- Small uppercase section label
- Large serif title
- Short teal underline
- Brief description

The service list will be replaced with verified MRS Medical Services offerings. No service will be added merely because it appears in the mockup.

Potential items to verify before launch:

- Routine blood draws
- Specialty kit collections
- Standing orders
- Wellness collections
- Employer or occupational collections
- Assisted-living or facility visits
- Pediatric collections
- Post-discharge collections

### 5. How It Works

A lightly tinted blue-gray section with:

- Section label and heading on the left
- Four numbered steps across the remaining width
- Thin directional arrows between steps on desktop
- Clear vertical stacking on mobile

Reference flow:

1. Schedule
2. We Come to You
3. Blood Is Collected
4. Delivered to the Lab

Each step contains:

- Teal numbered circle
- Short bold title
- One short explanatory sentence

The final wording must accurately reflect how MRS Medical Services handles orders, collection, transportation, delivery, or shipping.

### 6. Trust, Credentials, and Testimonials

A two-column section.

#### Left side: Trust and credentials

- Small uppercase section label
- Simple checklist of verified credentials
- Thin circular check icons
- `Learn More About Us` secondary button

Only verified claims may be included. Placeholder items from the mockup must not automatically be copied.

Items requiring confirmation:

- Phlebotomy certification
- CPR and first-aid certification
- Insurance status
- Background-check status
- Privacy and specimen-handling practices

Do not display a generic `HIPAA compliant` claim or badge unless the business's legal and operational status has been confirmed.

#### Right side: Patient testimonials

- Small uppercase section label
- Two testimonial blocks on desktop
- Five-star treatment only when supported by genuine reviews
- Short quote
- Patient initials or approved display name

The testimonials may use subtle borders and light elevation, but they should not become oversized decorative cards.

No fabricated reviews or placeholder testimonials may remain in production.

### 7. Final Call-to-Action Band

A full-width deep navy band at the bottom of the landing page.

Structure:

- Teal circular calendar icon on the left
- Serif heading: `Ready to Schedule?`
- One short supporting sentence
- Large teal `Schedule Your Visit` button aligned to the right on desktop
- Stacked layout on mobile

This section should feel decisive and calm, not promotional or aggressive.

### 8. Footer

The supplied image ends at the final CTA band, but the production website still requires a real footer.

The footer should remain compact and include only necessary information:

- MRS Medical Services
- Business phone
- Business email
- General service area
- Operating hours
- Privacy Policy
- Terms of Use
- Accessibility Statement
- Copyright

Additional legal or healthcare notices will be added only if they apply to the business.

## Layout and Spacing Details

- Use a centered maximum-width content container for text-based sections.
- Allow the hero image to feel large and dominant without overwhelming the headline.
- Use generous vertical padding between major sections.
- Keep body-copy line lengths controlled for readability.
- Use thin dividers instead of placing every item inside a box.
- Avoid excessive shadows.
- Use subtle shadows only where the reference uses them, primarily around testimonial content or form controls.
- Keep border radiuses modest.
- Maintain strong left alignment throughout the page.
- Preserve the alternating white and pale-blue section rhythm shown in the reference.

## Responsive Behavior

### Desktop

- Header navigation displayed horizontally
- Hero shown as two columns
- Trust strip shown in three columns
- Services shown as intro plus two-column list
- Four process steps shown horizontally
- Credentials and testimonials shown side by side
- Final CTA shown in one horizontal row

### Tablet

- Reduce navigation spacing
- Preserve the two-column hero only while text remains comfortable
- Allow services and testimonial areas to rebalance into narrower columns

### Mobile

- Replace desktop navigation with a simple menu button
- Stack hero copy above the image
- Use full-width action buttons where appropriate
- Stack ZIP input and availability button cleanly
- Stack trust-strip items with horizontal separators
- Convert service list to one column
- Stack the process vertically without horizontal arrows
- Stack credentials above testimonials
- Stack the final CTA content and button
- Keep tap targets large and text readable

## Content Rules

- Do not invent medical services, prices, credentials, laboratory relationships, or availability.
- Do not promise painless draws, guaranteed first-stick success, same-day results, or diagnostic accuracy.
- Do not imply that MRS Medical Services performs laboratory testing unless it actually does.
- Clearly distinguish mobile collection fees from laboratory testing charges when pricing is added.
- Use `we` only if the business genuinely operates as a team. Otherwise, copy should accurately reflect a single provider.
- Keep paragraphs short and conversational.
- Every section should answer a real visitor question.

## Assets Needed

Before the final landing page can be completed, the following will be needed:

- Final MRS Medical Services logo
- Real photograph of the phlebotomist providing an in-home service, or an approved temporary image
- Verified service list
- Verified service area
- Business phone and email
- Scheduling method or booking URL
- Verified credentials
- Genuine reviews
- Final hours of operation
- Privacy and policy details

## Initial Technical Direction

The final stack will be confirmed before development begins. The landing page should be component-based, responsive, accessible, and easy to maintain without overengineering a simple service website.

Suggested structure:

```text
src/
  components/
    Header
    Hero
    TrustStrip
    Services
    HowItWorks
    Credentials
    Testimonials
    FinalCTA
    Footer
  pages/
    Home
  assets/
    images
    icons
  styles/
```

The component structure is for maintainability only. It must not cause the visual design to become a repetitive grid of generic components.

## Current Status

- [x] Repository created
- [x] Approved landing-page reference selected
- [x] Header exclusions confirmed
- [x] Hero availability-message exclusion confirmed
- [x] Landing-page build plan documented
- [ ] Confirm technology stack
- [ ] Add project foundation
- [ ] Create MRS Medical Services brand assets
- [ ] Build header and hero
- [ ] Build remaining landing-page sections
- [ ] Add responsive behavior
- [ ] Add verified business content
- [ ] Accessibility and browser testing
- [ ] Deploy

## Production Safeguards Review

Implemented before paid appointment launch:

- Stripe checkout reconciliation no longer depends on the customer returning to the website. `/api/contact/stripe-webhook` verifies Stripe signatures, records webhook event IDs idempotently, confirms paid checkout sessions, and expires abandoned checkout reservations.
- Appointment slot availability is backed by `appointment_slot_reservations` with a database-level unique active slot index. Checkout creates a temporary reservation; pay-at-site creates a held slot; cancellation, denial, expiration, and confirmation update the reservation state.
- Date of birth collection and the 19-or-older appointment restriction were removed from the public appointment form, submitted payload, admin notification email, and client validation.
- Unverified testimonial cards and the unverified exact-years experience claim were removed from public copy.
- The exact pricing origin is no longer hard-coded in source. Configure `SERVICE_ORIGIN_LATITUDE` and `SERVICE_ORIGIN_LONGITUDE` in the deployment environment.
- Admin registration decision tokens expire after 24 hours. Once an approved admin exists, approval or denial requires an active admin bearer session.
- A project-level `npm run check` command runs the full client and server build.

Operational items that still need owner/client confirmation:

- Confirm whether M.R.S. Medical Services is acting as a HIPAA covered entity or business associate for each workflow, and document that decision.
- Confirm Railway, Resend, Stripe, Square, and any future insurance or lab integrations are approved vendors for the data they process. If PHI/ePHI is involved, confirm required business associate agreements before production use.
- Create a written retention schedule for appointment requests, cancellation records, webhook/payment records, logs, backups, and email copies.
- Decide whether detailed appointment/request emails are acceptable for the business risk profile or whether email should be reduced to notifications that link into the admin dashboard.
- Add admin audit logging for account approvals, appointment decisions, cancellations, and record access.
- Add production monitoring for failed webhooks, failed emails, database errors, reminder-job failures, and unusual admin-login activity.
- Plan a component split for `client/src/App.tsx` before the next round of large frontend changes.

References used for the privacy/security review:

- HHS HIPAA guidance on cloud service providers and business associate agreements
- FTC business guidance for protecting personal information
- New Jersey Division of Consumer Affairs data privacy law FAQ
- New Jersey identity-theft and breach notification guidance

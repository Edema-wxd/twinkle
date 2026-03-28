# Phase 8: Conversion - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Footer newsletter signup on every page — an email capture form that records subscriber name, email, and source page in Supabase. No popups, exit-intent, or drip campaigns — those are future scope.

</domain>

<decisions>
## Implementation Decisions

### Signup form design
- Inline layout: email field and "Join" button side by side on one row
- First name field also included (above or before email field)
- Section heading: "Join the Twinkle family" above the form
- Button label: "Join"
- Positioned as a column alongside existing footer link columns (same visual weight, not a full-width banner row)

### Success & error states
- On success: show inline confirmation message below the form (form remains visible)
- Success message: "You're in! Welcome to the Twinkle family."
- On duplicate email: show friendly "Looks like you're already on the list!" message inline
- Standard client-side email validation before submit

### Data captured
- Fields: first name + email
- Metadata: source page (window.location.pathname or referrer) recorded at signup time
- Supabase table: `newsletter_subscribers` with columns: id, first_name, email, source_page, subscribed_at

### Opt-in method
- Single opt-in — email recorded immediately on valid submit
- No confirmation email required (keeps it simple, no email service dependency)

### Claude's Discretion
- Exact form input styling (consistent with existing Tailwind v4 design tokens)
- Loading/submitting state on the button
- How first name field is labelled/positioned relative to email
- Error message for invalid email format

</decisions>

<specifics>
## Specific Ideas

- "Join" button label chosen to echo the "Join the Twinkle family" heading — creates a cohesive micro-copy pair
- Source page tracking enables future analytics on which pages drive most signups without extra tooling

</specifics>

<deferred>
## Deferred Ideas

- Double opt-in with confirmation email — considered but deferred (no email infrastructure in v1)
- Full-width footer newsletter banner above footer links — could be revisited if the column form underperforms
- Popup / exit-intent capture — separate phase if needed

</deferred>

---

*Phase: 08-conversion*
*Context gathered: 2026-03-28*

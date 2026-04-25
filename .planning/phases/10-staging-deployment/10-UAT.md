---
status: complete
phase: 10-staging-deployment
source: [10-01-SUMMARY.md, 10-02-SUMMARY.md, 10-03-SUMMARY.md]
started: 2026-04-25T08:45:00Z
updated: 2026-04-25T09:10:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Staging site is live
expected: Visit https://twinkle-mocha.vercel.app — homepage loads with the hero section, no browser console errors. Navigate to /catalog — products are visible (confirms live Supabase connection).
result: pass

### 2. WhatsApp CTA links are correct
expected: On the Shipping page (/shipping), the WhatsApp contact button opens a valid wa.me link — NOT a placeholder number like 2348000000000. Same check on the About page — any WhatsApp contact link uses the real business number.
result: pass

### 3. Sitemap and robots.txt are correct
expected: https://twinkle-mocha.vercel.app/sitemap.xml renders valid XML with staging domain URLs (not localhost). /checkout is absent from the sitemap (intentionally excluded as transactional). /robots.txt references the correct staging sitemap URL.
result: pass

### 4. Admin panel is protected and functional
expected: Visiting https://twinkle-mocha.vercel.app/admin redirects to the login page. After signing in with admin credentials, the orders list and product management pages load correctly. Logout works.
result: pass

### 5. Cart and checkout flow reaches Paystack
expected: Add a product to cart, proceed to checkout, fill in customer details. The Paystack payment form appears (modal or redirect). No errors before the payment step.
result: pass

### 6. Test purchase completes end-to-end
expected: Complete a test payment using Paystack's test card (4084084084084081, any future expiry, any CVV). After payment, the order confirmation page loads showing the order reference. The new order also appears in the Supabase orders table (check via admin panel or Supabase dashboard).
result: pass

### 7. Site is ready for DNS cutover
expected: No blocking issues remain. The DNS cutover steps are documented and actionable: upgrade Vercel to Pro, swap Paystack test keys → live keys, register live webhook URL, update NEXT_PUBLIC_SITE_URL to https://twinklelocs.com, add domain in Vercel, update DNS at registrar.
result: pass

## Summary

total: 7
passed: 7
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none yet]

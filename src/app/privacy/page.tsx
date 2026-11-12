import type { Metadata } from 'next'
import Link from 'next/link'
import { BUSINESS } from '@/lib/config/business'
import { PolicyPage } from '@/components/PolicyPage'

const title = 'Privacy Policy | Twinkle Locs'
const description =
  'What personal information Twinkle Locs collects when you shop, why, who we share it with, how long we keep it and your rights under the Nigeria Data Protection Act.'

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: '/privacy' },
  openGraph: { title, description, images: [{ url: '/og-image.jpg', width: 1200, height: 630 }], type: 'website' },
}

const email = BUSINESS.support.email

export default function PrivacyPage() {
  return (
    <PolicyPage
      eyebrow="Your privacy"
      title="Privacy policy"
      updated="12 November 2026"
      intro={
        <p>
          This explains what personal information {BUSINESS.name} collects when you shop with us, why we need it and what you can ask us
          to do with it. We only collect what we need to sell and deliver your beads, and we never sell your information.
        </p>
      }
      sections={[
        {
          id: 'who-we-are',
          title: 'Who we are',
          body: (
            <p>
              {BUSINESS.name} is a loc bead business based in Lagos, Nigeria, and is responsible for the personal information described
              here. Questions or requests: <a href={`mailto:${email}`}>{email}</a> or{' '}
              <a href={BUSINESS.whatsapp.url('Hi, I have a question about my personal information.')} target="_blank" rel="noopener noreferrer">
                WhatsApp
              </a>
              .
            </p>
          ),
        },
        {
          id: 'what-we-collect',
          title: 'What we collect and why',
          body: (
            <>
              <p>
                <strong>When you order:</strong> your name, email, phone number, delivery address, state and (in Lagos) your area,
                plus what you bought and how much you paid. We use these to process, deliver and support your order, to send your
                receipt and delivery updates, and for our accounts.
              </p>
              <p>
                <strong>When you pay:</strong> payments are handled by Paystack. We never see or store your full card number. Paystack
                sends us a record of the payment, which can include the card type, the issuing bank, the last four digits and the IP
                address used, and we keep it to confirm the payment, prevent fraud and handle refunds.
              </p>
              <p>
                <strong>If you start checkout but don&apos;t pay:</strong> once you reach the review step, we save the details you
                entered and what was in your bag. We use this only to help you finish that order, for example by messaging you if your
                payment didn&apos;t go through.
              </p>
              <p>
                <strong>Newsletter:</strong> if you join, your first name, email and the page you signed up on. We use these to send
                you guides, restock news and offers.
              </p>
              <p>
                <strong>Reviews:</strong> the name, rating and words you choose to share. Reviews are published on the product page.
              </p>
              <p>
                <strong>Messages:</strong> anything you send us on WhatsApp, Instagram or email, so we can reply and help.
              </p>
              <p>
                <strong>Emails we send:</strong> our email provider can tell us whether an email was delivered, bounced or opened, so
                we know your receipt and updates reached you.
              </p>
            </>
          ),
        },
        {
          id: 'legal-basis',
          title: 'Why we’re allowed to use it',
          body: (
            <ul>
              <li><strong>To fulfil your order</strong> (a contract with you): order, payment and delivery details.</li>
              <li><strong>Legal obligations:</strong> keeping sales records for tax and accounting.</li>
              <li><strong>Legitimate interests:</strong> preventing fraud, following up an unfinished checkout, and improving the shop.</li>
              <li><strong>Your consent:</strong> the newsletter and published reviews. You can withdraw consent at any time.</li>
            </ul>
          ),
        },
        {
          id: 'sharing',
          title: 'Who we share it with',
          body: (
            <>
              <p>We share only what each service needs to do its job for us:</p>
              <ul>
                <li><strong>Paystack</strong> to take your payment.</li>
                <li><strong>Delivery riders and couriers</strong>: your name, phone number and address, to deliver your order.</li>
                <li><strong>Resend</strong> to send our emails.</li>
                <li><strong>Vercel</strong> (website hosting) and <strong>Neon</strong> (our database), which store the website and its data.</li>
                <li><strong>UploadThing</strong>, which hosts our product photos.</li>
                <li><strong>WhatsApp (Meta)</strong>, when you choose to message us there.</li>
                <li>
                  <strong>Google</strong>: blog posts include a Google button for adding us as a preferred source, which loads a
                  script from Google when you view the post.
                </li>
              </ul>
              <p>
                Some of these providers store data outside Nigeria, for example in the United States or Europe. We use established
                providers that protect data to recognised standards. We may also share information if the law requires it.
              </p>
            </>
          ),
        },
        {
          id: 'retention',
          title: 'How long we keep it',
          body: (
            <ul>
              <li><strong>Orders and payment records:</strong> as long as tax and accounting rules require us to keep sales records.</li>
              <li><strong>Unfinished checkouts:</strong> only while they&apos;re useful for following up. Ask us and we&apos;ll delete yours.</li>
              <li><strong>Newsletter:</strong> until you unsubscribe.</li>
              <li><strong>Reviews:</strong> while they&apos;re published, or until you ask us to remove yours.</li>
            </ul>
          ),
        },
        {
          id: 'your-rights',
          title: 'Your rights',
          body: (
            <>
              <p>Under the Nigeria Data Protection Act 2023 you can ask us to:</p>
              <ul>
                <li>tell you what information we hold about you and give you a copy</li>
                <li>correct anything that&apos;s wrong</li>
                <li>delete your information, unless we have to keep it by law (such as sales records)</li>
                <li>stop or limit how we use it, or object to a use</li>
                <li>stop sending you the newsletter, at any time</li>
              </ul>
              <p>
                Email <a href={`mailto:${email}`}>{email}</a> or message us on WhatsApp. We&apos;ll reply within 30 days. To unsubscribe
                from the newsletter, just reply to any newsletter email or message us. If you&apos;re unhappy with how we&apos;ve handled
                your information, you can complain to the Nigeria Data Protection Commission.
              </p>
            </>
          ),
        },
        {
          id: 'cookies',
          title: 'Cookies and your browser',
          body: (
            <p>
              We don&apos;t use advertising or tracking cookies. Your bag is saved in your own browser so it&apos;s still there when
              you come back; clearing your browser data removes it. Our staff admin area uses a login cookie, which shoppers never get.
            </p>
          ),
        },
        {
          id: 'security',
          title: 'Keeping it safe',
          body: (
            <p>
              The site runs over an encrypted (HTTPS) connection, card payments are handled entirely by Paystack, and only our own staff
              can sign in to see orders. Order pages only show what you need to see your order, never your full contact or payment
              details.
            </p>
          ),
        },
        {
          id: 'changes',
          title: 'Changes to this policy',
          body: (
            <p>
              If we change how we use your information, we&apos;ll update this page and the date at the top. See also our{' '}
              <Link href="/returns">returns policy</Link> and <Link href="/shipping">delivery information</Link>.
            </p>
          ),
        },
      ]}
    />
  )
}

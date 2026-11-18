import type { Metadata } from 'next'
import Link from 'next/link'
import { BUSINESS } from '@/lib/config/business'
import { PolicyPage } from '@/components/PolicyPage'
import { ConsentChoice } from '@/components/tracking/ConsentChoice'

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
      updated="15 November 2026"
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
                payment didn&apos;t go through, and delete it after 90 days.
              </p>
              <p>
                <strong>Newsletter:</strong> if you join, your first name, email and the page you signed up on. We first email you a
                link to confirm it&apos;s really you; nothing else is sent until you do. After that we use these details to send you
                guides, restock news and offers.
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
              <p>
                <strong>Ads (only if you accept ad cookies):</strong> which pages you view, what you add to your bag and what you buy,
                shared with Meta and TikTok so we can see which of our ads work. See <a href="#cookies">Cookies</a>. [confirm]
              </p>
              <p>
                <strong>Ad links:</strong> if you arrive from one of our ads, the campaign tags in the link (for example, which ad you
                tapped) are saved with your order, so we know which ads lead to sales. [confirm]
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
              <li><strong>Legitimate interests:</strong> preventing fraud, following up an unfinished checkout, improving the shop, and knowing which of our ad links lead to sales [confirm].</li>
              <li><strong>Your consent:</strong> the newsletter, published reviews and ad cookies (Meta and TikTok) [confirm]. You can withdraw consent at any time.</li>
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
                  <strong>Meta</strong> (Facebook, Instagram) and <strong>TikTok</strong>, only if you accept ad cookies: what you view
                  and buy on our site and, when you buy, your email address and phone number in hashed (scrambled) form with your IP
                  address and browser type, so they can tell us which ads led to a sale. They use it under their own privacy policies.
                  [confirm]
                </li>
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
              <li><strong>Unfinished checkouts:</strong> deleted automatically after 90 days, or sooner if you ask us.</li>
              <li><strong>Newsletter:</strong> until you unsubscribe. Unsubscribing deletes your details from the list. If you never confirm your sign-up, we delete it after 7 days.</li>
              <li><strong>Reviews:</strong> while they&apos;re published, or until you ask us to remove yours.</li>
              <li>
                <strong>Your ad cookie choice:</strong> 180 days, then we ask again. <strong>Ad link tags:</strong> 30 days in your
                browser, then with your order record. [confirm]
              </li>
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
                Email <a href={`mailto:${email}`}>{email}</a> or message us on WhatsApp. We&apos;ll reply within 30 days. To leave the
                newsletter, use the Unsubscribe link at the bottom of any newsletter email (or message us). If you&apos;re unhappy with how
                we&apos;ve handled your information, you can complain to the Nigeria Data Protection Commission.
              </p>
            </>
          ),
        },
        {
          id: 'cookies',
          title: 'Cookies and your browser',
          body: (
            <>
              <p>
                Your bag is saved in your own browser so it&apos;s still there when you come back; clearing your browser data removes
                it. Our staff admin area uses a login cookie, which shoppers never get.
              </p>
              <p>
                <strong>Ad cookies, only if you accept:</strong> we advertise on Facebook, Instagram and TikTok. If you press Accept on
                our cookie banner, the Meta Pixel and TikTok Pixel load on this site. They set cookies and tell Meta and TikTok which
                pages you view and what you add to your bag or buy, so we can see which of our ads work. When you buy, our server also
                sends them a record of the purchase with your email address and phone number in hashed (scrambled) form, your IP
                address and your browser type. If you decline, or don&apos;t answer, none of this happens and the shop works exactly
                the same. [confirm]
              </p>
              <p>
                <strong>Ad links:</strong> when you arrive from one of our ads, the link&apos;s campaign tags are kept in a cookie on
                this site for 30 days and saved with your order. They say which ad you came from, not who you are, and we don&apos;t
                share them. [confirm]
              </p>
              <p>
                <strong>Change your choice:</strong> we remember it in a cookie for 180 days. You can change it here at any time. [confirm]
              </p>
              <ConsentChoice />
            </>
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

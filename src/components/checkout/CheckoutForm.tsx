'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { NIGERIAN_STATES } from '@/lib/checkout/shipping';
import { LAGOS_ZONES } from '@/lib/checkout/shippingZones';
import { BUSINESS } from '@/lib/config/business';

export interface CustomerDetails {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  deliveryAddress: string;
  state: string;
  lga?: string;
  deliveryType: 'nigeria' | 'international';
}

interface CheckoutFormProps {
  onSubmit: (details: CustomerDetails) => void;
  defaultValues?: CustomerDetails;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  deliveryAddress?: string;
  state?: string;
  lga?: string;
}

const inputClass =
  // text-base (16px) so iOS Safari doesn't zoom in when a field is focused
  'w-full min-h-12 border rounded-lg px-3 py-2 font-body text-base text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type FieldName = keyof FormErrors

/** Order matters: on a failed submit, focus goes to the first field with a problem. */
const FIELD_ORDER: FieldName[] = ['firstName', 'lastName', 'email', 'phone', 'deliveryAddress', 'state', 'lga']

/** Label + control + error, with the error linked to the control for screen readers. */
function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: FieldName
  label: string
  error?: string
  hint?: string
  children: (a11y: { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string; className: string }) => React.ReactNode
}) {
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined
  return (
    <div className="mb-4">
      <label className="block font-body text-sm text-charcoal mb-1" htmlFor={id}>
        {label}
      </label>
      {children({
        id,
        'aria-invalid': !!error,
        'aria-describedby': describedBy,
        className: `${inputClass} ${error ? 'border-red-500' : 'border-charcoal/20'}`,
      })}
      {hint && !error && (
        <p id={`${id}-hint`} className="font-body text-xs text-charcoal/60 mt-1">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="font-body text-sm text-red-700 mt-1">
          {error}
        </p>
      )}
    </div>
  )
}

export function CheckoutForm({ onSubmit, defaultValues }: CheckoutFormProps) {
  const [deliveryType, setDeliveryType] = useState<'nigeria' | 'international'>(defaultValues?.deliveryType ?? 'nigeria');
  const [firstName, setFirstName] = useState(defaultValues?.firstName ?? '');
  const [lastName, setLastName] = useState(defaultValues?.lastName ?? '');
  const [email, setEmail] = useState(defaultValues?.email ?? '');
  const [phone, setPhone] = useState(defaultValues?.phone ?? '');
  const [deliveryAddress, setDeliveryAddress] = useState(defaultValues?.deliveryAddress ?? '');
  const [state, setState] = useState(defaultValues?.state ?? '');
  const [lga, setLga] = useState(defaultValues?.lga ?? '');
  const [errors, setErrors] = useState<FormErrors>({});
  const formRef = useRef<HTMLFormElement>(null);

  /** Update a field and clear its error, so the message goes away as soon as it's fixed. */
  function change<T>(field: FieldName, set: (v: T) => void) {
    return (v: T) => {
      set(v);
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    };
  }

  function handleStateChange(newState: string) {
    change('state', setState)(newState);
    setLga('');
    if (errors.lga) setErrors((prev) => ({ ...prev, lga: undefined }));
  }

  function validate(): FormErrors {
    const errs: FormErrors = {};
    if (!firstName.trim()) errs.firstName = 'Enter your first name';
    if (!lastName.trim()) errs.lastName = 'Enter your last name';
    if (!email.trim()) {
      errs.email = 'Enter your email address, so we can send your receipt';
    } else if (!EMAIL_RE.test(email.trim())) {
      errs.email = 'Enter an email address like name@example.com';
    }
    const digits = phone.replace(/\D/g, '');
    if (!phone.trim()) {
      errs.phone = 'Enter a phone number for the delivery rider';
    } else if (digits.length < 10 || digits.length > 14) {
      errs.phone = 'Enter your full phone number, like 0803 123 4567';
    }
    if (!deliveryAddress.trim()) errs.deliveryAddress = 'Enter the address we should deliver to';
    if (!state) errs.state = 'Choose your state';
    if (state === 'Lagos' && !lga) errs.lga = 'Choose your area in Lagos';
    return errs;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      // Take the customer straight to the first thing to fix
      const first = FIELD_ORDER.find((f) => errs[f]);
      if (first) formRef.current?.querySelector<HTMLElement>(`#${first}`)?.focus();
      return;
    }
    setErrors({});
    onSubmit({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      deliveryAddress: deliveryAddress.trim(),
      state,
      lga: state === 'Lagos' ? lga : undefined,
      deliveryType: 'nigeria',
    });
  }

  const isOutsideLagos = state !== '' && state !== 'Lagos';
  const errorCount = Object.values(errors).filter(Boolean).length;

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="font-display text-2xl text-forest mb-6">Delivery details</h2>

      {/* Nigeria / International toggle */}
      <fieldset className="mb-6">
        <legend className="sr-only">Where should we deliver?</legend>
        <div className="flex gap-2">
          {(['nigeria', 'international'] as const).map((type) => (
            <label
              key={type}
              className={`flex min-h-11 items-center gap-2 rounded-lg border px-4 cursor-pointer font-body text-sm text-charcoal transition-colors ${
                deliveryType === type ? 'border-gold bg-gold/10' : 'border-charcoal/20 hover:border-charcoal/40'
              }`}
            >
              <input
                type="radio"
                name="deliveryType"
                value={type}
                checked={deliveryType === type}
                onChange={() => setDeliveryType(type)}
                className="accent-gold"
              />
              {type === 'nigeria' ? 'Nigeria' : 'Outside Nigeria'}
            </label>
          ))}
        </div>
      </fieldset>

      {deliveryType === 'international' ? (
        <div className="bg-white rounded-xl ring-1 ring-charcoal/10 p-6 font-body text-sm text-charcoal">
          <p className="mb-4">
            We ship worldwide, with a shipping quote for your country. Message us on WhatsApp with your bag and address and we&apos;ll
            send you the total.
          </p>
          <a
            href={BUSINESS.whatsapp.url("Hi, I'd like a shipping quote for my Twinkle Locs order")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 items-center gap-2 bg-whatsapp-dark text-white font-heading font-semibold px-6 rounded-lg hover:bg-whatsapp-darker transition-colors"
          >
            Get a quote on WhatsApp
          </a>
        </div>
      ) : (
        <form ref={formRef} onSubmit={handleSubmit} noValidate aria-describedby={errorCount > 0 ? 'checkout-errors' : undefined}>
          {errorCount > 0 && (
            <p id="checkout-errors" role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 font-body text-sm text-red-800">
              {errorCount === 1 ? 'One detail needs fixing below.' : `${errorCount} details need fixing below.`}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 sm:gap-4">
            <Field id="firstName" label="First name" error={errors.firstName}>
              {(a) => (
                <input {...a} name="firstName" type="text" autoComplete="given-name" value={firstName} onChange={(e) => change('firstName', setFirstName)(e.target.value)} />
              )}
            </Field>
            <Field id="lastName" label="Last name" error={errors.lastName}>
              {(a) => (
                <input {...a} name="lastName" type="text" autoComplete="family-name" value={lastName} onChange={(e) => change('lastName', setLastName)(e.target.value)} />
              )}
            </Field>
          </div>

          <Field id="email" label="Email address" error={errors.email} hint="We’ll send your receipt and delivery updates here.">
            {(a) => (
              <input
                {...a}
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                value={email}
                onChange={(e) => change('email', setEmail)(e.target.value)}
              />
            )}
          </Field>

          <Field id="phone" label="Phone number" error={errors.phone} hint="For the delivery rider. WhatsApp works best.">
            {(a) => (
              <input {...a} name="phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => change('phone', setPhone)(e.target.value)} />
            )}
          </Field>

          <Field id="deliveryAddress" label="Delivery address" error={errors.deliveryAddress}>
            {(a) => (
              <textarea
                {...a}
                name="deliveryAddress"
                rows={2}
                autoComplete="street-address"
                placeholder="House number, street, area"
                className={`${a.className} resize-none`}
                value={deliveryAddress}
                onChange={(e) => change('deliveryAddress', setDeliveryAddress)(e.target.value)}
              />
            )}
          </Field>

          <Field id="state" label="State" error={errors.state}>
            {(a) => (
              <select {...a} name="state" autoComplete="address-level1" value={state} onChange={(e) => handleStateChange(e.target.value)}>
                <option value="">Select state</option>
                {NIGERIAN_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            )}
          </Field>

          {/* Lagos area dropdown */}
          {state === 'Lagos' && (
            <Field id="lga" label="Area in Lagos" error={errors.lga} hint="Sets your delivery fee and time.">
              {(a) => (
                <select {...a} name="lga" autoComplete="address-level2" value={lga} onChange={(e) => change('lga', setLga)(e.target.value)}>
                  <option value="">Select your area</option>
                  {LAGOS_ZONES.map((zone) => (
                    <optgroup key={zone.id} label={`Zone ${zone.id}: ${zone.name} (${zone.deliveryTime})`}>
                      {zone.areas.map((area) => (
                        <option key={area} value={area}>
                          {area}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              )}
            </Field>
          )}

          {/* Outside Lagos notice */}
          {isOutsideLagos && (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="font-body text-sm text-charcoal/80">
                We ship to every state by courier at one flat rate. You&apos;ll see the exact fee and delivery time on the next step, and we&apos;ll WhatsApp you the tracking details once it&apos;s on its way.
              </p>
            </div>
          )}

          <button
            type="submit"
            className="bg-gold text-forest font-heading font-semibold min-h-12 px-8 rounded-lg hover:bg-forest hover:text-cream transition-colors w-full mt-6"
          >
            Review order
          </button>
          <p className="mt-3 text-center font-body text-xs text-charcoal/60">
            We only use your details to deliver your order.{' '}
            <Link href="/privacy" className="underline underline-offset-2 hover:text-forest">Privacy</Link>
            {' · '}
            <Link href="/returns" className="underline underline-offset-2 hover:text-forest">Returns</Link>
          </p>
        </form>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { NIGERIAN_STATES } from '@/lib/checkout/shipping';

export interface CustomerDetails {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  deliveryAddress: string;
  state: string;
  deliveryType: 'nigeria' | 'international';
}

interface CheckoutFormProps {
  onSubmit: (details: CustomerDetails) => void;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  deliveryAddress?: string;
  state?: string;
}

export function CheckoutForm({ onSubmit }: CheckoutFormProps) {
  const [deliveryType, setDeliveryType] = useState<'nigeria' | 'international'>('nigeria');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [state, setState] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  function validate(): FormErrors {
    const errs: FormErrors = {};
    if (!firstName.trim()) errs.firstName = 'First name is required';
    if (!lastName.trim()) errs.lastName = 'Last name is required';
    if (!email.trim()) {
      errs.email = 'Email is required';
    } else if (!email.includes('@')) {
      errs.email = 'Please enter a valid email address';
    }
    if (!phone.trim()) {
      errs.phone = 'Phone number is required';
    } else if (phone.trim().length < 7) {
      errs.phone = 'Phone number must be at least 7 characters';
    }
    if (!deliveryAddress.trim()) errs.deliveryAddress = 'Delivery address is required';
    if (!state) errs.state = 'Please select a state';
    return errs;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (deliveryType === 'international') {
      onSubmit({ firstName, lastName, email, phone, deliveryAddress, state, deliveryType: 'international' });
      return;
    }
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    onSubmit({ firstName, lastName, email, phone, deliveryAddress, state, deliveryType: 'nigeria' });
  }

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="font-display text-2xl text-cocoa mb-6">Delivery Details</h2>

      {/* Nigeria / International toggle */}
      <div className="flex gap-4 mb-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="deliveryType"
            value="nigeria"
            checked={deliveryType === 'nigeria'}
            onChange={() => setDeliveryType('nigeria')}
            className="accent-gold"
          />
          <span className="font-body text-sm text-charcoal">Nigeria</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="deliveryType"
            value="international"
            checked={deliveryType === 'international'}
            onChange={() => setDeliveryType('international')}
            className="accent-gold"
          />
          <span className="font-body text-sm text-charcoal">International</span>
        </label>
      </div>

      {deliveryType === 'international' ? (
        /* International delivery message */
        <div className="bg-stone-50 rounded-xl p-6 font-body text-sm text-charcoal">
          <p className="mb-4">
            For international orders, please contact us on WhatsApp to get a shipping quote.
          </p>
          {/* TODO: Replace placeholder number with actual Twinkle Locs WhatsApp business number */}
          <a
            href="https://wa.me/2348000000000?text=Hi%2C+I%27d+like+a+shipping+quote+for+my+Twinkle+Locs+order"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#25D366] text-white font-heading font-semibold py-3 px-6 rounded-lg hover:bg-[#1da851] transition-colors"
          >
            Contact us on WhatsApp
          </a>
        </div>
      ) : (
        /* Nigeria delivery form */
        <form onSubmit={handleSubmit} noValidate>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block font-body text-sm text-charcoal mb-1" htmlFor="firstName">
                First Name
              </label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full border border-charcoal/20 rounded-lg px-3 py-2 font-body text-sm text-charcoal focus:outline-none focus:border-gold"
              />
              {errors.firstName && (
                <p className="font-body text-xs text-terracotta mt-1">{errors.firstName}</p>
              )}
            </div>
            <div>
              <label className="block font-body text-sm text-charcoal mb-1" htmlFor="lastName">
                Last Name
              </label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full border border-charcoal/20 rounded-lg px-3 py-2 font-body text-sm text-charcoal focus:outline-none focus:border-gold"
              />
              {errors.lastName && (
                <p className="font-body text-xs text-terracotta mt-1">{errors.lastName}</p>
              )}
            </div>
          </div>

          <div className="mb-4">
            <label className="block font-body text-sm text-charcoal mb-1" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-charcoal/20 rounded-lg px-3 py-2 font-body text-sm text-charcoal focus:outline-none focus:border-gold"
            />
            {errors.email && (
              <p className="font-body text-xs text-terracotta mt-1">{errors.email}</p>
            )}
          </div>

          <div className="mb-4">
            <label className="block font-body text-sm text-charcoal mb-1" htmlFor="phone">
              Phone Number
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-charcoal/20 rounded-lg px-3 py-2 font-body text-sm text-charcoal focus:outline-none focus:border-gold"
            />
            {errors.phone && (
              <p className="font-body text-xs text-terracotta mt-1">{errors.phone}</p>
            )}
          </div>

          <div className="mb-4">
            <label className="block font-body text-sm text-charcoal mb-1" htmlFor="deliveryAddress">
              Delivery Address
            </label>
            <textarea
              id="deliveryAddress"
              rows={2}
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="Street address, city"
              className="w-full border border-charcoal/20 rounded-lg px-3 py-2 font-body text-sm text-charcoal focus:outline-none focus:border-gold resize-none"
            />
            {errors.deliveryAddress && (
              <p className="font-body text-xs text-terracotta mt-1">{errors.deliveryAddress}</p>
            )}
          </div>

          <div className="mb-4">
            <label className="block font-body text-sm text-charcoal mb-1" htmlFor="state">
              State
            </label>
            <select
              id="state"
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full border border-charcoal/20 rounded-lg px-3 py-2 font-body text-sm text-charcoal focus:outline-none focus:border-gold bg-white"
            >
              <option value="">Select state</option>
              {NIGERIAN_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            {errors.state && (
              <p className="font-body text-xs text-terracotta mt-1">{errors.state}</p>
            )}
          </div>

          <button
            type="submit"
            className="bg-gold text-cocoa font-heading font-semibold py-3 px-8 rounded-lg hover:bg-terracotta hover:text-cream transition-colors w-full mt-6"
          >
            Review Order
          </button>
        </form>
      )}
    </div>
  );
}

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';

type PageKey =
  | 'home'
  | 'services'
  | 'about'
  | 'contact'
  | 'intake'
  | 'admin'
  | 'login'
  | 'register'
  | 'forgot'
  | 'dashboard'
  | 'adminRegistration'
  | 'cancel'
  | 'confirm'
  | 'appointmentReview'
  | 'accessibility'
  | 'privacy'
  | 'terms';

const navItems: Array<{ key: PageKey; label: string; path: string }> = [
  { key: 'home', label: 'Home', path: '/' },
  { key: 'services', label: 'Services', path: '/services' },
  { key: 'intake', label: 'Appointments', path: '/intake' },
  { key: 'about', label: 'About', path: '/about' },
  { key: 'contact', label: 'Contact', path: '/contact' },
];

const serviceItems = [
  'Routine blood draws',
  'Specialty kit collections',
  'Standing orders',
  'Wellness collections',
  'Employer or group collections',
  'Assisted living or facility visits',
];

const labOptions = ['LabCorp', 'Quest', 'Oxford', 'Vibrant America', 'Boston Heart', 'SpectraCell'];
const serviceAreaOptions = ['Ocean County', 'Central New Jersey', 'Camden County'];
const publicServiceAreas = ['Ocean County', 'Camden County', 'Central New Jersey'];
const serviceableZipPrefixes = ['077', '080', '081', '085', '086', '087', '088'];
const timeWindowOptions = [
  '6 AM - 7 AM',
  '7 AM - 8 AM',
  '8 AM - 9 AM',
  '9 AM - 10 AM',
  '10 AM - 11 AM',
  '11 AM - 12 PM',
  '12 PM - 1 PM',
  '1 PM - 2 PM',
];
const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

type AdminRequest = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string;
  message: string | null;
  status: string;
  requestType: string;
  serviceArea: string | null;
  preferredDate: string | null;
  preferredTimeWindow: string | null;
  createdAt: string;
};

type Appointment = {
  id: string;
  patientName: string;
  phone: string;
  serviceArea: string | null;
  serviceAddress: string | null;
  appointmentDate: string;
  timeWindow: string;
  status: string;
  notes: string | null;
};

type BlockedTime = {
  id: string;
  blockDate: string;
  timeWindow: string;
  reason: string | null;
  source?: 'blocked' | 'appointment';
};

type CancellationDetails = {
  fullName: string;
  email: string | null;
  phone: string;
  preferredDate: string;
  preferredTimeWindow: string;
  status: string;
  canCancel: boolean;
  message?: string;
};

type AppointmentConfirmationDetails = CancellationDetails & {
  confirmedAt?: string | null;
};

const steps = [
  ['1', 'Request a visit', 'Share your location, preferred timing, and collection needs.'],
  ['2', 'Choose payment', 'Review the visit total and choose card checkout or on-site payment.'],
  ['3', 'Collection visit', 'M.R.S. completes the mobile blood draw at the approved location.'],
  ['4', 'Specimen handoff', 'Specimens are handled according to the lab order or provider request.'],
];

const benefitItems = [
  ['home', 'Convenient', 'Service is planned around an approved home, job, office, or facility visit.'],
  ['shield', 'Professional', 'Care is handled with a focus on comfort, safety, and clear communication.'],
  ['heart', 'Comfortable', 'Mobile collection helps blood work fit more easily into the day.'],
];

const trustItems = [
  'Certified phlebotomy service',
  'CPR and first aid trained',
  'Insured mobile visits',
  'Patient privacy handled with care',
];

const appointmentConfirmationNote =
  'Card-paid appointments are confirmed after successful checkout. Pay-at-site requests may be reviewed by M.R.S. Medical Services before the visit. Appointments must be canceled at least 24 hours in advance.';
const adminSessionTokenKey = 'mrsAdminToken';
const adminSessionExpiryKey = 'mrsAdminTokenExpiresAt';
const inactivityLimitMs = 15 * 60 * 1000;

function getAdminToken() {
  const token = window.sessionStorage.getItem(adminSessionTokenKey);
  const expiresAt = window.sessionStorage.getItem(adminSessionExpiryKey);
  if (!token || !expiresAt || Date.parse(expiresAt) <= Date.now()) {
    window.sessionStorage.removeItem(adminSessionTokenKey);
    window.sessionStorage.removeItem(adminSessionExpiryKey);
    return '';
  }
  return token;
}

function clearAdminSession() {
  window.sessionStorage.removeItem(adminSessionTokenKey);
  window.sessionStorage.removeItem(adminSessionExpiryKey);
  window.sessionStorage.removeItem('mrsAdminPassword');
}

function getPasswordScore(value: string) {
  return [
    value.length >= 12,
    /[a-z]/.test(value),
    /[A-Z]/.test(value),
    /\d/.test(value),
    /[^A-Za-z0-9]/.test(value),
  ].filter(Boolean).length;
}

function getPasswordStrengthLabel(score: number) {
  if (score <= 2) return 'Weak';
  if (score <= 4) return 'Good';
  return 'Strong';
}

function estimateOneWayTravelMinutes(zipCode: string) {
  const prefix = zipCode.trim().slice(0, 3);
  const pricingOrigin = { lat: 39.60, lng: -74.35 };
  const zipCentroids: Record<string, { lat: number; lng: number }> = {
    '08087': { lat: 39.60, lng: -74.35 },
    '077': { lat: 40.35, lng: -74.08 },
    '080': { lat: 39.82, lng: -74.87 },
    '081': { lat: 39.94, lng: -75.10 },
    '085': { lat: 40.28, lng: -74.60 },
    '086': { lat: 40.22, lng: -74.76 },
    '087': { lat: 39.92, lng: -74.20 },
    '088': { lat: 40.55, lng: -74.45 },
  };
  const destination = zipCentroids[zipCode.trim().slice(0, 5)] || zipCentroids[prefix];
  if (!destination) return null;

  const radians = Math.PI / 180;
  const lat1 = pricingOrigin.lat * radians;
  const lat2 = destination.lat * radians;
  const deltaLat = (destination.lat - pricingOrigin.lat) * radians;
  const deltaLng = (destination.lng - pricingOrigin.lng) * radians;
  const a = Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  const miles = 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.ceil(miles * 1.55 + 8);
}

function calculateIntakeTotal(zipCode: string, requestedDate: string, timeWindow: string, patientCount: number) {
  const travelMinutes = estimateOneWayTravelMinutes(zipCode);
  if (!travelMinutes) return null;

  const baseFee = travelMinutes <= 60 ? 90 : travelMinutes <= 90 ? 125 : travelMinutes <= 120 ? 150 : travelMinutes <= 150 ? 175 : null;
  if (baseFee === null) return null;

  const date = requestedDate ? new Date(`${requestedDate}T12:00:00`) : null;
  const day = date && !Number.isNaN(date.getTime()) ? date.getDay() : null;
  const startHour = getTimeWindowStartHour(timeWindow);
  const weekendFee = day === 0 || day === 6 ? 25 : 0;
  const earlyOrEveningFee = startHour !== null && (startHour < 6 || startHour >= 19) ? 25 : 0;
  const additionalPatientsFee = Math.max(0, patientCount - 1) * 35;

  return baseFee + weekendFee + earlyOrEveningFee + additionalPatientsFee;
}

function formatCurrency(value: number | null) {
  if (value === null) return '';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function pageFromPath(pathname: string): PageKey {
  if (pathname.startsWith('/services')) return 'services';
  if (pathname.startsWith('/intake')) return 'intake';
  if (pathname.startsWith('/about')) return 'about';
  if (pathname.startsWith('/contact')) return 'contact';
  if (pathname.startsWith('/admin-registration')) return 'adminRegistration';
  if (pathname.startsWith('/admin')) return 'login';
  if (pathname.startsWith('/login')) return 'login';
  if (pathname.startsWith('/register')) return 'register';
  if (pathname.startsWith('/forgot-password')) return 'forgot';
  if (pathname.startsWith('/dashboard')) return 'dashboard';
  if (pathname.startsWith('/cancel')) return 'cancel';
  if (pathname.startsWith('/confirm')) return 'confirm';
  if (pathname.startsWith('/appointment-review')) return 'appointmentReview';
  if (pathname.startsWith('/accessibility')) return 'accessibility';
  if (pathname.startsWith('/privacy')) return 'privacy';
  if (pathname.startsWith('/terms')) return 'terms';
  return 'home';
}

function Header({ activePage, onNavigate }: { activePage: PageKey; onNavigate: (page: PageKey) => void }) {
  return (
    <header className="header">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <div className="wrap header-inner">
        <a
          className="logo"
          href="/"
          aria-label="M.R.S. Medical Services home"
          onClick={(event) => {
            event.preventDefault();
            onNavigate('home');
          }}
        >
          <img src="/images/mrs-logo.png" alt="M.R.S. Medical Services" />
        </a>

        <nav aria-label="Primary navigation">
          {navItems.map((item) => (
            <a
              key={item.key}
              href={item.path}
              aria-current={activePage === item.key ? 'page' : undefined}
              onClick={(event) => {
                event.preventDefault();
                onNavigate(item.key);
              }}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}

function Footer({ onNavigate }: { onNavigate: (page: PageKey) => void }) {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="wrap footer-inner">
        <div>
          <strong>M.R.S. Medical Services&trade;</strong>
          <p>&copy; {year} M.R.S. Medical Services. All rights reserved.</p>
        </div>
        <div className="social-links" aria-label="Social media links">
          <a href="https://www.facebook.com/" target="_blank" rel="noreferrer" aria-label="Facebook">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M14 8.4V6.8c0-.8.5-1.3 1.4-1.3H17V2.7c-.8-.1-1.7-.2-2.4-.2-2.5 0-4.2 1.5-4.2 4.1v1.8H7.6v3.2h2.8v8h3.6v-8h2.7l.5-3.2H14Z" />
            </svg>
          </a>
          <a href="https://www.instagram.com/" target="_blank" rel="noreferrer" aria-label="Instagram">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7.7 2.8h8.6a4.9 4.9 0 0 1 4.9 4.9v8.6a4.9 4.9 0 0 1-4.9 4.9H7.7a4.9 4.9 0 0 1-4.9-4.9V7.7a4.9 4.9 0 0 1 4.9-4.9Zm0 2A2.9 2.9 0 0 0 4.8 7.7v8.6a2.9 2.9 0 0 0 2.9 2.9h8.6a2.9 2.9 0 0 0 2.9-2.9V7.7a2.9 2.9 0 0 0-2.9-2.9H7.7Zm4.3 3.1a4.1 4.1 0 1 1 0 8.2 4.1 4.1 0 0 1 0-8.2Zm0 2a2.1 2.1 0 1 0 0 4.2 2.1 2.1 0 0 0 0-4.2Zm4.4-2.6a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z" />
            </svg>
          </a>
          <a href="https://www.linkedin.com/" target="_blank" rel="noreferrer" aria-label="LinkedIn">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6.7 8.8v10.4H3.4V8.8h3.3ZM5.1 3.7a1.9 1.9 0 1 1 0 3.8 1.9 1.9 0 0 1 0-3.8Zm7.2 5.1.1 1.4c.8-1.1 1.9-1.7 3.3-1.7 2.4 0 4 1.6 4 4.8v5.9h-3.4v-5.5c0-1.4-.6-2.2-1.8-2.2-1 0-1.7.6-2.1 1.4v6.3H9V8.8h3.3Z" />
            </svg>
          </a>
        </div>
        <div className="footer-links">
          <a
            className="admin-link"
            href="/terms"
            onClick={(event) => {
              event.preventDefault();
              onNavigate('terms');
            }}
          >
            Terms
          </a>
          <a
            className="admin-link"
            href="/privacy"
            onClick={(event) => {
              event.preventDefault();
              onNavigate('privacy');
            }}
          >
            Privacy
          </a>
          <a
            className="admin-link"
            href="/accessibility"
            onClick={(event) => {
              event.preventDefault();
              onNavigate('accessibility');
            }}
          >
            Accessibility
          </a>
          <a
            className="admin-link"
            href="/login"
            onClick={(event) => {
              event.preventDefault();
              onNavigate('login');
            }}
          >
            Admin
          </a>
        </div>
      </div>
    </footer>
  );
}

function HomePage({ onNavigate }: { onNavigate: (page: PageKey) => void }) {
  return (
    <main id="top">
      <section className="hero">
        <div className="wrap hero-inner">
          <div className="hero-copy">
            <h1>Professional blood draws in the comfort of your space.</h1>
            <p>
              M.R.S. Medical Services brings mobile blood collection to homes, workplaces, offices,
              and care settings, making routine lab work easier to fit into the day.
            </p>
            <div className="hero-buttons">
              <button className="btn primary" type="button" onClick={() => onNavigate('intake')}>
                Request a Visit
              </button>
              <a className="btn secondary desktop-hidden-cta" href="tel:+19084637457">Call Now</a>
            </div>
            <p className="service-area-line">
              Serving {publicServiceAreas.join(', ')}.
            </p>
          </div>
          <div className="hero-media" aria-label="Mobile phlebotomy visit in a patient's home">
            <img src="/images/mobile-phlebotomy-hero.png" alt="" />
          </div>
        </div>
      </section>

      <section className="benefits">
        <div className="wrap benefits-grid">
          {benefitItems.map(([icon, title, description]) => (
            <article key={title}>
              <SvgIcon name={icon} />
              <div>
                <strong>{title}</strong>
                <p>{description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="wrap split">
          <div className="section-title">
            <span>How it works</span>
            <h2>A straightforward collection visit.</h2>
            <i />
          </div>
          <div className="steps">
            {steps.map(([number, title, description]) => (
              <article key={number}>
                <b>{number}</b>
                <strong>{title}</strong>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section reviews-section">
        <div className="wrap reviews-layout">
          <div className="section-title">
            <span>Professional care you can trust</span>
            <h2>Care that feels personal and prepared.</h2>
            <i />
            <ul className="trust-list">
              {trustItems.map((item) => (
                <li key={item}>
                  <SvgIcon name="check" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <button className="btn secondary" type="button" onClick={() => onNavigate('about')}>
              Learn More About Us
            </button>
          </div>
          <div className="trust-copy">
            <h3>Prepared for the visit before arrival.</h3>
            <p>
              Appointment details, lab-order needs, kit timing, and service location are reviewed so the visit
              can be handled clearly and professionally.
            </p>
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="wrap cta-inner">
          <div>
            <h3>Need a mobile blood draw?</h3>
            <p>Send the appointment details and choose the payment option that works best for the visit.</p>
          </div>
          <button className="btn teal" type="button" onClick={() => onNavigate('intake')}>
            Request Visit
          </button>
        </div>
      </section>
    </main>
  );
}

function SvgIcon({ name }: { name: string }) {
  if (name === 'home') {
    return (
      <svg className="svg-icon" viewBox="0 0 48 48" aria-hidden="true">
        <path d="M8 23.5 24 10l16 13.5" />
        <path d="M13 22v17h8V28h6v11h8V22" />
      </svg>
    );
  }

  if (name === 'shield') {
    return (
      <svg className="svg-icon" viewBox="0 0 48 48" aria-hidden="true">
        <path d="M24 7 38 12v11c0 9.5-5.8 15.3-14 18-8.2-2.7-14-8.5-14-18V12l14-5Z" />
        <path d="m17 24 5 5 10-11" />
      </svg>
    );
  }

  if (name === 'heart') {
    return (
      <svg className="svg-icon" viewBox="0 0 48 48" aria-hidden="true">
        <path d="M24 39S10 30.5 10 18.5C10 13.7 13.5 10 18 10c2.7 0 5 1.3 6 3.4C25 11.3 27.3 10 30 10c4.5 0 8 3.7 8 8.5C38 30.5 24 39 24 39Z" />
      </svg>
    );
  }

  if (name === 'star') {
    return (
      <svg className="star-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />
      </svg>
    );
  }

  return (
    <svg className="check-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 12 4 4 10-9" />
    </svg>
  );
}

function ServicesPage({ onNavigate }: { onNavigate: (page: PageKey) => void }) {
  return (
    <main>
      <section className="page-hero image-page-hero">
        <div className="wrap image-page-hero-inner">
          <div>
            <h1>Mobile blood collection made simple.</h1>
            <p>
              M.R.S. supports routine and specialty blood draw needs throughout the service area,
              with clear scheduling, careful specimen handling, and a calm visit experience.
            </p>
          </div>
          <img src="/images/services-phlebotomy-tools.png" alt="Phlebotomy tubes and collection supplies arranged on a clean table" />
        </div>
      </section>

      <section className="section">
        <div className="wrap services-layout">
          <div className="section-title">
            <span>What we collect</span>
            <h2>Common mobile phlebotomy needs.</h2>
            <i />
          </div>
          <ul className="service-list">
            {serviceItems.map((service) => (
              <li key={service}>{service}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section muted">
        <div className="wrap info-grid">
          <article>
            <span className="eyebrow">Payment</span>
            <h2>Payment options are expanding.</h2>
            <p>
              Visit cost is calculated from the appointment details before checkout or on-site payment.
            </p>
            <p>Insurance payment is planned for a later phase after the required approvals are in place.</p>
          </article>
          <article>
            <span className="eyebrow">Requirements</span>
            <h2>Prescription required.</h2>
            <p>
              A prescription, lab order, or provider request is required before a blood draw can be
              completed.
            </p>
            <p>Appointments require 24-hour notice for cancellation.</p>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="wrap services-layout">
          <div className="section-title">
            <span>Labs and kits</span>
            <h2>Collection support for common lab orders.</h2>
            <i />
          </div>
          <ul className="service-list">
            {labOptions.map((lab) => (
              <li key={lab}>{lab}</li>
            ))}
          </ul>
        </div>
      </section>

    </main>
  );
}

function AboutPage({ onNavigate }: { onNavigate: (page: PageKey) => void }) {
  return (
    <main>
      <section className="page-hero about-hero">
        <div className="wrap about-hero-inner">
          <div>
            <h1>Personal, professional mobile collection.</h1>
            <p>
              M.R.S. Medical Services brings experienced, certified phlebotomy care to people who
              need blood work completed outside a traditional lab setting.
            </p>
          </div>
          <img src="/images/about-care-team.png" alt="Smiling healthcare team and patient" />
        </div>
      </section>

      <section className="section">
        <div className="wrap about-layout">
          <div className="content-block">
            <h2>About Dennise Irving.</h2>
            <p>
              My name is Dennise Irving, founder of M.R.S. Medical Services. I am a dedicated and
              compassionate phlebotomist committed to safe, reliable, and professional mobile
              specimen collection.
            </p>
            <p>
              My mission is to make laboratory testing more convenient by bringing high-quality
              phlebotomy services directly to people in their homes, workplaces, assisted living
              facilities, and other healthcare settings.
            </p>
            <p>
              I understand that having blood drawn can be stressful, especially for children, older
              adults, and individuals with medical conditions. I take pride in creating a calm,
              respectful, and comfortable experience while maintaining high standards for patient
              care, safety, and confidentiality.
            </p>
            <p>
              M.R.S. Medical Services is built on integrity, professionalism, and attention to
              detail. Every specimen is collected with precision and handled according to
              established laboratory protocols, so patients and providers can depend on careful,
              respectful service.
            </p>
            <p>
              Thank you for trusting M.R.S. Medical Services. I look forward to serving you with
              professionalism, compassion, and excellence.
            </p>
          </div>
          <div className="about-notes">
            <div className="about-note">
              <strong>Background includes</strong>
              <ul className="about-list">
                <li>Experienced mobile phlebotomy care</li>
                <li>NCCT certification</li>
                <li>Rehabilitation facilities</li>
                <li>Correctional health settings</li>
                <li>Mental health care settings</li>
                <li>Nursing homes and doctors' offices</li>
              </ul>
            </div>
            <div className="about-note">
              <strong>Scope of care</strong>
              <p>
                You will be asked for basic visit details first. Medical questions, diagnosis, and
                lab-result interpretation should always stay with your provider.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="wrap cta-inner">
          <div>
            <h3>Have a general question?</h3>
            <p>Use the contact page for questions that do not need the full appointment form yet.</p>
          </div>
          <button className="btn teal" type="button" onClick={() => onNavigate('contact')}>
            Contact Us
          </button>
        </div>
      </section>
    </main>
  );
}

function ContactPage() {
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('sending');
    setStatusMessage('Sending your message...');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, requestType: 'contact' }),
      });

      const result = (await response.json().catch(() => ({}))) as { message?: string };

      if (!response.ok) {
        throw new Error(result.message || 'Message could not be sent right now.');
      }

      setForm({ name: '', phone: '', email: '', message: '' });
      setStatus('success');
      setStatusMessage('Your message was sent. M.R.S. Medical Services will follow up soon.');
    } catch (error) {
      setStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Message could not be sent right now.');
    }
  };

  return (
    <main>
      <section className="page-hero image-page-hero">
        <div className="wrap image-page-hero-inner">
          <div>
            <h1>Contact M.R.S. Medical Services.</h1>
            <p>
              Send a general question, ask about service details, or get help before completing the
              appointment form.
            </p>
          </div>
          <img src="/images/contact-care-coordination.png" alt="Healthcare professional coordinating appointments on a laptop" />
        </div>
      </section>

      <section className="section">
        <div className="wrap contact-layout">
          <form className="contact-form" onSubmit={handleSubmit}>
            <label>
              Name
              <input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                autoComplete="name"
                required
              />
            </label>
            <label>
              Phone
              <input
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
                autoComplete="tel"
                required
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                autoComplete="email"
                required
              />
            </label>
            <label>
              Message
              <textarea
                rows={6}
                value={form.message}
                onChange={(event) => setForm({ ...form, message: event.target.value })}
                placeholder="Write your message here."
                required
              />
            </label>
            <button className="btn primary" type="submit" disabled={status === 'sending'}>
              {status === 'sending' ? 'Sending...' : 'Send Message'}
            </button>
            {statusMessage && (
              <p className={`form-status ${status === 'error' ? 'form-status-error' : ''}`} role="status">
                {statusMessage}
              </p>
            )}
          </form>

          <aside className="contact-card">
            <h2>Contact details</h2>
            <p><strong>Phone:</strong> <a href="tel:+19084637457">(908) 463-7457</a></p>
            <p><strong>Email:</strong> <a href="mailto:dirving.mrsms@gmail.com">dirving.mrsms@gmail.com</a></p>
            <p><strong>Hours:</strong> Monday-Friday, 6 AM-2 PM</p>
            <p>For visit requests, use the appointment page so scheduling, location, and paperwork stay together.</p>
          </aside>
        </div>
      </section>
    </main>
  );
}

function IntakePage() {
  const [form, setForm] = useState({
    fullName: '',
    patientName: '',
    appointmentFor: 'self',
    relationshipToPatient: '',
    patientIsMinor: false,
    guardianAuthorization: false,
    phone: '',
    email: '',
    streetAddress: '',
    addressDetails: '',
    town: '',
    state: 'NJ',
    zipCode: '',
    preferredLab: '',
    requestedDate: '',
    preferredTimeWindow: '',
    isGroup: false,
    patientCount: '1',
    prescriptionReady: false,
    hasKit: false,
    paymentMethod: 'card',
    insuranceProvider: '',
    insuranceMemberId: '',
    insuranceGroupNumber: '',
    policyholderName: '',
    termsAccepted: false,
    notes: '',
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showServiceAreaNotice, setShowServiceAreaNotice] = useState(false);
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(getNextWeekday(new Date())));
  const todayKey = getLocalDateKey(new Date());
  const calendarDays = getCalendarDays(visibleMonth);
  const selectedBlockedWindows = new Set(
    blockedTimes
      .filter((blocked) => getScheduleDateKey(blocked.blockDate) === form.requestedDate)
      .map((blocked) => blocked.timeWindow),
  );
  const selectedUnavailableWindows = getUnavailableWindows(selectedBlockedWindows, form.hasKit);
  const effectivePatientCount = form.isGroup ? Math.max(2, Math.floor(Number(form.patientCount) || 2)) : 1;
  const cardTotal = calculateIntakeTotal(form.zipCode, form.requestedDate, form.preferredTimeWindow, effectivePatientCount);
  const missingDate = attemptedSubmit && !form.requestedDate;
  const missingTime = attemptedSubmit && !form.preferredTimeWindow;
  const missingInsurance = attemptedSubmit && form.paymentMethod === 'insurance' &&
    (!form.insuranceProvider || !form.insuranceMemberId || !form.policyholderName);
  const missingTerms = attemptedSubmit && !form.termsAccepted;
  const isSchedulingForSomeoneElse = form.appointmentFor === 'someone_else';
  const unavailableByDate = blockedTimes.reduce<Record<string, Set<string>>>((availability, blocked) => {
    const key = getScheduleDateKey(blocked.blockDate);
    availability[key] = availability[key] || new Set<string>();
    availability[key].add(blocked.timeWindow);
    return availability;
  }, {});
  const selectedDateLabel = form.requestedDate ? formatScheduleDate(form.requestedDate) : 'Choose a date';

  useEffect(() => {
    fetch('/api/availability/blocked-times')
      .then((response) => response.json())
      .then((result: { blockedTimes?: BlockedTime[] }) => setBlockedTimes(result.blockedTimes || []))
      .catch(() => setBlockedTimes([]));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    const sessionId = params.get('session_id');

    if (payment === 'success') {
      const storedRequest = window.sessionStorage.getItem('mrsPendingIntake');
      const pendingRequest = storedRequest ? JSON.parse(storedRequest) as {
        fullName?: string;
        email?: string;
        requestedDate?: string;
        preferredTimeWindow?: string;
      } : null;

      if (pendingRequest) {
        setForm((currentForm) => ({
          ...currentForm,
          fullName: pendingRequest.fullName || currentForm.fullName,
          email: pendingRequest.email || currentForm.email,
          requestedDate: pendingRequest.requestedDate || currentForm.requestedDate,
          preferredTimeWindow: pendingRequest.preferredTimeWindow || currentForm.preferredTimeWindow,
        }));
      }

      if (sessionId) {
        void fetch('/api/contact/payment-success', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        }).catch(() => undefined);
      }

      window.sessionStorage.removeItem('mrsPendingIntake');
      setStatus('success');
      setStatusMessage('Your payment was received. Please watch for a confirmation email.');
      setShowConfirmation(true);
      window.history.replaceState(null, '', '/intake');
    }

    if (payment === 'cancelled') {
      setStatus('idle');
      setStatusMessage('Secure checkout was cancelled. Choose a payment option and submit again when ready.');
      window.history.replaceState(null, '', '/intake');
    }
  }, []);

  useEffect(() => {
    if (form.hasKit && form.preferredTimeWindow && isKitRestrictedWindow(form.preferredTimeWindow)) {
      setForm((currentForm) => ({ ...currentForm, preferredTimeWindow: '' }));
    }
  }, [form.hasKit, form.preferredTimeWindow]);

  useEffect(() => {
    const currentUnavailable = unavailableByDate[form.requestedDate] || new Set<string>();
    const currentDateIsOpen = form.requestedDate &&
      !timeWindowOptions.every((window) => getUnavailableWindows(currentUnavailable, form.hasKit).has(window));

    if (currentDateIsOpen && !selectedUnavailableWindows.has(form.preferredTimeWindow)) return;

    const nextAvailableDate = getNextAvailableVisitDate(blockedTimes, form.hasKit);
    if (!nextAvailableDate) return;

    setVisibleMonth(startOfMonth(nextAvailableDate));
    setForm((currentForm) => ({
      ...currentForm,
      requestedDate: getLocalDateKey(nextAvailableDate),
      preferredTimeWindow: currentForm.preferredTimeWindow &&
        !getUnavailableWindows(unavailableByDate[getLocalDateKey(nextAvailableDate)] || new Set<string>(), currentForm.hasKit).has(currentForm.preferredTimeWindow)
        ? currentForm.preferredTimeWindow
        : '',
    }));
  }, [blockedTimes, form.hasKit]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAttemptedSubmit(true);

    if (!form.requestedDate || !form.preferredTimeWindow) {
      setStatus('error');
      setStatusMessage('Please choose an available date and time window.');
      return;
    }

    if (isSchedulingForSomeoneElse && (!form.patientName || !form.relationshipToPatient)) {
      setStatus('error');
      setStatusMessage('Please enter the patient name and your relationship to the patient.');
      return;
    }

    if (form.patientIsMinor && !form.guardianAuthorization) {
      setStatus('error');
      setStatusMessage('A parent or legal guardian must authorize scheduling for a minor.');
      return;
    }

    if (!isServiceableZip(form.zipCode)) {
      setStatus('idle');
      setStatusMessage('');
      setShowServiceAreaNotice(true);
      return;
    }

    if (form.preferredTimeWindow && selectedUnavailableWindows.has(form.preferredTimeWindow)) {
      setStatus('error');
      setStatusMessage('That time window is unavailable. Please choose another option.');
      return;
    }

    if (form.paymentMethod === 'insurance' && (!form.insuranceProvider || !form.insuranceMemberId || !form.policyholderName)) {
      setStatus('error');
      setStatusMessage('Please enter insurance provider, member ID, and policyholder name.');
      return;
    }

    if (!form.termsAccepted) {
      setStatus('error');
      setStatusMessage('Please agree to the Terms & Conditions and Privacy Policy before continuing.');
      return;
    }

    setStatus('sending');
    setStatusMessage(form.paymentMethod === 'card' ? 'Preparing secure checkout...' : 'Sending your appointment form...');

    const message = [
      'Appointment request',
      '',
      `Scheduling contact: ${form.fullName}`,
      `Appointment for: ${isSchedulingForSomeoneElse ? 'Someone else' : 'Self'}`,
      `Patient name: ${isSchedulingForSomeoneElse ? form.patientName : form.fullName}`,
      `Relationship to patient: ${isSchedulingForSomeoneElse ? form.relationshipToPatient : 'Self'}`,
      `Minor patient: ${form.patientIsMinor ? 'Yes' : 'No'}`,
      `Parent/legal guardian authorization: ${form.patientIsMinor ? (form.guardianAuthorization ? 'Yes' : 'No') : 'Not applicable'}`,
      `Phone: ${form.phone}`,
      `Email: ${form.email || 'Not provided'}`,
      `Street address: ${form.streetAddress}`,
      `Address details: ${form.addressDetails || 'Not provided'}`,
      `Town/city: ${form.town}`,
      `State: ${form.state}`,
      `ZIP code: ${form.zipCode}`,
      `Preferred lab: ${form.preferredLab || 'Not specified'}`,
      `Requested date: ${form.requestedDate || 'Not specified'}`,
      `Preferred time window: ${form.preferredTimeWindow || 'Not specified'}`,
      `Group appointment: ${form.isGroup ? 'Yes' : 'No'}`,
      `Number of people: ${effectivePatientCount}`,
      `Prescription/order ready: ${form.prescriptionReady ? 'Yes' : 'No'}`,
      `Has kit: ${form.hasKit ? 'Yes' : 'No'}`,
      `Payment method: ${form.paymentMethod === 'insurance' ? 'Insurance' : form.paymentMethod === 'pay_at_site' ? 'Pay at site' : 'Card checkout'}`,
      `Terms accepted: ${form.termsAccepted ? 'Yes' : 'No'}`,
      ...(form.paymentMethod === 'insurance'
        ? [
            `Insurance provider: ${form.insuranceProvider}`,
            `Insurance member ID: ${form.insuranceMemberId}`,
            `Insurance group number: ${form.insuranceGroupNumber || 'Not provided'}`,
            `Policyholder name: ${form.policyholderName}`,
          ]
        : []),
      '',
      'Notes:',
      form.notes || 'None',
    ].join('\n');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.fullName,
          phone: form.phone,
          email: form.email,
          message,
          requestType: 'intake',
          zipCode: form.zipCode,
          preferredDate: form.requestedDate,
          preferredTimeWindow: form.preferredTimeWindow,
          hasKit: form.hasKit,
          streetAddress: form.streetAddress,
          addressDetails: form.addressDetails,
          town: form.town,
          state: form.state,
          preferredLab: form.preferredLab,
          prescriptionReady: form.prescriptionReady,
          patientCount: effectivePatientCount,
          paymentMethod: form.paymentMethod,
          insuranceProvider: form.insuranceProvider,
          insuranceMemberId: form.insuranceMemberId,
          insuranceGroupNumber: form.insuranceGroupNumber,
          policyholderName: form.policyholderName,
          termsAccepted: form.termsAccepted,
          notes: form.notes,
        }),
      });

      const result = (await response.json().catch(() => ({}))) as { message?: string; checkoutUrl?: string };

      if (!response.ok) {
        throw new Error(result.message || 'Appointment form could not be sent right now.');
      }

      if (result.checkoutUrl) {
        window.sessionStorage.setItem('mrsPendingIntake', JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          requestedDate: form.requestedDate,
          preferredTimeWindow: form.preferredTimeWindow,
        }));
        window.location.assign(result.checkoutUrl);
        return;
      }

      setStatus('success');
      setStatusMessage('Your appointment form was sent. Please watch for a confirmation email.');
      setAttemptedSubmit(false);
      setShowConfirmation(true);
    } catch (error) {
      setStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Appointment form could not be sent right now.');
    }
  };

  return (
    <main>
      <section className="page-hero intake-hero">
        <div className="wrap intake-hero-inner">
          <div>
            <h1>Appointment request.</h1>
            <p>
              Share the visit details, choose a payment method, and complete checkout if paying by card.
            </p>
          </div>
          <img src="/images/intake-consultation.png" alt="Mobile phlebotomy appointment review" />
        </div>
      </section>

      <section className="section">
        <div className="wrap intake-layout">
          <div className="notice-card" role="note">
            <strong>Before choosing a visit time</strong>
            <p>{appointmentConfirmationNote}</p>
            <p>Specialty kit collections must be scheduled before 10 AM.</p>
          </div>

          <form
            className={`contact-form intake-form ${attemptedSubmit ? 'submitted' : ''}`}
            onSubmit={handleSubmit}
            onInvalid={() => setAttemptedSubmit(true)}
          >
            <div className="intake-columns">
              <section className="intake-panel" aria-labelledby="patient-info-title">
                <h2 id="patient-info-title">Scheduling contact</h2>
            <div className="form-grid">
              <label>
                Contact full name
                <input
                  value={form.fullName}
                  onChange={(event) => setForm({ ...form, fullName: event.target.value })}
                  autoComplete="name"
                  required
                />
              </label>
              <label>
                Phone
                <input
                  value={form.phone}
                  onChange={(event) => setForm({ ...form, phone: event.target.value })}
                  autoComplete="tel"
                  required
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  autoComplete="email"
                  required
                />
              </label>
              <label>
                Who is this appointment for?
                <select
                  value={form.appointmentFor}
                  onChange={(event) => setForm({
                    ...form,
                    appointmentFor: event.target.value,
                    patientName: event.target.value === 'self' ? '' : form.patientName,
                    relationshipToPatient: event.target.value === 'self' ? '' : form.relationshipToPatient,
                  })}
                  required
                >
                  <option value="self">Myself</option>
                  <option value="someone_else">Someone else</option>
                </select>
              </label>
              {isSchedulingForSomeoneElse && (
                <>
                  <label>
                    Patient full name
                    <input
                      value={form.patientName}
                      onChange={(event) => setForm({ ...form, patientName: event.target.value })}
                      required
                    />
                  </label>
                  <label>
                    Relationship to patient
                    <input
                      value={form.relationshipToPatient}
                      onChange={(event) => setForm({ ...form, relationshipToPatient: event.target.value })}
                      placeholder="Parent, guardian, caregiver, spouse, or other authorized contact."
                      required
                    />
                  </label>
                </>
              )}
            </div>

            <div className="checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={form.patientIsMinor}
                  onChange={(event) => setForm({
                    ...form,
                    patientIsMinor: event.target.checked,
                    guardianAuthorization: event.target.checked ? form.guardianAuthorization : false,
                  })}
                />
                The patient is under 18.
              </label>
              {form.patientIsMinor && (
                <label>
                  <input
                    type="checkbox"
                    checked={form.guardianAuthorization}
                    onChange={(event) => setForm({ ...form, guardianAuthorization: event.target.checked })}
                    required
                  />
                  I am the parent or legal guardian, or I am authorized by the parent or legal guardian to schedule this visit.
                </label>
              )}
            </div>

            <div className="form-grid">
              <label>
                Street address
                <input
                  value={form.streetAddress}
                  onChange={(event) => setForm({ ...form, streetAddress: event.target.value })}
                  autoComplete="address-line1"
                  placeholder="Home, job, office, facility, or approved care setting."
                  required
                />
              </label>
              <label>
                Address details
                <input
                  value={form.addressDetails}
                  onChange={(event) => setForm({ ...form, addressDetails: event.target.value })}
                  autoComplete="address-line2"
                  placeholder="Apartment, gate number, floor, parking, or entry notes."
                />
              </label>
              <label>
                Town / city
                <input
                  value={form.town}
                  onChange={(event) => setForm({ ...form, town: event.target.value })}
                  autoComplete="address-level2"
                  required
                />
              </label>
              <label>
                State
                <input
                  value={form.state}
                  onChange={(event) => setForm({ ...form, state: event.target.value.toUpperCase().slice(0, 2) })}
                  autoComplete="address-level1"
                  required
                />
              </label>
              <label>
                ZIP code
                <input
                  value={form.zipCode}
                  onChange={(event) => setForm({ ...form, zipCode: event.target.value.replace(/[^\d-]/g, '').slice(0, 10) })}
                  autoComplete="postal-code"
                  inputMode="numeric"
                  required
                />
              </label>
              <div className="group-request-block">
                <label className="checkbox-field">
                  <input
                    type="checkbox"
                    checked={form.isGroup}
                    onChange={(event) => setForm({
                      ...form,
                      isGroup: event.target.checked,
                      patientCount: event.target.checked ? String(Math.max(2, Number(form.patientCount) || 2)) : '1',
                    })}
                  />
                  <span>Groups:</span>
                  {' '}
                  <small>For more than 1 patient.</small>
                </label>
                {form.isGroup && (
                  <>
                    <label>
                      Number of people
                      <input
                        type="number"
                        min={2}
                        value={form.patientCount}
                        onFocus={(event) => event.currentTarget.select()}
                        onChange={(event) => setForm({ ...form, patientCount: event.target.value.replace(/\D/g, '') })}
                        onBlur={() => setForm((currentForm) => ({
                          ...currentForm,
                          patientCount: String(Math.max(2, Number(currentForm.patientCount) || 2)),
                        }))}
                        required
                      />
                    </label>
                    <p className="field-help group-help">Additional group member information will be collected on site.</p>
                  </>
                )}
              </div>
              <label>
                Preferred lab
                <select
                  value={form.preferredLab}
                  onChange={(event) => setForm({ ...form, preferredLab: event.target.value })}
                >
                  <option value="">Select if known</option>
                  {labOptions.map((lab) => (
                    <option key={lab} value={lab}>{lab}</option>
                  ))}
                  <option value="Other">Other / not sure</option>
                </select>
              </label>
            </div>

            <div className="checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={form.prescriptionReady}
                  onChange={(event) => setForm({ ...form, prescriptionReady: event.target.checked })}
                />
                I have a prescription, lab order, or provider instructions.
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={form.hasKit}
                  onChange={(event) => setForm({ ...form, hasKit: event.target.checked })}
                />
                I have a specialty collection kit. I understand kit collections must be scheduled before 10 AM.
              </label>
            </div>

            <fieldset className="payment-methods">
              <legend>Payment method</legend>
              <div className="payment-method-grid">
                <div className="payment-option-list">
                  <label>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="card"
                      checked={form.paymentMethod === 'card'}
                      onChange={() => setForm({ ...form, paymentMethod: 'card' })}
                    />
                    <span>Secure card checkout</span>
                  </label>
                  <label className="insurance-option-hidden">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="insurance"
                      checked={form.paymentMethod === 'insurance'}
                      onChange={() => setForm({ ...form, paymentMethod: 'insurance' })}
                    />
                    <span>Paid by insurance</span>
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="pay_at_site"
                      checked={form.paymentMethod === 'pay_at_site'}
                      onChange={() => setForm({ ...form, paymentMethod: 'pay_at_site' })}
                    />
                    <span>Pay at site</span>
                  </label>
                </div>
                {form.paymentMethod === 'card' && (
                  <div className="checkout-total" aria-live="polite">
                    <span>Checkout total</span>
                    <strong>{formatCurrency(cardTotal)}</strong>
                    <small>Based on the service ZIP code and selected visit details.</small>
                  </div>
                )}
              </div>
              {form.paymentMethod === 'pay_at_site' && (
                <p className="payment-warning">Checks and Venmo are <strong>NOT</strong> accepted. On-site payment is processed through Square only.</p>
              )}
            </fieldset>

            <label className={`checkbox-field terms-acknowledgement ${missingTerms ? 'field-invalid' : ''}`}>
              <input
                type="checkbox"
                checked={form.termsAccepted}
                onChange={(event) => setForm({ ...form, termsAccepted: event.target.checked })}
                required
              />
              <span>
                I agree to the <a href="/terms">Terms &amp; Conditions</a> and{' '}
                <a href="/privacy">Privacy Policy</a>, and authorize M.R.S. Medical Services to use my submitted
                information to process this visit request and payment.
              </span>
            </label>

            {form.paymentMethod === 'insurance' && (
              <div className={`form-grid insurance-fields ${missingInsurance ? 'field-invalid' : ''}`}>
                <label>
                  Insurance provider
                  <input
                    value={form.insuranceProvider}
                    onChange={(event) => setForm({ ...form, insuranceProvider: event.target.value })}
                    required
                  />
                </label>
                <label>
                  Member ID
                  <input
                    value={form.insuranceMemberId}
                    onChange={(event) => setForm({ ...form, insuranceMemberId: event.target.value })}
                    required
                  />
                </label>
                <label>
                  Group number
                  <input
                    value={form.insuranceGroupNumber}
                    onChange={(event) => setForm({ ...form, insuranceGroupNumber: event.target.value })}
                  />
                </label>
                <label>
                  Policyholder name
                  <input
                    value={form.policyholderName}
                    onChange={(event) => setForm({ ...form, policyholderName: event.target.value })}
                    required
                  />
                </label>
              </div>
            )}

            <button className="btn primary" type="submit" disabled={status === 'sending'}>
              {status === 'sending' ? 'Sending...' : form.paymentMethod === 'card' ? 'Continue to Checkout' : 'Submit Appointment'}
            </button>
            {statusMessage && (
              <p className={`form-status ${status === 'error' ? 'form-status-error' : ''}`} role="status">
                {statusMessage}
              </p>
            )}
              </section>

              <section className="intake-panel appointment-panel" aria-labelledby="appointment-info-title">
                <h2 id="appointment-info-title">Appointment info</h2>
            <div className={`booking-calendar ${missingDate || missingTime ? 'field-invalid' : ''}`} aria-label="Visit availability picker">
              <div className="calendar-header">
                <button
                  className="calendar-nav"
                  type="button"
                  onClick={() => setVisibleMonth(addMonths(visibleMonth, -1))}
                  disabled={getMonthKey(visibleMonth) <= getMonthKey(startOfMonth(new Date()))}
                  aria-label="Previous month"
                >
                  ‹
                </button>
                <div>
                  <strong>{visibleMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</strong>
                  <span>{selectedDateLabel}</span>
                </div>
                <button
                  className="calendar-nav"
                  type="button"
                  onClick={() => setVisibleMonth(addMonths(visibleMonth, 1))}
                  aria-label="Next month"
                >
                  ›
                </button>
              </div>

              <div className="calendar-weekdays" aria-hidden="true">
                {weekdayLabels.map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>

              <div className="calendar-grid">
                {calendarDays.map((date, index) => {
                  if (!date) {
                    return <span key={`empty-${index}`} className="calendar-day-empty" aria-hidden="true" />;
                  }

                  const dateKey = getLocalDateKey(date);
                  const blockedForDate = unavailableByDate[dateKey] || new Set<string>();
                  const unavailableForDate = getUnavailableWindows(blockedForDate, form.hasKit);
                  const isCurrentMonth = date.getMonth() === visibleMonth.getMonth();
                  const isPast = dateKey < todayKey;
                  const isFull = timeWindowOptions.every((window) => unavailableForDate.has(window));
                  const isDisabled = !isCurrentMonth || isPast || isFull;

                  return (
                    <button
                      key={dateKey}
                      className={`calendar-day ${form.requestedDate === dateKey ? 'selected' : ''}`}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => {
                        setForm({
                          ...form,
                          requestedDate: dateKey,
                          preferredTimeWindow: unavailableForDate.has(form.preferredTimeWindow)
                            ? ''
                            : form.preferredTimeWindow,
                        });
                      }}
                    >
                      <span>{date.getDate()}</span>
                      {isCurrentMonth && !isPast && (
                        <small>{isFull ? 'Full' : `${timeWindowOptions.length - unavailableForDate.size} open`}</small>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="time-slot-panel">
                <strong>{form.requestedDate ? 'Available hourly times' : 'Choose a date to see times'}</strong>
                {form.hasKit && (
                  <span className="time-slot-note">Kit collections must be scheduled before 10 AM.</span>
                )}
                <div className="time-slot-rolodex">
                  {timeWindowOptions.map((window) => {
                    const isKitBlocked = form.hasKit && isKitRestrictedWindow(window);
                    const isUnavailable = selectedUnavailableWindows.has(window);

                    return (
                      <button
                        key={window}
                        className={`time-slot ${form.preferredTimeWindow === window ? 'selected' : ''}`}
                        type="button"
                        disabled={!form.requestedDate || isUnavailable}
                        onClick={() => setForm({ ...form, preferredTimeWindow: window })}
                      >
                        <span>{window}</span>
                        <small>{isKitBlocked ? 'Kit cutoff' : isUnavailable ? 'Unavailable' : 'Available'}</small>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <label>
              Collection accommodations or visit details
              <textarea
                rows={5}
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
                placeholder="Please do not include Social Security numbers, diagnoses, insurance IDs, or unrelated medical history."
              />
            </label>
              </section>
            </div>
          </form>

        </div>
      </section>

      {showConfirmation && (
        <div className="modal-backdrop" role="presentation">
          <div className="confirmation-modal compact-modal" role="dialog" aria-modal="true" aria-labelledby="confirmation-title">
            <h2 id="confirmation-title">Thank you, {form.fullName}</h2>
            <p>
              Your visit request for {formatScheduleDate(form.requestedDate)} during {form.preferredTimeWindow} was
              received.
            </p>
            <p>Appointments must be canceled at least 24 hours in advance.</p>
            <p>A confirmation email has been sent to {form.email}.</p>
            <button className="btn primary" type="button" onClick={() => setShowConfirmation(false)}>
              Close
            </button>
          </div>
        </div>
      )}

      {showServiceAreaNotice && (
        <div className="modal-backdrop" role="presentation">
          <div className="confirmation-modal compact-modal" role="dialog" aria-modal="true" aria-labelledby="service-area-title">
            <h2 id="service-area-title">Please call before scheduling.</h2>
            <p>
              This ZIP code appears to be outside the regular M.R.S. Medical Services area. Please call
              <a href="tel:+19084637457"> (908) 463-7457</a> so the visit can be reviewed personally.
            </p>
            <button className="btn primary" type="button" onClick={() => setShowServiceAreaNotice(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function CancelPage() {
  const [details, setDetails] = useState<CancellationDetails | null>(null);
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState<'loading' | 'idle' | 'sending' | 'success' | 'error'>('loading');
  const [statusMessage, setStatusMessage] = useState('Loading appointment request...');
  const token = new URLSearchParams(window.location.search).get('token') || '';

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setStatusMessage('This cancellation link is missing appointment details.');
      return;
    }

    fetch(`/api/contact/cancel/${encodeURIComponent(token)}`)
      .then(async (response) => {
        const result = (await response.json().catch(() => ({}))) as CancellationDetails & { message?: string };
        if (!response.ok) {
          throw new Error(result.message || 'Appointment request could not be found.');
        }
        setDetails(result);
        setStatus('idle');
        setStatusMessage('');
      })
      .catch((error) => {
        setStatus('error');
        setStatusMessage(error instanceof Error ? error.message : 'Appointment request could not be found.');
      });
  }, [token]);

  const handleCancel = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('sending');
    setStatusMessage('Submitting cancellation...');

    try {
      const response = await fetch(`/api/contact/cancel/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const result = (await response.json().catch(() => ({}))) as { message?: string };

      if (!response.ok) {
        throw new Error(result.message || 'Cancellation could not be completed online.');
      }

      setStatus('success');
      setStatusMessage('Your appointment request was canceled. M.R.S. Medical Services has been notified.');
    } catch (error) {
      setStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Cancellation could not be completed online.');
    }
  };

  return (
    <main>
      <PageHero title="Cancel appointment request.">
        <p>Review your visit request before submitting a cancellation.</p>
      </PageHero>

      <section className="section">
        <div className="wrap cancel-layout">
          <form className="contact-form cancel-panel" onSubmit={handleCancel}>
            <h2>Appointment details</h2>
            {details && (
              <div className="cancel-summary">
                <p><strong>Name:</strong> {details.fullName}</p>
                <p><strong>Date:</strong> {formatScheduleDate(details.preferredDate)}</p>
                <p><strong>Time:</strong> {details.preferredTimeWindow}</p>
                <p><strong>Phone:</strong> {details.phone}</p>
              </div>
            )}

            {details?.canCancel && status !== 'success' && (
              <>
                <label>
                  Reason for cancellation
                  <textarea
                    rows={5}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    required
                  />
                </label>
                <button className="btn primary" type="submit" disabled={status === 'sending'}>
                  {status === 'sending' ? 'Canceling...' : 'Confirm Cancellation'}
                </button>
              </>
            )}

            {details && !details.canCancel && (
              <div className="notice-card" role="note">
                <strong>Call to cancel</strong>
                <p>
                  This appointment request can no longer be canceled online because less than 24 hours remain.
                  Please call <a href="tel:+19084637457">(908) 463-7457</a>.
                </p>
              </div>
            )}

            {statusMessage && (
              <p className={`form-status ${status === 'error' ? 'form-status-error' : ''}`} role="status">
                {statusMessage}
              </p>
            )}
          </form>
        </div>
      </section>
    </main>
  );
}

function ConfirmAppointmentPage() {
  const [details, setDetails] = useState<AppointmentConfirmationDetails | null>(null);
  const [status, setStatus] = useState<'loading' | 'idle' | 'sending' | 'success' | 'error'>('loading');
  const [statusMessage, setStatusMessage] = useState('Loading appointment details...');
  const token = new URLSearchParams(window.location.search).get('token') || '';

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setStatusMessage('This confirmation link is missing appointment details.');
      return;
    }

    fetch(`/api/contact/confirm/${encodeURIComponent(token)}`)
      .then(async (response) => {
        const result = (await response.json().catch(() => ({}))) as AppointmentConfirmationDetails & { message?: string };
        if (!response.ok) {
          throw new Error(result.message || 'Appointment request could not be found.');
        }
        setDetails(result);
        setStatus(result.confirmedAt ? 'success' : 'idle');
        setStatusMessage(result.confirmedAt ? 'Appointment confirmed. Thank you.' : '');
      })
      .catch((error) => {
        setStatus('error');
        setStatusMessage(error instanceof Error ? error.message : 'Appointment request could not be found.');
      });
  }, [token]);

  const handleConfirm = async () => {
    setStatus('sending');
    setStatusMessage('Confirming appointment...');

    try {
      const response = await fetch(`/api/contact/confirm/${encodeURIComponent(token)}`, {
        method: 'POST',
      });
      const result = (await response.json().catch(() => ({}))) as AppointmentConfirmationDetails & { message?: string };

      if (!response.ok) {
        throw new Error(result.message || 'Appointment could not be confirmed right now.');
      }

      setDetails(result);
      setStatus('success');
      setStatusMessage('Appointment confirmed. Thank you.');
    } catch (error) {
      setStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Appointment could not be confirmed right now.');
    }
  };

  return (
    <main>
      <PageHero title="Confirm appointment.">
        <p>Please confirm that you still plan to keep this appointment.</p>
      </PageHero>

      <section className="section">
        <div className="wrap cancel-layout">
          <div className="contact-form cancel-panel">
            <h2>Appointment details</h2>
            {details && (
              <div className="cancel-summary">
                <p><strong>Name:</strong> {details.fullName}</p>
                <p><strong>Date:</strong> {formatScheduleDate(details.preferredDate)}</p>
                <p><strong>Time:</strong> {details.preferredTimeWindow}</p>
                <p><strong>Phone:</strong> {details.phone}</p>
              </div>
            )}

            {details && status !== 'success' && (
              <button className="btn primary" type="button" onClick={() => void handleConfirm()} disabled={status === 'sending'}>
                {status === 'sending' ? 'Confirming...' : 'Confirm Appointment'}
              </button>
            )}

            {statusMessage && (
              <p className={`form-status ${status === 'error' ? 'form-status-error' : ''}`} role="status">
                {statusMessage}
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function AppointmentReviewPage() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token') || '';
  const initialDecision = params.get('decision') === 'deny' ? 'deny' : 'confirm';
  const [details, setDetails] = useState<CancellationDetails | null>(null);
  const [decision, setDecision] = useState<'confirm' | 'deny'>(initialDecision);
  const [status, setStatus] = useState<'loading' | 'idle' | 'sending' | 'success' | 'error'>('loading');
  const [statusMessage, setStatusMessage] = useState('Loading appointment request...');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setStatusMessage('This review link is missing appointment details.');
      return;
    }

    fetch(`/api/contact/staff-decision/${encodeURIComponent(token)}`)
      .then(async (response) => {
        const result = (await response.json().catch(() => ({}))) as CancellationDetails & { message?: string };
        if (!response.ok) throw new Error(result.message || 'Appointment request could not be found.');
        setDetails(result);
        setStatus('idle');
        setStatusMessage('');
      })
      .catch((error) => {
        setStatus('error');
        setStatusMessage(error instanceof Error ? error.message : 'Appointment request could not be found.');
      });
  }, [token]);

  const submitDecision = async () => {
    setStatus('sending');
    setStatusMessage(decision === 'confirm' ? 'Confirming appointment...' : 'Sending denial email...');

    try {
      const response = await fetch(`/api/contact/staff-decision/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      });
      const result = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) throw new Error(result.message || 'Appointment request could not be updated.');
      setStatus('success');
      setStatusMessage(result.message || 'Appointment request updated.');
    } catch (error) {
      setStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Appointment request could not be updated.');
    }
  };

  return (
    <main>
      <PageHero title="Review appointment.">
        <p>Confirm or deny this appointment request.</p>
      </PageHero>

      <section className="section">
        <div className="wrap auth-layout">
          <div className="confirmation-modal auth-decision-card" role="dialog" aria-modal="true" aria-labelledby="appointment-review-title">
            <h2 id="appointment-review-title">{decision === 'confirm' ? 'Confirm appointment' : 'Deny appointment'}</h2>
            {details && (
              <div className="cancel-summary">
                <p><strong>Name:</strong> {details.fullName}</p>
                <p><strong>Date:</strong> {formatScheduleDate(details.preferredDate)}</p>
                <p><strong>Time:</strong> {details.preferredTimeWindow}</p>
                <p><strong>Phone:</strong> {details.phone}</p>
              </div>
            )}
            {details && status !== 'success' && (
              <>
                <div className="segmented-control" aria-label="Appointment decision">
                  <button className={decision === 'confirm' ? 'active' : ''} type="button" onClick={() => setDecision('confirm')}>
                    Confirm
                  </button>
                  <button className={decision === 'deny' ? 'active danger' : 'danger'} type="button" onClick={() => setDecision('deny')}>
                    Deny
                  </button>
                </div>
                <p>
                  {decision === 'confirm'
                    ? 'This will send the patient an appointment confirmation email.'
                    : 'This will send the patient a kind note with a link to reschedule.'}
                </p>
                <button className="btn primary" type="button" onClick={() => void submitDecision()} disabled={status === 'sending'}>
                  {status === 'sending' ? 'Sending...' : decision === 'confirm' ? 'Confirm Appointment' : 'Deny and Send Email'}
                </button>
              </>
            )}
            {statusMessage && (
              <p className={`form-status ${status === 'error' ? 'form-status-error' : ''}`} role="status">
                {statusMessage}
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function AccessibilityPage() {
  return (
    <main>
      <PageHero title="Accessibility.">
        <p>
          M.R.S. Medical Services is committed to making this website usable for patients, families,
          providers, and caregivers.
        </p>
      </PageHero>

      <section className="section">
        <div className="wrap content-block accessibility-content">
          <h2>Website access</h2>
          <p>
            The site is built with keyboard navigation, visible focus states, readable color
            contrast, descriptive labels, and responsive layouts for mobile and desktop screens.
          </p>
          <p>
            If you have trouble using any part of the website or need help requesting a visit,
            please call <a href="tel:+19084637457">(908) 463-7457</a> or email{' '}
            <a href="mailto:dirving.mrsms@gmail.com">dirving.mrsms@gmail.com</a>.
          </p>
        </div>
      </section>
    </main>
  );
}

function TermsPage() {
  return (
    <main>
      <PageHero title="Terms & Conditions.">
        <p>
          These terms apply to use of the M.R.S. Medical Services website and mobile phlebotomy visit requests.
        </p>
      </PageHero>

      <section className="section">
        <div className="wrap content-block legal-content">
          <h2>Service scope</h2>
          <p>
            M.R.S. Medical Services provides mobile specimen collection support. This website is not for
            emergencies, urgent medical advice, diagnosis, treatment decisions, or lab-result interpretation.
            Call 911 or seek emergency care for urgent health concerns.
          </p>
          <p>
            The scheduling contact is responsible for submitting accurate visit details and having any required
            lab order, prescription, kit, provider instruction, identification, and payment method available at
            the appointment.
          </p>
          <p>
            A parent or legal guardian may schedule for a minor and must be available for the service when required.
            Do not schedule for another person unless you are authorized to do so.
          </p>

          <h2>Scheduling and payment</h2>
          <p>
            Card-paid appointments are confirmed after successful checkout. For pay-at-site visits, payment is
            processed through Square at the visit. Checks and Venmo are not accepted.
          </p>
          <p>
            Pricing shown during scheduling is an estimated visit total calculated from submitted appointment
            details, including service ZIP code, requested time, date, and group size when applicable. Group
            appointments may be scheduled by one contact person; additional group member information is collected
            on site.
          </p>
          <p>
            Some requests may require direct review if the location, order, kit, group size, or visit details
            are outside the standard service rules. M.R.S. Medical Services may decline or reschedule a request
            when the visit cannot be completed safely, lawfully, or within the available schedule.
          </p>

          <h2>Cancellation</h2>
          <p>
            Appointments must be canceled at least 24 hours in advance. The confirmation email includes a
            cancellation link when online cancellation is available.
          </p>

          <h2>Website use</h2>
          <p>
            Users agree to submit accurate information, avoid misuse of the website, and avoid attempting to
            access systems, records, or accounts without authorization.
          </p>

          <h2>Privacy</h2>
          <p>
            Information submitted through this website is handled according to the Privacy Policy. Payment card
            details are processed by Stripe for online checkout and are not stored directly by this website.
            Avoid submitting Social Security numbers, diagnoses, unrelated medical history, or insurance
            identification numbers through free-text notes.
          </p>

          <h2>Contact</h2>
          <p>
            Questions about these terms can be sent to{' '}
            <a href="mailto:dirving.mrsms@gmail.com">dirving.mrsms@gmail.com</a> or handled by calling{' '}
            <a href="tel:+19084637457">(908) 463-7457</a>.
          </p>
        </div>
      </section>
    </main>
  );
}

function PrivacyPage() {
  return (
    <main>
      <PageHero title="Privacy Policy.">
        <p>
          This policy explains how M.R.S. Medical Services collects and uses information submitted through this website.
        </p>
      </PageHero>

      <section className="section">
        <div className="wrap content-block legal-content">
          <h2>Information collected</h2>
          <p>
            The website may collect scheduling contact information, patient name when the appointment is for
            another person, relationship to the patient, minor/guardian acknowledgement, phone number, email
            address, service address, requested appointment details, lab preference, prescription or kit status,
            group size, notes, payment method, and related visit information. If insurance payment is enabled
            later, insurance information may also be collected.
          </p>

          <h2>How information is used</h2>
          <p>
            Information is used to process appointment requests, calculate visit pricing, communicate with
            scheduling contacts, coordinate service, process payment, maintain records, prevent abuse, protect
            the website, and respond to legal or security needs.
          </p>

          <h2>Service providers</h2>
          <p>
            M.R.S. Medical Services may use service providers for website hosting, database storage, email delivery,
            security, and payment processing. Online card checkout is handled by Stripe. On-site card payment is
            processed through Square.
          </p>
          <p>
            Service providers are expected to use information only for the services they provide to M.R.S. Medical
            Services. Payment card numbers are handled by the payment processor and are not stored directly by this
            website.
          </p>
          <p>
            If submitted information is treated as protected health information, vendors that create, receive,
            maintain, or transmit that information should be reviewed for appropriate business associate agreements
            before production use.
          </p>

          <h2>Sharing</h2>
          <p>
            Information may be shared when needed to provide services, coordinate with a lab or ordering provider,
            operate the website, process payment, comply with law, prevent fraud or abuse, or protect patients and
            the business. Personal information is not sold.
          </p>
          <p>
            M.R.S. Medical Services does not use submitted health or appointment information for targeted advertising.
          </p>

          <h2>Security and retention</h2>
          <p>
            The website uses administrative access controls, rate limits, secure browser headers, encrypted HTTPS
            transport in production, and third-party payment processing so card numbers are not stored by this site.
            No website or email system can be guaranteed completely secure, but reasonable safeguards are used for
            the sensitivity of the information submitted.
          </p>
          <p>
            Records are retained only as needed for business, legal, payment, security, and service purposes. When
            records are no longer needed, they should be deleted, de-identified, or securely destroyed according to
            the business record-retention process.
          </p>

          <h2>Health privacy</h2>
          <p>
            Depending on the services provided and relationships with labs, providers, health plans, or patients,
            HIPAA or other health privacy and breach-notification rules may apply. M.R.S. Medical Services should
            keep written privacy, security, breach-response, and vendor-review procedures outside this website.
          </p>

          <h2>Your choices</h2>
          <p>
            To request access, correction, deletion, or a copy of submitted information where legally available,
            email{' '}
            <a href="mailto:dirving.mrsms@gmail.com">dirving.mrsms@gmail.com</a> or call{' '}
            <a href="tel:+19084637457">(908) 463-7457</a>.
          </p>
          <p>
            Some records may need to be kept for payment, legal, security, or service-documentation reasons even
            after a deletion request.
          </p>
        </div>
      </section>
    </main>
  );
}

function LoginPage({ onNavigate }: { onNavigate: (page: PageKey) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('sending');
    setStatusMessage('');

    try {
      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        message?: string;
        token?: string;
        expiresAt?: string;
      };

      if (!response.ok) {
        throw new Error(result.message || 'Unable to sign in. Check your email and password and try again.');
      }

      window.sessionStorage.setItem(adminSessionTokenKey, result.token || '');
      window.sessionStorage.setItem(adminSessionExpiryKey, result.expiresAt || new Date(Date.now() + inactivityLimitMs).toISOString());
      setStatus('success');
      setStatusMessage('Signed in.');
      onNavigate('dashboard');
    } catch (error) {
      setStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Unable to sign in right now.');
    }
  };

  return (
    <main>
      <PageHero title="Admin login.">
        <p>Access the M.R.S. Medical Services control center.</p>
      </PageHero>

      <section className="section">
        <div className="wrap auth-layout">
          <form className="contact-form auth-card" onSubmit={handleLogin}>
            <h2>Sign in</h2>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </label>
            <label>
              Password
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
            <label className="checkbox-field auth-checkbox">
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(event) => setShowPassword(event.target.checked)}
              />
              <span>Show password</span>
            </label>
            <button className="btn primary" type="submit" disabled={status === 'sending'}>
              {status === 'sending' ? 'Signing in...' : 'Login'}
            </button>
            {statusMessage && (
              <p className={`form-status ${status === 'error' ? 'form-status-error' : ''}`} role="status">
                {statusMessage}
              </p>
            )}
            <div className="auth-links">
              <a
                href="/register"
                onClick={(event) => {
                  event.preventDefault();
                  onNavigate('register');
                }}
              >
                Register
              </a>
              <a
                href="/forgot-password"
                onClick={(event) => {
                  event.preventDefault();
                  onNavigate('forgot');
                }}
              >
                Forgot password?
              </a>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}

function RegisterPage({ onNavigate }: { onNavigate: (page: PageKey) => void }) {
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const passwordScore = getPasswordScore(form.password);
  const passwordRequirements = [
    ['At least 12 characters', form.password.length >= 12],
    ['One lowercase letter', /[a-z]/.test(form.password)],
    ['One uppercase letter', /[A-Z]/.test(form.password)],
    ['One number', /\d/.test(form.password)],
    ['One symbol', /[^A-Za-z0-9]/.test(form.password)],
  ] as const;

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('sending');
    setStatusMessage('');

    try {
      const response = await fetch('/api/admin/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const result = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) throw new Error(result.message || 'Account request could not be sent.');
      setStatus('success');
      setStatusMessage(result.message || 'Account request sent for approval.');
      setForm({ email: '', password: '', confirmPassword: '' });
    } catch (error) {
      setStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Account request could not be sent.');
    }
  };

  return (
    <main>
      <PageHero title="Register.">
        <p>Admin access will be limited to approved M.R.S. Medical Services users.</p>
      </PageHero>

      <section className="section">
        <div className="wrap auth-layout">
          <form className="contact-form auth-card" onSubmit={handleRegister}>
            <h2>Create admin access</h2>
            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                autoComplete="email"
                required
              />
            </label>
            <label>
              Password
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                autoComplete="new-password"
                required
              />
            </label>
            <div className={`password-meter score-${passwordScore}`} aria-label={`Password strength: ${getPasswordStrengthLabel(passwordScore)}`}>
              <span />
            </div>
            <ul className="password-requirements">
              {passwordRequirements.map(([label, met]) => (
                <li className={met ? 'met' : ''} key={label}>{label}</li>
              ))}
            </ul>
            <label>
              Confirm password
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })}
                autoComplete="new-password"
                required
              />
            </label>
            <label className="checkbox-field auth-checkbox">
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(event) => setShowPassword(event.target.checked)}
              />
              <span>Show password</span>
            </label>
            <button className="btn primary" type="submit" disabled={status === 'sending'}>
              {status === 'sending' ? 'Sending...' : 'Request Access'}
            </button>
            {statusMessage && (
              <p className={`form-status ${status === 'error' ? 'form-status-error' : ''}`} role="status">
                {statusMessage}
              </p>
            )}
            <div className="auth-links">
              <a
                href="/login"
                onClick={(event) => {
                  event.preventDefault();
                  onNavigate('login');
                }}
              >
                Back to login
              </a>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}

function ForgotPasswordPage({ onNavigate }: { onNavigate: (page: PageKey) => void }) {
  const [statusMessage, setStatusMessage] = useState('');

  const handleReset = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatusMessage('Password reset email is not active yet. Use the current Railway admin password for now.');
  };

  return (
    <main>
      <PageHero title="Forgot password.">
        <p>Admin password recovery will be connected when the full account system is added.</p>
      </PageHero>

      <section className="section">
        <div className="wrap auth-layout">
          <form className="contact-form auth-card" onSubmit={handleReset}>
            <h2>Reset access</h2>
            <label>
              Admin email
              <input type="email" autoComplete="email" required />
            </label>
            <button className="btn primary" type="submit">Send Reset Link</button>
            {statusMessage && <p className="form-status" role="status">{statusMessage}</p>}
            <div className="auth-links">
              <a
                href="/login"
                onClick={(event) => {
                  event.preventDefault();
                  onNavigate('login');
                }}
              >
                Back to login
              </a>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}

function AdminRegistrationDecisionPage() {
  const token = new URLSearchParams(window.location.search).get('token') || '';
  const [requestDetails, setRequestDetails] = useState<{ email: string; status: string; requestedAt: string } | null>(null);
  const [status, setStatus] = useState<'loading' | 'idle' | 'sending' | 'success' | 'error'>('loading');
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setStatusMessage('Account request token is missing.');
      return;
    }

    void (async () => {
      try {
        const response = await fetch(`/api/admin/auth/registration/${encodeURIComponent(token)}`);
        const result = (await response.json().catch(() => ({}))) as {
          message?: string;
          request?: { email: string; status: string; requestedAt: string };
        };
        if (!response.ok || !result.request) throw new Error(result.message || 'Account request could not be loaded.');
        setRequestDetails(result.request);
        setStatus('idle');
      } catch (error) {
        setStatus('error');
        setStatusMessage(error instanceof Error ? error.message : 'Account request could not be loaded.');
      }
    })();
  }, [token]);

  const decide = async (decision: 'approve' | 'deny') => {
    setStatus('sending');
    setStatusMessage('');

    try {
      const response = await fetch(`/api/admin/auth/registration/${encodeURIComponent(token)}/decision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(getAdminToken() ? { Authorization: `Bearer ${getAdminToken()}` } : {}),
        },
        body: JSON.stringify({ decision }),
      });
      const result = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) throw new Error(result.message || 'Account request could not be updated.');
      setStatus('success');
      setStatusMessage(result.message || 'Account request updated.');
      setRequestDetails((current) => current ? { ...current, status: decision === 'approve' ? 'approved' : 'denied' } : current);
    } catch (error) {
      setStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Account request could not be updated.');
    }
  };

  return (
    <main>
      <PageHero title="Admin request.">
        <p>Review the account request before granting access.</p>
      </PageHero>

      <section className="section">
        <div className="wrap auth-layout">
          <div className="confirmation-modal auth-decision-card" role="dialog" aria-modal="true" aria-labelledby="admin-request-title">
            <h2 id="admin-request-title">Confirm admin access</h2>
            {requestDetails ? (
              <>
                <p><strong>Email:</strong> {requestDetails.email}</p>
                <p><strong>Status:</strong> {requestDetails.status}</p>
                <div className="modal-actions">
                  <button className="btn primary" type="button" onClick={() => void decide('approve')} disabled={status === 'sending' || requestDetails.status !== 'pending'}>
                    Approve
                  </button>
                  <button className="btn secondary" type="button" onClick={() => void decide('deny')} disabled={status === 'sending' || requestDetails.status !== 'pending'}>
                    Deny
                  </button>
                </div>
              </>
            ) : (
              <p>{status === 'loading' ? 'Loading account request...' : statusMessage}</p>
            )}
            {statusMessage && requestDetails && (
              <p className={`form-status ${status === 'error' ? 'form-status-error' : ''}`} role="status">
                {statusMessage}
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function DashboardPage({ onNavigate }: { onNavigate: (page: PageKey) => void }) {
  const hasSession = Boolean(getAdminToken());
  const dashboardItems = [
    ['Messages', 'Review website contact messages and follow-up needs.'],
    ['Visit Requests', 'See new intake requests, patient details, and requested times.'],
    ['Schedule', 'Confirm appointments and block unavailable dates or times.'],
    ['Reminders', 'Track patient confirmation emails and upcoming visits.'],
    ['Billing', 'Prepare for Stripe, insurance, and pay-at-visit workflows.'],
    ['Website', 'Keep service details, contact information, and public notices current.'],
  ];

  return (
    <main>
      <PageHero title="Dashboard.">
        <p>M.R.S. Medical Services control center.</p>
      </PageHero>

      <section className="section">
        <div className="wrap dashboard-shell">
          {!hasSession ? (
            <div className="auth-card dashboard-empty">
              <h2>Login required</h2>
              <p>Sign in before opening the control center.</p>
              <button className="btn primary" type="button" onClick={() => onNavigate('login')}>
                Go to Login
              </button>
            </div>
          ) : (
            <>
              <div className="dashboard-header">
                <h2>Control Center</h2>
                <button
                  className="btn secondary"
                  type="button"
                  onClick={() => {
                    const token = getAdminToken();
                    if (token) {
                      void fetch('/api/admin/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
                    }
                    clearAdminSession();
                    onNavigate('login');
                  }}
                >
                  Sign Out
                </button>
              </div>
              <div className="dashboard-grid">
                {dashboardItems.map(([title, description]) => (
                  <article className="dashboard-card" key={title}>
                    <span>{title}</span>
                    <p>{description}</p>
                  </article>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

function AdminPage() {
  const [password, setPassword] = useState(() => window.sessionStorage.getItem('mrsAdminPassword') || '');
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [manualForm, setManualForm] = useState({
    name: '',
    phone: '',
    email: '',
    serviceArea: '',
    preferredDate: '',
    preferredTimeWindow: '',
    message: '',
  });
  const [appointmentForm, setAppointmentForm] = useState({
    patientName: '',
    phone: '',
    serviceArea: '',
    serviceAddress: '',
    appointmentDate: '',
    timeWindow: '',
    notes: '',
  });
  const [blockForm, setBlockForm] = useState({ blockDate: '', timeWindow: '', reason: '' });

  const loadSchedule = async (adminPassword = password) => {
    const response = await fetch('/api/admin/schedule', {
      headers: { 'x-admin-password': adminPassword },
    });
    const result = (await response.json().catch(() => ({}))) as {
      message?: string;
      appointments?: Appointment[];
      blockedTimes?: BlockedTime[];
    };

    if (!response.ok) {
      throw new Error(result.message || 'Schedule could not be loaded.');
    }

    setAppointments(result.appointments || []);
    setBlockedTimes(result.blockedTimes || []);
  };

  const loadRequests = async (adminPassword = password) => {
    setStatus('loading');
    setStatusMessage('Loading control center...');

    try {
      const response = await fetch('/api/admin/contact-requests', {
        headers: { 'x-admin-password': adminPassword },
      });
      const result = (await response.json().catch(() => ({}))) as {
        message?: string;
        requests?: AdminRequest[];
      };

      if (!response.ok) {
        throw new Error(result.message || 'Control center could not be loaded.');
      }

      window.sessionStorage.setItem('mrsAdminPassword', adminPassword);
      setRequests(result.requests || []);
      await loadSchedule(adminPassword);
      setStatus('success');
      setStatusMessage('');
    } catch (error) {
      setStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Control center could not be loaded.');
    }
  };

  const handleAppointment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('loading');
    setStatusMessage('Saving appointment...');

    try {
      const response = await fetch('/api/admin/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify(appointmentForm),
      });
      const result = (await response.json().catch(() => ({}))) as { message?: string };

      if (!response.ok) {
        throw new Error(result.message || 'Appointment could not be saved.');
      }

      setAppointmentForm({
        patientName: '',
        phone: '',
        serviceArea: '',
        serviceAddress: '',
        appointmentDate: '',
        timeWindow: '',
        notes: '',
      });
      await loadSchedule(password);
      setStatus('success');
      setStatusMessage('Appointment saved.');
    } catch (error) {
      setStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Appointment could not be saved.');
    }
  };

  const handleBlockedTime = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('loading');
    setStatusMessage('Saving blocked time...');

    try {
      const response = await fetch('/api/admin/blocked-times', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify(blockForm),
      });
      const result = (await response.json().catch(() => ({}))) as { message?: string };

      if (!response.ok) {
        throw new Error(result.message || 'Blocked time could not be saved.');
      }

      setBlockForm({ blockDate: '', timeWindow: '', reason: '' });
      await loadSchedule(password);
      setStatus('success');
      setStatusMessage('Blocked time saved.');
    } catch (error) {
      setStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Blocked time could not be saved.');
    }
  };

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void loadRequests(password);
  };

  const handleManualIntake = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('loading');
    setStatusMessage('Saving manual intake...');

    try {
      const response = await fetch('/api/admin/manual-intake', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify(manualForm),
      });
      const result = (await response.json().catch(() => ({}))) as { message?: string };

      if (!response.ok) {
        throw new Error(result.message || 'Manual intake could not be saved.');
      }

      setManualForm({
        name: '',
        phone: '',
        email: '',
        serviceArea: '',
        preferredDate: '',
        preferredTimeWindow: '',
        message: '',
      });
      await loadRequests(password);
      setStatus('success');
      setStatusMessage('Manual intake saved.');
    } catch (error) {
      setStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Manual intake could not be saved.');
    }
  };

  return (
    <main>
      <PageHero title="Control center.">
        <p>Review website requests and enter phone intakes for M.R.S. Medical Services.</p>
      </PageHero>

      <section className="section">
        <div className="wrap admin-layout">
          <form className="contact-form admin-panel" onSubmit={handleLogin}>
            <h2>Admin access</h2>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
            <button className="btn primary" type="submit" disabled={status === 'loading'}>
              {status === 'loading' ? 'Loading...' : 'Open Control Center'}
            </button>
            {statusMessage && (
              <p className={`form-status ${status === 'error' ? 'form-status-error' : ''}`} role="status">
                {statusMessage}
              </p>
            )}
          </form>

          <form className="contact-form admin-panel" onSubmit={handleManualIntake}>
            <h2>Manual intake</h2>
            <div className="form-grid">
              <label>
                Name
                <input
                  value={manualForm.name}
                  onChange={(event) => setManualForm({ ...manualForm, name: event.target.value })}
                  required
                />
              </label>
              <label>
                Phone
                <input
                  value={manualForm.phone}
                  onChange={(event) => setManualForm({ ...manualForm, phone: event.target.value })}
                  required
                />
              </label>
            </div>
            <label>
              Email
              <input
                type="email"
                value={manualForm.email}
                onChange={(event) => setManualForm({ ...manualForm, email: event.target.value })}
              />
            </label>
            <div className="form-grid">
              <label>
                Service area
                <select
                  value={manualForm.serviceArea}
                  onChange={(event) => setManualForm({ ...manualForm, serviceArea: event.target.value })}
                >
                  <option value="">Select service area</option>
                  {serviceAreaOptions.map((area) => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                  <option value="Other">Other / not sure</option>
                </select>
              </label>
              <label>
                Preferred date
                <input
                  type="date"
                  value={manualForm.preferredDate}
                  onChange={(event) => setManualForm({ ...manualForm, preferredDate: event.target.value })}
                />
              </label>
              <label>
                Preferred time window
                <select
                  value={manualForm.preferredTimeWindow}
                  onChange={(event) => setManualForm({ ...manualForm, preferredTimeWindow: event.target.value })}
                >
                  <option value="">Select if known</option>
                  {timeWindowOptions.map((window) => (
                    <option key={window} value={window}>{window}</option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Notes
              <textarea
                rows={5}
                value={manualForm.message}
                onChange={(event) => setManualForm({ ...manualForm, message: event.target.value })}
                required
              />
            </label>
            <button className="btn primary" type="submit" disabled={status === 'loading' || !password}>
              Save Manual Intake
            </button>
          </form>

          <section className="admin-panel admin-requests">
            <div className="admin-panel-header">
              <h2>Saved requests</h2>
              <button className="btn secondary" type="button" onClick={() => void loadRequests()} disabled={!password}>
                Refresh
              </button>
            </div>
            {requests.length ? (
              <div className="request-list">
                {requests.map((request) => (
                  <article key={request.id} className="request-item">
                    <div>
                      <strong>{request.fullName}</strong>
                      <span>{request.requestType.replace('_', ' ')}</span>
                    </div>
                    <p>{request.phone}{request.email ? ` | ${request.email}` : ''}</p>
                    <p>{request.serviceArea || 'Area not set'} | {request.preferredDate || 'Date not set'} | {request.preferredTimeWindow || 'Time not set'}</p>
                    <p>{request.message || 'No notes.'}</p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="admin-empty">No saved requests loaded.</p>
            )}
          </section>

          <form className="contact-form admin-panel" onSubmit={handleAppointment}>
            <h2>Set appointment</h2>
            <div className="form-grid">
              <label>
                Patient
                <input
                  value={appointmentForm.patientName}
                  onChange={(event) => setAppointmentForm({ ...appointmentForm, patientName: event.target.value })}
                  required
                />
              </label>
              <label>
                Phone
                <input
                  value={appointmentForm.phone}
                  onChange={(event) => setAppointmentForm({ ...appointmentForm, phone: event.target.value })}
                  required
                />
              </label>
            </div>
            <label>
              Service address
              <input
                value={appointmentForm.serviceAddress}
                onChange={(event) => setAppointmentForm({ ...appointmentForm, serviceAddress: event.target.value })}
              />
            </label>
            <div className="form-grid">
              <label>
                Service area
                <select
                  value={appointmentForm.serviceArea}
                  onChange={(event) => setAppointmentForm({ ...appointmentForm, serviceArea: event.target.value })}
                >
                  <option value="">Select service area</option>
                  {serviceAreaOptions.map((area) => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                  <option value="Other">Other / not sure</option>
                </select>
              </label>
              <label>
                Date
                <input
                  type="date"
                  value={appointmentForm.appointmentDate}
                  onChange={(event) => setAppointmentForm({ ...appointmentForm, appointmentDate: event.target.value })}
                  required
                />
              </label>
              <label>
                Time window
                <select
                  value={appointmentForm.timeWindow}
                  onChange={(event) => setAppointmentForm({ ...appointmentForm, timeWindow: event.target.value })}
                  required
                >
                  <option value="">Select time</option>
                  {timeWindowOptions.map((window) => (
                    <option key={window} value={window}>{window}</option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Notes
              <textarea
                rows={4}
                value={appointmentForm.notes}
                onChange={(event) => setAppointmentForm({ ...appointmentForm, notes: event.target.value })}
              />
            </label>
            <button className="btn primary" type="submit" disabled={status === 'loading' || !password}>
              Save Appointment
            </button>
          </form>

          <form className="contact-form admin-panel" onSubmit={handleBlockedTime}>
            <h2>Block time</h2>
            <div className="form-grid">
              <label>
                Date
                <input
                  type="date"
                  value={blockForm.blockDate}
                  onChange={(event) => setBlockForm({ ...blockForm, blockDate: event.target.value })}
                  required
                />
              </label>
              <label>
                Time window
                <select
                  value={blockForm.timeWindow}
                  onChange={(event) => setBlockForm({ ...blockForm, timeWindow: event.target.value })}
                  required
                >
                  <option value="">Select time</option>
                  {timeWindowOptions.map((window) => (
                    <option key={window} value={window}>{window}</option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Reason
              <input
                value={blockForm.reason}
                onChange={(event) => setBlockForm({ ...blockForm, reason: event.target.value })}
              />
            </label>
            <button className="btn primary" type="submit" disabled={status === 'loading' || !password}>
              Save Block
            </button>
          </form>

          <section className="admin-panel admin-requests">
            <div className="admin-panel-header">
              <h2>Schedule</h2>
              <button className="btn secondary" type="button" onClick={() => void loadSchedule()} disabled={!password}>
                Refresh
              </button>
            </div>
            <div className="schedule-grid">
              <div className="request-list">
                {appointments.map((appointment) => (
                  <article key={appointment.id} className="request-item">
                    <div>
                      <strong>{appointment.patientName}</strong>
                      <span>{appointment.status}</span>
                    </div>
                    <p>{formatScheduleDate(appointment.appointmentDate)} | {appointment.timeWindow}</p>
                    <p>{appointment.phone} | {appointment.serviceArea || 'Area not set'}</p>
                    <p>{appointment.serviceAddress || appointment.notes || 'No notes.'}</p>
                  </article>
                ))}
              </div>
              <div className="request-list">
                {blockedTimes.map((blocked) => (
                  <article key={blocked.id} className="request-item">
                    <div>
                      <strong>{formatScheduleDate(blocked.blockDate)}</strong>
                      <span>blocked</span>
                    </div>
                    <p>{blocked.timeWindow}</p>
                    <p>{blocked.reason || 'No reason entered.'}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function formatScheduleDate(value: string | null | undefined) {
  if (!value) return 'Not specified';
  const dateKey = getScheduleDateKey(value);
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = year && month && day ? new Date(year, month - 1, day) : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getCalendarDays(monthDate: Date): Array<Date | null> {
  const firstDay = startOfMonth(monthDate);
  const days: Array<Date | null> = Array.from({ length: Math.max(firstDay.getDay() - 1, 0) }, () => null);
  const cursor = new Date(firstDay);

  while (cursor.getMonth() === monthDate.getMonth()) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) {
      days.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  while (days.length % 5 !== 0) {
    days.push(null);
  }

  return days;
}

function getTimeWindowStartHour(value: string) {
  const match = value.match(/^(\d+)\s(AM|PM)/);
  if (!match) return null;

  const hour = Number(match[1]);
  if (match[2] === 'AM') return hour === 12 ? 0 : hour;
  return hour === 12 ? 12 : hour + 12;
}

function isKitRestrictedWindow(value: string) {
  return (getTimeWindowStartHour(value) ?? 0) >= 10;
}

function getUnavailableWindows(blockedWindows: Set<string>, hasKit: boolean) {
  return new Set(
    timeWindowOptions.filter((window) => blockedWindows.has(window) || (hasKit && isKitRestrictedWindow(window))),
  );
}

function startOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function addMonths(value: Date, amount: number) {
  return new Date(value.getFullYear(), value.getMonth() + amount, 1);
}

function getMonthKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`;
}

function getNextWeekday(startDate: Date) {
  const date = new Date(startDate);
  while (date.getDay() === 0 || date.getDay() === 6) {
    date.setDate(date.getDate() + 1);
  }
  return date;
}

function getNextAvailableVisitDate(blockedTimes: BlockedTime[], hasKit: boolean) {
  const unavailableByDate = blockedTimes.reduce<Record<string, Set<string>>>((availability, blocked) => {
    const key = getScheduleDateKey(blocked.blockDate);
    availability[key] = availability[key] || new Set<string>();
    availability[key].add(blocked.timeWindow);
    return availability;
  }, {});
  const cursor = getNextWeekday(new Date());

  for (let index = 0; index < 45; index += 1) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) {
      const dateKey = getLocalDateKey(cursor);
      const unavailable = getUnavailableWindows(unavailableByDate[dateKey] || new Set<string>(), hasKit);
      const isFull = timeWindowOptions.every((window) => unavailable.has(window));
      if (!isFull) return new Date(cursor);
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return null;
}

function isServiceableZip(value: string) {
  const zip = value.replace(/\D/g, '').slice(0, 5);
  return zip.length === 5 && serviceableZipPrefixes.some((prefix) => zip.startsWith(prefix));
}

function getLocalDateKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getScheduleDateKey(value: string | null | undefined) {
  if (!value) return '';
  const dateOnly = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (dateOnly) return dateOnly;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function PageHero({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="page-hero">
      <div className="wrap">
        <h1>{title}</h1>
        {children}
      </div>
    </section>
  );
}

export default function App() {
  const [activePage, setActivePage] = useState<PageKey>(() => pageFromPath(window.location.pathname));

  useEffect(() => {
    const onPopState = () => setActivePage(pageFromPath(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    let timeoutId = window.setTimeout(() => undefined, inactivityLimitMs);
    const resetTimer = () => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        if (getAdminToken()) {
          clearAdminSession();
          setActivePage('login');
          window.history.pushState(null, '', '/login');
        }
      }, inactivityLimitMs);
    };
    const events = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'];
    events.forEach((eventName) => window.addEventListener(eventName, resetTimer, { passive: true }));
    resetTimer();
    return () => {
      window.clearTimeout(timeoutId);
      events.forEach((eventName) => window.removeEventListener(eventName, resetTimer));
    };
  }, []);

  const navigate = (page: PageKey) => {
    const item = navItems.find((navItem) => navItem.key === page);
    const standalonePaths: Partial<Record<PageKey, string>> = {
      admin: '/login',
      cancel: '/cancel',
      confirm: '/confirm',
      appointmentReview: '/appointment-review',
      accessibility: '/accessibility',
      privacy: '/privacy',
      terms: '/terms',
      login: '/login',
      register: '/register',
      forgot: '/forgot-password',
      dashboard: '/dashboard',
      adminRegistration: '/admin-registration',
    };
    const path = item?.path || standalonePaths[page];
    if (!path) return;
    window.history.pushState(null, '', path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setActivePage(page === 'admin' ? 'login' : page);
  };

  return (
    <div className="page">
      <Header activePage={activePage} onNavigate={navigate} />
      <div id="main-content" tabIndex={-1}>
        {activePage === 'home' && <HomePage onNavigate={navigate} />}
        {activePage === 'services' && <ServicesPage onNavigate={navigate} />}
        {activePage === 'intake' && <IntakePage />}
        {activePage === 'about' && <AboutPage onNavigate={navigate} />}
        {activePage === 'contact' && <ContactPage />}
        {activePage === 'login' && <LoginPage onNavigate={navigate} />}
        {activePage === 'register' && <RegisterPage onNavigate={navigate} />}
        {activePage === 'forgot' && <ForgotPasswordPage onNavigate={navigate} />}
        {activePage === 'adminRegistration' && <AdminRegistrationDecisionPage />}
        {activePage === 'dashboard' && <DashboardPage onNavigate={navigate} />}
        {activePage === 'admin' && <AdminPage />}
        {activePage === 'cancel' && <CancelPage />}
        {activePage === 'confirm' && <ConfirmAppointmentPage />}
        {activePage === 'appointmentReview' && <AppointmentReviewPage />}
        {activePage === 'accessibility' && <AccessibilityPage />}
        {activePage === 'privacy' && <PrivacyPage />}
        {activePage === 'terms' && <TermsPage />}
      </div>
      <Footer onNavigate={navigate} />
    </div>
  );
}

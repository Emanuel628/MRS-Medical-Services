import { useEffect, useState, type FormEvent, type ReactNode } from 'react';

type PageKey = 'home' | 'services' | 'about' | 'contact' | 'intake' | 'admin' | 'cancel' | 'confirm';

const navItems: Array<{ key: PageKey; label: string; path: string }> = [
  { key: 'home', label: 'Home', path: '/' },
  { key: 'services', label: 'Services', path: '/services' },
  { key: 'intake', label: 'Intake', path: '/intake' },
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
const monthOptions = [
  ['01', 'January'],
  ['02', 'February'],
  ['03', 'March'],
  ['04', 'April'],
  ['05', 'May'],
  ['06', 'June'],
  ['07', 'July'],
  ['08', 'August'],
  ['09', 'September'],
  ['10', 'October'],
  ['11', 'November'],
  ['12', 'December'],
];

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

type DateParts = {
  year: string;
  month: string;
  day: string;
};

const steps = [
  ['1', 'Request a visit', 'Share your location, preferred timing, and collection needs.'],
  ['2', 'Confirm the details', 'M.R.S. reviews the request, route timing, and required paperwork.'],
  ['3', 'Collection visit', 'A mobile phlebotomy visit is completed at the approved location.'],
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

const reviews = [
  [
    'Such a great experience. She was on time, professional, and made me feel so comfortable.',
    'J. M.',
  ],
  [
    'Having someone come to my home made all the difference. Friendly, efficient, and convenient.',
    'L. T.',
  ],
];

const appointmentConfirmationNote =
  'Appointment requests must be confirmed by M.R.S. Medical Services. Requests that are not confirmed will be canceled. Appointments must be canceled at least 24 hours in advance.';

function pageFromPath(pathname: string): PageKey {
  if (pathname.startsWith('/services')) return 'services';
  if (pathname.startsWith('/intake')) return 'intake';
  if (pathname.startsWith('/about')) return 'about';
  if (pathname.startsWith('/contact')) return 'contact';
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/cancel')) return 'cancel';
  if (pathname.startsWith('/confirm')) return 'confirm';
  return 'home';
}

function Header({ activePage, onNavigate }: { activePage: PageKey; onNavigate: (page: PageKey) => void }) {
  return (
    <header className="header">
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
  return (
    <footer className="footer">
      <div className="wrap footer-inner">
        <div>
          <strong>M.R.S. Medical Services</strong>
          <p>Mobile phlebotomy services for convenient specimen collection.</p>
        </div>
        <a
          className="admin-link"
          href="/admin"
          onClick={(event) => {
            event.preventDefault();
            onNavigate('admin');
          }}
        >
          Admin
        </a>
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
              and care settings, so routine lab work can fit more easily into the day.
            </p>
            <div className="hero-buttons">
              <button className="btn primary" type="button" onClick={() => onNavigate('intake')}>
                Request a Visit
              </button>
              <a className="btn secondary" href="tel:+19084637457">Call Now</a>
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
            <span>Trust and reviews</span>
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
          <div className="review-grid">
            {reviews.map(([quote, author]) => (
              <article className="review-card" key={author}>
                <div className="stars" aria-label="Five star review">
                  <SvgIcon name="star" />
                  <SvgIcon name="star" />
                  <SvgIcon name="star" />
                  <SvgIcon name="star" />
                  <SvgIcon name="star" />
                </div>
                <p>&ldquo;{quote}&rdquo;</p>
                <strong>- {author}</strong>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="wrap cta-inner">
          <div>
            <h3>Need a mobile blood draw?</h3>
            <p>Start with the intake form and M.R.S. will follow up to confirm timing.</p>
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
      <PageHero title="Mobile blood collection made simple.">
        <p>
          M.R.S. supports common mobile blood draw needs throughout the listed service areas. Each
          visit is reviewed before it is placed on the schedule.
        </p>
      </PageHero>

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
              Visit cost is confirmed before scheduling. Service location and collection needs are
              reviewed before payment is collected.
            </p>
            <p>M.R.S. Medical Services will be accepting insurance soon.</p>
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
      <PageHero title="Personal, professional mobile collection.">
        <p>
          M.R.S. Medical Services brings experienced, certified phlebotomy care to patients who
          need blood work completed outside of a traditional lab setting.
        </p>
      </PageHero>

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
              phlebotomy services directly to patients in their homes, workplaces, assisted living
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
                <li>18 years of phlebotomy experience</li>
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
            <p>Use the contact page for questions that are not ready for intake.</p>
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
      <PageHero title="Contact M.R.S. Medical Services.">
        <p>
          Send a general question or ask for help before using the intake form.
        </p>
      </PageHero>

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
            <p>
              For visit requests, use the intake page so the calendar, location, and required
              paperwork can be reviewed together.
            </p>
          </aside>
        </div>
      </section>
    </main>
  );
}

function IntakePage() {
  const [form, setForm] = useState({
    fullName: '',
    dateOfBirth: '',
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
    prescriptionReady: false,
    hasKit: false,
    notes: '',
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showServiceAreaNotice, setShowServiceAreaNotice] = useState(false);
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
  const [dobDraft, setDobDraft] = useState<DateParts>({ year: '', month: '', day: '' });
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));
  const todayKey = getLocalDateKey(new Date());
  const calendarDays = getCalendarDays(visibleMonth);
  const dobYears = getDobYears(new Date(), 120);
  const dobDays = getDaysInMonth(dobDraft.year, dobDraft.month);
  const selectedBlockedWindows = new Set(
    blockedTimes
      .filter((blocked) => getScheduleDateKey(blocked.blockDate) === form.requestedDate)
      .map((blocked) => blocked.timeWindow),
  );
  const selectedUnavailableWindows = getUnavailableWindows(selectedBlockedWindows, form.hasKit);
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
    if (form.hasKit && form.preferredTimeWindow && isKitRestrictedWindow(form.preferredTimeWindow)) {
      setForm((currentForm) => ({ ...currentForm, preferredTimeWindow: '' }));
    }
  }, [form.hasKit, form.preferredTimeWindow]);

  const updateDobPart = (part: keyof DateParts, value: string) => {
    const nextDraft = normalizeDateParts({ ...dobDraft, [part]: value });
    setDobDraft(nextDraft);
    setForm({ ...form, dateOfBirth: buildDateValue(nextDraft.year, nextDraft.month, nextDraft.day) });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.requestedDate || !form.preferredTimeWindow) {
      setStatus('error');
      setStatusMessage('Please choose an available date and time window.');
      return;
    }

    if (!isAdultPatient(form.dateOfBirth)) {
      setStatus('error');
      setStatusMessage('Patients must be 19 or older to schedule through the intake form.');
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

    setStatus('sending');
    setStatusMessage('Sending your intake form...');

    const message = [
      'Patient intake request',
      '',
      `Patient name: ${form.fullName}`,
      `Date of birth: ${form.dateOfBirth}`,
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
      `Prescription/order ready: ${form.prescriptionReady ? 'Yes' : 'No'}`,
      `Has kit: ${form.hasKit ? 'Yes' : 'No'}`,
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
        }),
      });

      const result = (await response.json().catch(() => ({}))) as { message?: string };

      if (!response.ok) {
        throw new Error(result.message || 'Intake form could not be sent right now.');
      }

      setStatus('success');
      setStatusMessage('Your intake form was sent. Please watch for a confirmation email.');
      setShowConfirmation(true);
    } catch (error) {
      setStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Intake form could not be sent right now.');
    }
  };

  return (
    <main>
      <section className="page-hero intake-hero">
        <div className="wrap intake-hero-inner">
          <div>
            <h1>Patient intake form.</h1>
            <p>
              Send the details for the visit. M.R.S. will review the route, timing, and paperwork before
              confirming an appointment.
            </p>
          </div>
          <img src="/images/intake-consultation.png" alt="Mobile phlebotomy intake review" />
        </div>
      </section>

      <section className="section">
        <div className="wrap intake-layout">
          <div className="notice-card" role="note">
            <strong>Before choosing a visit time</strong>
            <p>{appointmentConfirmationNote}</p>
            <p>Specialty kit collections must be scheduled before 10 AM.</p>
          </div>

          <form className="contact-form intake-form" onSubmit={handleSubmit}>
            <div className="form-grid">
              <label>
                Full name
                <input
                  value={form.fullName}
                  onChange={(event) => setForm({ ...form, fullName: event.target.value })}
                  autoComplete="name"
                  required
                />
              </label>
              <label>
                Date of birth
                <div className="dob-rolodex" role="group" aria-label="Date of birth">
                  <select
                    aria-label="Birth month"
                    value={dobDraft.month}
                    onChange={(event) => updateDobPart('month', event.target.value)}
                    required
                  >
                    <option value="">Month</option>
                    {monthOptions.map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                  <select
                    aria-label="Birth day"
                    value={dobDraft.day}
                    onChange={(event) => updateDobPart('day', event.target.value)}
                    required
                  >
                    <option value="">Day</option>
                    {dobDays.map((day) => (
                      <option key={day} value={day}>{Number(day)}</option>
                    ))}
                  </select>
                  <select
                    aria-label="Birth year"
                    value={dobDraft.year}
                    onChange={(event) => updateDobPart('year', event.target.value)}
                    required
                  >
                    <option value="">Year</option>
                    {dobYears.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
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
            </div>

            <div className="form-grid">
              <label>
                Street address
                <input
                  value={form.streetAddress}
                  onChange={(event) => setForm({ ...form, streetAddress: event.target.value })}
                  autoComplete="address-line1"
                  required
                />
                <span className="field-help">Home, job, office, facility, or approved care setting.</span>
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
                <span className="field-help">
                  Regular service area: Ocean, Camden, and Central New Jersey.
                </span>
              </label>
              <label>
                Preferred lab
                <select
                  value={form.preferredLab}
                  onChange={(event) => setForm({ ...form, preferredLab: event.target.value })}
                  required
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

            <div className="booking-calendar" aria-label="Visit availability picker">
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
              Notes
              <textarea
                rows={5}
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
              />
            </label>

            <button className="btn primary" type="submit" disabled={status === 'sending'}>
              {status === 'sending' ? 'Sending...' : 'Submit Intake'}
            </button>
            {statusMessage && (
              <p className={`form-status ${status === 'error' ? 'form-status-error' : ''}`} role="status">
                {statusMessage}
              </p>
            )}
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

function formatScheduleDate(value: string) {
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
  if (!match) return 0;

  const hour = Number(match[1]);
  if (match[2] === 'AM') return hour === 12 ? 0 : hour;
  return hour === 12 ? 12 : hour + 12;
}

function isKitRestrictedWindow(value: string) {
  return getTimeWindowStartHour(value) >= 10;
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

function getDobYears(today: Date, span: number) {
  const latestYear = today.getFullYear() - 19;
  return Array.from({ length: span }, (_, index) => String(latestYear - index));
}

function getDaysInMonth(year: string, month: string) {
  const fallbackMonth = Number(month) || 1;
  const fallbackYear = Number(year) || new Date().getFullYear() - 19;
  const days = new Date(fallbackYear, fallbackMonth, 0).getDate();
  return Array.from({ length: days }, (_, index) => String(index + 1).padStart(2, '0'));
}

function normalizeDateParts(parts: DateParts): DateParts {
  if (!parts.day) return parts;

  const daysInMonth = getDaysInMonth(parts.year, parts.month);
  if (daysInMonth.includes(parts.day)) return parts;

  return { ...parts, day: daysInMonth[daysInMonth.length - 1] };
}

function buildDateValue(year: string, month: string, day: string) {
  if (!year || !month || !day) return '';

  const daysInMonth = getDaysInMonth(year, month);
  const safeDay = daysInMonth.includes(day) ? day : daysInMonth[daysInMonth.length - 1];
  return `${year}-${month}-${safeDay}`;
}

function isAdultPatient(dateOfBirth: string) {
  if (!dateOfBirth) return false;

  const birthDate = new Date(`${dateOfBirth}T00:00:00`);
  if (Number.isNaN(birthDate.getTime())) return false;

  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 19);
  return birthDate <= cutoff;
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

function getScheduleDateKey(value: string) {
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

  const navigate = (page: PageKey) => {
    const item = navItems.find((navItem) => navItem.key === page);
    if (!item && page !== 'cancel' && page !== 'confirm') return;
    const path = item?.path || (page === 'confirm' ? '/confirm' : '/cancel');
    window.history.pushState(null, '', path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setActivePage(page);
  };

  return (
    <div className="page">
      <Header activePage={activePage} onNavigate={navigate} />
      {activePage === 'home' && <HomePage onNavigate={navigate} />}
      {activePage === 'services' && <ServicesPage onNavigate={navigate} />}
      {activePage === 'intake' && <IntakePage />}
      {activePage === 'about' && <AboutPage onNavigate={navigate} />}
      {activePage === 'contact' && <ContactPage />}
      {activePage === 'admin' && <AdminPage />}
      {activePage === 'cancel' && <CancelPage />}
      {activePage === 'confirm' && <ConfirmAppointmentPage />}
      <Footer onNavigate={navigate} />
    </div>
  );
}

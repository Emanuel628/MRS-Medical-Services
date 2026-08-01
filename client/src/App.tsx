import { useEffect, useState, type FormEvent, type ReactNode } from 'react';

type PageKey = 'home' | 'services' | 'about' | 'contact' | 'intake' | 'admin';

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
const timeWindowOptions = ['6 AM - 8 AM', '8 AM - 10 AM', '10 AM - 12 PM', '12 PM - 2 PM'];
const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

const steps = [
  ['1', 'Request a visit', 'Share your location, preferred timing, and collection needs.'],
  ['2', 'Confirm the details', 'M.R.S. reviews the request, route timing, and required paperwork.'],
  ['3', 'Collection visit', 'A mobile phlebotomy visit is completed at the approved location.'],
  ['4', 'Specimen handoff', 'Specimens are handled according to the lab order or provider request.'],
];

const benefitItems = [
  ['home', 'Convenient', 'Service is planned around an approved home, office, or facility visit.'],
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

function pageFromPath(pathname: string): PageKey {
  if (pathname.startsWith('/services')) return 'services';
  if (pathname.startsWith('/intake')) return 'intake';
  if (pathname.startsWith('/about')) return 'about';
  if (pathname.startsWith('/contact')) return 'contact';
  if (pathname.startsWith('/admin')) return 'admin';
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
          <span className="brand-wordmark">
            <strong>M.R.S.</strong>
            <span>Medical Services</span>
          </span>
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
              M.R.S. Medical Services brings mobile blood collection to homes, offices, and care
              settings, so routine lab work can fit more easily into the day.
            </p>
            <div className="hero-buttons">
              <button className="btn primary" type="button" onClick={() => onNavigate('intake')}>
                Request a Visit
              </button>
              <a className="btn secondary" href="tel:+19084637457">Call Now</a>
            </div>
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
            <h2>Mileage-based payment.</h2>
            <p>
              Visit cost is confirmed before scheduling. Mileage, service location, and collection
              needs are reviewed before payment is collected.
            </p>
            <p>Online payment support is planned so confirmed visits can be handled securely.</p>
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
            <h2>Experienced care in real-world settings.</h2>
            <p>
              M.R.S. is led by an NCCT-certified phlebotomy professional with 18 years of hands-on
              experience. That background includes work in rehabilitation facilities, correctional
              health settings, mental health care, nursing homes, and doctors' offices.
            </p>
            <p>
              That range of experience matters during mobile visits. Patients may be at home,
              recovering, managing anxiety, coordinating care for a loved one, or working around a
              provider's order. The goal is to keep the visit calm, prepared, and respectful from
              the first message through the collection.
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
    address: '',
    serviceArea: '',
    preferredLab: '',
    requestedDate: '',
    preferredTimeWindow: '',
    prescriptionReady: false,
    hasKit: false,
    notes: '',
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));
  const todayKey = getLocalDateKey(new Date());
  const calendarDays = getCalendarDays(visibleMonth);
  const selectedBlockedWindows = new Set(
    blockedTimes
      .filter((blocked) => getScheduleDateKey(blocked.blockDate) === form.requestedDate)
      .map((blocked) => blocked.timeWindow),
  );
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.requestedDate || !form.preferredTimeWindow) {
      setStatus('error');
      setStatusMessage('Please choose an available date and time window.');
      return;
    }

    if (form.preferredTimeWindow && selectedBlockedWindows.has(form.preferredTimeWindow)) {
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
      `Address: ${form.address}`,
      `Service area: ${form.serviceArea || 'Not specified'}`,
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
          serviceArea: form.serviceArea,
          preferredDate: form.requestedDate,
          preferredTimeWindow: form.preferredTimeWindow,
        }),
      });

      const result = (await response.json().catch(() => ({}))) as { message?: string };

      if (!response.ok) {
        throw new Error(result.message || 'Intake form could not be sent right now.');
      }

      setStatus('success');
      setStatusMessage('Your intake form was sent. M.R.S. Medical Services will follow up soon.');
    } catch (error) {
      setStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Intake form could not be sent right now.');
    }
  };

  return (
    <main>
      <PageHero title="Patient intake form.">
        <p>
          Send the details for the visit. M.R.S. will review the route, timing, and paperwork before
          confirming an appointment.
        </p>
      </PageHero>

      <section className="section">
        <div className="wrap intake-layout">
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
                <input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(event) => setForm({ ...form, dateOfBirth: event.target.value })}
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
            </div>

            <label>
              Service address
              <input
                value={form.address}
                onChange={(event) => setForm({ ...form, address: event.target.value })}
                autoComplete="street-address"
                required
              />
            </label>

            <div className="form-grid">
              <label>
                Service area
                <select
                  value={form.serviceArea}
                  onChange={(event) => setForm({ ...form, serviceArea: event.target.value })}
                  required
                >
                  <option value="">Select service area</option>
                  {serviceAreaOptions.map((area) => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                  <option value="Other">Other / not sure</option>
                </select>
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

            <div className="booking-calendar" aria-label="Visit availability calendar">
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
                {calendarDays.map((date) => {
                  const dateKey = getLocalDateKey(date);
                  const blockedForDate = unavailableByDate[dateKey] || new Set<string>();
                  const isCurrentMonth = date.getMonth() === visibleMonth.getMonth();
                  const isPast = dateKey < todayKey;
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  const isFull = timeWindowOptions.every((window) => blockedForDate.has(window));
                  const isDisabled = !isCurrentMonth || isPast || isWeekend || isFull;

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
                          preferredTimeWindow: blockedForDate.has(form.preferredTimeWindow)
                            ? ''
                            : form.preferredTimeWindow,
                        });
                      }}
                    >
                      <span>{date.getDate()}</span>
                      {isCurrentMonth && !isPast && !isWeekend && (
                        <small>{isFull ? 'Full' : `${timeWindowOptions.length - blockedForDate.size} open`}</small>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="time-slot-panel">
                <strong>{form.requestedDate ? 'Available time windows' : 'Choose a date to see times'}</strong>
                <div className="time-slot-grid">
                  {timeWindowOptions.map((window) => {
                    const isUnavailable = selectedBlockedWindows.has(window);

                    return (
                      <button
                        key={window}
                        className={`time-slot ${form.preferredTimeWindow === window ? 'selected' : ''}`}
                        type="button"
                        disabled={!form.requestedDate || isUnavailable}
                        onClick={() => setForm({ ...form, preferredTimeWindow: window })}
                      >
                        <span>{window}</span>
                        <small>{isUnavailable ? 'Unavailable' : 'Available'}</small>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={form.prescriptionReady}
                  onChange={(event) => setForm({ ...form, prescriptionReady: event.target.checked })}
                  required
                />
                I have a prescription, lab order, or provider instructions.
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={form.hasKit}
                  onChange={(event) => setForm({ ...form, hasKit: event.target.checked })}
                />
                I have a specialty collection kit.
              </label>
            </div>

            <label>
              Notes
              <textarea
                rows={5}
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
                required
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

function getCalendarDays(monthDate: Date) {
  const firstDay = startOfMonth(monthDate);
  const firstGridDay = new Date(firstDay);
  firstGridDay.setDate(firstGridDay.getDate() - firstGridDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstGridDay);
    date.setDate(firstGridDay.getDate() + index);
    return date;
  });
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
    if (!item) return;
    window.history.pushState(null, '', item.path);
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
      <Footer onNavigate={navigate} />
    </div>
  );
}
